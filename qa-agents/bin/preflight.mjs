#!/usr/bin/env node
// Checks that every piece of the test rig is ready. Changes nothing.
//   node bin/preflight.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, loadTargets, listPersonas } from './lib.mjs';

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok, detail });
const run = (cmd, a) => spawnSync(cmd, a, { encoding: 'utf8', timeout: 20000 });
const http = async url => { try { const r = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(8000) }); return r.status; } catch (e) { return e.cause?.code || e.name; } };

check('claude CLI', run('claude', ['--version']).status === 0, run('claude', ['--version']).stdout?.trim());
// Check the browser builds that Playwright MCP's own bundled playwright-core expects.
const mcpBrowsers = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules/@playwright/mcp/node_modules/playwright-core/browsers.json'), 'utf8')).browsers;
for (const b of ['webkit', 'firefox']) {
  const rev = mcpBrowsers.find(x => x.name === b)?.revision;
  const ok = fs.existsSync(path.join(process.env.HOME, 'Library/Caches/ms-playwright', `${b}-${rev}`));
  check(`Playwright MCP ${b} ${rev}`, ok, ok ? '' : `run: node node_modules/@playwright/mcp/cli.js install-browser ${b}`);
}
check('Lightpanda', fs.existsSync(path.join(ROOT, 'tools', 'lightpanda')), 'tools/lightpanda');
check('axe-core', fs.existsSync(path.join(ROOT, 'node_modules', 'axe-core')));

const api = await http('http://meiki-api.test:8083/health');
check('meikigo-api /health', api === 200, String(api));

const apiEnv = path.join(ROOT, '..', 'meikigo-api', '.env');
const env = fs.existsSync(apiEnv) ? fs.readFileSync(apiEnv, 'utf8') : '';
const chipModes = [...env.matchAll(/^Chip__\w+__Environment=(.*)$/gm)].map(m => m[1].trim());
check('CHIP in Sandbox mode', chipModes.length > 0 && chipModes.every(m => /sandbox|staging|test/i.test(m)), chipModes.join(', ') || 'not found');

const targets = loadTargets();
for (const [key, t] of Object.entries(targets)) {
  if (t.platform === 'ios') {
    const booted = run('xcrun', ['simctl', 'list', 'devices', 'booted']).stdout.includes(t.device);
    const app = run('xcrun', ['simctl', 'get_app_container', t.device, t.appId]);
    const release = app.status === 0 && fs.existsSync(path.join(app.stdout.trim(), 'main.jsbundle'));
    check(`${key} simulator booted`, booted, t.device);
    check(`${key} Release app installed`, release, release ? 'main.jsbundle present' : 'debug or missing build');
  } else if (t.platform === 'android') {
    const devices = run('adb', ['devices']).stdout || '';
    const up = devices.includes(t.device + '\tdevice');
    check(`${key} emulator running`, up, t.device);
    if (up) check(`${key} app installed`, (run('adb', ['-s', t.device, 'shell', 'pm', 'list', 'packages', t.appId]).stdout || '').includes(t.appId));
  } else {
    const placeholder = /BRAND_ID|OUTLET_ID/.test(t.url);
    const status = placeholder ? 'placeholder URL' : await http(t.url);
    check(`${key} reachable`, !placeholder && Number(status) > 0 && Number(status) < 500, `${t.url} -> ${status}`);
  }
}

const secretsFile = path.join(ROOT, 'config', 'secrets.env');
const secrets = fs.existsSync(secretsFile)
  ? Object.fromEntries(fs.readFileSync(secretsFile, 'utf8').split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.split('=')[0].trim(), l.slice(l.indexOf('=') + 1).trim()]))
  : {};
check('config/secrets.env', fs.existsSync(secretsFile));
const needed = new Set(listPersonas().flatMap(p => p.secrets || []));
for (const k of needed) check(`secret ${k}`, !!secrets[k]);

const personas = listPersonas();
check('personas', personas.length > 0, `${personas.length}: ` + Object.entries(personas.reduce((a, p) => ((a[p.app] = (a[p.app] || 0) + 1), a), {})).map(([k, v]) => `${k}=${v}`).join(' '));

for (const r of results) console.log(`${r.ok ? 'OK  ' : 'FAIL'}  ${r.name}${r.detail ? '  (' + r.detail + ')' : ''}`);
const failed = results.filter(r => !r.ok).length;
console.log(failed ? `\n${failed} check(s) failing.` : '\nAll checks pass.');
process.exit(failed ? 1 : 0);
