#!/usr/bin/env node

import { chromium } from 'playwright';

async function test() {
  try {
    console.log('Launching browser...');
    const browser = await chromium.launch();

    console.log('Creating context...');
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    console.log('Creating page...');
    const page = await context.newPage();

    console.log('Navigating to login...');
    await page.goto('http://[::1]:3004/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Loaded!');

    await new Promise(r => setTimeout(r, 1000));

    console.log('Filling email...');
    await page.fill('input[id="email"]', 'haziq@meikigo.com');

    console.log('Filling password...');
    await page.fill('input[id="password"]', 'Test1234');

    console.log('Clicking submit...');
    await page.click('button[type="submit"]');

    console.log('Waiting for navigation...');
    await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('Navigation complete!');

    await new Promise(r => setTimeout(r, 2000));

    console.log('Taking screenshot...');
    await page.screenshot({ path: '/Users/user/Private/meikigo-project/motion-assets/test.png', fullPage: true });
    console.log('Screenshot saved!');

    await context.close();
    await browser.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

test();
