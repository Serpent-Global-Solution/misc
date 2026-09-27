#!/usr/bin/env node
// Turn a finished run into a markdown bug report.
//   node bin/triage.mjs --run runs/<stamp> [--model opus] [--max-repro 8] [--browser webkit]
// Output: runs/<stamp>/report.md, copied to reports/<stamp>.md
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ROOT, parseArgs } from './lib.mjs';
import { aggregate } from './aggregate.mjs';

const args = parseArgs(process.argv.slice(2));
if (!args.run) { console.error('Usage: node bin/triage.mjs --run runs/<stamp>'); process.exit(1); }
const runRoot = path.resolve(ROOT, args.run);
const { signals } = aggregate(runRoot);
console.log(`${signals.length} distinct signals in ${runRoot}`);

const secretsFile = path.join(ROOT, 'config', 'secrets.env');
const secretNames = fs.readFileSync(secretsFile, 'utf8').split('\n').map(l => l.split('=')[0].trim()).filter(n => n && !n.startsWith('#'));
const reproDir = path.join(runRoot, '_triage');
fs.mkdirSync(path.join(reproDir, 'artifacts'), { recursive: true });

const mcp = {
  mcpServers: {
    browser: {
      command: process.execPath,
      args: [
        path.join(ROOT, 'node_modules', '@playwright', 'mcp', 'cli.js'),
        '--headless', '--isolated', '--browser', args.browser || 'webkit',
        '--init-page', path.join(ROOT, 'oracle', 'init-page.cjs'),
        '--output-dir', path.join(reproDir, 'artifacts'),
        '--secrets', secretsFile, '--caps', 'vision', '--viewport-size', '1440x900',
      ],
      env: { QA_RUN_DIR: reproDir },
    },
  },
};
fs.writeFileSync(path.join(reproDir, 'mcp.json'), JSON.stringify(mcp, null, 2));

const system = fs.readFileSync(path.join(ROOT, 'prompts', 'triage.md'), 'utf8')
  .replace('{{SECRETS}}', secretNames.join(', '))
  .replace('{{MAX_REPRO}}', String(args['max-repro'] || 8));

const cliArgs = [
  '-p', `Triage this run and write report.md. Today is ${new Date().toISOString().slice(0, 10)}.`,
  '--system-prompt', system,
  '--model', args.model || 'opus',
  '--tools', 'Read,Glob,Grep,Write',
  '--setting-sources', '',
  '--strict-mcp-config', '--mcp-config', path.join(reproDir, 'mcp.json'),
  '--allowedTools', 'Read', 'Glob', 'Grep', 'Write', 'mcp__browser',
  '--permission-mode', 'dontAsk',
  '--no-session-persistence',
  '--output-format', 'stream-json', '--verbose',
];

const out = fs.createWriteStream(path.join(reproDir, 'transcript.jsonl'));
const code = await new Promise(resolve => {
  // cwd is the run folder: the triage agent can read run data but not product docs or code.
  const child = spawn('claude', cliArgs, { cwd: runRoot, stdio: ['ignore', 'pipe', 'inherit'] });
  child.stdout.pipe(out);
  child.on('close', resolve);
});

const report = path.join(runRoot, 'report.md');
if (!fs.existsSync(report)) { console.error(`Triage exited ${code} without writing report.md`); process.exit(1); }
fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
const dest = path.join(ROOT, 'reports', `${path.basename(runRoot)}.md`);
fs.writeFileSync(dest, `> Evidence paths are relative to \`${path.relative(ROOT, runRoot)}/\`.\n\n` + fs.readFileSync(report, 'utf8'));
console.log(`Report: ${dest}`);
