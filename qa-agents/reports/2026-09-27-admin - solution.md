# Solutions: admin portal test report, 2026-09-27

This file follows `2026-09-27-admin.md`. For every bug and usability issue it gives the root cause, found by reading the code, and the proposed fix. Nothing has been changed yet.

The confidence labels mean:
- **Confirmed:** the cause was proven in code or by a test.
- **Likely:** the code strongly points to this cause, but the fix still needs to be checked.

## Summary

| ID | Severity | Root cause | Where to fix | Confidence |
|---|---|---|---|---|
| BUG-001 | High | "Withheld" is the brand's lifetime Meikigo margin, not this payout's. Net = amount is correct. The label is wrong. | `meikigo-api` SettlementService + admin payout UI + mock data | Confirmed |
| BUG-002 | Medium | The sidebar expands on hover and moves every nav item 132px down, so the click lands on a different element | `meikigo-admin` `app-nav-chrome.tsx`, `hook-sidebar.tsx` | Confirmed |
| BUG-003 | Low | The selected sub-tab uses the HeroUI `secondary` variant, which has low contrast in dark mode | `settings-sub-nav.tsx` | Confirmed |
| BUG-004 | Low | `role="tablist"` on groups of links and buttons, with no `role="tab"` children | `money-view-toolbar.tsx`, `shop-detail-modal.tsx` | Confirmed |
| BUG-004b | Low | `HeroLinkButton` silently drops `aria-current` and `aria-label` (found while checking BUG-004) | `heroui-link-button.tsx` | Confirmed |
| BUG-005 | Low | `<Drawer>` / `<Modal>` roots have no trigger child because their state is controlled | `app-nav-chrome.tsx`, 4 dialog components | Likely |
| BUG-006 | Low | Accent chips, alert titles and full-width outline buttons fail contrast in dark mode | theme tokens / `globals.css` | Likely |

Suggested order: BUG-001 (a product decision is needed first), then BUG-002, then BUG-004/004b and BUG-005 together, then the contrast fixes, then the usability wording.

---

## BUG-001: The "Net payout" column equals the gross amount

### Root cause (confirmed)

In `meikigo-api/src/Meikigo.Infrastructure/Payments/SettlementService.cs`:

- **The balance is already net of fees.** `ComputeBalanceAsync` (line 485) sums `Transaction.BrandNetCents`. That is the brand's share *after* the CHIP cost and the Meikigo fee were deducted from each sale. A payout request (`AmountCents`) can never exceed this net balance.
- **So `NetPayoutCents = amountCents` (line 194) is correct.** Nothing more is withheld at payout time.
- **The figure shown as "Withheld" is wrong.** `MeikigoMarginWithheldCents` comes from `ComputeMarginWithheldAsync` (line 524), which is:

  ```csharp
  Transactions.Where(t => t.BrandId == brandId && t.Status == Success && t.PaymentChannel == Chip)
              .SumAsync(t => t.MeikigoMarginCents)
  ```

  That is the **lifetime** Meikigo margin on every CHIP sale the brand has ever made. It is not related to this payout. Every new payout ticket shows a larger cumulative number, which is why the percentage looked inconsistent (1.67%, 1.87%, 2.00%).

- **The admin UI then mislabels it.** `meikigo-admin/src/components/chip/settlement-queue.tsx:160` renders `Gross {amountCents} · Withheld {meikigoMarginWithheldCents}`, which tells Finance that the amount is gross and that something is subtracted from it. Neither is true.
- **The screens the persona saw use mock data.** `meikigo-admin/.env` has `MEIKIGO_CHIP_MOCK=true`, and `src/lib/chip-mock.ts` hard-codes `netPayoutCents = amountCents` with made-up withheld values. The "0% margin" on the CHIP commission page comes from the real API config, so the two screens disagree only because one is mock data and the other is real. The labelling bug exists on the real API path too.

No money is currently paid out wrongly. The bug is that Finance sees a misleading number on the screen where they approve irreversible payouts.

### Fix

**Decision needed:** what should a payout ticket show about Meikigo fees? The recommended option is A.

**Option A (recommended): show fees for the sales this payout covers**
1. In `SettlementService.CreateRequestAsync`, compute the margin on CHIP transactions that succeeded after the previous non-rejected settlement request's `RequestedAt`, up to now:
   ```csharp
   var lastCutoff = await dbContext.SettlementRequests.AsNoTracking()
       .Where(r => r.BrandId == brandId && r.Status != SettlementRequestStatus.Rejected)
       .MaxAsync(r => (DateTimeOffset?)r.RequestedAt, ct);
   var margin = await settled
       .Where(t => lastCutoff == null || t.CompletedAt > lastCutoff)
       .SumAsync(t => t.MeikigoMarginCents, ct);
   ```
   Use the transaction timestamp column the entity actually has, if it is not called `CompletedAt`.
2. Rename the field in the response contract to `MeikigoFeesOnPeriodSalesCents`. Keep `MeikigoMarginWithheldCents` for one release as a deprecated alias.
3. Add an EF migration only if the column is renamed. A reversible rename is fine.
4. Admin UI (`settlement-queue.tsx` lines 160 and 712–722):
   - Details line: `Payout RM X · already after Meikigo fees of RM Y on sales since <date>`.
   - Details panel: drop the "Gross" wording. Show `Payout amount`, `Meikigo fees on these sales (already deducted)` and `Paid to shop`, where `Paid to shop` = payout amount.
   - Table column: rename "Net payout" to "Paid to shop".

**Option B (smallest change): keep the lifetime figure and label it honestly**
- Keep the API as it is.
- UI: `Payout RM X`, plus a second line in muted text: `Meikigo fees kept from this shop's sales to date: RM Y`.
- Remove "Gross" and "Withheld" everywhere.

**Both options:**
- Fix `src/lib/chip-mock.ts` so the mock withheld values follow the chosen meaning, so mock mode stops showing figures that do not add up.
- Add tests:
  - API: two payouts in a row. The second one's fee figure covers only sales after the first payout (Option A).
  - API: `NetPayoutCents == AmountCents` stays true.
  - Admin: the Details panel shows no "Gross/Withheld" wording, and the numbers add up.

### Status: FIXED and committed on `main` on 2026-09-27: meikigo-api fcdc599, meikigo-admin 0861238, meikigo-brand bce187f.

The entity's own doc comment already described the per-payout meaning, so Option A matches the original design. No field, contract or DB column was renamed, and no migration is needed.

- `meikigo-api/src/Meikigo.Infrastructure/Payments/SettlementService.cs`: `ComputeMarginWithheldAsync` now sums the Meikigo margin only on CHIP sales paid (`PaidAt`, falling back to `SaleAt`) after the Brand's previous non-rejected payout request. The first request covers all sales. `NetPayoutCents` still equals `AmountCents`.
- `meikigo-api/src/Meikigo.Domain/Entities/SettlementRequest.cs`: doc comment updated.
- `meikigo-api/tests/Meikigo.Api.Tests/SettlementServiceTests.cs`: added 2 tests.
  - `WithheldMarginCoversOnlySalesSinceThePreviousPayoutRequest`
  - `RejectedPayoutRequestDoesNotStartANewFeePeriod`
  - Result: all 16 settlement and money-summary tests pass. They were run in the `dotnet/sdk:10.0` container because there is no local SDK.
- UI labels (per product owner, standard wording): **Gross / Withheld / Net payout**. Gross is computed as `netPayoutCents + meikigoMarginWithheldCents`, so Gross − Withheld = Net always adds up.
  - `meikigo-admin/src/components/chip/settlement-queue.tsx`: Details line and release dialog. The column stays "Net payout". Checked in WebKit: "Gross RM 2,147.10 · Withheld RM 42.10 · Net RM 2,105.00".
  - `meikigo-brand/src/components/payments/settlement-history-table.tsx`: the merchant portal had the same bug ("Requested X, Withheld − Y, To your bank X"). It now shows Gross, Withheld and Net payout, which add up.
- The mock data (`chip-mock.ts`) is already consistent with the new meaning, so it did not change.
- Existing problems not caused by this change:
  - `settlement-queue.tsx` has a lint error (`react-hooks/set-state-in-effect`, line 869) and an unused `cn` import.
  - The admin `tsc` complains about a stale `.next/types` NextAuth route.
- To see the API change locally, rebuild the API with `meikigo-api/scripts/restart-local-api.sh`. The admin portal is in `MEIKIGO_CHIP_MOCK=true` mode, so its Money screens still show sample data.

---

## BUG-002: Sidebar links need two clicks

### Root cause (confirmed)

`meikigo-admin/src/components/app-nav-chrome.tsx`:
- The `<motion.aside>` expands on `onMouseEnter` (line 386), from 72px to 256px wide, with a spring animation.
- When it expands, `hook-sidebar.tsx` reveals the section titles (`height: expanded ? "auto" : 0`, line 191) and changes the item padding (`pl-3.5` vs `px-0.5`, line 203).

Measured in WebKit, the **Money** link moves from `x=15, y=228` (collapsed) to `x=26, y=360` (expanded) the moment the pointer enters the sidebar.
- A person moves the mouse to the Money icon and clicks. The sidebar expands under the cursor, and the click lands on whatever element is now at `y=228`.
- The second click works because the sidebar is already expanded and stable.
- Touch devices are worse: a tap triggers the hover and the click together.

### Fix

Keep every nav item's position the same in both states:
1. **Expand as an overlay, not a reflow.** Keep the collapsed rail at 72px in the page layout. Render the expanded panel as an absolutely positioned layer on top of the content, using the same item rows at the same `top` offsets.
2. **Stop section titles from pushing items down.** In `hook-sidebar.tsx`:
   - Reserve the section-title height in both states. For example, keep `height` fixed and animate only `opacity`.
   - Or show titles only as a tooltip or inline label in the expanded state.
3. **Keep the same horizontal padding in both states.** Replace `withIcons && expanded ? "pl-3.5" : "px-0.5"` with one fixed padding, so icons stay at the same x.
4. **Only expand on hover for mouse users.** Wrap `openSidebar` with a `(hover: hover) and (pointer: fine)` media-query check. On touch devices, expand with an explicit menu button instead.
5. Optional: add a 150–200ms hover-intent delay before expanding. That alone is not enough without 1–3.

**Test:** add a Playwright e2e test (WebKit and Chromium). Load `/`, click the Money icon once with no pre-hover, and expect `/chip/settlements`. Repeat for Shop, Customer and Settings. Also check that the Money link's `boundingBox()` before and after expansion differs by less than 2px on the y axis.

### Status: FIXED and committed on `main` on 2026-09-27: meikigo-admin 85de0fa.

Reproduced first: a human-like move-and-click (WebKit, no pre-hover) opened the link **one row above** every time. Shop opened Dashboard, Customer opened Shop, Money opened Customer, and Settings opened Money. So the bug was worse than "two clicks": it could open the wrong page.

There were two causes of the vertical jump, both measured:
- **Section titles** (HOME/WORK/MONEY/SETTINGS) grew from 0 to 29px each on expand.
- **The profile card** grew from 40 to 87px on expand.

The fix, kept small and without redesigning the sidebar:
- `src/components/ui/hook-sidebar.tsx`: section titles keep their height in both states and fade by opacity only.
- `src/components/app-nav-chrome.tsx`: the profile card sits in a fixed `h-[5.5rem]` slot, so its growth no longer moves the nav.

Result:
- Every nav link now has the same y position collapsed and expanded (for example, Money at y=362 in both).
- A single move-and-click opens the right page for Shop, Customer, Money and Settings.
- The collapsed rail now shows small gaps where the titles are, and I checked it visually.
- Lint: the only error (`react-hooks/set-state-in-effect`) is pre-existing on `main`.

Touch devices (step 4), added in the same commit:
- The rail and hover-expand now show only on `pointer: fine` devices (`pointer-fine:md:flex`). Touch tablets such as the iPad get the header menu button and drawer, which show full labels.
- Hover-expand listens to `onPointerEnter` and ignores anything except `pointerType === "mouse"`, so a tap on a touchscreen laptop no longer expands the sidebar in the middle of the tap.
- **A separate pre-existing bug was also found and fixed:** the menu drawer never opened on any phone or tablet. `useEffect(() => drawer.setOpen(false), [pathname, drawer])` ran on every render, because `drawer` is a new object each render, so it closed the drawer instantly. The effect was removed; the nav links already close the drawer through `onNavigate`.
- Checked in WebKit:
  - iPhone 15 and iPad Pro 11: tap the menu, the drawer opens, tap Money, `/chip/settlements` opens and the drawer closes.
  - Desktop: a single click works for all 4 links.

Not done: step 5 (hover-intent delay), because it is not needed now that positions are stable. There is also no automated e2e test, because the repo has no Playwright e2e setup.

---

## BUG-003: The selected settings sub-tab is low contrast

### Root cause (confirmed)

`meikigo-admin/src/components/settings/settings-sub-nav.tsx`: the active sub-tab uses `variant={active ? "secondary" : "ghost"}`. In the dark theme, HeroUI v3's `secondary` button renders mid-grey text on `rgb(39,39,42)`, about 2.1:1, so the current page looks disabled.

### Fix
- Use the same style as the group nav above it: `variant={active ? "primary" : "ghost"}`.
- Or keep `secondary` and add `className={cn("gap-1.5", active ? "text-foreground font-medium" : "text-muted")}`.
- Check both themes with axe. It should report no `color-contrast` on `/settings/*`.

---

## BUG-004: `role="tablist"` without tabs

### Root cause (confirmed)
- `components/chip/money-view-toolbar.tsx:23`: the Queue/History switcher is two **page links** (`HeroLinkButton`), wrapped in `role="tablist"`.
- `components/support/shop-detail-modal.tsx:75`: the shop sections are real **in-page tabs** (buttons that swap panels), but they have no `role="tab"`, `aria-selected` or `aria-controls`.

### Fix
- **Money toolbar:** these are links, so change the wrapper to `<nav aria-label={ariaLabel}>` and remove `role="tablist"`. Keep `aria-current="page"` on the active link. This depends on BUG-004b being fixed first.
- **Shop detail modal:** replace the hand-rolled group with HeroUI v3 `Tabs` (it provides `tablist`/`tab`/`tabpanel` and arrow-key navigation). If you keep the custom markup instead:
  - Each button gets `role="tab"`, `aria-selected={isActive}`, `aria-controls={`shop-panel-${tab.id}`}`, `id={`shop-tab-${tab.id}`}` and a `tabIndex` roving between 0 and -1.
  - Each panel gets `role="tabpanel"` and `aria-labelledby`.
  - Remove `aria-current="page"`. It is wrong for in-page tabs.

### Status: BUG-003, BUG-004 and BUG-004b FIXED and committed on `main` on 2026-09-27: meikigo-admin (see the latest `fix(a11y)` commit).
- BUG-003: the active settings sub-tab uses `text-foreground`. axe reports no issues on the sub-nav.
- BUG-004: the Money toolbar is now a `<nav>` (0 tablists). The shop modal tabs are native `<button role="tab" aria-selected>`, because the HeroUI `Button` type rejects `role`. axe reports no issues; there are 5 tabs, 1 selected, and switching works.
- BUG-004b: `HeroLinkButton` forwards the rest of its props to `NextLink`. `aria-current="page"` now renders (checked on the settings sub-nav and the Money toolbar).
- Skipped: `aria-controls`/`tabpanel` wiring and arrow-key navigation on the shop tabs. Add them if a screen-reader audit asks.

## BUG-004b (new, found while checking BUG-004): `HeroLinkButton` drops ARIA props

`components/heroui-link-button.tsx` only accepts `href`, `children`, `variant`, `size`, `fullWidth` and `className`. Every `aria-current={...}` and `aria-label` passed by callers (settings nav, money toolbar and others) is **silently discarded**. So screen readers never know which page or tab is current.

**Fix:** forward the remaining props:

```tsx
export function HeroLinkButton({ href, children, variant = "primary", size = "md", fullWidth, className, ...rest }:
  { href: string; children: ReactNode; variant?: Variant; size?: Size; fullWidth?: boolean; className?: string }
  & Omit<React.ComponentProps<typeof NextLink>, "href" | "className" | "children">) {
  return (
    <NextLink {...rest} className={buttonVariants({ variant, size, fullWidth, className })} href={href}>
      {children}
    </NextLink>
  );
}
```

---

## BUG-005: "PressResponder was rendered without a pressable child" on every page

### Root cause (likely)
- In HeroUI v3, the `<Drawer>` / `<Modal>` root is a React Aria `DialogTrigger`. It expects a pressable trigger (a `Button`) as a direct child.
- The app shell renders `<Drawer>` with only a controlled `<Drawer.Backdrop isOpen={drawer.isOpen}>` inside (`app-nav-chrome.tsx:418`). The "Open menu" button sits outside it (line 402). The trigger's `PressResponder` therefore has nothing to attach to, and it warns. The app shell is on every page, which explains "every screen".
- The same pattern appears in:
  - `components/chip/settlement-queue.tsx` (2×)
  - `components/chip/dispute-table.tsx` (2×)
  - `components/support/shop-detail-modal.tsx`
  - `components/support/customer-unlock-dialog.tsx`

### Fix

Pick one pattern and apply it everywhere:
- **Uncontrolled:** put the opening `Button` inside the root, `<Drawer><Button …>Open menu</Button><Drawer.Backdrop>…</Drawer.Backdrop></Drawer>`, and drop the manual open state. Keep `useOverlayState` only where code must close the dialog.
- **Controlled:** keep the state, but pass it to the root rather than the backdrop (`<Drawer isOpen={…} onOpenChange={…}>`), if the HeroUI v3 version in use supports that. Or render `Drawer.Backdrop` without the `<Drawer>` wrapper.

Check with the HeroUI v3 docs for the installed version (`@heroui/react ^3.2.4`), then confirm the console warning is gone on `/`.

This is not proven to cause BUG-002. BUG-002 has its own confirmed cause.

### Status: FIXED and committed on `main` on 2026-09-27 (meikigo-admin, `fix(ui): drop trigger-less Modal/Drawer roots`).
- Confirmed from the source code: every HeroUI `Modal`/`Drawer`/`AlertDialog` root renders a react-aria `DialogTrigger`, and `PressResponder` warns when no pressable child registers. The warning is dev-only (`NODE_ENV !== 'production'`).
- Each `*.Backdrop` already builds its own slots and `isDismissable` context and takes `isOpen` directly, so the bare root did nothing useful. All 9 bare roots were replaced with `<>` fragments (2 lines each, 6 files, including `category-manager-form.tsx`, which the report had missed).
- Checked in WebKit:
  - 0 PressResponder warnings across `/`, `/chip/settlements`, `/chip/disputes`, `/settings/categories` and `/support/open`.
  - These overlays open and close on Esc: payout ticket, reject, evidence, resolve, shop detail, customer unlock, category drawer, and the mobile nav drawer (iPhone and iPad).
  - The "Approve & pay out" alert was not clicked, because every approve button is disabled in the mock data (frozen by disputes). It uses the same pattern, and typecheck is clean.

---

## BUG-006: Other low-contrast text (unconfirmed)

The likely cause is theme tokens in dark mode:
- `.chip--accent .chip__label` on Shop categories
- `.alert--accent .alert__title` on the "Sample data" banner
- the full-width "Start a job" buttons on the dashboard

**Fix:** adjust the dark-mode `--accent` foreground and `--muted` tokens in `src/app/globals.css`, or the HeroUI theme override, so text reaches at least 4.5:1. Then rerun the admin personas: the oracle runs axe on every route automatically. Fixing the "Sample data" banner title also helps usability issue 3.

### Status: FIXED and committed on `main` on 2026-09-27 (meikigo-admin, `fix(theme): readable accent text and light-mode muted text`).
- The root cause was confirmed, and it is shared with BUG-003. The shadcn block in `globals.css` redefines `--accent` as grey, which overrides HeroUI's blue `oklch(0.62 0.195 253.83)`. HeroUI derives `--accent-soft-foreground` from `--accent`, so it came out #595959. Accent chips, alert titles and secondary buttons (the dashboard "Start a job" buttons and the settings sub-tab) all use that token.
- Fix: `--accent-soft-foreground: var(--foreground)` in `:root` and `.dark`. The one-off BUG-003 `text-foreground` patch is now redundant, so it was reverted.
- Also found when light mode was forced for the first time: light `--muted` `oklch(0.5517 …)` was 4.2:1 on table headers. It is now `0.5`.
- axe `color-contrast` reports 0 nodes on 12 admin routes, in both dark and light (before: 24 dark, 35 light).

---

## Usability issues

| # | Issue | Fix | Files |
|---|---|---|---|
| U1 | Developer jargon shown to staff | Rewrite for business users. "meikigo-api rejects …" becomes "The system won't allow …". Remove "Round 16/22" from descriptions. Show the `MEIKIGO_CHIP_MOCK` hint only to developers, or drop it. "CHIP mock mode" becomes "Sample data mode". | `settings-read-only-notice.tsx`, `commission-config-editor.tsx`, `clock-override-editor.tsx`, `settlement-queue.tsx:98,640-641`, `mock-data-notice.tsx`, `shop-detail-modal.tsx:567`, `settings/addon-pricing`, `statutory-template`, `email-deliverability`, `email-packages`, `platform` pages |
| U2 | The "Override date" test clock sits on the main Platform settings | Hide it unless the environment is non-production (e.g. `NEXT_PUBLIC_APP_ENV !== "production"`) **and** the user is `AboveSupport`. Move it into a collapsed "Developer tools" section with a warning style. The API should refuse clock overrides in production too. | `app/(app)/settings/platform/page.tsx`, `clock-override-editor.tsx`, API clock-override endpoint |
| U3 | Sample Money data does not match real shops; users notice late | While mock mode is on, show a clear banner in the app shell, not only on Money pages. Add a "Sample" badge on each mock row and on the dashboard's "Needs you" items that come from mock data. Better long term: seed the mock from the real shop list. | `mock-data-notice.tsx`, `app/(app)/page.tsx`, `lib/chip-mock.ts` |
| U4 | Complaints, chargebacks and disputes used for one thing | Use one word everywhere: nav, dashboard card, page title and status text. "Payment complaints" is the friendliest. The URL can stay. | nav config in `lib/nav.ts`, dashboard card, `dispute-table.tsx` |
| U5 | "Net payout", "Gross/Withheld" and "Payouts waiting" wording | Covered by BUG-001. Also rename the dashboard tile to "Payouts to approve", and add a one-line explanation for the "Sending" status next to the badge instead of only in a tooltip. | `app/(app)/page.tsx`, `settlement-queue.tsx` status hints |
| U6 | Settings are hard to scan and have no search | Add a filter box on `/settings` that searches page titles and field labels in `SETTINGS_GROUPS`. Rename "Hours per support visit" to "Support visit length (hours)" so it is not read as opening hours. `settings/support-hours` already redirects to Platform, so add "support hours" as a search alias for that field. | `lib/nav.ts`, `settings/page.tsx`, `settings/platform/page.tsx` |
| U7 | The greeting shows the email address | The code uses `firstName(staff.fullName)`, so the admin account's `fullName` is stored as the email (a data issue). Fix the account's name in the DB. Harden `firstName()` so a value containing `@` falls back to the part before `@` (capitalised), or to plain "Dashboard". In the profile card, do not repeat the email when name = email. | `components/app-shell.tsx`, `app/(app)/page.tsx`, staff record |

### Status: U1–U7 FIXED and committed on `main` on 2026-09-27 (meikigo-admin 96e2e97).
- **U1:** replaced `meikigo-api`, `meikigo-brand`, "Round 16/22", `MEIKIGO_CHIP_MOCK` and "CHIP mock mode" with plain wording on 14 screens. A text scan of 9 pages now finds none of them.
- **U2:** the Override date is hidden when the API reports `allowOverride: false`. Otherwise it is collapsed under "Testing tools (for developers only)". The API-side production refusal was not changed; it already exists as the `allowOverride` environment flag.
- **U3:** the sample-data notice now also shows on the dashboard. Its text now says the shops are made-up examples. Per-row "Sample" badges were skipped.
- **U4:** "payment complaint(s)" is used everywhere in the UI text. Chargeback and dispute wording was removed, including toasts and fees. URLs and code identifiers are unchanged.
- **U5:** the dashboard tile is now "Payouts to approve". The payout details show the status explanation inline, for example "Sending — CHIP is moving the money…".
- **U6:** added a native `<datalist>` search on every settings page, with keywords per page (for example, "support hours" finds Platform, and picking a result opens it). The field is renamed "Support visit length (hours)". Only page titles and keywords are searched, not individual field labels.
- **U7:** `firstName()` now uses the part of the email before `@`, capitalised, when the stored name is an email. The dashboard shows "Hi Haziq." The admin account's name in the DB was **not** changed, because it is on the shared database.
- Checked in WebKit: typecheck clean, lint errors unchanged at 6 (all were already there), and axe finds no issues on Platform.

Note for readers: in the persona diaries the greeting reads "Hi ADMIN_EMAIL". That is the test rig hiding the real address from the agent, not literal text on the screen.

---

## Retest plan after fixes

1. Unit and integration tests listed under BUG-001 and BUG-002.
2. Rerun the admin module with the same three personas: `node bin/run.mjs --personas admin --run runs/<date>-admin-retest`, then triage.
3. Expected results:
   - No two-click navigation in the diaries.
   - No `aria-required-children` or `color-contrast` signals on `/settings/*` and `/chip/*`.
   - No PressResponder warnings.
   - The Money persona reports payout figures that add up.
4. Still untested: admin **write** actions (approve payout, edit rates, unlock customer). Plan a separate run for these with CHIP sandbox and a test brand, once you approve changes on the shared database.
