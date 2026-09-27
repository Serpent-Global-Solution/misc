> Evidence paths are relative to `runs/2026-09-27-admin-retest/`.

# Meikigo exploratory test report — 2026-09-27

## Summary

This run covered only the **Meikigo admin portal**. Three personas used it: a new operations assistant looking around, a finance manager trying to change a setting, and an accounts executive checking settlements and disputes. Login, the dashboard, the Money screens and all Settings pages load and work. We found no Critical or High bugs. The most important finding is one the automated checks missed: the **Money tab in every shop's detail panel fails with a server error (500 INTERNAL_ERROR)**. The persona who hit it did not mention it in the diary. Other bugs are a contradiction in payout data (a shop marked "no bank account" also has a completed payout to a bank account), a settings search box that does nothing, and developer text shown to staff.

| App | Personas run | Goals completed | Confirmed bugs (by severity) | Usability issues |
|---|---|---|---|---|
| Admin portal (`meiki-admin.test:3004`) | 3 | 2 of 3 (1 gave up) | Critical 0 · High 0 · Medium 3 · Low 3 | 7 |

No bugs are UNCONFIRMED: I reproduced every one myself in the browser.

---

## Fix status (updated 2026-09-28)

All six bugs from this retest are fixed, verified in WebKit, and pushed to `main`.

| Bug | Fix | Commit |
|---|---|---|
| BUG-001 Shop Money tab 500 | API ran three queries on one DbContext at once (`Task.WhenAll`); now sequential | meikigo-api `f4dc389` |
| BUG-002 Fade Room "no bank account" | Sample data only: pending payout now carries the brand's ••••4471 account | meikigo-admin `54d031b` |
| BUG-003 Settings search does nothing | Visible result list, Enter/click opens the page, "No settings found" status | meikigo-admin `1d12eae` |
| BUG-004 Developer text on settings | Remaining API routes, field names, cron/webhook/seed wording rewritten | meikigo-admin `56d601f` |
| BUG-005 "CHIP state column" hint | Hint now points to Details and says the money is not in the bank yet | meikigo-admin `8c6aca3` |
| BUG-006 Reference badge contrast | Badge uses foreground text on a foreground/10 fill | meikigo-admin `494f374` |

The harness also changed. The oracle now flags server actions that return HTTP 200 with a 5xx error inside the payload (`server-action-5xx`), which is how BUG-001 got past it.

Usability items 1, 3, 5, 6 and 7 below are product decisions and are **still open**. Items 2 and 4 are covered by the BUG-003 and BUG-005 fixes.

---

## Bugs

### Shop detail "Money" tab shows "An unexpected error occurred" for every shop

- **ID:** BUG-001
- **Fix:** FIXED in meikigo-api `f4dc389`. `BrandMoneySummaryService` started 3 `CountAsync` calls on one DbContext with `Task.WhenAll`. EF Core threw "A second operation was started on this context instance", which the API turned into a 500. The in-memory test database never overlaps queries, so tests missed it. The calls now run one after another. Verified on all 4 shops (counts load). The tab takes about 8s to load because of the shared Supabase pooler (`EMAXCONNSESSION`, pool_size 15). That is a separate issue.
- **Severity:** Medium (a secondary feature fails completely, for every shop, from a server-side 500. The links below the error to the Money module still work, so this is a workaround.)
- **Status:** CONFIRMED (reproduced on both shops in the system)
- **App:** Admin portal
- **Page/route:** Work → Shop (`/support/open`) → View → **Money** tab
- **Steps to reproduce:**
  1. Go to http://meiki-admin.test:3004 and sign in with ADMIN_EMAIL / ADMIN_PASSWORD.
  2. In the left menu, under Work, click **Shop**.
  3. On the "QA Barber Test" row, click **View**.
  4. In the panel that opens, click the **Money** tab.
  5. Close the panel and repeat for "Wak Jono Barber". It fails the same way.
- **Expected:** A per-shop money summary, such as counts of payouts, complaints and bills. The panel says "Counts here come from the live database".
- **Actual:** In place of the counts, the panel shows the message "An unexpected error occurred. Please try again." The Payouts / Payment complaints / Monthly bills links below it still work.
- **Evidence:**
  - HTTP: `POST http://meiki-admin.test:3004/support/open` (Next.js server action), request body `["635dcc93-8f7a-4b1a-9b4e-bfc059d196ae"]` (the brand ID) → HTTP **200**, but the response body is `{"ok":false,"error":{"status":500,"code":"INTERNAL_ERROR","message":"An unexpected error occurred. Please try again.","details":null}}`. The backend call behind this action fails with a 500.
  - The oracle recorded **no signal**, because the server action returns HTTP 200 and nothing is logged to the console. The harness should also detect `ok:false` / 5xx inside server action payloads.
  - Persona snapshot: `admin-first-look__webkit/artifacts/page-2026-09-27T14-04-14-670Z.yml` (line 100). Session log: `admin-first-look__webkit/artifacts/session-1790517822590/session.md` (line 222).
  - Triage screenshot: `_triage/bug-shop-money-tab-error.png`
- **Found by:** admin-first-look__webkit (and reproduced in triage)

### The Fade Room is marked "no bank account" in the payout queue but has a completed payout to account ••••4471

- **ID:** BUG-002
- **Fix:** FIXED in meikigo-admin `54d031b`. This was a sample-data bug only. In `lib/chip-mock.ts` the pending Fade Room payout had `bankAccount: null`. It now has the same ••••4471 account. The real API returns the brand's single settlement account, so live data cannot contradict itself this way. One payout is now approvable, so the approve flow can be tested. The dev server has to be restarted to pick up the new sample data.
- **Severity:** Medium (the screen contradicts itself, and the wrong flag blocks approval of an RM 88.00 payout)
- **Status:** CONFIRMED (seen by admin-money-check, reproduced in triage)
- **App:** Admin portal
- **Page/route:** Money → Payouts, Queue (`/chip/settlements`) and History (`/chip/settlements?view=history`)
- **Steps to reproduce:**
  1. Sign in with ADMIN_EMAIL / ADMIN_PASSWORD.
  2. Click **Money (7)** in the left menu. The Payout queue opens.
  3. Look at the row for **The Fade Room**. It says "BRD03 · no bank account". **Approve & pay out** is disabled, with the tooltip "This Brand has never registered a bank account with CHIP Send, so there is nowhere to pay the money to."
  4. Click the **History** tab.
  5. Look at the row for **The Fade Room**: "BRD03 · ••••4471", RM 2,105.00, status **Completed** ("The payout reached the Brand's bank account."), 28/08/2026, with a CHIP receipt link.
- **Expected:** One consistent bank-account state per shop. If the shop was paid to ••••4471 on 28/08, the queue should show that account and allow approval. If it truly has no account, the history should not show a completed bank payout.
- **Actual:** The queue says the shop never registered a bank account. The history shows a completed payout to its bank account.
- **Evidence:**
  - Persona snapshots: `admin-money-check__webkit/artifacts/page-2026-09-27T14-04-04-121Z.yml` (queue) and `admin-money-check__webkit/artifacts/page-2026-09-27T14-04-10-596Z.yml` (history). Session log: `admin-money-check__webkit/artifacts/session-1790517824542/session.md` (lines 101 and 131).
  - Triage screenshot: `_triage/bug-fade-room-history.png`
  - Note: every Money page shows the banner "Sample data. Payment endpoints are not live yet." The cause may be inconsistent sample data rather than logic. Either way, fix it: staff reviewing payouts will read this as real, and the "no bank account" rule must not disagree with payout history once the data is live.
- **Found by:** admin-money-check__webkit

### "Search settings" box does nothing: no results and no "nothing found" message

- **ID:** BUG-003
- **Fix:** FIXED in meikigo-admin `1d12eae`. The native `<datalist>` was replaced with a visible result list, in which every word must match the page label or keywords. Enter opens the first match, a click opens that page, and a `role="status"` "No settings found" message shows when nothing matches. Verified: "support hours" finds Platform, and "commission" finds CHIP commission. The results appear in the accessibility snapshot that agents read.
- **Severity:** Medium (a secondary feature fails, and it cost a persona their task: they had to click through about 12 settings pages by hand)
- **Status:** CONFIRMED (reproduced in triage)
- **App:** Admin portal
- **Page/route:** Settings, on any settings page (for example `/settings/platform`). The search box sits at the top left.
- **Steps to reproduce:**
  1. Sign in with ADMIN_EMAIL / ADMIN_PASSWORD.
  2. Click **Settings** in the left menu.
  3. Click the **Search settings** box and type `commission`. A "CHIP commission" settings page exists under Billing.
  4. Wait, then press Enter.
- **Expected:** A dropdown of matching settings, such as "CHIP commission", or a clear "No settings found" message.
- **Actual:** Nothing happens. No dropdown or listbox appears, the page does not change, and no message shows. The field is announced to screen readers as a combobox, but it never shows any options.
- **Evidence:**
  - Triage screenshot: `_triage/bug-settings-search-no-results.png` (the box contains "commission" and the page is unchanged)
  - Persona session: `admin-change-setting__webkit/artifacts/session-1790517822590/session.md` (lines 170–213). The persona typed "support hours" and the snapshot after a 1-second wait shows no results.
  - Diary quote: "Typing 'support hours' into the 'Search settings' search box did nothing — no dropdown, no filtered results, no message saying 'no results.'"
- **Found by:** admin-change-setting__webkit

### Developer and API text shown to staff on settings pages

- **ID:** BUG-004
- **Fix:** FIXED in meikigo-admin `56d601f`. Rewrote the Email packages note, the Payroll Reference help, the pilot toggle (`isPilotBrand`), and the Billing cycle cron/whitelist/webhook text. Also rewrote the "webhook" wording on the monthly bills, complaints and paid badge, and changed "Payroll seed defaults" to "Default payroll settings". A scan of all 16 admin pages with every help panel expanded finds no developer terms. Testing tools are now hidden from users who cannot change settings. The test admin can change settings, so it still sees them, collapsed.
- **Severity:** Low (wording; no task blocked)
- **Status:** CONFIRMED (appeared in 2 sessions; reproduced in triage)
- **App:** Admin portal
- **Page/route:** `/settings/email-packages` (Email → Email package prices) and `/settings/subscription-billing` (Billing → Billing cycle)
- **Steps to reproduce:**
  1. Sign in with ADMIN_EMAIL / ADMIN_PASSWORD. Click **Settings**, then **Email**, then **Email package prices**.
  2. Read the "Included volume is fixed, not editable" note.
  3. Click **Billing**, then **Billing cycle**, and read the text under "Brand referral pilot".
- **Expected:** Plain-language explanations for operations and finance staff.
- **Actual:** The Email packages note shows code: "`PUT .../email-packages/{code}/price` only ever changes `priceCents`… a fixed product decision built into the seed data". The Billing cycle page says "(isPilotBrand = true)". The Platform page also shows a "Testing tools (for developers only)" section to a Finance user.
- **Evidence:**
  - Snapshots: `admin-first-look__webkit/artifacts/page-2026-09-27T14-05-16-502Z.yml` (priceCents), `admin-change-setting__webkit/artifacts/page-2026-09-27T14-05-32-353Z.yml` (priceCents), `admin-first-look__webkit/artifacts/page-2026-09-27T14-05-38-504Z.yml` and `admin-change-setting__webkit/artifacts/page-2026-09-27T14-04-28-536Z.yml` (isPilotBrand)
  - Triage snapshot: `_triage/artifacts/page-2026-09-27T14-09-12-519Z.yml`
  - Diary (admin-first-look): "shows a note with raw code like `PUT .../email-packages/{code}/price` and words like `priceCents`… made me feel this page wasn't meant for someone like me."
- **Found by:** admin-first-look__webkit, admin-change-setting__webkit

### "Sending" status tooltip points to a "CHIP state column" that does not exist

- **ID:** BUG-005
- **Fix:** FIXED in meikigo-admin `8c6aca3`. The hint now reads "CHIP is moving the money. Not in the shop's bank yet. CHIP's progress is listed under Details." The CHIP state (for example "CHIP executing") is shown in the row's Details.
- **Severity:** Low (misleading help text)
- **Status:** CONFIRMED (reproduced in triage)
- **App:** Admin portal
- **Page/route:** Money → Payouts → History (`/chip/settlements?view=history`)
- **Steps to reproduce:**
  1. Sign in, click **Money (7)**, then click **History**.
  2. Hover the **Sending** status on the Kedai Gunting Sri Muda RM 540.00 row.
- **Expected:** The tooltip points to information that is on screen.
- **Actual:** The tooltip reads "CHIP is moving the money. Watch the CHIP state column." The table only has the columns Shop, Net payout, Status, Requested and one unlabelled action column. There is no CHIP state column. The persona was left unsure whether "Sending" counts as settled.
- **Evidence:** `admin-money-check__webkit/artifacts/page-2026-09-27T14-04-10-596Z.yml` (line 86); triage snapshot `_triage/artifacts/page-2026-09-27T14-08-42-616Z.yml`
- **Found by:** admin-money-check__webkit (triage spotted it in the evidence)

### Low colour contrast on the "Reference" badge (Payroll Reference tab)

- **ID:** BUG-006
- **Fix:** FIXED in meikigo-admin `494f374`. The page-type badge in `settings-page-shell.tsx` used the muted colour for both its text and its background. It now uses `bg-foreground/10 text-foreground`, which covers every Reference and Read only badge. axe finds no contrast issues on the settings pages, in both dark and light themes.
- **Severity:** Low (accessibility)
- **Status:** CONFIRMED (oracle signal in 1 session; in triage I found the same element and confirmed its colours)
- **App:** Admin portal
- **Page/route:** Settings → Platform → Payroll Reference (`/settings/statutory-template`)
- **Steps to reproduce:**
  1. Sign in, click **Settings**, then click **Payroll Reference** in the sub-menu.
  2. Look at the small "Reference" badge on the active Payroll tab (dark theme, which is the default).
- **Expected:** Text contrast of at least 4.5:1 (WCAG AA).
- **Actual:** Light-grey 12px text (`lab(67 …)`) on a 40%-opacity grey background (`bg-muted/40`) over the dark theme. axe rates this "serious".
- **Evidence:** Signal `a11y` / `color-contrast` (impact serious, 1 node, selector `.bg-muted\/40`) at `meiki-admin.test:3004/settings/statutory-template`, 2026-09-27T14:05:20Z. No screenshot was attached to the signal.
- **Found by:** admin-change-setting__webkit

---

## Usability issues

### Admin portal

1. **No "support hours" setting, and a similar-sounding field causes confusion.** The finance manager was asked to change support closing time to 7pm. The only match is "Support visit length (hours)" on Settings → Platform, which is a session duration, not a time of day. The persona gave up without changing anything. Either the feature does not exist, or it is not discoverable. Product should decide which. 1 persona.
   > "'Support visit length (hours)' sounds similar to 'support hours' but means something completely different… This name is easy to mix up with what my boss asked for." (admin-change-setting)

2. **[Covered by the BUG-003 fix]** **Settings are split into many small sub-pages, and search does not help (see BUG-003).** It takes 4 top tabs and about 11 sub-pages to find anything, so users cannot be sure they have checked everywhere. 1 persona.
   > "The Settings area is split into many small sub-pages… with no single 'search all settings' that actually works, so I wasn't fully sure I hadn't missed something." (admin-change-setting)

3. **The "Sample data" banner makes staff doubt every number.** The banner shows on the dashboard and every Money and Billing page. It is honest, but it leaves staff unsure whether they can report the figures. 3 personas.
   > "I have to caveat to my boss that this isn't real money yet." (admin-money-check)
   > "I wondered if the whole admin portal is still in a testing/demo state." (admin-change-setting)

4. **[Partly covered by the BUG-005 fix: "Sending" is explained]** **Payouts Queue vs History is not obvious, and "Sending" is ambiguous.** The persona first thought the Queue showed settled money. It was also unclear whether "Sending" counts as settled (see also BUG-005). 1 persona.
   > "I initially thought the Queue page (payouts awaiting approval) already showed settled money, but it actually shows money NOT yet paid out." (admin-money-check)

5. **Menu badge counts mix different things.** "Money (7)" adds together payouts, complaints and bills. Related: the dashboard says "Payouts to approve: 3 · Need Finance review", but all 3 have **Approve** disabled (two frozen by complaints, one with no bank account). 1 persona.
   > "The badge counts (e.g. 'Money (7)', 'Payouts (3)') mix together different things… which could confuse someone glancing quickly." (admin-money-check)

6. **The "Unlock" button on the Customer list is not self-explanatory.** Only a small note at the bottom says it reveals private contact details and is audit-logged. 1 persona.
   > "not obvious at first that clicking it reveals private contact info and gets logged; I only understood this after reading the small 'Privacy and audit' note at the bottom." (admin-first-look)

7. **Inline "Edit" in Shop categories gives no clear editing state.** Clicking Edit turns the row into input fields without saying that nothing is saved yet. The user was not sure whether clicking Edit had already changed something. 1 persona.
   > "I wasn't sure if simply clicking Edit already changed something until I found Cancel." (admin-first-look)

---

## Coverage

**Admin portal, routes reached (17):** `/login`, `/` (Dashboard), `/support/open` (Shop), `/support/pii` (Customer), `/chip/settlements` (Payouts queue and history), `/chip/disputes` (Payment complaints queue and history), `/chip/subscription-invoices` (Monthly bills), and the settings pages `/settings/platform`, `/settings/statutory-template`, `/settings/email-deliverability`, `/settings/smtp`, `/settings/email-packages`, `/settings/categories`, `/settings/subscription-billing`, `/settings/chip-commission`, `/settings/plan-caps`, `/settings/addon-pricing`.

Every link in the navigation was reached, so navigation discoverability is good. Areas that were **reached but never exercised**:
- **Saving any setting.** No persona saved a change. admin-change-setting gave up before editing, and admin-first-look was told not to save. The "change → save → leave → come back → value persists" flow is **untested**.
- **Payout actions:** Approve & pay out, Reject, Create payout ticket. Approve was blocked on all 3 queued payouts, so the happy path cannot be tested with the current sample data.
- **Complaint resolution** on `/chip/disputes`, and the detail view of a single complaint.
- **Customer "Unlock"** (PII reveal and audit logging), and opening and closing a **support visit** on a shop.
- **Monthly bills** was visited by only 1 persona (admin-first-look), briefly.
- **Sign out**, light theme, and login with wrong credentials.

---

## Not tested / limits

- **Only the admin portal was in this run.** The owner portal, POS and customer booking apps were not tested, so there is nothing on booking, selling or customer payment flows. OWNER_* and POS_* credentials were unused.
- **Payments are sample data.** The Money screens say "Payment endpoints are not live yet… no money moves". Real CHIP settlement amounts, disputes and bill payment could not be checked. BUG-002 may be a sample-data problem.
- **Write paths are largely untested** (see Coverage). By design, two of three personas avoided saving, and the third found nothing to change.
- **The oracle missed the most important bug.** BUG-001 is a backend 500 that the Next.js server action wraps in an HTTP 200, with no console error. Only reading the page snapshots found it. The harness should flag `"ok":false` / 5xx inside server action responses and visible text like "unexpected error". Other silent failures of this kind may be hidden in untested areas.
- **Browser coverage:** all personas used WebKit only. I reproduced in the triage browser, not on Chromium or Firefox, and I did not test mobile viewports.
- **Environment:** a development build. The "Open Next.js Dev Tools" button appears on every page, so this is not the production bundle. Performance and production-only behaviour were not assessed.
- **Short sessions:** 1–3 minutes and 14–66 actions per persona. This is a light pass, not deep testing.
