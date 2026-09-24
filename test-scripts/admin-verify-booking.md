# Admin Portal: Verifying and Managing Cut Service Bookings

## Overview

The Meikigo admin portal enables staff to verify and manage customer cut service bookings through a two-step access pattern:

1. **Authentication**: Login to the admin portal at `http://meiki-admin.test:3004`
2. **Shop Access**: Open a support session for the target shop
3. **Booking Management**: Access the shop's merchant portal to view and manage bookings

This guide documents how to navigate this flow to find, view, and verify booking details.

---

## Part 1: Admin Portal Login

### Prerequisites
- Email: `haziq@meikigo.com` (or authorized staff account)
- Password: `Test1234`
- Browser: Chrome/Firefox/Safari (JavaScript enabled)
- URL: `http://meiki-admin.test:3004`

### Login Flow

1. **Navigate to Admin Portal**
   - Open browser and go to `http://meiki-admin.test:3004`
   - If not logged in, you'll be redirected to Keycloak login page

2. **Enter Credentials**
   - Email field: Enter `haziq@meikigo.com`
   - Password field: Enter `Test1234`
   - Click "Sign In" button

3. **Verify Login Success**
   - You'll see the Dashboard with:
     - Greeting: "Hi [First Name]." (e.g., "Hi Haziq.")
     - Role badge: "Staff" or "Support" (depends on your permissions)
     - Four metric tiles showing:
       - Open visits
       - Payouts waiting
       - Complaints open
       - Bills unpaid

---

## Part 2: Opening a Support Session to a Shop

### Dashboard Navigation

1. **From Dashboard, locate the "Start a job" section**
   - Scroll down to see three cards: "Shop", "Customer", "Money", "Settings"
   - Click on the "Shop" card

2. **Alternative Direct Navigation**
   - Click menu → "Shop" or navigate to `/support/open`

### Shop Directory Interface

**You will see:**
- Search bar at top: "Search shops by name or ID"
- Filter toggle: "Open visits only" (checkbox)
- List of shops with columns:
  - Shop name
  - Brand (parent company)
  - Status (open/closed)
  - Support session status

### Opening a Support Session

1. **Find the target shop**
   - Use search bar to filter by shop name
   - Example: Search "Barbershop ABC" or "Outlet 001"

2. **Click on the shop row** to expand details

3. **Look for "Open Support Session" button**
   - You may need to scroll right to see it
   - Or look in a dropdown menu for the shop

4. **Configure the session**
   - Reason: Select from dropdown (e.g., "Customer support", "Technical issue")
   - Duration: Choose hours (default is from platform settings, typically 2-4 hours)
   - Click "Open Session"

5. **Session confirmation**
   - A new tab or window will open with the shop's merchant portal
   - URL will be something like: `http://meiki-brand.test:3000/login` (if already logged in, skip to dashboard)
   - A banner appears: "Support session active until [end time]"

---

## Part 3: Navigating the Shop's Merchant Portal

**Note:** This portal is accessed by opening a support session from the admin panel. The admin is logged in as the shop's hidden support account.

### Main Navigation

Once logged into the merchant portal, look for the left sidebar or top navigation:
- Dashboard (home icon)
- **Bookings** ← This is what we need
- Calendar
- Settings

### Accessing the Bookings Section

1. **Click "Bookings"** in the main navigation
   - Or navigate directly to the bookings page if URL is visible
   - Page title: "Bookings" with a subtitle explaining the view

---

## Part 4: The Bookings List View

### Bookings Table Layout

The bookings page displays a data table with the following columns:

| Column | Description | Format |
|--------|-------------|--------|
| **Date** | When the booking is scheduled | "Today", "Mon 25 Sep", "Tue 26 Sep", etc. |
| **Time** | Start time of the appointment | "14:30" (24-hour format) |
| **Customer** | Name of the customer with booking ref | Name on first line, booking reference (e.g., "BOOK-001") below in monospace |
| **Service** | Type of service booked | "Haircut", "Fade", "Beard Trim", etc. |
| **Barber** | Staff member performing service | Name of the barber/stylist |
| **Status** | Current state of booking | Badge with color: "Confirmed" (blue), "Checked-in" (green), "In-service" (orange), "Completed" (gray), "No-show" (red), "Cancelled" (red) |
| **Amount** | Price quoted for service | "RM 35.00", "RM 50.00", etc. |

### Filters and Search

**Filter Controls (above the table):**

1. **Date Filter** (button/dropdown)
   - "Today" — shows only today's bookings
   - "This week" — shows this week's bookings (default)
   - "All" — shows all bookings

2. **Status Filter** (dropdown or pill buttons)
   - "All" (count of total)
   - "Confirmed" (count)
   - "Checked-in" (count)
   - "In-service" (count)
   - "Completed" (count)
   - "No-show" (count)
   - "Cancelled" (count)

3. **Barber/Staff Filter** (dropdown)
   - "All" — all staff
   - Individual staff names: "Ahmad", "Siti", "Raj", etc.

4. **Search Box** (text input)
   - Type customer name, phone number, booking reference, service name, or barber name
   - Search is real-time (filters as you type)
   - Example searches:
     - "Ahmed" (finds bookings by/for Ahmed)
     - "60123456789" (phone number)
     - "BOOK-001" (booking reference)
     - "Fade" (service type)

### Example Bookings Table Data

```
Date  Time  Customer              Service      Barber    Status      Amount
---   ---   --------              -------      ------    ------      ------
Today 14:00 Mohammad Azizul       Haircut      Ahmad     Confirmed   RM 35.00
            BOOK-2425-0001
Today 14:30 Siti Nordiana         Beard Trim   Raj       Checked-in  RM 25.00
            BOOK-2425-0002
Today 15:00 Alice Wong            Fade         Siti      In-service  RM 40.00
            BOOK-2425-0003
Mon   10:00 Kumar Rajesh          Haircut      Ahmad     Confirmed   RM 35.00
            BOOK-2425-0004
Mon   11:00 Fatimah Hassan        Colour       Siti      Completed   RM 85.00
            BOOK-2425-0005
```

---

## Part 5: Viewing Booking Details

### Opening a Booking Detail View

1. **Click on any booking row** in the table
   - The entire row is clickable
   - A right-side drawer/panel will slide open

2. **Alternatively**, look for a "Details" or expand icon if the UI shows one

### Booking Detail Drawer Layout

**Header Section:**
- Booking reference (small text, e.g., "BOOK-2425-0001")
- Customer name (main heading)
- Status badge (color-coded, positioned top-right)

**Main Content Sections:**

#### Appointment Section
```
Appointment
-----------
Date:       Monday, 25 September 2025
Time:       14:00 - 14:45
Duration:   45 min
Service:    Haircut
Barber:     Ahmad
Source:     Online booking  (or "Walk-in" or "Phone booking")
```

#### Customer Section
```
Customer
--------
Phone:      +601234567890
Notes:      [if applicable] "Customer allergic to products X and Y"
```

#### Payment Section
```
Payment
-------
Quoted:     RM 35.00
```

### Status-Specific Information

- **Confirmed booking**: Shows appointment details only; ready for check-in
- **Checked-in booking**: Appointment details shown; waiting to start service
- **In-service booking**: Appointment details shown; payment action available
- **Completed booking**: Shows appointment details; receipt available via "View Receipt" button
- **No-show/Cancelled**: Shows original appointment details; rebook option available

---

## Part 6: Booking Actions by Status

### Confirmed Status → Available Actions

**Buttons shown in drawer footer:**
- **Check in** (primary button) — Marks booking as checked-in; customer has arrived
- **Reschedule** (secondary button) — Opens rescheduling dialog; changes date/time/barber

### Checked-in Status → Available Actions

**Buttons shown in drawer footer:**
- **Start service** (primary button) — Changes status to "in-service"; service is beginning
- **Mark no-show** (secondary button) — Changes status to "no-show"; customer did not appear

### In-service Status → Available Actions

**Buttons shown in drawer footer:**
- **Complete & take payment** (primary button) — Opens payment method selector

**Payment Method Selection:**
A modal/panel shows three payment options:
- Cash
- DuitNow
- Card

Select the method used; system records payment and marks booking as "Completed"

### Completed Status → Available Actions

**Buttons shown in drawer footer:**
- **View receipt** (secondary button) — Opens receipt display (shows itemization, amount, payment method)

### No-show or Cancelled Status → Available Actions

**Buttons shown in drawer footer:**
- **Rebook** (primary button) — Opens new booking form pre-filled with:
  - Same customer name
  - Same phone number
  - Same service type
  - Same barber preference (if applicable)
  - Admin can change date/time as needed

---

## Part 7: Common Verification Workflows

### Workflow 1: Find and Verify a Specific Customer's Booking

**Steps:**
1. On Bookings page, locate the search box (top area)
2. Enter customer name or phone number
3. Results filter in real-time
4. Click on the booking row
5. Verify details in the drawer:
   - Customer phone matches records
   - Service and barber are as expected
   - Date/time align with customer confirmation
   - Amount is correct

**Example:**
- Search "60123456789" → Shows all bookings for that phone
- Click a booking → Verify "BOOK-2425-0001" for "Mohammad Azizul" on Sept 25 at 14:00

---

### Workflow 2: Check In a Customer Arriving for Their Booking

**Steps:**
1. Filter by "Today" to see today's bookings
2. Search customer name or wait for them to call out their name
3. Click on the booking row
4. Verify phone number or identification matches the booking details
5. Click **"Check in"** button in the drawer footer
6. Booking status changes to "Checked-in" (green badge)
7. Close drawer; customer is now ready for service

---

### Workflow 3: Mark a Customer as No-Show

**Steps:**
1. Filter bookings by "Today" + "Confirmed" status
2. After appointment time has passed and customer did not arrive:
3. Search for the customer
4. Click the booking row
5. Click **"Mark no-show"** button
6. Status changes to "No-show" (red badge)
7. Drawer closes automatically
8. Customer's booking no longer shows as "Confirmed"

---

### Workflow 4: Complete a Service and Record Payment

**Steps:**
1. Find the booking with status "In-service"
2. Click on it to open the drawer
3. Click **"Complete & take payment"** button
4. Payment method selector appears with three options:
   - Cash
   - DuitNow
   - Card
5. Select the method the customer used
6. System records payment and marks booking "Completed"
7. Drawer closes; booking now shows "Completed" status with gray badge

---

### Workflow 5: Reschedule or Rebook a Booking

**For Confirmed Bookings (Reschedule):**
1. Click the booking to open drawer
2. Click **"Reschedule"** button
3. New booking form opens with pre-filled fields:
   - Customer name
   - Phone
   - Service type
   - Barber preference
4. Admin can change:
   - Date (calendar picker)
   - Time (time picker)
   - Barber (dropdown if available)
5. Click "Save" or "Confirm"
6. Original booking is replaced; new time is now in the system

**For Completed/No-show/Cancelled Bookings (Rebook):**
1. Click the booking to open drawer
2. Click **"Rebook"** button
3. New booking form opens pre-filled with same customer/service
4. Select new date and time
5. Click "Save"
6. New booking is created; old booking remains in history with its original status

---

## Part 8: Troubleshooting and Tips

### Booking Not Appearing in List?

1. **Check Date Filter**
   - If filtering by "Today", booking may be in the future
   - Change filter to "This week" or "All"

2. **Check Status Filter**
   - If filtering by "Confirmed", completed bookings won't show
   - Check "All" to see all statuses

3. **Search Issues**
   - Ensure search box is cleared (click X if visible)
   - Try searching by phone if name search fails
   - Phone format: use digits only (0123456789 or 60123456789)

4. **Barber Filter**
   - If filtering by a specific barber, bookings for other barbers won't show
   - Change to "All"

### Booking Reference Not Recognizable?

- Format is typically "BOOK-YYMM-NNNN"
  - YY = year (25 for 2025)
  - MM = month (09 for September)
  - NNNN = sequential number

---

## Part 9: Data Model Reference

### BookingRecord Structure (What You're Viewing)

```
{
  id: string                    // Unique booking ID
  ref: string                   // Display reference (BOOK-2425-0001)
  customer: string              // Customer full name
  phone: string                 // Phone number (or "-" if masked)
  date: string                  // YYYY-MM-DD format (2025-09-25)
  startMinutes: number          // Minutes from 00:00 (840 = 14:00)
  durationMinutes: number       // Duration (45, 60, etc.)
  services: string              // Service name ("Haircut", "Fade", etc.)
  staffName: string             // Barber/staff name
  source: "online" | "walk-in" | "phone"  // Booking source
  status: "confirmed" | "checked-in" | "in-service" | "completed" | "no-show" | "cancelled"
  amount: number                // Price in RM (35.00)
  notes?: string                // Optional customer notes
}
```

### Status Values Explained

| Status | Meaning | User Action Next |
|--------|---------|------------------|
| `confirmed` | Booking is confirmed; customer hasn't arrived | Check in when customer arrives |
| `checked-in` | Customer has arrived and checked in | Start service when ready |
| `in-service` | Service is currently being performed | Complete and record payment when done |
| `completed` | Service finished and payment collected | View receipt if needed |
| `no-show` | Customer did not arrive for booking | Optionally rebook or follow up |
| `cancelled` | Booking was cancelled (by admin or customer) | Optionally rebook if customer requests |

---

## Part 10: Accessing Bookings via API (For Automation)

**Note:** Due to Playwright connectivity issues, automation is not recommended. However, the underlying API structure is documented here for reference.

### API Endpoint Patterns (Meikigo API)

The booking list is fetched from the merchant portal's state, which communicates with:
- **Booking Fetch Endpoint**: `/api/v1/bookings` (or similar; exact path depends on API version)
- **Booking Detail Endpoint**: `/api/v1/bookings/{id}`
- **Update Booking Status**: `POST /api/v1/bookings/{id}/action` (e.g., check-in, start-service)

### State Management

The merchant portal uses React state management (likely Zustand or Context API) to:
- Fetch bookings on page load
- Filter and sort locally
- Update booking status on user actions
- Keep the list in sync with the backend

**Client-side filtering ensures:**
- Real-time search without network requests
- Instant filter changes (date, status, barber)
- Responsive UI during status transitions

---

## Part 11: Session Management

### Support Session Duration

- Typical duration: 2-4 hours (configurable by admin)
- Countdown timer visible in the merchant portal banner
- When session expires:
  - Automatic logout from merchant portal
  - Must return to admin portal and open a new support session
  - No data is lost; bookings are persisted in the system

### Closing a Support Session

1. Return to admin portal (different tab/window)
2. Navigate to `/support/open`
3. Find the shop with an open session (shown with "Open" status)
4. Click on the shop and select **"Close Support Session"** button
5. Session ends immediately
6. The merchant portal tab becomes inaccessible (redirects to login or error page)

### Best Practices

- Keep admin portal window open in background for quick session management
- Note the session end time before starting any long tasks
- Close the session when done to maintain audit trail and security
- Always work within a single support session per shop per task

---

## Part 12: Reference: Menu Navigation in Admin Portal

From the admin portal dashboard, the main navigation includes:

- **Dashboard** (home icon) — Overview, work queue, metrics
- **Shop** — Browse shops, open support sessions
- **Customer** — Search customers, unlock PII (phone/email)
- **Money** — Payouts, disputes, invoices (Finance only)
- **Settings** — Platform configuration, email, billing, etc.

For booking management, you always:
1. Go to **Shop**
2. Find and open support session
3. Access merchant portal
4. Navigate to **Bookings** within the merchant portal

---

## Part 13: Testing Checklist for Admin Booking Verification

Use this checklist to verify that the booking workflow is working end-to-end:

- [ ] **Login**: Can authenticate with staff credentials to admin portal
- [ ] **Shop Search**: Can find shops by name/ID in the shop directory
- [ ] **Support Session**: Can open a support session to a shop
- [ ] **Session Confirmation**: Session window/tab opens and shows merchant portal
- [ ] **Navigation**: Can find and click "Bookings" link in merchant portal
- [ ] **Booking List**: Bookings table loads with visible columns (date, time, customer, service, barber, status, amount)
- [ ] **Date Filter**: Filtering by "Today" / "This week" / "All" changes results
- [ ] **Status Filter**: Filtering by status (confirmed, checked-in, etc.) changes results
- [ ] **Barber Filter**: Filtering by barber name changes results
- [ ] **Search**: Can search by customer name and find bookings
- [ ] **Search**: Can search by phone number and find bookings
- [ ] **Search**: Can search by booking reference and find exact booking
- [ ] **Detail View**: Clicking a booking opens the detail drawer
- [ ] **Detail View**: Drawer shows all expected fields (appointment, customer, payment sections)
- [ ] **Check In**: Can click "Check in" on a confirmed booking
- [ ] **Start Service**: Can click "Start service" on a checked-in booking
- [ ] **Mark No-Show**: Can click "Mark no-show" on a confirmed booking
- [ ] **Complete & Pay**: Can click "Complete & take payment" on an in-service booking
- [ ] **Payment Methods**: Can select Cash / DuitNow / Card during payment
- [ ] **Reschedule**: Can reschedule a confirmed booking to a new date/time
- [ ] **Rebook**: Can rebook a no-show/cancelled booking
- [ ] **Session Close**: Can close the support session from admin portal
- [ ] **Session Expiry**: Session expires gracefully after configured duration

---

## Appendix: Known Limitations and Workarounds

### Playwright/Automation Issues

**Problem**: Playwright-based test automation has connectivity issues with the support session popup/new window.

**Workaround**: Perform manual verification steps as documented in this guide. The UI is straightforward and supports the following manual workflows:
- Find bookings via search or filters
- Verify all booking details in the drawer
- Perform status transitions (check-in, start, complete, etc.)
- Record payment and mark service complete

### API-Based Automation Alternative

If full automation is required in the future:
1. Use the Meikigo API directly (bypass UI)
2. Authenticate with staff JWT token from Keycloak
3. Call booking endpoints directly (if available in API contract)
4. Parse JSON responses for verification

See `meikigo-api/API-CONTRACTS.md` for the exact endpoint specifications.

---

## Appendix: Quick Reference Card

### Quick Steps: Verify a Booking

```
1. Login: http://meiki-admin.test:3004
   Email: haziq@meikigo.com
   Password: Test1234

2. Navigate to Shop (left menu or dashboard card)

3. Search for shop name, click it

4. Open Support Session
   Reason: "Customer support"
   Duration: 2-4 hours
   Click: "Open Session"

5. New window opens → merchant portal

6. Click "Bookings" in navigation

7. Use search or filters to find booking
   - Filter by Date: "Today"
   - Filter by Status: "Confirmed"
   - Search: Customer name or phone

8. Click booking row to see details

9. Verify:
   - Customer name matches
   - Phone number is correct
   - Date/time is as expected
   - Service and barber are correct
   - Status is appropriate

10. If service is complete:
    - Click "Complete & take payment"
    - Select payment method (Cash/DuitNow/Card)
    - Booking marked as "Completed"

11. Return to admin portal tab

12. Close support session (optional):
    - Click "Close Support Session" button
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-09-25  
**Author**: Meikigo Admin Documentation  
**Status**: For Staff Use
