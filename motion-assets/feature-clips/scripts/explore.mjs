// node explore.mjs <app> <url|-> <shot-name> [step ...]
// Steps: "text" tap exact text · "~text" tap partial text · "css:<sel>" · "fill:<sel>|<value>" · "goto:<url>" · "wait:<ms>"
// Prints the page text afterwards (trimmed) and saves a screenshot to /tmp-style scratch path given by SHOTS env or scripts/shots/.
import { open, closeAll, URLS, HERE } from './lib.mjs';
import fs from 'fs';
const [app, url, name, ...steps] = process.argv.slice(2);
const shots = process.env.SHOTS || `${HERE}/shots`; fs.mkdirSync(shots, { recursive: true });
const browsers = {};
const { h, close } = await open(app, { browsers });
if ((app === 'tablet' || app === 'cashier') && (url === '-' || url === 'pos')) await h.posReady(); else await h.goto(url === '-' ? URLS.qr : url, 3000);
for (const s of steps) {
  if (s.startsWith('fill:')) { const [sel, v] = s.slice(5).split('|'); await h.fill(sel, v); }
  else if (s.startsWith('css:')) await h.css(s.slice(4), 1800);
  else if (s.startsWith('goto:')) await h.goto(s.slice(5), 3000);
  else if (s === 'shah') await h.shahAlam();
  else if (s.startsWith('dom:')) { await h.page.evaluate(t => [...document.querySelectorAll('div,button,[role=button]')].reverse().find(e => e.textContent?.trim() === t)?.click(), s.slice(4)); await h.wait(1800); }
  else if (s.startsWith('wait:')) await h.wait(+s.slice(5));
  else if (s.startsWith('~')) await h.tap(s.slice(1), { exact: false, pause: 1800 });
  else if (s.startsWith('last:')) await h.tap(s.slice(5), { last: true, pause: 1800 });
  else await h.tap(s, { pause: 1800 });
}
await h.page.screenshot({ path: `${shots}/${name}.png` });
console.log('url:', h.page.url());
if (process.env.CTRL) console.log((await h.page.$$eval('button, input, select, [role=switch], [role=combobox], [role=tab], [role=dialog] button, [role=dialog] input, [role=dialog] select, [role=dialog] [role=switch], [role=dialog] [role=combobox]', els => els.filter(e => e.offsetParent !== null).map(e => `${e.tagName.toLowerCase()}${e.getAttribute('role') ? '['+e.getAttribute('role')+']' : ''}${e.type ? '('+e.type+')' : ''}:${(e.innerText || e.getAttribute('aria-label') || e.getAttribute('placeholder') || e.getAttribute('name') || e.value || '').replace(/\s+/g,' ').trim().slice(0,40)}`))).join(' ; '));
const txt = await h.dump();
console.log(txt.slice(+(process.env.FROM || 0), +(process.env.FROM || 0) + +(process.env.LEN || 1400)));
await close(); await closeAll(browsers);
