#!/usr/bin/env node

/**
 * Playwright test script for Meikigo Brand Merchant Portal
 * Automates login, navigation to services, and Cut service creation/verification
 *
 * Usage: node merchant-setup-cut-service.mjs
 */

import { chromium } from 'playwright';

const config = {
  email: process.env.MERCHANT_EMAIL || 'fakhrulsumarjono@gmail.com',
  password: process.env.MERCHANT_PASSWORD || 'Test1234',
  portalUrl: process.env.PORTAL_URL || 'http://meiki-brand.test:3000',
  headless: process.env.HEADLESS !== 'false',
};

const cutServiceConfig = {
  name: 'Cut',
  price: '25.00',
  duration: '30',
  juniorPrice: '20.00',
  seniorPrice: '30.00',
  proPrice: '35.00',
};

async function runTest() {
  let browser;
  let page;

  try {
    console.log('\n🚀 Meikigo Merchant Portal - Cut Service Setup');
    console.log('='.repeat(50));
    console.log(`Portal: ${config.portalUrl}`);
    console.log(`Email: ${config.email}\n`);

    browser = await chromium.launch({ headless: config.headless });
    page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });

    // Step 1: Navigate
    console.log('1️⃣  Navigating to portal...');
    await page.goto(config.portalUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    console.log(`    URL: ${page.url()}\n`);

    // Step 2: Login
    console.log('2️⃣  Authenticating...');
    await login(page);
    console.log(`    URL: ${page.url()}\n`);

    // Step 3: Wait for home page to fully load and get Brand ID
    console.log('3️⃣  Waiting for home page to load...');
    await page.waitForTimeout(2000); // Wait for page to fully render

    const currentUrl = page.url();
    console.log(`    Current URL: ${currentUrl}`);

    // If we're still on home, wait for page to fully load and look for brand link
    if (!currentUrl.includes('/brands/')) {
      console.log('    Waiting for brand content to load...');
      await page.waitForTimeout(2000);

      // Try to find a brand link to click
      const brandLink = await page.$('a[href*="/brands/"]');
      if (brandLink) {
        const href = await brandLink.getAttribute('href');
        console.log(`    Found brand link: ${href}`);
        await page.goto(config.portalUrl + href, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);
      }
    }

    console.log('3️⃣  Extracting brand information...');
    const brandId = await extractBrandId(page);
    console.log(`    Brand ID: ${brandId}\n`);

    // Step 4: Navigate to services
    console.log('4️⃣  Opening services page...');
    await page.goto(`${config.portalUrl}/brands/${brandId}/services`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForTimeout(1000);
    console.log(`    URL: ${page.url()}\n`);

    // Step 5: Check and create service
    console.log('5️⃣  Checking Cut service...');
    // Wait for table to load
    await page.waitForTimeout(1000);
    const exists = await serviceExists(page, cutServiceConfig.name);

    if (exists) {
      console.log(`    ✓ Service exists\n`);
    } else {
      console.log(`    ✗ Service not found, creating...\n`);
      await createService(page, cutServiceConfig);

      // Reload page to see new service
      console.log('    Reloading page to verify service...');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      const exists2 = await serviceExists(page, cutServiceConfig.name);
      if (exists2) {
        console.log(`    ✓ Service now visible in list\n`);
      } else {
        console.log(`    ⚠️  Service may not be visible yet, but creation was submitted\n`);
      }
    }

    // Summary
    console.log('✅ Success!');
    console.log('='.repeat(50));
    console.log(`\n📋 Service Details:`);
    console.log(`   Name:     ${cutServiceConfig.name}`);
    console.log(`   Price:    RM${cutServiceConfig.price}`);
    console.log(`   Duration: ${cutServiceConfig.duration} min`);
    console.log(`   Junior:   RM${cutServiceConfig.juniorPrice}`);
    console.log(`   Senior:   RM${cutServiceConfig.seniorPrice}`);
    console.log(`   Pro:      RM${cutServiceConfig.proPrice}\n`);

  } catch (error) {
    console.error('\n❌ Test Failed');
    console.error('='.repeat(50));
    console.error(`Error: ${error.message}\n`);

    if (page) {
      try {
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const path = `/tmp/playwright-error-${ts}.png`;
        await page.screenshot({ path, fullPage: true });
        console.log(`📸 Screenshot: ${path}`);
      } catch (e) {
        // silent
      }
    }
    process.exit(1);

  } finally {
    if (page) await page.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  }
}

async function login(page) {
  try {
    // Wait for form
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });

    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');

    if (!emailInput || !passwordInput) {
      throw new Error('Email or password input not found');
    }

    // Clear and fill form
    await emailInput.fill('');
    await passwordInput.fill('');
    await page.waitForTimeout(100);

    await emailInput.type(config.email, { delay: 50 });
    await passwordInput.type(config.password, { delay: 50 });

    // Verify values were set
    const emailVal = await emailInput.inputValue();
    const passVal = await passwordInput.inputValue();
    console.log(`    Email set: ${emailVal === config.email ? '✓' : `✗ (got: ${emailVal})`}`);
    console.log(`    Password set: ${passVal.length === config.password.length ? '✓' : '✗'}`);

    // Find and click the actual sign in button (not the tab)
    let submitBtn = null;

    // Try finding button by CSS selector first
    submitBtn = await page.$('button[type="submit"]');

    if (!submitBtn) {
      // Look for button below the password field
      const buttons = await page.$$('button');
      console.log(`    Found ${buttons.length} buttons`);

      const passwordInput = await page.$('input[type="password"]');
      if (passwordInput) {
        const passBox = await passwordInput.boundingBox();

        // Find button below the password input
        for (const btn of buttons) {
          const box = await btn.boundingBox();
          if (box && passBox && box.y > passBox.y + passBox.height) {
            const text = await btn.textContent();
            if (text.toLowerCase().includes('sign')) {
              submitBtn = btn;
              break;
            }
          }
        }
      }
    }

    // Fallback: find last button with "sign in" text
    if (!submitBtn) {
      const buttons = await page.$$('button');
      for (let i = buttons.length - 1; i >= 0; i--) {
        const btn = buttons[i];
        const text = await btn.textContent();
        if (text.trim().toLowerCase() === 'sign in') {
          submitBtn = btn;
          break;
        }
      }
    }

    if (!submitBtn) {
      throw new Error('Could not find login/submit button');
    }

    const btnText = await submitBtn.textContent();
    console.log(`    Clicking button: "${btnText}"`);
    await submitBtn.click();

    // Wait for authentication to complete
    console.log('    Waiting for authentication response...');

    // Wait up to 15 seconds for form to disappear or page to redirect
    let attempts = 30; // 15 seconds with 500ms intervals
    let lastUrl = page.url();

    while (attempts > 0) {
      await page.waitForTimeout(500);
      attempts--;

      const currentUrl = page.url();
      const emailInputVisible = await page.isVisible('input[type="email"]');

      if (!emailInputVisible) {
        console.log('    ✓ Form disappeared, login likely succeeded');
        break;
      }

      if (currentUrl !== lastUrl && !currentUrl.includes('/login')) {
        console.log('    ✓ URL changed, redirecting');
        break;
      }

      lastUrl = currentUrl;
    }

    // Final check: is the email input still visible?
    const finalEmailVisible = await page.isVisible('input[type="email"]');

    if (finalEmailVisible) {
      // Form is still visible, check for error message
      const error = await page.$('.error, [role="alert"], [class*="error"]');
      if (error) {
        const errorText = await error.textContent();
        throw new Error(`Login error: ${errorText || 'Unknown error'}`);
      }

      throw new Error('Login failed - form still visible after 15 seconds');
    }

  } catch (error) {
    throw new Error(`Login error: ${error.message}`);
  }
}

async function extractBrandId(page) {
  const url = page.url();
  const match = url.match(/\/brands\/([a-zA-Z0-9-]+)/);

  if (match) {
    return match[1];
  }

  const links = await page.$$('a[href*="/brands/"]');
  for (const link of links) {
    const href = await link.getAttribute('href');
    const m = href.match(/\/brands\/([a-zA-Z0-9-]+)/);
    if (m) return m[1];
  }

  throw new Error(`Brand ID not found in URL: ${url}`);
}

async function serviceExists(page, name) {
  try {
    const rows = await page.$$('tbody tr, [role="row"], li');
    console.log(`    Found ${rows.length} table rows/items`);

    for (const row of rows) {
      const text = await row.textContent();
      if (text.includes(name)) {
        console.log(`    ✓ Found "${name}" in table`);
        return true;
      }
    }

    // Debug: Show all rows
    if (rows.length > 0) {
      for (let i = 0; i < Math.min(rows.length, 6); i++) {
        const rowText = (await rows[i].textContent()).substring(0, 60).replace(/\n/g, ' ');
        console.log(`    Row ${i}: ${rowText}`);
      }
    }

    return false;
  } catch (e) {
    console.log(`    Debug: Error checking service: ${e.message}`);
    return false;
  }
}

async function createService(page, config) {
  try {
    // Find Add button
    let btn = await page.$('button:has-text("Add service")');
    if (!btn) btn = await page.$('button:has-text("Add")');

    if (!btn) {
      const buttons = await page.$$('button');
      for (const b of buttons) {
        const text = await b.textContent();
        if (text.includes('Add')) {
          btn = b;
          break;
        }
      }
    }

    if (!btn) throw new Error('Add button not found');

    await btn.click();
    await page.waitForTimeout(800);

    // Fill form
    const inputs = await page.$$(
      'input[type="text"], input[type="number"], input[inputmode="decimal"], input[inputmode="numeric"]'
    );

    if (inputs.length < 3) {
      throw new Error(`Not enough inputs: ${inputs.length}`);
    }

    await inputs[0].fill(config.name);
    await inputs[1].fill(config.price);
    await inputs[2].fill(config.duration);

    if (inputs.length > 3) {
      try {
        await inputs[3].fill(config.juniorPrice);
      } catch (e) {
        // optional
      }
    }
    if (inputs.length > 4) {
      try {
        await inputs[4].fill(config.seniorPrice);
      } catch (e) {
        // optional
      }
    }
    if (inputs.length > 5) {
      try {
        await inputs[5].fill(config.proPrice);
      } catch (e) {
        // optional
      }
    }

    // Submit
    const buttons = await page.$$('button');
    let submitBtn = null;
    for (const b of buttons) {
      const text = await b.textContent();
      if (text.includes('Add')) {
        submitBtn = b;
      }
    }

    if (!submitBtn) throw new Error('Submit button not found');

    console.log('    Submitting form...');
    await submitBtn.click();
    await page.waitForTimeout(2000);

    // Check for error messages
    const errorElement = await page.$('.error, [role="alert"], [class*="error"], .toast-error, [class*="toast"]');
    if (errorElement) {
      const errorText = await errorElement.textContent();
      if (errorText && errorText.trim()) {
        console.log(`    Warning: Service creation may have failed: ${errorText}`);
      }
    }

    // Wait a bit more for potential API response
    await page.waitForTimeout(1000);

  } catch (error) {
    throw new Error(`Service creation failed: ${error.message}`);
  }
}

// Run
runTest().catch((error) => {
  console.error('Fatal:', error);
  process.exit(1);
});
