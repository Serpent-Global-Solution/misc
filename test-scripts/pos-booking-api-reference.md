# POS App: Booking API & State Management Reference

## API Endpoints

### Queue Management

#### Start Service (Mark In-Progress)
```http
POST /api/v1/queue-lines/{lineId}/start
```

**Purpose:** Transition a waiting queue line to "InService" status (customer in chair)

**Request:**
- No body required
- Auth: Bearer token (staff)

**Response (200 OK):**
```json
{
  "id": "line-uuid",
  "queueTicketId": "ticket-uuid",
  "employeeId": "emp-uuid",
  "status": "InService",
  "productId": "prod-haircut",
  "productName": "Haircut",
  "priceSnapshotCents": 4500,
  "estimatedDurationMinutesSnapshot": 30,
  "employeeName": "Ahmed",
  "createdAt": "2024-09-25T14:00:00Z",
  "cancelledAt": null
}
```

**Error Cases:**
```json
{
  "error": "Employee has active service",
  "status": 409
}
```

**Source Code:**
- `POST` handler: meikigo-api backend controller
- Frontend call: `/src/api/queue.ts` → `startQueueLine(lineId)`

---

#### Complete Service (Mark Done)
```http
POST /api/v1/queue-lines/{lineId}/complete
```

**Purpose:** Transition a service from "InService" to "Completed" after payment

**Request:**
- No body required
- Auth: Bearer token (staff)

**Response (200 OK):**
```json
{
  "id": "line-uuid",
  "status": "Completed",
  "completedAt": "2024-09-25T14:35:00Z",
  ...
}
```

**Automatic Trigger:**
- Called after payment settles (post-transaction)
- In `CheckoutScreen.tsx` → `completePaidQueueLines()`
- OR in `QueueBoardScreen.tsx` → `completeQueueLine()` effect

---

### Transaction & Payment

#### Create Transaction
```http
POST /api/v1/outlets/{outletId}/transactions
```

**Purpose:** Create a transaction record and initiate payment

**Request:**
```json
{
  "queueTicketId": "ticket-uuid",
  "clientId": "client-uuid or null",
  "lines": [
    {
      "productId": "prod-haircut",
      "quantity": 1,
      "employeeId": "emp-uuid",
      "queueLineId": "line-uuid"
    }
  ],
  "discounts": [
    {
      "kind": "AdHoc",
      "valueType": "Percentage | Fixed",
      "value": 10,
      "reason": "Birthday discount"
    }
  ],
  "tips": [
    {
      "employeeId": "emp-uuid",
      "amountCents": 200
    }
  ],
  "paymentMethod": "Cash | Card | DuitNowQr",
  "approvingUserAccountId": "admin-uuid or null",
  "approvalPassword": "password if discount",
  "isManualEntry": false
}
```

**Response (201 Created):**
```json
{
  "id": "txn-uuid",
  "queueTicketId": "ticket-uuid",
  "status": "Pending | Settled",
  "amount": {
    "subtotalCents": 4500,
    "discountCents": 0,
    "tipCents": 200,
    "totalCents": 4700
  },
  "paymentMethod": "Cash",
  "reference": "REF-2024-1234",
  "approvalCode": "ABC123",
  "lines": [...],
  "createdAt": "2024-09-25T14:35:00Z",
  "settledAt": null
}
```

**For Electronic Payments (DuitNow QR / Card):**
- Backend generates QR code payload
- Returns `qrPayload` or `qrUrl` in response
- Frontend displays QR via `react-native-qrcode-svg`
- Backend waits for payment gateway webhook

**Error Cases:**
```json
{
  "error": "Discount requires approval",
  "status": 400
}
```

**Source Code:**
- Frontend: `/src/screens/CheckoutScreen.tsx` → `handlePay()` → `createTxn()`
- API: `/src/api/transactions.ts` → `createTransaction()`

---

### Queue Ticket Details

#### Get Queue Ticket
```http
GET /api/v1/queue-tickets/{ticketId}
```

**Response:**
```json
{
  "id": "ticket-uuid",
  "displayNumber": 1002,
  "type": "Booking | WalkIn",
  "clientId": "client-uuid or null",
  "clientName": "Sarah Ahmed",
  "clientPhone": "+60123456789",
  "bookingSlotAt": "2024-09-25T14:30:00Z",
  "walkInLabel": "Customer",
  "lines": [
    {
      "id": "line-uuid",
      "status": "InService | Waiting | Completed | Cancelled",
      "employeeId": "emp-uuid",
      "employeeName": "Ahmed",
      "productId": "prod-haircut",
      "productName": "Haircut",
      "priceSnapshotCents": 4500,
      "estimatedDurationMinutesSnapshot": 30,
      "createdAt": "2024-09-25T14:00:00Z",
      "cancelledAt": null
    }
  ],
  "createdAt": "2024-09-25T14:00:00Z"
}
```

---

## Queue Line Status Transitions

### State Diagram
```
┌─────────┐
│ Waiting │  (Checked in, yellow pill)
│ (Yellow)│
└────┬────┘
     │ [START CUT button]
     │ POST /queue-lines/{id}/start
     ↓
┌─────────┐
│InService│  (In chair, lavender pill)
│(Lavender)│
└────┬────┘
     │ [COMPLETE & PAY button]
     │ POST /transactions (create)
     │ [Select payment method]
     │ [Payment settles]
     │ POST /queue-lines/{id}/complete
     ↓
┌──────────┐
│Completed │  (Completed, green pill)
│ (Green) │
└──────────┘

Alternative paths:
Waiting → Requeued (5-min grace period)
Waiting → NoShow (past slot time, bookings only)
Waiting → Cancelled (manual cancel + reason)
InService → Cancelled (manual cancel + reason)
```

---

## Frontend State Management

### QueueBoardScreen Component State

**Location:** `/src/screens/QueueBoardScreen.tsx`

#### Key State Variables
```typescript
// Queue data
const { columns, setColumns, loading, error, refresh } = useQueueBoard(outletId);
const { tickets: checkoutTickets, paidTicketIds, refresh: refreshCheckoutQueue } = useCheckoutQueue(outletId);

// UI state
const [selected, setSelected] = useState<BoardLineEntry | null>(null);
const [boardView, setBoardView] = useState<"lanes" | "timeline">("lanes");
const [staffFilter, setStaffFilter] = useState("all");

// Action state
const [pendingLineId, setPendingLineId] = useState<string | null>(null);
const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);
const [actionError, setActionError] = useState<string | null>(null);

// Shift tracking
const [onShiftIds, setOnShiftIds] = useState<Set<string>>(() => new Set());
const [onBreakIds, setOnBreakIds] = useState<Set<string>>(() => new Set());

// Checkout flow
const [checkoutTicket, setCheckoutTicket] = useState<CheckoutableTicket | null>(null);
const [showCashierPicker, setShowCashierPicker] = useState(false);
const [receipt, setReceipt] = useState<TransactionResult | null>(null);

// Modals
const [showNewWalkIn, setShowNewWalkIn] = useState(false);
const [showNewBooking, setShowNewBooking] = useState(false);
const [showDayClose, setShowDayClose] = useState(false);
```

#### BarberBoardColumn Type
```typescript
type BarberBoardColumn = {
  employee: Employee;
  now: BoardLineEntry[];      // Currently serving
  waiting: BoardLineEntry[];  // Checked in, waiting
  completedTodayCount: number;
};

type BoardLineEntry = {
  ticket: QueueTicket;
  line: QueueLine;
  customerLabel: string;
  customerPhone?: string;
};
```

---

### BookingDetailSheet Props

**Location:** `/src/components/pos/BookingDetailSheet.tsx`

```typescript
type Props = {
  entry: BoardLineEntry | null;           // Selected booking
  columns?: BarberBoardColumn[];           // All barbers
  pending: boolean;                        // Action in progress
  canStart: boolean;                       // Can click "Start cut"
  paymentInFlight?: boolean;               // Payment processing
  actingAsLabel?: string;                  // Manager override label
  onClose: () => void;
  onStart: () => void;                     // "Start cut" handler
  onComplete: () => void;                  // "Complete & pay" handler
  onRequeue: () => void;                   // "Requeue" handler
  onNoShow: () => void;                    // "No-show" handler
  onCancel: () => void;                    // "Cancel booking" handler
  onPay?: () => void;                      // Payment for completed line
  onAddService?: () => void;               // Add service to booking
  onReassign?: () => void;                 // Reassign to another barber
};
```

#### Button Visibility Logic
```typescript
// When status is "Waiting" and canStart is true
showButtons: ["START CUT", "Reassign", "No-show/Requeue", "Cancel"]

// When status is "Waiting" but !canStart (barber busy or not first)
showButtons: ["Reassign", "Requeue", "No-show", "Cancel"]

// When status is "InService" or "Called"
paymentInFlight ? ["Payment in progress", "Close"] : ["COMPLETE & PAY", "Add service"]

// When status is "Completed"
onPay ? ["TAKE PAYMENT"] : ["Close"]
```

---

### Optimistic Updates

**Pattern:** Move card UI before API response

```typescript
// FloorBoard.tsx → onMoveEntry handler
const previousColumns = columns;
setColumns((prev) =>
  prev
    ? moveEntryOptimistic(prev, entry, targetEmployeeId, targetStatus)
    : prev
);

// Execute API call
try {
  await moveQueueLine(lineId, { employeeId, status });
  await refresh();
} catch (err) {
  // Revert on error
  setColumns(previousColumns);
  setActionError(toDisplayMessage(err));
}
```

---

### Payment Settlement Effect

**Location:** `QueueBoardScreen.tsx` lines 402-440

```typescript
useEffect(() => {
  if (!columns) return;
  
  // Filter freshly settled payments
  const freshly = pendingPayments.filter(
    (e) =>
      e.phase === "settled" &&
      e.settled?.queueTicketId &&
      !settledTxnRef.current.has(e.transactionId)
  );
  
  if (freshly.length === 0) return;

  // Auto-complete queue lines for settled transactions
  void (async () => {
    for (const entry of freshly) {
      settledTxnRef.current.add(entry.transactionId);
      const ticketId = entry.settled!.queueTicketId!;
      
      for (const col of columns) {
        for (const boardEntry of col.now) {
          if (
            boardEntry.ticket.id === ticketId &&
            boardEntry.line.status === "InService"
          ) {
            lineIds.push(boardEntry.line.id);
          }
        }
      }
    }
    
    if (lineIds.length === 0) return;

    for (const lineId of lineIds) {
      try {
        await completeQueueLine(lineId);
      } catch {
        continue;
      }
    }
    await refreshRef.current.refresh();
    await refreshRef.current.refreshCheckoutQueue();
  })();
}, [pendingPayments, columns]);
```

This effect:
1. Watches `PendingPaymentsContext` for settled transactions
2. Finds matching queue lines in "InService" status
3. Calls `completeQueueLine()` for each
4. Refreshes board view

---

## CheckoutScreen Payment Flow

**Location:** `/src/screens/CheckoutScreen.tsx`

### handlePay() Function
```typescript
const handlePay = async () => {
  if (shortfall || submitting) return;  // Prevent double-submit
  
  setPayError(null);
  setSubmitting(true);
  
  try {
    if (method === "cash") {
      // Cash payment settles immediately
      const txn = await createTxn("Cash");
      if (!txn) return;
      
      await completePaidQueueLines();  // Mark lines complete
      setReceipt(txn);  // Show receipt
      return;
    }
    
    // Electronic payment (QR/Card)
    const electronic: "Card" | "DuitNowQr" =
      method === "card" ? "Card" : "DuitNowQr";
    
    const txn = await createTxn(electronic);
    if (!txn) return;
    
    // Open payment panel, wait for settlement
    setElectronicMethod(electronic);
    setElectronicTxn(txn);
  } catch (err) {
    setPayError(toDisplayMessage(err));
  } finally {
    setSubmitting(false);
  }
};
```

### completePaidQueueLines() Function
```typescript
const completePaidQueueLines = async () => {
  // Get line IDs that were just paid
  const paidLineIds = new Set(
    cart.lines
      .map((l) => l.queueLineId)
      .filter((id): id is string => Boolean(id))
  );
  
  // Complete each line
  for (const line of ticket.lines) {
    if (line.status !== "InService" || !paidLineIds.has(line.id)) continue;
    
    try {
      await completeQueueLine(line.id);  // POST /queue-lines/{id}/complete
    } catch {
      continue;  // Ignore errors, user sees receipt anyway
    }
  }
};
```

---

## Context Providers

### PosSessionContext
Manages outlet, identity, and session phase
```typescript
type PosSessionContextType = {
  outlet: OutletInfo | null;
  identity: Identity | null;
  role: "Admin" | "Cashier" | "read-only-display" | null;
  phase: "loading" | "bound" | "unbound" | "revoked" | "error";
  error: string | null;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  enterDisplayMode: () => void;
};
```

### PendingPaymentsContext
Tracks transactions in flight (settled/pending)
```typescript
type PendingPayment = {
  transactionId: string;
  phase: "pending" | "settled";
  settled?: {
    queueTicketId?: string;
  };
  transaction: TransactionResult;
  paymentMethod: PaymentMethod;
};
```

### ApprovalContext
Gating discount approval
```typescript
type ApprovalContext = {
  runWithApproval<T>(
    fn: (creds: ApprovalCredentials) => Promise<T>,
    options: ApprovalOptions
  ): Promise<T>;
};
```

---

## Error Handling Strategy

### toDisplayMessage()
**Location:** `/src/lib/errorMessage.ts`

Converts errors to user-friendly messages:
```typescript
export function toDisplayMessage(err: unknown): string {
  if (err instanceof ApiError) {
    // Backend error with message
    return err.message ?? "Request failed";
  }
  if (err instanceof TypeError) {
    // Network error
    return "Connection error — check your network";
  }
  return "Something went wrong";
}
```

### Error Boundaries
- Action errors display in inline banner (red background)
- API errors prevent button clicks (opacity 0.5, disabled)
- Network errors show ConnectivityBanner (top of screen)

---

## Testing Helpers

### useQueueBoard Hook
```typescript
const { columns, setColumns, loading, error, refresh } = useQueueBoard(outletId);

// columns = BarberBoardColumn[] organized by employee
// Filters by outlet, sorts by display number
// Refetch: await refresh()
```

### useDraftCart Hook
```typescript
const cart = useDraftCart(ticket);

// Structure:
{
  lines: CartLine[];          // Items to charge
  subtotalCents: number;
  discount?: DiscountLine;
  tip?: TipLine;
}
```

---

## Key Constants

**POS App Constants**

```typescript
// Barber pins (from /src/lib/barberPin.ts)
MANAGER_PIN = "1234";          // Unlock manager features
DISPLAY_MODE_PIN = "5678";     // Unlock wall display

// Late booking threshold (QueueBoardScreen + TicketCard)
LATE_AFTER_MS = 15 * 60 * 1000  // 15 minutes past slot time
```

---

## Network Monitoring (Development)

### API Base URL
Default: `http://meiki-api.test:8083`
Override: `EXPO_PUBLIC_MEIKIGO_API_BASE_URL`

### Key Endpoints for Monitoring
| Endpoint | Call | UI Event |
|----------|------|----------|
| `/api/v1/pos/me` | Auth check | Login → Outlet selection |
| `/api/v1/outlets/{id}/queue` | useQueueBoard | Board refresh |
| `/api/v1/queue-lines/{id}/start` | Start cut | Waiting → InService |
| `/api/v1/transactions` | Complete & Pay | Checkout screen |
| `/api/v1/queue-lines/{id}/complete` | Auto (post-payment) | Receipt → Board close |

### Browser DevTools (Web)
1. Open `http://localhost:19000` on web
2. Open DevTools → Network tab
3. Filter by API calls, monitor responses

### Mobile Network Inspector
- iOS: Simulator → Debug → Network Link Conditioner
- Android: Android Studio → Network Profiler

---

## Performance Considerations

### Optimizations
1. **Debounced Refresh:** useQueueBoard polls every 2-3 seconds with debounce
2. **Optimistic UI:** Moves update UI before confirmation
3. **Memoized Selectors:** useMemo on expensive filters (inChairRows, etc.)
4. **Lazy Loaded:** DisplayScreen loaded only for display-mode users

### Known Bottlenecks
- If >20 employees/barbers: Board may feel sluggish
- If >50 tickets in queue: Performance degrades
- Drag-to-assign expensive when many cards re-render

---

**Last Updated:** 2026-09-25  
**API Version:** v1  
**Backend:** .NET 10 + EF Core
