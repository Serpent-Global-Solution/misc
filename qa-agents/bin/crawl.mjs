#!/usr/bin/env node
// Fast, LLM-free smoke crawl with Lightpanda (non-Chromium, CDP). Visits every same-host
// link breadth-first and records oracle signals. Cheap first pass before persona runs.
//   node bin/crawl.mjs --apps admin,merchant [--max 40] [--login] [--run runs/<stamp>]
// --login signs in with the app's secrets first (email + password fields).
// Anything flagged only by Lightpanda must be re-checked in WebKit: Lightpanda does not
// implement every Web API, so some failures are the browser, not the app.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import { ROOT, parseArgs, loadTargets, stamp } from './lib.mjs';

const args = parseArgs(process.argv.slice(2));
const targets = loadTargets();
const apps = String(args.apps || 'admin,merchant,customer,pos-web').split(',');
const max = Number(args.max || 40);
const runRoot = path.resolve(ROOT, args.run || path.join('runs', stamp()));
const LOGIN = { admin: ['ADMIN_EMAIL', 'ADMIN_PASSWORD'], merchant: ['OWNER_EMAIL', 'OWNER_PASSWORD'], customer: ['CUSTOMER_EMAIL', 'CUSTOMER_PASSWORD'], 'pos-web': ['POS_EMAIL', 'POS_PASSWORD'] };

const secrets = Object.fromEntries(
  (fs.existsSync(path.join(ROOT, 'config', 'secrets.env')) ? fs.readFileSync(path.join(ROOT, 'config', 'secrets.env'), 'utf8') : '')
    .split('\n').filter(l => l.includes('=') && !l.startsWith('#')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));

const port = 9300 + Math.floor(Math.random() * 500);
const lp = spawn(path.join(ROOT, 'tools', 'lightpanda'), ['serve', '--host', '127.0.0.1', '--port', String(port)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));

try {
  for (const app of apps) {
    const target = targets[app];
    if (!target || /BRAND_ID|OUTLET_ID/.test(target.url)) { console.log(`SKIP ${app}: no usable URL`); continue; }
    const dir = path.join(runRoot, `crawl-${app}__lightpanda`);
    fs.mkdirSync(dir, { recursive: true });
    process.env.QA_RUN_DIR = dir;
    process.env.QA_ORACLE_LITE = '1';
    const oracle = (await import(path.join(ROOT, 'oracle', 'init-page.cjs'))).default.default;

    const browser = await chromium.connectOverCDP(`ws://127.0.0.1:${port}`);
    const context = browser.contexts()[0] ?? await browser.newContext();
    const page = await context.newPage();
    await oracle({ page });

    const started = Date.now();
    const origin = new URL(target.url).origin;
    if (args.login && LOGIN[app]?.every(k => secrets[k])) {
      try {
        await page.goto(target.url, { waitUntil: 'load', timeout: 30000 });
        await page.locator('input[type=email], input[name*=email i]').first().fill(secrets[LOGIN[app][0]]);
        await page.locator('input[type=password]').first().fill(secrets[LOGIN[app][1]]);
        await page.locator('button[type=submit], form button').first().click();
        await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
      } catch (e) { fs.appendFileSync(path.join(dir, 'oracle.jsonl'), JSON.stringify({ kind: 'crawl-login-failed', url: page.url(), message: e.message.slice(0, 300) }) + '\n'); }
    }

    const queue = [page.url().startsWith(origin) ? page.url() : target.url];
    const seen = new Set();
    while (queue.length && seen.size < max) {
      const url = queue.shift();
      const key = url.split('#')[0];
      if (seen.has(key) || /logout|sign-?out/i.test(key)) continue;
      seen.add(key);
      try {
        const res = await page.goto(key, { waitUntil: 'load', timeout: 30000 });
        await new Promise(r => setTimeout(r, 1500));
        fs.appendFileSync(path.join(dir, 'oracle.jsonl'), JSON.stringify({ ts: new Date().toISOString(), kind: 'navigate', url: key, route: new URL(key).pathname, status: res?.status() }) + '\n');
        const links = await page.$$eval('a[href]', as => as.map(a => a.href)).catch(() => []);
        for (const l of links) if (l.startsWith(origin) && !seen.has(l.split('#')[0])) queue.push(l);
      } catch (e) {
        fs.appendFileSync(path.join(dir, 'oracle.jsonl'), JSON.stringify({ ts: new Date().toISOString(), kind: 'crawl-nav-failed', url: key, message: e.message.slice(0, 300) }) + '\n');
      }
    }
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ id: `crawl-${app}`, app, browser: 'lightpanda', pages: seen.size, seconds: Math.round((Date.now() - started) / 1000) }, null, 2));
    console.log(`${app}: ${seen.size} pages in ${Math.round((Date.now() - started) / 1000)}s`);
    await browser.close().catch(() => {});
  }
} finally {
  lp.kill();
}
console.log(`Run folder: ${runRoot}`);
