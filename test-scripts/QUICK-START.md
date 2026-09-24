# Quick Start Guide - Book a Cut Service Test

Get the automated booking test running in 3 minutes.

## Prerequisites Check

```bash
# Check Node.js is installed (needs v18+)
node --version

# Check npm is installed
npm --version

# Verify customer app is running
curl -I http://meiki-customer-webapp.test:3001

# Verify API is running
curl -I http://localhost:8083/api/v1/public/outlets
```

All should return success (HTTP 200 or connection established).

## 1. Install Playwright

```bash
# From project root
npm install -D playwright
```

This installs Playwright and downloads the Chromium browser (~100MB).

**Takes**: 2-5 minutes on first run

## 2. Run the Test

```bash
# Basic (headless mode, no browser window)
node test-scripts/customer-app-book-cut.mjs
```

That's it! The test will:
1. Open the customer app
2. Navigate through the booking flow
3. Print results with ✓ for success

**Expected output**: GREEN checkmarks throughout, ending with "TEST COMPLETED SUCCESSFULLY"

## Options

### See the Browser

```bash
node test-scripts/customer-app-book-cut.mjs --headless=false
```

Watch the automation in action. Press Ctrl+C to stop.

### Target Specific Outlet

```bash
node test-scripts/customer-app-book-cut.mjs --outlet-name="Pavilion KL"
```

Specify which shop to book at.

### Both Together

```bash
node test-scripts/customer-app-book-cut.mjs --headless=false --outlet-name="Mid Valley"
```

## Troubleshooting

### "Playwright not found"

```bash
npm install -D playwright
npx playwright --version  # Should show version
```

### "Cannot find module"

Make sure you're in the project root:
```bash
cd /Users/user/Private/meikigo-project
npm install -D playwright
```

### "Connection refused"

Customer app or API not running. Start them first:
```bash
# Terminal 1: API
cd meikigo-api
# run your API start command

# Terminal 2: Customer app
cd meikigo-customer-webapp
npm run dev

# Terminal 3: Run test
node test-scripts/customer-app-book-cut.mjs
```

### "No outlets found"

Outlets haven't been published or API is returning empty. Check:
```bash
curl http://localhost:8083/api/v1/public/outlets | head -20
```

## What Gets Tested

✓ Browse outlet directory
✓ Select an outlet
✓ Choose a service (prefers "cut")
✓ Pick a barber
✓ Select booking time/walk-in
✓ Review booking details
✓ Reach authentication gate

**Test stops at login** - doesn't complete registration (can be extended).

## Expected Results

### Success (Green)

```
===== Meikigo Customer App - Booking Test =====

...
STEP 1: Navigate to customer app home page
  ✓ Home page loaded

STEP 2: Wait for outlet directory to load
  ✓ Outlet directory ready

... [more ✓ checks] ...

===== TEST COMPLETED SUCCESSFULLY =====
```

### Failure (Red)

```
❌ TEST FAILED

Error: [specific error message]
URL: [where it failed]
Screenshot: /tmp/playwright-test-failure.png
```

If test fails:
1. Check prerequisites are running
2. Review error message
3. Look at screenshot for clues
4. Check detailed docs in README.md

## Duration

- First run: 2-5 minutes (Playwright setup)
- Subsequent runs: 30-60 seconds

## Next Steps

### Extend the Test

- Add login/registration step
- Verify booking confirmation
- Test walk-in only flow
- Test multiple services

See README.md for examples.

### Integrate with CI/CD

Add to GitHub Actions or your CI pipeline:
```yaml
- run: npm install -D playwright
- run: node test-scripts/customer-app-book-cut.mjs
```

### Run Regularly

Set up cron job or scheduled test:
```bash
# Daily at 2 AM
0 2 * * * cd /path/to/project && node test-scripts/customer-app-book-cut.mjs
```

## File Locations

- **Test Script**: `test-scripts/customer-app-book-cut.mjs`
- **README**: `test-scripts/README.md` (detailed info)
- **Setup Guide**: `test-scripts/SETUP.md` (configuration)
- **Test Summary**: `test-scripts/TEST-SUMMARY.md` (full documentation)

## Getting Help

1. **README.md** - Full documentation
2. **SETUP.md** - Configuration details
3. **TEST-SUMMARY.md** - Architecture and extending
4. Review test output carefully for error hints

## Key Commands

```bash
# Install
npm install -D playwright

# Run headless
node test-scripts/customer-app-book-cut.mjs

# Run headed (see browser)
node test-scripts/customer-app-book-cut.mjs --headless=false

# Target specific outlet
node test-scripts/customer-app-book-cut.mjs --outlet-name="Name"

# Debug
PWDEBUG=1 node test-scripts/customer-app-book-cut.mjs
```

That's it! You're ready to go. 🚀
