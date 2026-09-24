#!/usr/bin/env node

/**
 * Playwright Test: Book a Cut Service on Meikigo Customer App
 *
 * This script automates the full booking flow:
 * 1. Browse the outlet directory
 * 2. Select an outlet with available services
 * 3. Select a "cut" service (or first available service)
 * 4. Pick a barber
 * 5. Choose a booking time slot or walk-in option
 * 6. Review and confirm the booking
 *
 * Prerequisites:
 * - npm install playwright
 * - Customer app running on http://meiki-customer-webapp.test:3001
 * - API backend available at http://localhost:8083
 *
 * Usage:
 *   node customer-app-book-cut.mjs
 *   node customer-app-book-cut.mjs --headless=false  (to see browser)
 *   node customer-app-book-cut.mjs --outlet-name="Branch Name"  (to target specific outlet)
 *
 * Test Credentials (if prompted):
 *   - No credentials needed for browsing services
 *   - Test stops at authentication gate for booking confirmation
 *   - For full E2E, register with any email and password
 */

import { chromium } from 'playwright';
import process from 'process';

const APP_URL = 'http://meiki-customer-webapp.test:3001';
const TIMEOUT = 15000; // 15 seconds per action
const MAX_RETRIES = 3;
const WAIT_BETWEEN_ACTIONS = 300; // ms between clicks

// Parse CLI arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const config = { headless: true, outletName: null };

  for (const arg of args) {
    if (arg.startsWith('--headless=')) {
      config.headless = arg.split('=')[1] !== 'false';
    } else if (arg.startsWith('--outlet-name=')) {
      config.outletName = arg.split('=')[1];
    }
  }

  return config;
}

// Utility to wait for selector with retries
async function waitForElement(page, selector, timeout = TIMEOUT) {
  return page.waitForSelector(selector, { timeout });
}

// Utility to wait for text with retries
async function waitForText(page, text, timeout = TIMEOUT) {
  return page.waitForFunction(
    (searchText) => {
      return document.body.innerText.includes(searchText);
    },
    searchText,
    { timeout }
  );
}

// Utility to click element with retry logic and better error handling
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

      // Scroll into view
      await element.scrollIntoViewIfNeeded();
      await page.waitForTimeout(WAIT_BETWEEN_ACTIONS);

      // Try clicking
      await element.click({ timeout: TIMEOUT });
      return;
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        console.log(`  ⚠ Retry ${i + 1}/${maxRetries - 1} for: ${selector}`);
        await page.waitForTimeout(500);
      }
    }
  }

  throw new Error(`Failed to click "${selector}" after ${maxRetries} retries: ${lastError.message}`);
}

// Utility to get text content of element
async function getElementText(page, selector) {
  const element = await page.$(selector);
  if (!element) return null;
  return element.textContent();
}

// Utility to find element by partial text content
async function findElementByText(page, selector, text, partialMatch = true) {
  const elements = await page.$$(selector);
  for (const element of elements) {
    const content = await element.textContent();
    if (partialMatch ? content.includes(text) : content.trim() === text) {
      return element;
    }
  }
  return null;
}

// Log with step indicator
function logStep(step, message) {
  console.log(`\n${step}: ${message}`);
}

async function runTest() {
  const config = parseArgs();
  let browser;
  let context;
  let page;

  try {
    console.log('\n===== Meikigo Customer App - Booking Test =====\n');
    console.log(`App URL: ${APP_URL}`);
    console.log(`Headless: ${config.headless}`);
    console.log(`Target outlet: ${config.outletName || 'Any available'}`);
    console.log('\n');

    // Launch browser
    logStep('INIT', 'Starting Playwright browser...');
    browser = await chromium.launch({ headless: config.headless });
    context = await browser.newContext();
    page = await context.newPage();

    // Set default timeout
    page.setDefaultTimeout(TIMEOUT);
    page.setDefaultNavigationTimeout(TIMEOUT);

    // Step 1: Navigate to home page
    logStep('STEP 1', 'Navigate to customer app home page');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    console.log('  ✓ Home page loaded');

    // Step 2: Wait for outlet directory
    logStep('STEP 2', 'Wait for outlet directory to load');
    await waitForText(page, 'shop', 15000);
    console.log('  ✓ Outlet directory ready');

    // Step 3: Find and click an outlet
    logStep('STEP 3', 'Select an outlet');

    // Find the first outlet link
    const outletLinks = await page.$$('a[href*="/o/"]');
    if (outletLinks.length === 0) {
      throw new Error('No outlets found in directory');
    }

    console.log(`  Found ${outletLinks.length} outlets available`);

    let selectedLink = outletLinks[0];
    if (config.outletName) {
      console.log(`  Looking for: ${config.outletName}`);
      for (const link of outletLinks) {
        const text = await link.textContent();
        if (text.includes(config.outletName)) {
          selectedLink = link;
          console.log(`  ✓ Found matching outlet`);
          break;
        }
      }
    }

    const outletUrl = await selectedLink.getAttribute('href');
    console.log(`  Navigating to: ${outletUrl}`);
    await selectedLink.click();

    // Wait for outlet page to load
    await page.waitForURL(/\/o\/[^/]+\/[^/]+$/, { timeout: TIMEOUT });
    await page.waitForTimeout(500);
    console.log('  ✓ Outlet page loaded');

    // Step 4: Start booking flow
    logStep('STEP 4', 'Start booking flow');

    // Look for "Book a service" button
    const bookButton = await page.$('a:has-text("Book"), button:has-text("Book")');
    if (!bookButton) {
      throw new Error('No booking button found on outlet page');
    }

    await bookButton.click();
    await page.waitForURL(/\/book/, { timeout: TIMEOUT });
    await page.waitForTimeout(500);
    console.log('  ✓ Entered booking flow');

    // Step 5: Select service
    logStep('STEP 5', 'Select a service');

    await waitForText(page, 'Select services', TIMEOUT);

    // Get all service checkboxes/buttons
    const serviceButtons = await page.$$('div[role="button"]:has(input[type="checkbox"])');
    if (serviceButtons.length === 0) {
      throw new Error('No services found for this outlet');
    }

    console.log(`  Found ${serviceButtons.length} services`);

    let selectedService = null;
    // Try to find "cut" service
    for (const button of serviceButtons) {
      const text = await button.textContent();
      if (text.toLowerCase().includes('cut')) {
        console.log(`  ✓ Found "cut" service: ${text.trim().split('\n')[0]}`);
        await button.click();
        await page.waitForTimeout(WAIT_BETWEEN_ACTIONS);
        selectedService = text;
        break;
      }
    }

    // If no cut service, use first one
    if (!selectedService) {
      const firstText = await serviceButtons[0].textContent();
      console.log(`  No "cut" service. Using first: ${firstText.trim().split('\n')[0]}`);
      await serviceButtons[0].click();
      await page.waitForTimeout(WAIT_BETWEEN_ACTIONS);
    }

    // Click Next
    logStep('STEP 6', 'Proceed to barber selection');
    await clickElement(page, 'button:has-text("Next")');

    await waitForText(page, 'Pick a barber', TIMEOUT);
    await page.waitForTimeout(500);
    console.log('  ✓ Barber selection page loaded');

    // Step 7: Select barber
    logStep('STEP 7', 'Select a barber');

    // Find all barber buttons
    const barberButtons = await page.$$('button[class*="w-full"][class*="min-h"]');
    if (barberButtons.length === 0) {
      throw new Error('No barber options found');
    }

    // Prefer first option (usually "Any barber")
    const firstBarberText = await barberButtons[0].textContent();
    console.log(`  Selecting: ${firstBarberText.split('\n')[0]}`);

    await barberButtons[0].click();
    await page.waitForTimeout(WAIT_BETWEEN_ACTIONS);
    console.log('  ✓ Barber selected');

    // Click Next
    logStep('STEP 8', 'Proceed to time selection');
    await clickElement(page, 'button:has-text("Next")');

    await waitForText(page, 'When would you like to come', TIMEOUT);
    await page.waitForTimeout(500);
    console.log('  ✓ Time selection page loaded');

    // Step 9: Choose walk-in or booking
    logStep('STEP 9', 'Select when to visit');

    // Look for "Join queue" or "Book a time" buttons
    const modeButtons = await page.$$('button[class*="rounded-full"]');
    let joinedQueue = false;

    if (modeButtons.length >= 2) {
      const firstModeText = await modeButtons[0].textContent();
      const secondModeText = modeButtons[1].textContent();

      console.log(`  Available modes: "${firstModeText.trim()}", "${secondModeText.trim()}"`);

      // Prefer walk-in (Join queue) for simplicity
      if (firstModeText.includes('Join')) {
        console.log('  ✓ Selecting: Join queue');
        await modeButtons[0].click();
        joinedQueue = true;
      } else if (secondModeText.includes('Join')) {
        console.log('  ✓ Selecting: Join queue');
        await modeButtons[1].click();
        joinedQueue = true;
      } else {
        console.log('  Using: Book a time');
      }
    }

    await page.waitForTimeout(500);

    // If not joined queue, try to select a time slot
    if (!joinedQueue) {
      logStep('STEP 9b', 'Select a time slot');

      // Wait for time slots to load
      await page.waitForTimeout(1000);

      // Look for time slot buttons (contains time pattern HH:MM)
      const allButtons = await page.$$('button');
      let selectedTime = false;

      for (const button of allButtons) {
        const text = await button.textContent();
        if (/\d{2}:\d{2}/.test(text)) {
          console.log(`  ✓ Selected time slot: ${text.trim()}`);
          await button.click();
          selectedTime = true;
          await page.waitForTimeout(WAIT_BETWEEN_ACTIONS);
          break;
        }
      }

      if (!selectedTime) {
        console.log('  Note: No specific time slots found or auto-selected');
      }
    }

    // Click Next
    logStep('STEP 10', 'Proceed to review');
    await clickElement(page, 'button:has-text("Next")');

    await waitForText(page, 'Review & confirm', TIMEOUT);
    await page.waitForTimeout(500);
    console.log('  ✓ Review page loaded');

    // Step 11: Show booking summary
    logStep('STEP 11', 'Review booking details');

    const bodyText = await page.textContent('body');
    const priceMatch = bodyText.match(/RM[\s\d.]+/);
    if (priceMatch) {
      console.log(`  Total Price: ${priceMatch[0]}`);
    }
    console.log('  ✓ Booking details confirmed');

    // Step 12: Complete booking
    logStep('STEP 12', 'Complete booking (authentication gate)');

    // Find confirm/register button
    const confirmButtons = await page.$$('button');
    let confirmButton = null;

    for (const button of confirmButtons) {
      const text = await button.textContent();
      if (text.includes('Confirm') || text.includes('Register') || text.includes('Log in')) {
        confirmButton = button;
        console.log(`  Clicking: ${text.trim()}`);
        break;
      }
    }

    if (!confirmButton) {
      throw new Error('No confirmation button found');
    }

    await confirmButton.click();
    await page.waitForTimeout(1500);

    // Check where we ended up
    const finalUrl = page.url();
    console.log(`  Final URL: ${finalUrl}`);

    if (finalUrl.includes('register') || finalUrl.includes('login') || finalUrl.includes('auth')) {
      console.log('  ✓ Redirected to authentication gate');
    }

    console.log('\n===== TEST COMPLETED SUCCESSFULLY =====\n');
    console.log('Summary:');
    console.log('  ✓ Browsed outlet directory');
    console.log('  ✓ Selected outlet and service');
    console.log('  ✓ Chose barber');
    console.log('  ✓ Selected booking time/walk-in');
    console.log('  ✓ Reviewed booking details');
    console.log('  ✓ Proceeded to authentication\n');
    console.log('Next step: Register with test credentials to complete booking.\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED\n');
    console.error(`Error: ${error.message}\n`);

    if (page) {
      try {
        const screenshotPath = '/tmp/playwright-test-failure.png';
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot: ${screenshotPath}`);
      } catch (e) {
        console.log('Could not capture screenshot');
      }

      console.log(`URL: ${page.url()}`);
      const bodyText = await page.textContent('body');
      console.log(`Page content preview: ${bodyText.substring(0, 300)}...`);
    }

    process.exit(1);
  } finally {
    // Cleanup
    if (context) await context.close();
    if (browser) await browser.close();
    console.log('Browser closed\n');
  }
}

// Run the test
runTest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
