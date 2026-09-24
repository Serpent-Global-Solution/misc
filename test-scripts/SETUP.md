# Customer App Booking Test - Setup Guide

This guide explains how to set up and run the automated booking test for the meikigo customer app.

## Prerequisites

1. **Node.js** (v18 or later)
2. **Running services**:
   - Customer webapp: `http://meiki-customer-webapp.test:3001`
   - API backend: `http://localhost:8083`

Verify the app is running before running tests:
```bash
curl -I http://meiki-customer-webapp.test:3001
```

## Installation

### 1. Install Playwright

From the project root or test-scripts directory:

```bash
# Option A: Install globally for the project
npm install -D playwright

# Option B: Install locally in the customer-webapp (if you plan to add more tests there)
cd meikigo-customer-webapp
npm install -D playwright
cd ..
```

### 2. Verify Installation

```bash
npx playwright --version
```

Should output something like: `Version 1.48.0`

## Running the Test

### Basic Usage

```bash
node test-scripts/customer-app-book-cut.mjs
```

### With Options

```bash
# Run in non-headless mode (see the browser)
node test-scripts/customer-app-book-cut.mjs --headless=false

# Target a specific outlet by name
node test-scripts/customer-app-book-cut.mjs --outlet-name="Pavilion KL"

# Combine options
node test-scripts/customer-app-book-cut.mjs --headless=false --outlet-name="Pavilion KL"
```

## What the Test Does

The automated test performs the following steps:

1. **Navigate** to the customer app home page
2. **Browse** the outlets directory
3. **Select** an outlet with available services
4. **Choose** a service (preferably "cut", or the first available)
5. **Pick** a barber (or "Any barber" option)
6. **Select** a booking time slot or walk-in option
7. **Review** the booking details
8. **Complete** the booking flow (stops at authentication)

## Test Output

The test logs each step and shows:
- Navigation events
- Service/barber selections
- Booking details summary
- Final status and any errors

### Success Output Example

```
Starting Playwright automation...

App URL: http://meiki-customer-webapp.test:3001
Headless: true
Target outlet: Any available

Step 1: Navigating to customer app home page...
✓ Home page loaded

Step 2: Browsing outlets directory...
Found 5 outlets available

Step 3: Selecting an outlet...
Clicking "Book a service" on selected outlet...
✓ Navigated to booking page

Step 4: Selecting service...
Found 8 services available
Found "cut" service: Cut - 45 min
✓ Service selected

... [continues through all steps]

✓ Test completed successfully!
```

## Troubleshooting

### Issue: "No outlets found"
- **Cause**: Outlets may be closed or API is not returning data
- **Solution**: Check if the API is running and returning outlets from `/api/v1/public/outlets`

### Issue: "No services found"
- **Cause**: The selected outlet hasn't published services
- **Solution**: Try a different outlet, or configure services in the admin portal

### Issue: Connection timeout
- **Cause**: Browser can't connect to the app URL
- **Solution**: 
  - Verify the app is running: `curl -I http://meiki-customer-webapp.test:3001`
  - Check that `meiki-customer-webapp.test` resolves to localhost (add to `/etc/hosts` if needed)

### Issue: Playwright not found
- **Cause**: Playwright not installed or not in PATH
- **Solution**: Run `npm install -D playwright` from the project root

## Environment Variables

The test uses these environment variables (optional):

- `PLAYWRIGHT_DEBUG=1` - Show debug info
- `PWDEBUG=1` - Run in headed mode with inspector

Example:
```bash
PWDEBUG=1 node test-scripts/customer-app-book-cut.mjs
```

## Test Data Notes

### No Login Required for Browsing
The test doesn't require any login credentials to:
- Browse the outlet directory
- View available services
- Select services and barbers
- Choose booking times

### Authentication Gate
The test stops at the authentication gate (registration or login page), as the booking must be completed by a registered user.

In a real test scenario, you would:
1. Use test credentials to register/login
2. Verify the booking is confirmed
3. Check the booking appears in the customer's queue

## Extending the Test

To create more comprehensive tests:

1. **Add login simulation**: Modify `handleContinueToGate()` to input credentials
2. **Verify confirmation**: Check for confirmation email or booking ID in UI
3. **Test walk-in flow**: Target the "Join queue" button instead of booking a time
4. **Test multiple services**: Select multiple services in step 4
5. **Test barber-specific bookings**: Prefer named barbers over "Any barber"

## Integration with CI/CD

To run this test in CI/CD:

```yaml
# Example GitHub Actions
- name: Run booking test
  run: node test-scripts/customer-app-book-cut.mjs
  env:
    NODE_ENV: test
```

## Performance Notes

- Test duration: ~30-60 seconds
- Network timeouts: 10 seconds per action
- Max retries: 3 per action

Adjust these values in the script if your environment is slower.
