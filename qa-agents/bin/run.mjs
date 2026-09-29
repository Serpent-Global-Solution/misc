#!/usr/bin/env node
// Run naive persona agents against the Meikigo apps.
//
//   node bin/run.mjs --personas customer            all customer personas
//   node bin/run.mjs --personas customer-first-booking --browser firefox
//   node bin/run.mjs --personas all --concurrency 4 --model sonnet
//
// Each persona runs as an isolated `claude -p` session: no project files, no CLAUDE.md,
// no settings, no built-in tools. Its only tool is a Playwright browser. The oracle
// (oracle/init-page.cjs) records errors the agent never sees.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import { ROOT, parseArgs, listPersonas, loadTargets, stamp, pool } from './lib.mjs';
import { startNativeOracle } from '../oracle/native-oracle.mjs';

const args = parseArgs(process.argv.slice(2));
const filter = args.personas === 'all' ? null : args.personas;
if (!args.personas) {
  console.error('Usage: node bin/run.mjs --personas <all|app|id[,id]> [--target pos-android] [--browser webkit|firefox|chromium] [--concurrency 3] [--model sonnet] [--timeout-min 30] [--run <dir>]');
  process.exit(1);
}

const personas = listPersonas(filter);
if (!personas.length) { console.error(`No persona matches "${args.personas}"`); process.exit(1); }

const targets = loadTargets();
const secretsFile = path.join(ROOT, 'config', 'secrets.env');
if (!fs.existsSync(secretsFile)) { console.error('Missing config/secrets.env (copy config/secrets.env.example)'); process.exit(1); }
const secretValues = Object.fromEntries(fs.readFileSync(secretsFile, 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.trim().startsWith('#'))
  .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
  .filter(([, v]) => v));
const secretNames = new Set(Object.keys(secretValues));

const runRoot = path.resolve(args.run || path.join(ROOT, 'runs', stamp()));
fs.mkdirSync(runRoot, { recursive: true });
const naiveRules = fs.readFileSync(path.join(ROOT, 'prompts', 'naive-user.md'), 'utf8');
const concurrency = Number(args.concurrency || 3);
const timeoutMs = Number(args['timeout-min'] || 30) * 60_000;

console.log(`Run folder: ${runRoot}`);
console.log(`Personas: ${personas.map(p => p.id).join(', ')}  (concurrency ${concurrency})`);

// One native persona per device at a time; web personas run in parallel.
const deviceLocks = new Map();
const results = await pool(personas, concurrency, p => {
  const t = targets[p.app];
  if (!t?.platform) return runPersona(p);
  const prev = deviceLocks.get(t.device) || Promise.resolve();
  const next = prev.then(() => runPersona(p));
  deviceLocks.set(t.device, next.catch(() => {}));
  return next;
});
fs.writeFileSync(path.join(runRoot, 'summary.json'), JSON.stringify(results, null, 2));
console.log('\nDone. Next: node bin/triage.mjs --run ' + path.relative(ROOT, runRoot));

async function runPersona(p) {
  const target = args.target && targets[p.app]?.platform ? targets[args.target] : targets[p.app]; // --target only swaps native devices
  if (!target) throw new Error(`${p.id}: unknown app "${p.app}"`);
  if (/BRAND_ID|OUTLET_ID/.test(target.url)) {
    console.log(`SKIP ${p.id}: set a real outlet URL for "${p.app}" in config/targets.json`);
    return { id: p.id, skipped: 'target URL placeholder' };
  }
  const native = target.platform; // 'ios' | 'android' | undefined (web)
  const browser = native ? native : (args.browser || p.browser || 'webkit');
  const model = args.model || p.model || 'sonnet';
  const dir = path.join(runRoot, `${p.id}__${browser}`);
  fs.mkdirSync(path.join(dir, 'artifacts'), { recursive: true });

  const missing = (p.secrets || []).filter(s => !secretNames.has(s));
  if (missing.length) {
    console.log(`SKIP ${p.id}: secrets.env lacks ${missing.join(', ')}`);
    return { id: p.id, browser, skipped: `missing secrets ${missing.join(', ')}` };
  }

  let mcpServer, blocked, taskLines;
  if (native) {
    // mobile-mcp has no secret masking, so test-account values go into the prompt.
    mcpServer = { command: process.execPath, args: [path.join(ROOT, 'node_modules', '@mobilenext', 'mobile-mcp', 'lib', 'index.js')], env: { MOBILEMCP_DISABLE_TELEMETRY: '1' } };
    blocked = ['mobile_get_device_logs', 'mobile_list_crashes', 'mobile_get_crash', 'mobile_install_app', 'mobile_uninstall_app', 'mobile_open_url',
      'mobile_login_to_cloud_provider', 'mobile_list_remote_devices', 'mobile_allocate_remote_device', 'mobile_release_remote_device', 'mobile_clipboard', 'mobile_set_location'];
    const creds = (p.secrets || []).map(k => `${k.replace(/^POS_/, '').toLowerCase().replace('_', ' ')}: ${secretValues[k]}`).join(', ');
    taskLines = [
      creds ? `Your login details: ${creds}.` : 'You do not have an account yet.',
      `The app is already open on the shop tablet. Use device "${target.device}" with the mobile tools. Look at the screen before each tap.`,
      `The app is called ${target.name}.`,
    ];
  } else {
    const mcpArgs = [
      path.join(ROOT, 'node_modules', '@playwright', 'mcp', 'cli.js'),
      '--headless', '--isolated',
      '--browser', browser,
      '--init-page', path.join(ROOT, 'oracle', 'init-page.cjs'),
      '--output-dir', path.join(dir, 'artifacts'),
      '--secrets', secretsFile,
      '--save-session',
      '--caps', 'vision',
      '--console-level', 'error',
      '--timeout-navigation', '30000',
    ];
    const device = p.device || target.device;
    if (device) mcpArgs.push('--device', device);
    else mcpArgs.push('--viewport-size', p.viewport || target.viewport || '1440x900');
    mcpServer = { command: process.execPath, args: mcpArgs, env: { QA_RUN_DIR: dir } };
    // A naive user has no developer tools: no JS execution, console or network views.
    blocked = ['browser_evaluate', 'browser_run_code_unsafe', 'browser_console_messages', 'browser_network_requests', 'browser_network_request', 'browser_file_upload'];
    taskLines = [
      p.secrets?.length ? `Your login details are these secret names: ${p.secrets.join(', ')}. Type the name itself into the field.` : 'You do not have an account yet.',
      `Start here: ${target.url}`,
      `The software is called ${target.name}.`,
    ];
  }
  fs.writeFileSync(path.join(dir, 'mcp.json'), JSON.stringify({ mcpServers: { browser: mcpServer } }, null, 2));

  let system = naiveRules.replace('{{MAX_ACTIONS}}', String(p.maxActions || 60));
  if (native) system = system
    .replace('A web browser you control with the browser tools.', 'A shop tablet you control with the mobile tools (tap, type, swipe, screenshot).')
    .replace(/- Login details, if the persona has an account\.[^\n]*\n/, '- Login details, if the persona has an account.\n')
    .replace(/Do not guess URLs;[^\n]*/, 'Move around by tapping what you see.')
    .replace('Do not open developer tools, read page source or run JavaScript.', 'Do not look at logs or developer settings.')
    .replace(/- Stay on the Meikigo sites[^\n]*/, '- Stay inside the Meikigo app. Do not open other apps.');
  // {{RUN_TAG}} gives sign-up personas an email no earlier run has registered.
  const runTag = new Date().toISOString().slice(5, 16).replace(/\D/g, ''); // MMDDHHMM
  const prompt = `${p.body.replaceAll('{{RUN_TAG}}', runTag)}\n\n${taskLines.join('\n\n')}\n\nBegin now.`;
  fs.writeFileSync(path.join(dir, 'prompt.md'), `# System\n\n${system}\n\n# Task\n\n${prompt.replace(/(login details: )[^\n]*/i, '$1<redacted>')}\n`);

  const cliArgs = [
    '-p', prompt,
    '--system-prompt', system,
    '--model', model,
    '--tools', '',
    '--setting-sources', '',
    '--strict-mcp-config',
    '--mcp-config', path.join(dir, 'mcp.json'),
    '--allowedTools', 'mcp__browser',
    '--disallowedTools', ...blocked.map(t => `mcp__browser__${t}`),
    '--permission-mode', 'dontAsk',
    '--no-session-persistence',
    '--output-format', 'stream-json', '--verbose',
  ];

  if (args['dry-run']) {
    console.log(`DRY ${p.id}: claude ${cliArgs.filter(a => a !== prompt && a !== system).join(' ')}`);
    return { id: p.id, dryRun: true };
  }

  if (native) prepareDevice(target);
  const stopNativeOracle = native ? startNativeOracle({ platform: native, device: target.device, appId: target.appId, runDir: dir }) : null;
  const started = Date.now();
  console.log(`START ${p.id} [${browser}, ${model}]`);
  const transcript = fs.createWriteStream(path.join(dir, 'transcript.jsonl'));
  const code = await new Promise(resolve => {
    // cwd is the empty run folder, so the agent cannot find project files.
    const child = spawn('claude', cliArgs, { cwd: dir, env: { ...process.env, QA_RUN_DIR: dir }, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(transcript);
    child.stderr.on('data', d => fs.appendFileSync(path.join(dir, 'stderr.log'), d));
    const timer = setTimeout(() => { fs.appendFileSync(path.join(dir, 'stderr.log'), '\nTIMEOUT\n'); child.kill('SIGTERM'); }, timeoutMs);
    child.on('close', c => { clearTimeout(timer); resolve(c); });
  });
  stopNativeOracle?.();

  const lines = fs.readFileSync(path.join(dir, 'transcript.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const result = lines.findLast(l => l.type === 'result');
  const actions = lines.filter(l => l.type === 'assistant').flatMap(l => l.message?.content || []).filter(c => c.type === 'tool_use').length;
  fs.writeFileSync(path.join(dir, 'diary.md'), result?.result || '(agent produced no final diary)');
  const oracleFile = path.join(dir, 'oracle.jsonl');
  const oracleEvents = fs.existsSync(oracleFile) ? fs.readFileSync(oracleFile, 'utf8').split('\n').filter(Boolean).length : 0;

  const meta = {
    id: p.id, app: p.app, browser, model, exitCode: code, actions, oracleEvents,
    minutes: +((Date.now() - started) / 60000).toFixed(1),
    costUsd: result?.total_cost_usd ?? null,
    outcome: (result?.result || '').match(/## Outcome\s*\n\s*(\w[\w ]*)/)?.[1] || 'UNKNOWN',
  };
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  console.log(`END   ${p.id}: ${meta.outcome}, ${actions} actions, ${oracleEvents} oracle events, ${meta.minutes} min`);
  return meta;
}

// Fresh app state for each native persona: stop the app, then launch it.
function prepareDevice(t) {
  if (t.platform === 'ios') {
    spawnSync('xcrun', ['simctl', 'terminate', t.device, t.appId]);
    spawnSync('xcrun', ['simctl', 'launch', t.device, t.appId]);
  } else {
    spawnSync('adb', ['-s', t.device, 'shell', 'am', 'force-stop', t.appId]);
    spawnSync('adb', ['-s', t.device, 'shell', 'monkey', '-p', t.appId, '-c', 'android.intent.category.LAUNCHER', '1']);
  }
  spawnSync('sleep', ['4']);
}
