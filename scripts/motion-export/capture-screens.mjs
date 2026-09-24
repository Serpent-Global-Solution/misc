#!/usr/bin/env node

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);
const TIMEOUT = 30000;
const OUTPUT_DIR = resolve('../../motion-assets');

const projects = [
  {
    name: 'meikigo-admin',
    port: 3000,
    routes: [
      { path: '/', name: 'home' },
      { path: '/login', name: 'login' },
      { path: '/chip/disputes', name: 'chip-disputes' },
      { path: '/chip/settlements', name: 'chip-settlements' },
      { path: '/settings', name: 'settings' },
      { path: '/settings/general', name: 'settings-general' },
      { path: '/support/open', name: 'support-open' },
    ],
  },
  {
    name: 'meikigo-brand',
    port: 3003,
    routes: [
      { path: '/', name: 'home' },
      { path: '/login', name: 'login' },
      { path: '/brands', name: 'brands-list' },
      { path: '/onboarding/brand', name: 'onboarding-brand' },
    ],
  },
  {
    name: 'meikigo-customer-webapp',
    port: 3001,
    routes: [
      { path: '/', name: 'home' },
      { path: '/login', name: 'login' },
      { path: '/register', name: 'register' },
      { path: '/recover', name: 'recover' },
    ],
  },
  {
    name: 'meikigo-pos-native',
    port: 19006,
    isExpo: true,
    routes: [
      { path: '/', name: 'home' },
    ],
  },
];

async function waitForServer(port, timeout = TIMEOUT) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`http://localhost:${port}`, { method: 'HEAD' });
      if (response.ok || response.status === 404) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server on port ${port} did not start within ${timeout}ms`);
}

async function startDevServer(project) {
  const cwd = resolve('../../', project.name);
  console.log(`Starting ${project.name} on port ${project.port}...`);

  return new Promise((resolve, reject) => {
    const script = project.isExpo ? 'web' : 'dev';
    const env = { ...process.env, PORT: project.port.toString() };
    const proc = spawn('npm', ['run', script], {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let ready = false;
    const onData = () => {
      if (!ready) {
        ready = true;
        resolve(proc);
      }
    };

    proc.stdout?.on('data', onData);
    proc.stderr?.on('data', onData);

    setTimeout(() => {
      if (!ready) resolve(proc);
    }, 2000);

    proc.on('error', reject);
  });
}

async function captureScreens() {
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();
  const processes = [];
  let screenIndex = 1;

  try {
    // Start all servers
    for (const project of projects) {
      const proc = await startDevServer(project);
      processes.push(proc);
      await new Promise(r => setTimeout(r, 500));
    }

    // Wait for all servers
    console.log('Waiting for servers to be ready...');
    for (const project of projects) {
      await waitForServer(project.port);
      console.log(`✓ ${project.name} ready on port ${project.port}`);
    }

    // Capture screenshots
    for (const project of projects) {
      const url = `http://localhost:${project.port}`;
      console.log(`\nCapturing ${project.name}...`);

      for (const route of project.routes) {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          deviceScaleFactor: 2,
        });
        const page = await context.newPage();

        try {
          const fullUrl = `${url}${route.path}`;
          console.log(`  ${route.path}...`);

          await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: TIMEOUT });
          await page.waitForLoadState('domcontentloaded');
          await new Promise(r => setTimeout(r, 1000)); // Wait for animations

          const filename = `${String(screenIndex).padStart(2, '0')}_${project.name.replace(/-/g, '')}_${route.name}.png`;
          await page.screenshot({ path: `${OUTPUT_DIR}/${filename}`, fullPage: true });
          console.log(`    → ${filename}`);
          screenIndex++;
        } catch (err) {
          console.error(`    ✗ Error: ${err.message}`);
        } finally {
          await context.close();
        }
      }
    }

    console.log(`\n✓ Captured ${screenIndex - 1} screenshots to ${OUTPUT_DIR}`);
  } finally {
    await browser.close();
    processes.forEach(proc => proc.kill());
  }
}

captureScreens().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
