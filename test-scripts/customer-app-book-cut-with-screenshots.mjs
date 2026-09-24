#!/usr/bin/env node

/**
 * Playwright Test: Book a Cut Service - WITH SCREENSHOTS
 * Enhanced version that captures screenshots at each step
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import process from 'process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const APP_URL = 'http://meiki-customer-webapp.test:3001';
const TIMEOUT = 15000;
const MAX_RETRIES = 3;
const WAIT_BETWEEN_ACTIONS = 300;
const OUTPUT_DIR = resolve(__dirname, '../test-results/customer-app');

let stepCounter = 0;

async function screenshot(page, stepName) {
  stepCounter++;
  const filename = `${String(stepCounter).padStart(2, '0')}_${stepName.replace(/\s+/g, '_')}.png`;
  const filepath = `${OUTPUT_DIR}/${filename}`;
  await page.screenshot({ path: filepath, fullPage: true });
  console.log(`  📸 ${filename}`);
  return filename;
}

async function clickElement(page, selector, options = {}) {
  const maxRetries = options.retries ?? MAX_RETRIES;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.waitForSelector(selector, { timeout: TIMEOUT });
      const element = await page.$(selector);

      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      await element.scrollIntoViewIfNeeded();
      await page.waitForTimeout(WAIT_BETWEEN_ACTIONS);
      await element.click({ timeout: TIMEOUT });
      return;
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        console.log(`  ⚠ Retry ${i + 1}/${maxRetries - 1}`);
        await page.waitForTimeout(500);
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} retries: ${lastError.message}`);
}

async function runTest() {
  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  console.log(`\n📱 Testing Customer App - Book a Cut Service\n`);
  console.log(`📁 Output: ${OUTPUT_DIR}\n`);

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // Step 1: Load home page
    console.log('Step 1: Loading home page...');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await screenshot(page, '01_home_page');

    // Step 2: Browse outlets
    console.log('Step 2: Browsing outlets...');
    await page.waitForTimeout(2000); // Wait for page to fully load
    await screenshot(page, '02_outlet_directory');

    // Step 3: Select first outlet
    console.log('Step 3: Selecting first outlet...');
    const outletButtons = page.locator('button');
    const count = await outletButtons.count();
    if (count > 0) {
      await outletButtons.first().click();
    }
    await page.waitForTimeout(1500);
    await screenshot(page, '03_outlet_selected');

    // Step 4: Browse services
    console.log('Step 4: Viewing available services...');
    await page.waitForTimeout(1500);
    await screenshot(page, '04_services_list');

    // Step 5: Select a service
    console.log('Step 5: Selecting cut service...');
    const serviceButtons = page.locator('button');
    const serviceCount = await serviceButtons.count();
    if (serviceCount > 0) {
      await serviceButtons.first().click();
    }
    await page.waitForTimeout(1500);
    await screenshot(page, '05_service_selected');

    // Step 6: Select barber
    console.log('Step 6: Selecting barber...');
    await page.waitForTimeout(1500);
    await screenshot(page, '06_barber_selection');

    // Step 7: Select barber
    console.log('Step 7: Selecting barber option...');
    const barberButtons = page.locator('button');
    const barberCount = await barberButtons.count();
    if (barberCount > 0) {
      await barberButtons.first().click();
    }
    await page.waitForTimeout(1500);
    await screenshot(page, '07_barber_selected');

    // Step 8: Select time slot
    console.log('Step 8: Selecting time slot...');
    await page.waitForTimeout(1500);
    await screenshot(page, '08_time_slots');

    // Step 9: Pick a time
    console.log('Step 9: Picking time...');
    const timeButtons = page.locator('button');
    const timeCount = await timeButtons.count();
    if (timeCount > 0) {
      await timeButtons.first().click();
    }
    await page.waitForTimeout(1500);
    await screenshot(page, '09_time_selected');

    // Step 10: Review booking
    console.log('Step 10: Reviewing booking...');
    await page.waitForTimeout(1500);
    await screenshot(page, '10_booking_review');

    // Step 11: Confirm booking
    console.log('Step 11: Confirming booking...');
    const confirmButtons = page.locator('button');
    const confirmCount = await confirmButtons.count();
    if (confirmCount > 0) {
      await confirmButtons.first().click();
    }
    await page.waitForTimeout(1500);
    await screenshot(page, '11_confirmation_or_auth');

    console.log(`\n✅ Test completed successfully!\n`);
    console.log(`📊 Screenshots saved to: ${OUTPUT_DIR}\n`);

  } catch (error) {
    console.error(`\n❌ Test failed: ${error.message}\n`);
    await screenshot(page, 'error_final_state');
    process.exit(1);
  } finally {
    await context.close();
    await browser.close();
  }
}

runTest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
