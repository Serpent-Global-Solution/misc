// Passive oracle for the native POS app. Streams device error logs and detects crashes
// while a persona runs, writing to <runDir>/oracle.jsonl like the browser oracle.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';

const IOS_NOISE = /nw_|CFNetwork|BackBoard|UIKitCore.*snapshot|RTIInputSystemClient|Unable to simultaneously satisfy|com\.apple\./;

export function startNativeOracle({ platform, device, appId, runDir }) {
  const file = path.join(runDir, 'oracle.jsonl');
  const write = (kind, data) => fs.appendFileSync(file, JSON.stringify({ ts: new Date().toISOString(), kind, url: `native:${platform}`, ...data }) + '\n');
  const started = Date.now();
  let child;

  if (platform === 'ios') {
    const proc = appId === 'com.meikigo.pos' ? 'MeikigoPOS' : appId;
    child = spawn('xcrun', ['simctl', 'spawn', device, 'log', 'stream', '--style', 'ndjson', '--level', 'default',
      '--predicate', `process == "${proc}" AND (messageType == error OR messageType == fault OR subsystem == "com.facebook.react.log")`]);
    let buf = '';
    child.stdout.on('data', d => {
      buf += d;
      const lines = buf.split('\n'); buf = lines.pop();
      for (const l of lines) {
        let e; try { e = JSON.parse(l); } catch { continue; }
        const msg = e.eventMessage || '';
        if (!msg || IOS_NOISE.test(msg)) continue;
        const isJs = e.subsystem === 'com.facebook.react.log';
        if (isJs && !/error|exception|warn|unhandled|failed/i.test(msg)) continue;
        write(isJs ? 'native-js-error' : 'native-log-error', { message: msg.slice(0, 1000) });
      }
    });
  } else {
    execFileSync('adb', ['-s', device, 'logcat', '-c']);
    child = spawn('adb', ['-s', device, 'logcat', '-v', 'brief', '*:E', 'ReactNativeJS:W', 'AndroidRuntime:E']);
    let buf = '';
    child.stdout.on('data', d => {
      buf += d;
      const lines = buf.split('\n'); buf = lines.pop();
      for (const l of lines) {
        if (/FATAL EXCEPTION|ANR in/.test(l)) write('native-crash', { message: l.slice(0, 1000) });
        else if (/ReactNativeJS/.test(l)) write('native-js-error', { message: l.slice(0, 1000) });
        else if (l.includes(appId)) write('native-log-error', { message: l.slice(0, 1000) });
      }
    });
  }

  return function stop() {
    child?.kill();
    if (platform === 'ios') {
      // Simulator app crashes land in the host's DiagnosticReports.
      const dir = path.join(os.homedir(), 'Library', 'Logs', 'DiagnosticReports');
      for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
        if (!/MeikigoPOS/i.test(f)) continue;
        const full = path.join(dir, f);
        if (fs.statSync(full).mtimeMs < started) continue;
        write('native-crash', { message: fs.readFileSync(full, 'utf8').slice(0, 1500), report: full });
      }
    }
  };
}
