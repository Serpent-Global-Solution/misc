// node run.mjs <clip-name> [...]   — records each scenario from scenarios.mjs, then encodes it (encode.py).
// A scenario calls h.mark('start') / h.mark('still') / h.mark('end'); everything outside start..end is trimmed.
import { open, closeAll, ROOT, HERE } from './lib.mjs';
import { scenarios } from './scenarios.mjs';
import { execFileSync } from 'child_process';
import fs from 'fs';

const browsers = {};
for (const name of process.argv.slice(2)) {
  const sc = scenarios[name];
  if (!sc) { console.log(`no scenario ${name}`); continue; }
  if (sc.setup) execFileSync('python3', ['-c', `from api import *\nimport json\nids=json.load(open('ids.json'))\nt=login('demo-test@gmail.com')\n${sc.setup}`], { cwd: HERE, stdio: 'inherit' });
  const app = sc.app || name.split('-').pop();
  const tmp = `${ROOT}/raw/tmp-${name}`;
  fs.rmSync(tmp, { recursive: true, force: true });
  const { h, marks, close } = await open(app, { record: tmp, browsers });
  try {
    await sc.run(h);
  } catch (e) {
    console.log(`FAILED ${name}: ${e.message.split('\n')[0]}`);
    await h.page.screenshot({ path: `${ROOT}/raw/FAILED-${name}.png` }).catch(() => {});
    await close(); continue;
  }
  const video = await close();
  fs.renameSync(video, `${ROOT}/raw/${name}.webm`); fs.rmSync(tmp, { recursive: true, force: true });
  fs.writeFileSync(`${ROOT}/raw/${name}.json`, JSON.stringify(marks));
  execFileSync('python3', [`${HERE}/encode.py`, name], { stdio: 'inherit' });
}
await closeAll(browsers);
