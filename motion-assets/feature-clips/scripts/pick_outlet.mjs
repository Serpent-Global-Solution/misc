// Select Shah Alam in the portal's outlet picker once and save that into the portal session state.
import { open, closeAll, URLS, HERE } from './lib.mjs';
const browsers = {};
const { h, close } = await open('portal', { browsers });
await h.goto(`${URLS.portal}/barbers`, 3000);
const sel = h.page.locator('select');
console.log('selects:', await sel.count());
if (await sel.count()) { await sel.first().selectOption({ label: 'Shah Alam' }).catch(e => console.log(e.message.split('\n')[0])); }
else { await h.tap('Setia Alam', { pause: 800 }); await h.tap('Shah Alam', { last: true, pause: 1500 }); }
await h.wait(2500);
console.log((await h.dump()).slice(330, 700));
await h.ctx.storageState({ path: `${HERE}/state/portal-state.json` });
await close(); await closeAll(browsers);
