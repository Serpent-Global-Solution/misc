// Re-shoot: tablet (POS web, owner signed in) + phone (Aiman joins the queue by QR) in sync, then the merchant portal.
// Writes raw webm + marks.json to ../raw/new/. Run via reshoot.sh during opening hours.
import { chromium } from '/Users/user/Private/meikigo-project/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const STATE = `${HERE}/state`;
const RAW = path.resolve(HERE, '../raw/new');
fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });
const ids = JSON.parse(fs.readFileSync(`${HERE}/ids.json`, 'utf8'));
const QR_URL = `http://meiki-customer-webapp.test:3001/o/${ids.brand}/${ids.outlet}`;
const PORTAL = `http://meiki-brand.test:3000/brands/${ids.brand}/outlets/${ids.outlet}`;

// Recording overlay only: hide Next.js dev UI, show a soft ripple where a tap lands.
const overlay = () => {
  const add = () => {
    if (document.getElementById('rec-style')) return;
    const st = document.createElement('style'); st.id = 'rec-style';
    st.textContent = `nextjs-portal{display:none!important}
      .rec-tap{position:fixed;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(0,0,0,.18);
      pointer-events:none;z-index:2147483647;animation:rec-tap .55s ease-out forwards}
      @keyframes rec-tap{from{transform:scale(.4);opacity:1}to{transform:scale(1.4);opacity:0}}`;
    document.documentElement.appendChild(st);
  };
  document.addEventListener('DOMContentLoaded', add); add();
  window.addEventListener('pointerdown', e => {
    const d = document.createElement('div'); d.className = 'rec-tap';
    d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 700);
  }, true);
};

const marks = {}, t0 = {};
const mark = (who, name) => { marks[`${who}.${name}`] = (Date.now() - t0[who]) / 1000; console.log(who, name, marks[`${who}.${name}`].toFixed(1)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Real device-resolution frames need the flag; Playwright's deviceScaleFactor alone records at CSS size.
const tbrowser = await chromium.launch({ args: ['--force-device-scale-factor=2'] });
const pbrowser = await chromium.launch({ args: ['--force-device-scale-factor=3'] });

// ── fresh sessions, off camera ──────────────────────────────────────────────
{
  const ctx = await pbrowser.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto('http://meiki-customer-webapp.test:3001/login', { waitUntil: 'networkidle' });
  await p.fill("input[placeholder='you@email.com']", 'aiman-test@gmail.com');
  await p.fill("input[placeholder='Your password']", 'Aiman-2026!x');
  await p.getByText('Log in', { exact: true }).last().click();
  await p.waitForURL(u => !u.toString().includes('/login'), { timeout: 30000 });
  await ctx.storageState({ path: `${STATE}/aiman-state.json` }); await ctx.close();
}
{
  const ctx = await tbrowser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto('http://meiki-brand.test:3000/login', { waitUntil: 'networkidle' });
  await p.fill('input[type=email]', 'demo-test@gmail.com');
  await p.fill('input[type=password]', 'Demo-pass-2026!');
  await p.locator('button[type=submit]').click();
  await p.waitForURL(u => !u.toString().includes('/login'), { timeout: 30000 });
  await ctx.storageState({ path: `${STATE}/portal-state.json` }); await ctx.close();
}

// ── tablet ──────────────────────────────────────────────────────────────────
const tctx = await tbrowser.newContext({
  viewport: { width: 1194, height: 834 }, storageState: `${STATE}/pos-state.json`,
  recordVideo: { dir: `${RAW}/tablet`, size: { width: 2388, height: 1668 } },
});
await tctx.addInitScript(overlay);
t0.tablet = Date.now();
const tab = await tctx.newPage();
const tclick = async txt => { await tab.getByText(txt, { exact: true }).last().click(); await sleep(900); };
await tab.goto('http://localhost:3003', { waitUntil: 'load', timeout: 180000 });
await sleep(7000);
if (await tab.getByText('Start the day', { exact: true }).count()) {   // new business day: opening float
  await tab.locator("input[placeholder*='150']").first().fill('150'); await sleep(400);
  await tclick('Start the day'); await sleep(2500);
}
await tab.getByText('Hafiz Rahman', { exact: true }).first().waitFor({ timeout: 30000 });
await sleep(1500);
mark('tablet', 'clip_start');
await sleep(2500);
mark('tablet', 'still_before');

// ── phone ───────────────────────────────────────────────────────────────────
const pctx = await pbrowser.newContext({
  viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, storageState: `${STATE}/aiman-state.json`,
  recordVideo: { dir: `${RAW}/phone`, size: { width: 1080, height: 1920 } },
});
await pctx.addInitScript(overlay);
t0.phone = Date.now();
const ph = await pctx.newPage();
const ptap = async (loc, pause = 1100) => { await loc.click(); await sleep(pause); };
await ph.goto(QR_URL, { waitUntil: 'networkidle' });
await sleep(1500);
mark('phone', 'clip_start');
await sleep(1800);
mark('phone', 'still_shop');
await ptap(ph.getByText('Book now', { exact: true }).first(), 1300);
mark('phone', 'still_service_list');
await ptap(ph.getByText('Haircut + Beard', { exact: true }).first(), 900);
mark('phone', 'still_service');
await ptap(ph.locator("button:has-text('Next ·')").first(), 1300);
await ptap(ph.getByText('Arun Kumar', { exact: true }).first(), 900);
mark('phone', 'still_barber');
await ptap(ph.locator("button:has-text('Next'):not(:has-text('·'))").first(), 1300);
if (await ph.getByText('Join queue', { exact: true }).count()) {      // "When would you like to come?" step
  await ptap(ph.getByText('Join queue', { exact: true }).first(), 900);
  await ptap(ph.locator("button:has-text('Next'):not(:has-text('·'))").first(), 1400);
}
mark('phone', 'still_review');
await ptap(ph.getByText('Confirm booking', { exact: true }).first(), 600);
mark('phone', 'confirmed');
await ph.getByText('Your queue number', { exact: false }).first().waitFor({ timeout: 30000 });
await sleep(3000);
mark('phone', 'still_ticket');
await sleep(800);
mark('phone', 'clip_end');

// ── tablet: the ticket lands, serve, cash ──────────────────────────────────
await tab.getByText('Haircut + Beard · walk-in', { exact: true }).first().waitFor({ timeout: 40000 });
mark('tablet', 'booking_appeared');
await sleep(2500);
mark('tablet', 'still_booking');
await tab.getByText('Haircut + Beard · walk-in', { exact: true }).first().click(); await sleep(1500);
mark('tablet', 'still_drawer');
await tclick('Start cut'); await sleep(2000);
mark('tablet', 'cut_started');
await sleep(1200);
await tab.getByText('Haircut + Beard · now', { exact: true }).first().click(); await sleep(1300);
await tclick('Complete & pay'); await sleep(1200);
await tclick('Cash'); await sleep(1300);
mark('tablet', 'still_cash');
await tclick('Pay RM 35.00'); await sleep(2500);
mark('tablet', 'still_paid');
await sleep(1500);
mark('tablet', 'clip_end');

const tv = tab.video(), pv = ph.video();
await tctx.close(); await pctx.close();

// ── merchant portal ─────────────────────────────────────────────────────────
const mctx = await tbrowser.newContext({
  viewport: { width: 1440, height: 900 }, storageState: `${STATE}/portal-state.json`,
  recordVideo: { dir: `${RAW}/portal`, size: { width: 2880, height: 1800 } },
});
await mctx.addInitScript(overlay);
t0.portal = Date.now();
const pg = await mctx.newPage();
await pg.goto(`${PORTAL}/dashboard`, { waitUntil: 'networkidle', timeout: 120000 });
await pg.getByText('Revenue today', { exact: true }).waitFor({ timeout: 60000 });
await sleep(2500);
mark('portal', 'clip_start');
await sleep(3000);
mark('portal', 'still_dashboard');
await sleep(500);
await pg.getByText('Payments', { exact: true }).first().click();
await pg.getByText('Gross sales', { exact: true }).waitFor({ timeout: 60000 });
await sleep(3000);
mark('portal', 'still_transactions');
await sleep(500);
await pg.locator('text=/Haircut \\+ Beard/').first().click(); await sleep(2500);
mark('portal', 'still_sale');
await sleep(2000);
mark('portal', 'clip_end');
const mv = pg.video();
await mctx.close();
await tbrowser.close(); await pbrowser.close();

marks.tabletVideo = await tv.path(); marks.phoneVideo = await pv.path(); marks.portalVideo = await mv.path();
fs.writeFileSync(`${RAW}/marks.json`, JSON.stringify(marks, null, 2));
console.log('done');
