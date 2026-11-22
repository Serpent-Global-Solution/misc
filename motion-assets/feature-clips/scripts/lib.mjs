// Shared harness: open an app at device resolution, optionally record it, and give scenarios small helpers.
import { chromium } from '/Users/user/Private/meikigo-project/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';

export const HERE = path.dirname(new URL(import.meta.url).pathname);
export const ROOT = path.dirname(HERE);
export const ids = JSON.parse(fs.readFileSync(`${HERE}/ids.json`, 'utf8'));
export const URLS = {
  qr: `http://meiki-customer-webapp.test:3001/o/${ids.brand}/${ids.outlet}`,
  webapp: 'http://meiki-customer-webapp.test:3001',
  portal: `http://meiki-brand.test:3000/brands/${ids.brand}`,
  outlet: `http://meiki-brand.test:3000/brands/${ids.brand}/outlets/${ids.outlet}`,
  pos: 'http://localhost:3003',
};

export const APPS = {
  phone: { dsf: 3, ctx: { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true }, size: { width: 1080, height: 1920 }, state: 'aiman-state.json' },
  tablet: { dsf: 2, ctx: { viewport: { width: 1194, height: 834 } }, size: { width: 2388, height: 1668 }, state: 'pos-state.json' },
  cashier: { dsf: 2, ctx: { viewport: { width: 1194, height: 834 } }, size: { width: 2388, height: 1668 }, state: 'pos-cashier-state.json' },
  portal: { dsf: 2, ctx: { viewport: { width: 1440, height: 900 } }, size: { width: 2880, height: 1800 }, state: 'portal-state.json' },
};

// Recording overlay only: hide Next.js dev UI and the outlet hours chip, show a soft ripple where a tap lands.
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
  // Hidden in recordings: the all-day hours used while recording, and Part B items that must never appear on screen.
  const HIDE = [/^\s*e-invoice\s*$/i, /payroll/i, /payslip/i, /myinvoice/i, /^\s*accounting\s*$/i,
    /audit log/i, /hq dashboard/i, /scheduled reports/i, /^\s*advanced analytics\s*$/i];
  // Part B wording inside an otherwise true line: keep the true part.
  const REWRITE = [[/advanced analytics \+ tax export/i, 'Tax export']];
  const ownText = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
  const hideHours = () => document.querySelectorAll('body *').forEach(el => {
    if (el.style.display === 'none') return;
    for (const n of el.childNodes) if (n.nodeType === 3) for (const [r, t] of REWRITE) if (r.test(n.textContent)) n.textContent = n.textContent.replace(r, t);
    const own = ownText(el);
    if (own && HIDE.some(r => r.test(own))) { (el.closest('li,a,button') || el).style.display = 'none'; }
  });
  document.addEventListener('DOMContentLoaded', () => { add(); hideHours(); new MutationObserver(hideHours).observe(document.body, { subtree: true, childList: true, characterData: true }); });
  add();
  window.addEventListener('pointerdown', e => {
    const d = document.createElement('div'); d.className = 'rec-tap';
    d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 700);
  }, true);
};

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function open(app, { record = null, browsers = {} } = {}) {
  const a = APPS[app];
  const key = `dsf${a.dsf}`;
  browsers[key] ??= await chromium.launch({ args: [`--force-device-scale-factor=${a.dsf}`] });
  const opts = { ...a.ctx, storageState: `${HERE}/state/${a.state}` };
  if (record) opts.recordVideo = { dir: record, size: a.size };
  const ctx = await browsers[key].newContext(opts);
  await ctx.addInitScript(overlay);
  const page = await ctx.newPage();
  const t0 = Date.now();
  const marks = {};
  const h = {
    page, ctx, app,
    mark: name => { marks[name] = (Date.now() - t0) / 1000; },
    wait: sleep,
    text: (t, exact = true) => page.getByText(t, { exact }),
    tap: async (t, { pause = 1100, last = false, exact = true } = {}) => {
      const l = typeof t === 'string' ? page.getByText(t, { exact }) : t;
      await (last ? l.last() : l.first()).click(); await sleep(pause);
    },
    css: async (sel, pause = 1100) => { await page.locator(sel).first().click(); await sleep(pause); },
    fill: async (sel, v, pause = 500) => { await page.locator(sel).first().fill(v); await sleep(pause); },
    type: async (sel, v, pause = 500) => { await page.locator(sel).first().click(); await page.keyboard.type(v, { delay: 70 }); await sleep(pause); },
    see: async (t, timeout = 30000, exact = false) => page.getByText(t, { exact }).first().waitFor({ timeout }),
    goto: async (u, pause = 1500) => { await page.goto(u, { waitUntil: 'networkidle', timeout: 120000 }); await sleep(pause); },
    posReady: async () => {   // POS: load, handle the day's opening float, wait for the board
      await page.goto(URLS.pos, { waitUntil: 'load', timeout: 180000 }); await sleep(6000);
      if (await page.getByText('Start the day', { exact: true }).count()) {
        await page.locator("input[placeholder*='150']").first().fill('150'); await sleep(300);
        await page.getByText('Start the day', { exact: true }).last().click(); await sleep(2500);
      }
      await page.getByText(/^now serving$/i).first().waitFor({ timeout: 30000 }); await sleep(1500);
    },
    shahAlam: async () => {   // portal pages default to the newest outlet; switch the picker back to Shah Alam if needed
      let native = false;
      for (const sel of await page.locator('select').all()) {   // native pickers ("Setia Alam · No. 21")
        const idx = await sel.evaluate(el => { const i = [...el.options].findIndex(o => o.text.startsWith('Shah Alam')); return i < 0 ? -2 : (el.selectedIndex === i ? -1 : i); }).catch(() => -2);
        if (idx !== -2) native = true;
        if (idx >= 0) { await sel.selectOption({ index: idx }, { force: true }).catch(() => {}); await sleep(2500); }
      }
      if (native) return;
      if (await page.getByText('Setia Alam', { exact: true }).count()) {
        await page.getByText('Setia Alam', { exact: true }).first().click(); await sleep(700);
        await page.getByText('Shah Alam', { exact: true }).last().click(); await sleep(2500);
      }
    },
    dump: async () => (await page.innerText('body')).replace(/\n+/g, ' | '),
  };
  return { h, marks, close: async () => { const v = page.video(); await ctx.close(); return v ? await v.path() : null; } };
}

export async function closeAll(browsers) { for (const b of Object.values(browsers)) await b.close(); }
