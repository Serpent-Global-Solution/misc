// Sign the POS web in as a given login, pick Shah Alam, start the session, save it as state/<name>.json
import { chromium } from '/Users/user/Private/meikigo-project/node_modules/playwright/index.mjs';
import { HERE, URLS, sleep } from './lib.mjs';
const [email, pw, name] = process.argv.slice(2);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1194, height: 834 } });
const p = await ctx.newPage();
await p.goto(URLS.pos, { waitUntil: 'load', timeout: 180000 }); await sleep(5000);
await p.getByPlaceholder(/email/i).first().fill(email).catch(async () => p.locator('input').nth(0).fill(email));
await p.locator('input[type=password]').first().fill(pw);
await p.getByText('Start session', { exact: true }).last().click(); await sleep(6000);
if (await p.getByText('Shah Alam', { exact: true }).count()) { await p.getByText('Shah Alam', { exact: true }).first().click(); await sleep(1000); }
await p.locator('input').first().fill('Front counter').catch(() => {});
await p.getByText('Start session', { exact: true }).last().click(); await sleep(7000);
console.log((await p.innerText('body')).replace(/\n+/g, ' | ').slice(0, 300));
await ctx.storageState({ path: `${HERE}/state/${name}.json` });
await b.close();
