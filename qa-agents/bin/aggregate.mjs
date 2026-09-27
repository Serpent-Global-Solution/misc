// Groups raw oracle events from every persona in a run into deduplicated signals.
// Output: <run>/signals.json and <run>/coverage.json. Used by triage.mjs.
import fs from 'node:fs';
import path from 'node:path';

// Dev-server and third-party noise that is not a product bug.
const NOISE = [
  /favicon\.ico/, /__nextjs|_next\/webpack-hmr|hot-update|\[HMR\]|\[Fast Refresh\]/,
  /Download the React DevTools/, /googletagmanager|google-analytics|doubleclick/,
  /ERR_BLOCKED_BY_CLIENT/,
  // Local http:// dev setup, not product bugs.
  /Password fields present on an insecure/, /geolocation was blocked over insecure/, /Cookie “__cf_bm” has been rejected/,
];

function normalise(s = '') {
  return String(s)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\b\d{3,}\b/g, ':n')
    .replace(/\?.*$/, '')
    .slice(0, 200);
}

function route(url = '') {
  try { const u = new URL(url); return u.host + normalise(u.pathname); } catch { return normalise(url); }
}

export function aggregate(runRoot) {
  const signals = new Map();
  const coverage = {};
  for (const dirName of fs.readdirSync(runRoot)) {
    const dir = path.join(runRoot, dirName);
    const file = path.join(dir, 'oracle.jsonl');
    if (!fs.existsSync(file)) continue;
    const meta = fs.existsSync(path.join(dir, 'meta.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8')) : { id: dirName, app: '?' };
    for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
      if (!line) continue;
      let e; try { e = JSON.parse(line); } catch { continue; }
      if (e.kind === 'navigate') {
        (coverage[meta.app] ??= {})[e.route] = ((coverage[meta.app] ?? {})[e.route] || 0) + 1;
        continue;
      }
      if (e.kind === 'tab-open') continue;
      const text = [e.message, e.text, e.request, e.detail, e.reason].filter(Boolean).join(' ');
      if (NOISE.some(r => r.test(text))) continue;

      let key;
      if (e.kind === 'a11y') key = `a11y|${route(e.url)}|${e.violations.map(v => v.id).sort().join(',')}`;
      else if (e.request) key = `${e.kind}|${e.status || ''}|${normalise(e.request)}`;
      else if (e.kind.startsWith('console-') || e.kind === 'js-exception') key = `${e.kind}|${normalise(e.message || e.text || '')}`;
      else key = `${e.kind}|${normalise(e.message || e.text || e.detail || '')}|${route(e.url)}`;

      const s = signals.get(key) ?? { key, kind: e.kind, count: 0, personas: new Set(), routes: new Set(), first: e, shots: [] };
      s.count++;
      s.personas.add(dirName);
      s.routes.add(route(e.url));
      if (e.shot && s.shots.length < 3) s.shots.push(`${dirName}/evidence/${e.shot}`);
      signals.set(key, s);
    }
  }

  const rank = { 'js-exception': 0, 'framework-error-overlay': 0, 'http-5xx': 1, 'server-action-5xx': 1, 'error-message-shown': 2, 'blank-screen': 1, 'error-page': 1, 'stuck-loading': 2, 'request-failed': 2, 'raw-value-leak': 3, 'http-4xx': 4, 'console-error': 4, 'horizontal-overflow': 5, 'a11y': 6, 'dialog': 7, 'console-warning': 8 };
  const list = [...signals.values()]
    .map(s => ({ ...s, personas: [...s.personas], routes: [...s.routes] }))
    .sort((a, b) => (rank[a.kind] ?? 9) - (rank[b.kind] ?? 9) || b.personas.length - a.personas.length);

  fs.writeFileSync(path.join(runRoot, 'signals.json'), JSON.stringify(list, null, 2));
  fs.writeFileSync(path.join(runRoot, 'coverage.json'), JSON.stringify(coverage, null, 2));
  return { signals: list, coverage };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { signals } = aggregate(path.resolve(process.argv[2]));
  console.log(`${signals.length} distinct signals`);
}
