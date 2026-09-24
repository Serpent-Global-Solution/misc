# POS App: Testing Checklist & Automation Notes

## Quick Testing Checklist

### Pre-Flight Checks
- [ ] Expo CLI installed: `expo --version`
- [ ] Node.js v18+ installed: `node --version`
- [ ] iOS Simulator OR Android Emulator running
- [ ] API backend running at `http://meiki-api.test:8083`
- [ ] Supabase credentials configured
- [ ] `.env` file configured (if needed)

### Launch & Login
- [ ] `cd /Users/user/Private/meikigo-project/meikigo-pos-native`
- [ ] `npm install` (first time only)
- [ ] `npm start`
- [ ] Press `i` for iOS or `a` for Android
- [ ] App loads in simulator
- [ ] LoginScreen displays email field
- [ ] Enter `poskd@wakjono.com` and continue
- [ ] Email verification prompt appears
- [ ] Successfully logged in

### Outlet & Queue Board
- [ ] Outlet selection screen displays (if multi-outlet)
- [ ] Select outlet
- [ ] QueueBoardScreen loads
- [ ] Floor board displays barber columns
- [ ] At least one "Checked in" (yellow) booking visible
- [ ] Status pills show correct colors:
  - [ ] Yellow: "Checked in"
  - [ ] Lavender: "In chair"
  - [ ] Green: "Completed"

### Workflow: Select & Start Service
- [ ] Tap yellow "Checked in" booking card
- [ ] BookingDetailSheet opens
- [ ] Shows: Customer name, phone, service, time, total
- [ ] "START CUT" button is visible and enabled
- [ ] Tap "START CUT"
- [ ] Loading indicator appears ("…")
- [ ] Status pill changes to lavender "In chair"
- [ ] Card moves to "Now Serving" column
- [ ] Sheet auto-closes

### Workflow: Complete & Pay (Cash)
- [ ] Tap booking in "Now Serving" section
- [ ] BookingDetailSheet shows "COMPLETE & PAY" button
- [ ] Tap "COMPLETE & PAY"
- [ ] CheckoutScreen opens
- [ ] Items and total displayed correctly
- [ ] Tap "Cash" tab
- [ ] Numeric keypad appears
- [ ] Enter tender amount (e.g., "70" for RM70)
- [ ] Change calculated correctly
- [ ] Tap "PAY [amount]" button
- [ ] Receipt screen appears
- [ ] Shows transaction details
- [ ] Tap "Done"
- [ ] Return to QueueBoardScreen
- [ ] Booking removed from board
- [ ] "Completed Today" count incremented

### Workflow: Complete & Pay (DuitNow QR)
- [ ] Tap booking, then "COMPLETE & PAY"
- [ ] CheckoutScreen opens
- [ ] Tap "DuitNow QR" tab
- [ ] QR code displays on screen
- [ ] Note QR content (should be valid for payment gateway)
- [ ] Tap "PAY [amount]" button
- [ ] ElectronicPaymentPanel opens showing QR
- [ ] Wait 30-60 seconds for settlement (or tap mock payment)
- [ ] "Payment received" message displays
- [ ] Receipt appears
- [ ] Tap "Done"

### Workflow: Complete & Pay (Card)
- [ ] Tap booking, then "COMPLETE & PAY"
- [ ] CheckoutScreen opens
- [ ] Tap "Card" tab
- [ ] Card terminal QR displays
- [ ] Tap "PAY [amount]" button
- [ ] ElectronicPaymentPanel opens
- [ ] Simulate card payment (backend stubs or real terminal)
- [ ] Receipt appears on settlement
- [ ] Tap "Done"

### Advanced Features
- [ ] Search: Tap More → Find → Search → Enter name → Select result
- [ ] Reassign: Open booking → Tap "Reassign" → Select barber
- [ ] No-Show: Open late booking (15+ min past slot) → Tap "No-show"
- [ ] Requeue: Open waiting booking → Tap "Requeue"
- [ ] Cancel: Open booking → Tap "Cancel booking" → Enter reason
- [ ] Add Service: Open "In chair" booking → Tap "Add service"

### Settings & Session
- [ ] Tap More menu
- [ ] Theme toggle cycles Light → Dark → System
- [ ] Display PIN screen appears and requires 4-digit PIN
- [ ] Manager PIN screen appears for non-admins
- [ ] Day Close button visible (admins only)
- [ ] End Session button signs out
- [ ] Shift management: Clock in/out, Take break

### Error Handling
- [ ] Disconnect network: Offline banner appears
- [ ] Reconnect: Banner disappears
- [ ] Invalid payment: Error message shows, can retry
- [ ] API timeout: Error message with retry button
- [ ] Invalid PIN: "Incorrect PIN" message

### Accessibility
- [ ] Can press all buttons
- [ ] Text is readable on both light and dark themes
- [ ] No content overlaps with safe area (notch, home indicator)
- [ ] Keyboard dismisses after input

---

## Automated Testing Approaches

### Current Limitation: React Native + Playwright

**Problem:** Playwright does not support React Native directly. Native apps run in simulator/device, not a browser.

**Why:** 
- Playwright automates web browsers (Chrome, Firefox, Safari)
- React Native compiles to native iOS/Android code
- No DOM to inspect; tests must interact with native UI layer

### Alternative Testing Strategies

#### 1. Detox (Recommended for React Native)

**What:** E2E testing framework for React Native apps

**Installation:**
```bash
npm install detox-cli --global
npm install --save-dev detox detox-config
```

**Example Test:**
```typescript
// e2e/firstTest.e2e.ts
describe('Complete Booking Workflow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should start a booking', async () => {
    // Wait for login screen
    await waitFor(element(by.id('emailInput')))
      .toBeVisible()
      .withTimeout(5000);

    // Enter email
    await element(by.id('emailInput')).typeText('poskd@wakjono.com');
    
    // Tap continue
    await element(by.text('Continue')).tap();
    
    // Wait for queue board
    await waitFor(element(by.id('floorBoard')))
      .toBeVisible()
      .withTimeout(10000);

    // Tap first waiting booking
    await element(by.text('Checked in')).atIndex(0).tap();

    // Verify detail sheet opened
    await waitFor(element(by.text('START CUT')))
      .toBeVisible()
      .withTimeout(5000);

    // Tap START CUT
    await element(by.text('START CUT')).tap();

    // Verify moved to "In chair"
    await waitFor(element(by.text('In chair')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
```

**Benefits:**
- Native app testing without a browser
- Can interact with all UI elements (buttons, text, animations)
- Can verify state changes in real-time
- Network mocking available via Detox Server

---

#### 2. Appium (Cross-Platform)

**What:** Open-source automation framework for mobile apps

**Installation:**
```bash
npm install appium --save-dev
appium driver install xcuitest  # iOS
appium driver install uiautomator2  # Android
```

**Example Test:**
```python
# test_booking.py (Python-based Appium)
from appium import webdriver
from appium.webdriver.common.appiumby import AppiumBy
from appium.webdriver.common.action_chains import ActionChains

class TestBookingWorkflow:
    def setup_method(self):
        self.driver = webdriver.Remote(
            'http://localhost:4723',
            {
                "platformName": "iOS",
                "platformVersion": "17",
                "deviceName": "iPhone 15 Pro",
                "app": "/path/to/Meikigo-POS.ipa",
                "automationName": "XCUITest"
            }
        )

    def test_start_booking(self):
        # Login
        email_input = self.driver.find_element(AppiumBy.ID, "emailInput")
        email_input.send_keys("poskd@wakjono.com")
        
        continue_btn = self.driver.find_element(AppiumBy.XPATH, "//XCUIElementTypeButton[@name='Continue']")
        continue_btn.click()
        
        # Wait for queue board
        self.driver.implicitly_wait(10)
        
        # Tap booking
        booking = self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, "ticketCard-1002")
        booking.click()
        
        # Tap START CUT
        start_btn = self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, "startCutButton")
        start_btn.click()
        
        # Verify status changed
        status = self.driver.find_element(AppiumBy.TEXT, "In chair")
        assert status.is_displayed()
```

---

#### 3. Manual Testing with Log Monitoring

**What:** Use console logs and network monitoring while testing manually

**Setup:**
```bash
# Terminal 1: Start app with logging
REACT_NATIVE_LOG_LEVEL=debug npm start

# Terminal 2: Watch backend logs
tail -f /var/log/meikigo-api.log

# Browser: Monitor network
open http://localhost:19000/debugger-ui
```

**Network Monitoring (Web):**
1. `npm start` in POS directory
2. Press `w` to open web version
3. Open DevTools → Network tab
4. Filter by XHR/Fetch
5. Monitor API calls as you interact with the app

---

### Manual Testing Script (Shell-Based)

Save as `/test-scripts/pos-test-runner.sh`:

```bash
#!/bin/bash
# POS App Manual Testing Script

set -e

POS_DIR="/Users/user/Private/meikigo-project/meikigo-pos-native"
TEMP_LOG="/tmp/pos-test.log"

echo "=== Meikigo POS Testing Script ==="
echo ""

# Check prerequisites
echo "✓ Checking prerequisites..."
if ! command -v expo &> /dev/null; then
    echo "✗ Expo CLI not found. Install with: npm install -g expo-cli"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "✗ Node.js not found"
    exit 1
fi

# Navigate to POS
echo "✓ Navigating to POS directory..."
cd "$POS_DIR"

# Install dependencies
echo "✓ Installing dependencies..."
npm install > "$TEMP_LOG" 2>&1 || {
    echo "✗ npm install failed. See $TEMP_LOG"
    exit 1
}

# Start Expo
echo "✓ Starting Expo server..."
echo ""
echo ">>> Expo is launching. Press 'i' for iOS or 'a' for Android"
echo ">>> Once app loads, follow these steps:"
echo ""
echo "STEP 1: LOGIN"
echo "  - Email: poskd@wakjono.com"
echo "  - Verify email via magic link"
echo ""
echo "STEP 2: QUEUE BOARD"
echo "  - Locate a yellow 'Checked in' booking"
echo ""
echo "STEP 3: START SERVICE"
echo "  - Tap booking card"
echo "  - Tap 'START CUT'"
echo "  - Verify status changes to 'In chair' (lavender)"
echo ""
echo "STEP 4: COMPLETE & PAY"
echo "  - Tap booking again"
echo "  - Tap 'COMPLETE & PAY'"
echo "  - Select payment method (Cash recommended for testing)"
echo "  - Tap 'PAY [amount]'"
echo "  - Verify receipt displays"
echo ""
echo "STEP 5: VERIFY"
echo "  - Tap 'Done' on receipt"
echo "  - Booking should disappear from queue board"
echo "  - 'Completed Today' count should increment"
echo ""

npm start
```

**Usage:**
```bash
chmod +x /test-scripts/pos-test-runner.sh
/test-scripts/pos-test-runner.sh
```

---

## UI Automation Helpers (Future)

### Custom Detox Matchers

Add to Detox config for reliable element selection:

```typescript
// e2e/matchers.ts
export const bookingCard = (ticketNumber: string) => 
  by.id(`ticketCard-${ticketNumber}`);

export const statusPill = (status: "Checked in" | "In chair" | "Completed") => 
  by.text(status);

export const actionButton = (label: string) => 
  by.text(label);

// Usage
await element(bookingCard('1002')).tap();
```

### Detox Actions for Payments

```typescript
// e2e/payments.ts
export async function payCash(amount: string) {
  // Select cash tab
  await element(by.text('Cash')).tap();
  
  // Enter tender
  for (const digit of amount) {
    await element(by.id(`keypad-${digit}`)).tap();
  }
  
  // Tap pay
  await element(by.text(`Pay RM${amount}`)).tap();
}

export async function payQR() {
  // Select QR tab
  await element(by.text('DuitNow QR')).tap();
  
  // Tap pay
  await element(by.text(/Pay RM/)).tap();
  
  // Wait for QR display
  await waitFor(element(by.id('qrCodeDisplay')))
    .toBeVisible()
    .withTimeout(5000);
}
```

---

## Logging & Debugging

### React Native Debug Menu
On Simulator: Cmd+D (iOS) or Cmd+M (Android)

Options:
- Show Inspector
- Show Perf Monitor
- Toggle Element Inspector
- Show Network Inspector
- Show Performance

### Custom Logging
```typescript
// In any component
import { logging } from './lib/logging';

const handleStart = async () => {
  logging.info('Starting queue line', { lineId, ticketId });
  try {
    await startQueueLine(lineId);
    logging.success('Queue line started');
  } catch (err) {
    logging.error('Failed to start queue line', err);
  }
};
```

### Network Monitoring
```typescript
// Add to app initialization
import { useMonitorNetwork } from './hooks/useMonitorNetwork';

export default function App() {
  useMonitorNetwork();  // Logs all API calls in development
  
  return <RootRouter />;
}
```

---

## Test Data Requirements

### Prerequisites for Testing
1. **Staff Account with POS Role**
   - Email: poskd@wakjono.com
   - Role: Admin or Cashier
   - Outlet: Assigned

2. **Outlet with Employees**
   - At least 1 barber employee assigned
   - Working hours configured

3. **Pending Bookings**
   - At least 1 booking in "Waiting" status
   - Today's date
   - In the test outlet

4. **Payment Methods**
   - Cash (always available)
   - DuitNow QR (requires payment stub or real gateway)
   - Card (requires payment stub or real terminal)

### Seeding Test Data

**Option A: Via meikigo-brand Admin Panel**
1. Log into meikigo-brand as admin
2. Navigate to Appointments/Bookings
3. Create test booking for today
4. Assign to barber
5. Mark as "Checked in"

**Option B: Via API (if direct access available)**
```bash
curl -X POST http://meiki-api.test:8083/api/v1/outlets/{outletId}/queue/join \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-client-123",
    "lines": [{
      "productId": "haircut",
      "employeeId": "barber-456",
      "duration": 30
    }]
  }'
```

---

## Performance Testing

### Load Testing Checklist
- [ ] 5 bookings per barber: UI responsive?
- [ ] 10 bookings per barber: Lag noticeable?
- [ ] 20+ bookings: Board slow to render?
- [ ] Large barber names: Text overflow?
- [ ] Long service names: Text truncate?
- [ ] Drag-to-assign: Smooth animation?

### Memory Monitoring
```bash
# Monitor app memory on iOS
xcrun simctl spawn booted log stream --predicate 'process == "Meikigo-POS"' | grep 'memory'

# On Android (via Android Studio)
Android Studio → Profiler → Memory tab
```

---

## Regression Testing Template

### Weekly Regression Suite
```markdown
## Week of [DATE]

### Core Functionality
- [ ] Login flow works
- [ ] Queue board displays correctly
- [ ] Can start a booking
- [ ] Can complete and pay (cash)
- [ ] Can complete and pay (QR)
- [ ] Can complete and pay (card)
- [ ] Receipt displays correctly
- [ ] Can cancel booking
- [ ] Can reassign booking
- [ ] Can mark no-show

### Edge Cases
- [ ] Late booking (15+ min past slot): Can mark no-show
- [ ] Party booking (multiple lines): All lines complete together
- [ ] Offline booking: Works with cached data
- [ ] Concurrent payments: No race condition
- [ ] Large discount: Requires approval
- [ ] Zero-price service: Payment skipped?

### Theme & Accessibility
- [ ] Light theme: All text readable
- [ ] Dark theme: All text readable
- [ ] Large text: No overlap issues
- [ ] Keyboard navigation: All buttons reachable

### Performance
- [ ] Board loads in <2 seconds
- [ ] Payment <1 second response
- [ ] No memory leaks after 100 actions

### Network
- [ ] Online: All features work
- [ ] Offline: ConnectivityBanner shows
- [ ] Reconnect: Sync data without reload

**Tester:** ___________  
**Date:** ___________  
**Notes:** ___________
```

---

## Troubleshooting Guide

### Symptom: "Not connected to the Meikigo server"
```bash
# Check API is running
curl http://meiki-api.test:8083/health

# Check environment variable
echo $EXPO_PUBLIC_MEIKIGO_API_BASE_URL

# Reset Expo cache
cd /meikigo-pos-native && npm start && press 'c'
```

### Symptom: "Booking won't start" (button disabled)
- Check: Is barber already serving someone? (Now Serving column not empty)
- Check: Is this booking first in waiting queue?
- Solution: Reassign to a free barber or complete the current service first

### Symptom: "Payment doesn't settle" (stuck in "Processing")
- Wait 30-60 seconds (async settlement)
- Check backend logs for payment gateway error
- For QR/Card: Verify terminal actually processed payment
- Fallback: Mark as "Pending" and retry later

### Symptom: "App crashes on startup"
```bash
# Clear Watchman cache
watchman watch-del-all

# Clear Expo cache
cd /meikigo-pos-native && npm start && press 'c'

# Reinstall dependencies
rm -rf node_modules && npm install

# Restart simulator
xcrun simctl erase all
```

---

**Last Updated:** 2026-09-25  
**Testing Framework:** Detox recommended  
**Estimated Manual Test Time:** 15-20 minutes per workflow
