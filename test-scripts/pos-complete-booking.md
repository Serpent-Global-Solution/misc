# POS App: Complete Booking Workflow

## Overview

This guide provides step-by-step instructions for the complete booking workflow in the Meikigo POS Native app (React Native via Expo). It covers viewing pending bookings, marking a booking as in-progress, completing the service, and processing payment.

**Technology Stack:**
- React Native with Expo (v57.0.15)
- NativeWind for styling
- Supabase authentication
- .NET backend API

---

## Prerequisites

### Credentials
- **Expo Account Email:** poskd@wakjono.com
- **Expo Account Password:** Test1234

### Environment
- Node.js and npm installed
- Expo CLI installed globally: `npm install -g expo-cli`
- Access to Meikigo API and Supabase
- Simulator (iOS/Android) or physical device with Expo app installed

### Configuration
The app requires the following environment variables (automatically set in development):
- `EXPO_PUBLIC_MEIKIGO_API_BASE_URL` → http://meiki-api.test:8083 (default)
- `EXPO_PUBLIC_SUPABASE_URL` → https://nekeahobppbrosrctppv.supabase.co (default)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` → Set in .env or environment

---

## Starting the POS App

### Step 1: Navigate to POS Native Directory
```bash
cd /Users/user/Private/meikigo-project/meikigo-pos-native
```

### Step 2: Install Dependencies (first time only)
```bash
npm install
```

### Step 3: Start Expo Server
```bash
npm start
```

This launches the Expo development server on `http://localhost:19000`.

### Step 4: Open in Simulator or Device
- **iOS Simulator:** Press `i` in the terminal
- **Android Emulator:** Press `a` in the terminal
- **Physical Device:** Scan the QR code with Expo app (iPhone) or Android device

---

## Authentication Flow

### Screen: LoginScreen

**Location:** `/src/screens/LoginScreen.tsx`

1. **Email Input**
   - Tap the email field
   - Enter: `poskd@wakjono.com`

2. **Continue**
   - Tap "Continue" or equivalent button
   - This sends a magic link to the email address via Supabase Auth

3. **Verify Email**
   - Check email for magic link (or confirmation code)
   - Copy the code/link and return to the app
   - Enter verification code if prompted

**Result:** User is logged in and proceeds to outlet selection or queue board

---

## Outlet Selection

### Screen: OutletPickerScreen

**Location:** `/src/screens/OutletPickerScreen.tsx`

If the account is bound to multiple outlets:
1. A list of available outlets is displayed
2. Tap the desired outlet (e.g., "Main Outlet", "Branch A")
3. App navigates to the queue board for that outlet

If bound to a single outlet, this screen is skipped.

---

## Viewing Pending Bookings

### Screen: QueueBoardScreen (Main POS Interface)

**Location:** `/src/screens/QueueBoardScreen.tsx`

#### Layout
The queue board displays bookings in a **Kanban-style layout**:

```
┌─────────────────────────────────────────────────┐
│ FLOOR BOARD - Today's Queue                     │
├─────────────────────────────────────────────────┤
│  [Staff Name - Status] | [Staff Name - Status]  │
│  ╔═══════════════════╗ ╔═══════════════════╗   │
│  ║ Now Serving:      ║ ║ Waiting:          ║   │
│  ║ #1001 Ahmed       ║ ║ #1002 Sarah       ║   │
│  ║ Haircut           ║ ║ Haircut           ║   │
│  ║ 2:00pm            ║ ║ 2:30pm            ║   │
│  ╚═══════════════════╝ ╚═══════════════════╝   │
│                                                 │
│  ╔═══════════════════╗                         │
│  ║ #1003 John        ║                         │
│  ║ (Party booking)   ║                         │
│  ║ Haircut + Beard   ║                         │
│  ╚═══════════════════╝                         │
└─────────────────────────────────────────────────┘
```

#### Column Organization
Each column represents a **barber/staff member** with:
- **Top section (Now Serving):** Active service(s)
- **Middle section (Waiting):** Checked-in customers awaiting service
- **Bottom stat:** Count of completed services today

#### Pending Booking Status
Pending bookings show:
- **Ticket number** (e.g., #1001)
- **Customer name** or generic label
- **Service type** (e.g., "Haircut", "Beard", "Wash & Cut")
- **Time slot** (for bookings)
- **Status indicator:**
  - Yellow/Orange: "Checked in" (Waiting status)
  - Lavender: "In chair" (InService/Called status)
  - Green: "Completed" (Completed status)

#### Finding a Specific Booking
1. **Scan the board** for a "Checked in" (yellow) ticket card
2. **Search option** (if needed):
   - Tap the "More" menu (bottom navigation)
   - Select "Find" → "Search"
   - Enter customer name or ticket number
   - Tap matching result to select

---

## Selecting & Opening Booking Details

### Step 1: Tap the Booking Card
- On the floor board, tap any pending (yellow "Checked in") ticket card
- Card shows customer name, service, time, and price

### Step 2: BookingDetailSheet Opens
**Location:** `/src/components/pos/BookingDetailSheet.tsx`

A bottom sheet modal displays:

```
┌────────────────────────────────┐
│        Booking Detail          │
├────────────────────────────────┤
│ #1002 · Online                 │
│ Sarah Ahmed                     │
│ ✓ Checked in                   │
│                                │
│ Service                        │
│ ├─ Haircut                     │
│ ├─ 2:30pm · 30 min             │
│ ├─ Barber: Ahmed               │
│ ├─ Total: RM 45.00             │
│                                │
│ ⚠ Late warning (if applicable) │
│                                │
├────────────────────────────────┤
│ [START CUT] (Primary button)   │
│ [Reassign] [No-show]           │
│ [Cancel booking]               │
└────────────────────────────────┘
```

#### Fields Displayed
- **Header:** Ticket #, source (Online/Walk-in), status pill
- **Contact:** Phone number (tappable for calling)
- **Service Block:** Product name, time slot, duration, employee, total price
- **Warnings:** Late booking alert (15+ min past slot time)
- **Party Indicator:** If party booking, shows all services on ticket
- **Action Footer:** Buttons based on status

---

## Mark Booking as In-Progress (Start Cut)

### Step 1: Verify Booking Status
Ensure the booking is in "**Checked in**" status (yellow pill).

### Step 2: Check "Can Start" Condition
The "Start cut" button is **enabled only if**:
- Current barber/employee has no active service (Now Serving empty)
- This booking is first in the waiting queue

### Step 3: Tap "START CUT" Button
- Primary button in the detail sheet footer
- Button shows loading indicator ("…") while processing
- Calls API: `POST /api/v1/queue-lines/{lineId}/start`

### Step 4: Status Transitions
```
Waiting (Yellow) → Called → InService (Lavender "In chair")
```

**Backend Processing:**
```typescript
// API Endpoint
POST /api/v1/queue-lines/{lineId}/start

// Response: Queue line status changes to "InService" or "Called"
{
  id: "line-123",
  status: "InService",
  employeeId: "emp-456",
  queueTicketId: "ticket-789",
  ...
}
```

### Step 5: UI Updates
After successful call:
- Ticket card **moves to "Now Serving" column**
- Status pill changes to **"In chair"** (lavender/purple)
- Button options change to "Complete & pay" and "Add service"
- Sheet auto-closes after brief moment

**Error Handling:**
- If another service is in progress: "Cannot start — barber is busy"
- If not first in queue: "Requeue this booking first" (show Requeue button)
- Network error: Error message displays; retry available

---

## Completing Service & Opening Payment

### Step 1: Service is In Progress
Booking now shows:
- Status: "In chair" (lavender)
- Barber is actively serving the customer
- Duration is being tracked

### Step 2: Tap Booking Card Again
- Tap the card in the "Now Serving" section
- BookingDetailSheet opens with new action buttons

### Step 3: Tap "COMPLETE & PAY"
- Primary button in the footer
- Calls API: `POST /api/v1/transactions/create`
- Opens CheckoutScreen

**API Request Structure:**
```typescript
POST /api/v1/outlets/{outletId}/transactions
{
  queueTicketId: "ticket-789",
  clientId: "client-123",
  lines: [
    {
      productId: "prod-haircut",
      quantity: 1,
      employeeId: "emp-456",
      queueLineId: "line-123"
    }
  ],
  discounts: [],
  tips: [],
  paymentMethod: "Cash" | "Card" | "DuitNowQr"
}
```

### Step 4: CheckoutScreen Opens
**Location:** `/src/screens/CheckoutScreen.tsx`

Displays the order for final review:
```
┌────────────────────────────────┐
│        CHECKOUT SCREEN         │
├────────────────────────────────┤
│ Customer: Sarah Ahmed (#1002)  │
│                                │
│ Items                          │
│ ├─ Haircut              RM45.00│
│ ├─ Beard Trim           RM20.00│
│ ├─ Subtotal             RM65.00│
│                                │
│ Discounts:      -               │
│ Tips:           -               │
│ Total Due:      RM 65.00        │
│                                │
│ Payment Method                 │
│ [Cash]  [DuitNow QR]  [Card]   │
│                                │
│ Tender/Amount Input:           │
│ [Numeric Keypad - if cash]     │
│                                │
│ [PAY RM65.00] (primary button) │
└────────────────────────────────┘
```

---

## Processing Payment

### Payment Methods

#### 1. Cash Payment

**Setup:**
- Tap "Cash" tab
- Numeric keypad appears for tender input

**Steps:**
1. **Enter Tender Amount:**
   - Tap numeric keys to enter amount received
   - Tap "C" to clear
   - Tap "⌫" to backspace
   - E.g., enter "70" for RM70 if total is RM65

2. **Calculate Change:**
   - App calculates: `Change = Tender - Total`
   - Display: "Change: RM 5.00"

3. **Tap "PAY RM[amount]"**
   - Button shows the total due
   - Creates transaction with `paymentMethod: "Cash"`

4. **Receipt Screen:**
   - Shows transaction receipt
   - Options: "Print", "Email", "Done"
   - Tap "Done" to complete

**API Call:**
```typescript
POST /api/v1/outlets/{outletId}/transactions
{
  ...cartData,
  paymentMethod: "Cash"
}
```

#### 2. DuitNow QR (Contactless)

**Setup:**
- Tap "DuitNow QR" tab
- QR code displays

**Steps:**
1. **Show QR Code to Customer:**
   - QR code appears on screen
   - Customer scans with their bank app

2. **Wait for Payment Authorization:**
   - Screen shows "Processing…"
   - ElectronicPaymentPanel monitors transaction
   - Backend handles DuitNow API callback

3. **Payment Settles:**
   - Status changes to "Payment received"
   - Receipt auto-displays

**API Flow:**
```typescript
1. POST /api/v1/transactions (creates transaction with paymentMethod: "DuitNowQr")
   → Returns transactionId and QR payload

2. ElectronicPaymentPanel polls or listens for settlement
   → Payment gateway calls webhook on app backend

3. Once settled, completeQueueLine() is called
```

#### 3. Card Payment (MSC/VISA/etc.)

**Setup:**
- Tap "Card" tab
- QR code for card terminal/machine displays

**Steps:**
1. **Show QR to Card Terminal:**
   - Merchant device scans QR code
   - Or enter card manually on POS terminal

2. **Card Terminal Processes:**
   - Customer enters PIN or taps
   - Terminal sends approval to backend

3. **Payment Settles:**
   - Similar to QR, waits for webhook
   - Receipt displays on success

---

## Receipt & Service Completion

### Receipt View

**Location:** `/src/screens/checkout/ReceiptView.tsx`

After successful payment:

```
┌────────────────────────────────┐
│           RECEIPT              │
│                                │
│ Meikigo Barbershop - Outlet A  │
│ 2024-09-25 14:35               │
│                                │
│ Customer: Sarah Ahmed          │
│ Ticket #1002                   │
│                                │
│ ── Services ──                 │
│ Haircut              RM45.00   │
│ Beard Trim           RM20.00   │
│                                │
│ ── Payment ──                  │
│ Subtotal             RM65.00   │
│ Tax                  -         │
│ Total Paid           RM65.00   │
│                                │
│ Payment Method: Cash            │
│ Amount Received: RM70.00        │
│ Change: RM5.00                 │
│                                │
│ Tip Distributed (if any)       │
│ Ahmed: RM2.00                  │
│                                │
│ Transaction ID: TXN-2024-1234   │
│ Approval Code: 123456           │
│                                │
│ ── Actions ──                  │
│ [Print] [Email] [Done]        │
│                                │
│ "Thank you - Please come again" │
└────────────────────────────────┘
```

#### Receipt Actions
- **Print:** Sends receipt to connected thermal printer
- **Email:** Emails receipt to customer (if email on file)
- **Done:** Closes receipt, returns to queue board

### Automatic Completion

After payment settles:
1. **completeQueueLine()** is called automatically
   - API: `POST /api/v1/queue-lines/{lineId}/complete`
   - Moves queue line to "Completed" status

2. **Ticket is removed** from queue board
   - No longer visible in active lanes
   - Counted in "Completed Today" stats

3. **PendingPaymentsContext** updates
   - Syncs with pending payments bar
   - Shows latest transaction

---

## UI Element Reference

### Bottom Navigation Pill
```
Today | + Walk-in | Cashier ($) | Calendar | More
```

- **Today:** Switch to lanes view (queue board)
- **+ Walk-in:** Create new walk-in ticket
- **Cashier ($):** Open checkout/payment screen
- **Calendar:** Switch to timeline view
- **More:** Settings, manager options, shift management

### More Menu (Manager/Staff Options)

**Display Section:**
- Queue Display (Wall screen) - requires PIN

**Manager Section** (if admin):
- Refunds
- Day Close
- End Session (sign out)

**Find Section** (if staff):
- Search by name/ticket/phone
- My Day (personal stats)

**Shift Section:**
- Clock in/out
- Take break / Back from break
- End shift

**Appearance:**
- Theme (Light/Dark/System)

---

## Complete Workflow Summary

### End-to-End Flow Diagram

```
┌──────────────────────────────────────────────────────┐
│ 1. LOGIN                                             │
│    Email: poskd@wakjono.com                          │
│    Password: Test1234                                │
│    └─→ Supabase Auth → Magic Link / Verification    │
├──────────────────────────────────────────────────────┤
│ 2. OUTLET SELECTION (if multiple outlets)            │
│    └─→ Select outlet from list                       │
├──────────────────────────────────────────────────────┤
│ 3. QUEUE BOARD (QueueBoardScreen)                    │
│    ├─ View floor with all barbers/employees         │
│    ├─ See pending bookings in "Waiting" sections    │
│    └─ Status: "Checked in" (yellow pill)            │
├──────────────────────────────────────────────────────┤
│ 4. SELECT BOOKING                                    │
│    ├─ Tap ticket card                               │
│    └─ BookingDetailSheet opens                      │
├──────────────────────────────────────────────────────┤
│ 5. START SERVICE (Mark In-Progress)                 │
│    ├─ Tap "START CUT" button                        │
│    ├─ API: POST /api/v1/queue-lines/{id}/start      │
│    ├─ Status changes: Waiting → InService           │
│    └─ Card moves to "Now Serving" column            │
├──────────────────────────────────────────────────────┤
│ 6. SERVICE IN PROGRESS                              │
│    ├─ Barber serves customer                        │
│    ├─ Status shows: "In chair" (lavender)           │
│    └─ Duration tracked                              │
├──────────────────────────────────────────────────────┤
│ 7. COMPLETE SERVICE & OPEN CHECKOUT                 │
│    ├─ Tap booking card again                        │
│    ├─ Tap "COMPLETE & PAY" button                   │
│    ├─ API: POST /api/v1/transactions (with items)   │
│    └─ CheckoutScreen opens                          │
├──────────────────────────────────────────────────────┤
│ 8. SELECT PAYMENT METHOD & PAY                       │
│    ├─ Choose: Cash | DuitNow QR | Card             │
│    ├─ For Cash:                                      │
│    │  └─ Enter tender amount                         │
│    ├─ For QR/Card:                                  │
│    │  └─ Show QR code to customer                   │
│    ├─ Tap "PAY [amount]" button                     │
│    └─ API: Payment method sent to backend           │
├──────────────────────────────────────────────────────┤
│ 9. PAYMENT PROCESSING & SETTLEMENT                   │
│    ├─ For Cash: Immediate → receipt                 │
│    ├─ For QR/Card: Poll for settlement              │
│    ├─ Backend receives payment gateway callback      │
│    └─ Transaction marked "settled"                  │
├──────────────────────────────────────────────────────┤
│ 10. COMPLETE QUEUE LINE (Automatic)                 │
│     ├─ API: POST /api/v1/queue-lines/{id}/complete  │
│     ├─ Status: InService → Completed                │
│     └─ Line removed from queue board                │
├──────────────────────────────────────────────────────┤
│ 11. RECEIPT DISPLAY                                 │
│     ├─ ReceiptView opens                            │
│     ├─ Shows all transaction details               │
│     ├─ Options: Print | Email | Done               │
│     └─ Tap "Done" → return to queue board           │
└──────────────────────────────────────────────────────┘
```

---

## Testing Approach

### Manual UI Testing (Expo)

Since Playwright does not directly support React Native, testing is **manual through the Expo simulator/device**:

1. **Start app:** `npm start` in `/meikigo-pos-native`
2. **Open simulator:** Press `i` (iOS) or `a` (Android)
3. **Login:** Use test credentials
4. **Navigate:** Follow workflow steps above
5. **Verify states:** Check UI reflects each status transition
6. **Validate API:** Open browser DevTools (web) or network inspector to monitor API calls

### Key API Endpoints to Monitor

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/pos/me` | GET | Session info & outlet |
| `/api/v1/outlets/{id}/queue` | GET | Load queue board |
| `/api/v1/queue-lines/{id}/start` | POST | Mark as in-progress |
| `/api/v1/transactions` | POST | Create transaction/payment |
| `/api/v1/queue-lines/{id}/complete` | POST | Mark service as done |

### Testing Checklist

- [ ] Login with provided credentials
- [ ] Outlet selection loads correctly
- [ ] Queue board displays all pending bookings
- [ ] Can select a booking and view details
- [ ] "Start cut" button is enabled/disabled correctly
- [ ] Clicking "Start cut" changes status from "Checked in" to "In chair"
- [ ] Can open checkout screen from booking detail
- [ ] Checkout screen displays correct items and total
- [ ] Can select each payment method (Cash/QR/Card)
- [ ] Payment processes without errors
- [ ] Receipt displays correctly
- [ ] Queue board updates after payment (booking removed)
- [ ] "Completed Today" count increments

---

## Troubleshooting

### Issue: "Not connected to the Meikigo server"
- **Cause:** API connection failed
- **Solution:**
  - Verify `EXPO_PUBLIC_MEIKIGO_API_BASE_URL` is set (default: http://meiki-api.test:8083)
  - Check if backend API is running
  - On iOS, ensure NSAppTransportSecurity exemption for dev hostname (see app.config.ts)

### Issue: "Missing Supabase configuration"
- **Cause:** Missing `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **Solution:**
  - Set env var before starting Expo
  - Or add to `.env` file and reload

### Issue: "Start cut" button is disabled
- **Cause:** Barber is busy or booking is not first in queue
- **Solution:**
  - Check if current employee has other active services
  - Requeue booking if needed, or reassign to available barber

### Issue: QR payment not settling
- **Cause:** Payment gateway callback delayed or missing
- **Solution:**
  - Wait 30-60 seconds for async settlement
  - Check backend logs for payment gateway errors
  - May need to retry with different method

### Issue: Expo app crashes on startup
- **Cause:** Out-of-memory or bundling error
- **Solution:**
  - `npm start` → Clear cache: Press `c`
  - On simulator: Restart and reinstall
  - Check for infinite loops in auth context

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `/src/screens/QueueBoardScreen.tsx` | Main queue board UI |
| `/src/screens/CheckoutScreen.tsx` | Payment processing UI |
| `/src/components/pos/BookingDetailSheet.tsx` | Booking detail bottom sheet |
| `/src/components/pos/FloorBoard.tsx` | Kanban-style queue display |
| `/src/api/queue.ts` | Queue API endpoints |
| `/src/api/transactions.ts` | Transaction/payment API |
| `/src/context/PosSessionContext.tsx` | Session state management |
| `/src/context/AuthContext.tsx` | Authentication & login |
| `/src/hooks/useQueueBoard.ts` | Queue board data fetching |

---

## Additional Resources

- **Expo Docs (v57):** https://docs.expo.dev/versions/v57.0.0/
- **Meikigo API:** http://meiki-api.test:8083 (local dev)
- **Supabase Console:** https://app.supabase.com/
- **React Native Docs:** https://reactnative.dev/

---

## Notes for Developers

1. **Real-time Sync:** The queue board auto-refreshes when another barber completes a service
2. **Offline Support:** ConnectivityProvider detects network status; shows banner when offline
3. **Dark Mode:** Tap theme button in More menu to toggle dark/light/system
4. **PIN-Protected Actions:** Manager options require PIN entry (MANAGER_PIN constant)
5. **Display Mode:** Press PIN button to show public queue display on second screen
6. **Payment Stubs:** In development, `EXPO_PUBLIC_USE_PAYMENT_STUBS=true` mocks payment processing

---

**Last Updated:** 2026-09-25  
**App Version:** 1.0.0  
**Tested With:** Expo CLI, React Native 0.86.2
