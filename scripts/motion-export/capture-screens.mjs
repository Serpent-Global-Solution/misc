#!/usr/bin/env node

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);
const TIMEOUT = 60000;
const OUTPUT_DIR = resolve('../../motion-assets');

const projects = [
  {
    name: 'meikigo-admin',
    port: 3004,
    auth: { email: 'haziq@meikigo.com', password: 'Test1234' },
    routes: [
      { path: '/', name: 'home', auth: true },
      { path: '/chip/disputes', name: 'chip-disputes', auth: true },
      { path: '/chip/settlements', name: 'chip-settlements', auth: true },
      { path: '/settings', name: 'settings', auth: true },
      { path: '/settings/general', name: 'settings-general', auth: true },
      { path: '/support/open', name: 'support-open', auth: true },
    ],
  },
  {
    name: 'meikigo-brand',
    port: 3000,
    auth: { email: 'fakhrulsumarjono@gmail.com', password: 'Test1234' },
    routes: [
      { path: '/', name: 'home', auth: true },
      { path: '/brands', name: 'brands-list', auth: true },
    ],
  },
  {
    name: 'meikigo-customer-webapp',
    port: 3001,
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
    // Check if servers are already running (using .test hostnames)
    console.log('Checking if servers are already running...');
    const hostMap = { 3004: 'meiki-admin', 3000: 'meiki-brand', 3001: 'meiki-customer-webapp' };
    for (const project of projects) {
      const hostname = hostMap[project.port] || 'localhost';
      try {
        const testUrl = `http://${hostname}.test:${project.port}`;
        const response = await fetch(testUrl, { method: 'HEAD', timeout: 2000 });
        console.log(`✓ ${project.name} already running on ${hostname}.test:${project.port}`);
      } catch {
        console.log(`  Starting ${project.name} on port ${project.port}...`);
        const proc = await startDevServer(project);
        processes.push(proc);
        await new Promise(r => setTimeout(r, 500));
      }
    }

    // Wait for all servers using .test hostnames
    console.log('Waiting for servers to be ready...');
    for (const project of projects) {
      const hostname = hostMap[project.port] || 'localhost';
      await waitForServer(project.port);
      console.log(`✓ ${project.name} ready on ${hostname}.test:${project.port}`);
    }

    // Capture screenshots
    for (const project of projects) {
      // Map port to hostname for .test domains
      const hostMap = { 3004: 'meiki-admin', 3000: 'meiki-brand', 3001: 'meiki-customer-webapp' };
      const hostname = hostMap[project.port] || `localhost`;
      const url = `http://${hostname}.test:${project.port}`;
      console.log(`\nCapturing ${project.name}...`);

      for (const route of project.routes) {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          deviceScaleFactor: 2,
        });
        const page = await context.newPage();

        try {
          // Login if needed
          if (route.auth && project.auth) {
            console.log(`  [logging in to ${project.name}]...`);
            await page.goto(`${url}/login`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
            await new Promise(r => setTimeout(r, 1000));

            // Try multiple selector options for email and password fields
            await page.fill('input[id="email"]', project.auth.email).catch(() =>
              page.fill('input[type="email"]', project.auth.email).catch(() =>
                page.fill('input.merchant-input', project.auth.email)
              )
            );
            await new Promise(r => setTimeout(r, 500));

            const passwordInputs = await page.$$('input[type="password"]');
            if (passwordInputs.length > 0) {
              await page.fill('input[type="password"]', project.auth.password);
            } else {
              await page.fill('input[id="password"]', project.auth.password);
            }

            await new Promise(r => setTimeout(r, 500));
            await page.click('button[type="submit"]');
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: TIMEOUT });
            await new Promise(r => setTimeout(r, 3000));
          }

          const fullUrl = `${url}${route.path}`;
          console.log(`  ${route.path}...`);

          await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: TIMEOUT });
          await page.waitForLoadState('domcontentloaded');
          await new Promise(r => setTimeout(r, 1500)); // Wait for animations

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
