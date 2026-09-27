// Passive bug oracle. Playwright MCP loads this for every tab (--init-page).
// The persona agent never sees this output; it is written to $QA_RUN_DIR/oracle.jsonl
// and read later by the triage step.
const fs = require('fs');
const path = require('path');

const runDir = () => process.env.QA_RUN_DIR || process.cwd();

const SPINNER_LIMIT_MS = 15000;
const axeSource = (() => {
  try { return require('axe-core').source; } catch { return null; }
})();

let shotCount = 0;
const axeDone = new Set();

function write(kind, data) {
  fs.appendFileSync(path.join(runDir(), 'oracle.jsonl'), JSON.stringify({ ts: new Date().toISOString(), kind, ...data }) + '\n');
}

function routeKey(url) {
  try {
    const u = new URL(url);
    return u.host + u.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id').replace(/\/\d+(?=\/|$)/g, '/:n');
  } catch { return url; }
}

// QA_ORACLE_LITE=1 skips screenshots and axe (Lightpanda cannot do either).
const lite = () => process.env.QA_ORACLE_LITE === '1';

async function evidence(page, label) {
  if (lite() || shotCount >= 60) return null;
  const shotDir = path.join(runDir(), 'evidence');
  fs.mkdirSync(shotDir, { recursive: true });
  const file = path.join(shotDir, `${String(++shotCount).padStart(3, '0')}-${label}.png`);
  try { await page.screenshot({ path: file, timeout: 5000 }); return path.basename(file); } catch { return null; }
}

// Runs inside the page. Returns symptoms a user would see but might not report.
function probe() {
  const out = [];
  const body = document.body;
  const text = body ? body.innerText.trim() : '';
  if (document.readyState === 'complete' && text.length === 0 && !document.querySelector('img,svg,canvas,video'))
    out.push({ kind: 'blank-screen' });
  // Next.js dev tools always mount <nextjs-portal>; only its error state counts.
  const devTools = document.querySelector('nextjs-portal')?.shadowRoot;
  const devError = devTools?.querySelector('[data-next-badge][data-error="true"], [data-nextjs-dialog]');
  if (devError || /Unhandled Runtime Error|Application error: a client-side exception/i.test(text))
    out.push({ kind: 'framework-error-overlay', detail: (devError ? devTools.textContent.replace(/[^\n]*\{[^}]*\}/g, '').trim().slice(-300) + ' | ' : '') + text.slice(0, 200) });
  const errMsg = text.match(/.{0,60}(An unexpected error occurred|Something went wrong|Failed to load|Could not load)[^\n]{0,80}/i);
  if (errMsg) out.push({ kind: 'error-message-shown', detail: errMsg[0] });
  if (/^(404|500|502|503)\b|This page could not be found|Internal Server Error/m.test(text))
    out.push({ kind: 'error-page', detail: text.slice(0, 200) });
  if (/\b(undefined|NaN|null|\[object Object\])\b/.test(text)) {
    const m = text.match(/.{0,40}\b(undefined|NaN|null|\[object Object\])\b.{0,40}/);
    out.push({ kind: 'raw-value-leak', detail: m ? m[0] : '' });
  }
  if (document.documentElement.scrollWidth > window.innerWidth + 2)
    out.push({ kind: 'horizontal-overflow', detail: `${document.documentElement.scrollWidth}px > ${window.innerWidth}px` });
  const busy = document.querySelectorAll('[aria-busy="true"],[role="progressbar"],.animate-spin,[class*="spinner" i],[class*="skeleton" i]');
  const visibleBusy = [...busy].filter(e => e.getClientRects().length > 0).length;
  out.push({ kind: '_busy', count: visibleBusy });
  return out;
}

module.exports.default = async ({ page }) => {
  write('tab-open', { url: page.url() });

  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning')
      write('console-' + msg.type(), { url: page.url(), text: msg.text().slice(0, 1000), location: msg.location()?.url });
  });

  page.on('pageerror', async err => {
    write('js-exception', { url: page.url(), message: String(err.message).slice(0, 1000), stack: String(err.stack || '').slice(0, 2000), shot: await evidence(page, 'js-exception') });
  });

  page.on('requestfailed', req => {
    const reason = req.failure()?.errorText || '';
    if (/ERR_ABORTED|cancelled|NS_BINDING_ABORTED/i.test(reason)) return;
    write('request-failed', { url: page.url(), request: `${req.method()} ${req.url()}`, reason });
  });

  page.on('response', async res => {
    const status = res.status();
    // Next.js server actions wrap backend failures in HTTP 200: look inside the payload.
    if (status < 400 && res.request().method() === 'POST' && res.request().headers()['next-action']) {
      let body = '';
      try { body = await res.text(); } catch {}
      const inner = body.match(/"status":\s*(5\d\d)/);
      if (inner) write('server-action-5xx', { url: page.url(), request: `POST ${res.url()} (server action)`, status: Number(inner[1]), body: body.slice(0, 800), shot: await evidence(page, 'server-action-5xx') });
      return;
    }
    if (status < 400) return;
    const req = res.request();
    let body = '';
    try { body = (await res.text()).slice(0, 800); } catch {}
    write(status >= 500 ? 'http-5xx' : 'http-4xx', {
      url: page.url(), request: `${req.method()} ${res.url()}`, status, body,
      shot: status >= 500 ? await evidence(page, 'http-' + status) : null,
    });
  });

  page.on('dialog', d => write('dialog', { url: page.url(), type: d.type(), message: d.message() }));

  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) write('navigate', { url: frame.url(), route: routeKey(frame.url()) });
  });

  page.on('load', async () => {
    const key = routeKey(page.url());
    if (lite() || !axeSource || axeDone.has(key) || !/^https?:/.test(page.url())) return;
    axeDone.add(key);
    try {
      await page.evaluate(axeSource);
      const res = await page.evaluate(async () => {
        const r = await window.axe.run(document, { resultTypes: ['violations'] });
        return r.violations.filter(v => v.impact === 'critical' || v.impact === 'serious')
          .map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, sample: v.nodes[0]?.target?.join(' ') }));
      });
      if (res.length) write('a11y', { url: page.url(), route: key, violations: res });
    } catch {}
  });

  // Symptom poller: blank screens, error overlays, stuck spinners, overflow.
  const seen = new Set();
  let busySince = null;
  const timer = setInterval(async () => {
    if (page.isClosed()) return clearInterval(timer);
    let found;
    try { found = await page.evaluate(probe); } catch { return; }
    for (const f of found) {
      if (f.kind === '_busy') {
        if (f.count > 0) {
          busySince ??= Date.now();
          if (Date.now() - busySince > SPINNER_LIMIT_MS && !seen.has('stuck:' + page.url())) {
            seen.add('stuck:' + page.url());
            write('stuck-loading', { url: page.url(), seconds: Math.round((Date.now() - busySince) / 1000), shot: await evidence(page, 'stuck') });
          }
        } else busySince = null;
        continue;
      }
      const sig = f.kind + ':' + routeKey(page.url());
      if (seen.has(sig)) continue;
      seen.add(sig);
      write(f.kind, { url: page.url(), detail: f.detail, shot: await evidence(page, f.kind) });
    }
  }, 3000);
  page.on('close', () => clearInterval(timer));
};
