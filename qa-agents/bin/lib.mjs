import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// adb and the emulator are not on the default PATH on this Mac.
const sdk = process.env.ANDROID_HOME || path.join(process.env.HOME || '', 'Library', 'Android', 'sdk');
process.env.ANDROID_HOME ??= sdk;
if (!String(process.env.PATH).includes('platform-tools')) process.env.PATH = `${path.join(sdk, 'platform-tools')}:${process.env.PATH}`;

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { args._.push(a); continue; }
    const [k, v] = a.slice(2).split('=');
    if (v !== undefined) args[k] = v;
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) args[k] = argv[++i];
    else args[k] = true;
  }
  return args;
}

// Minimal front-matter parser: "key: value" and "key: [a, b]" lines only.
export function readPersona(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing front matter`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith('[')) v = v.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean);
    else if (/^\d+$/.test(v)) v = Number(v);
    else v = v.replace(/^["']|["']$/g, '');
    meta[kv[1]] = v;
  }
  meta.id ??= path.basename(file, '.md');
  meta.body = m[2].trim();
  meta.file = file;
  return meta;
}

export function listPersonas(filter) {
  const out = [];
  const walk = dir => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md')) out.push(readPersona(p));
    }
  };
  walk(path.join(ROOT, 'personas'));
  if (!filter) return out;
  const parts = String(filter).split(',');
  return out.filter(p => parts.some(f => p.id === f || p.app === f || p.id.includes(f)));
}

export function loadTargets() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'targets.json'), 'utf8'));
}

export function stamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export async function pool(items, limit, fn) {
  const results = [];
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
