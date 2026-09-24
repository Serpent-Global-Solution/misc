#!/usr/bin/env node

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';

const TIMEOUT = 60000;
const OUTPUT_DIR = resolve('../../motion-assets');

const projects = [
  {
    name: 'meikigo-admin',
    url: 'http://meiki-admin.test:3004',
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
    url: 'http://meiki-brand.test:3000',
    auth: { email: 'fakhrulsumarjono@gmail.com', password: 'Test1234' },
    routes: [
      { path: '/', name: 'home', auth: true },
      { path: '/brands', name: 'brands-list', auth: true },
    ],
  },
  {
    name: 'meikigo-customer-webapp',
    url: 'http://meiki-customer-webapp.test:3001',
    routes: [
      { path: '/', name: 'home' },
    ],
  },
];

async function captureScreens() {
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch();
  let screenIndex = 1;

  try {
    for (const project of projects) {
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
            console.log(`  [logging in]...`);
            await page.goto(`${project.url}/login`, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
            await new Promise(r => setTimeout(r, 2000));

            await page.fill('input[id="email"]', project.auth.email);
            await page.fill('input[id="password"]', project.auth.password);
            await page.click('button[type="submit"]');
            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: TIMEOUT });
            await new Promise(r => setTimeout(r, 3000));
          }

          const fullUrl = `${project.url}${route.path}`;
          console.log(`  ${route.path}...`);

          await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
          await new Promise(r => setTimeout(r, 2000));

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
  }
}

captureScreens().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
