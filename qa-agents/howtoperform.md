# How to perform naive-user exploratory testing

This guide explains how we test the Meikigo apps with AI agents that behave like real, non-technical users. The same loop is used for every app: find bugs, write them up, fix them, and confirm the fixes. For the tooling reference (files, flags, isolation), see `README.md`. Current status is in [section 8, Progress](#8-progress).

## 1. The method in one paragraph

Each agent plays one **persona**, for example a 52-year-old shop owner or a cashier on day one, with one everyday **goal**. The agent gets no test script, no documentation and no source code. It gets only the start address, a login and a browser (or a simulator for native POS). While it works, a passive **oracle** records problems the agent cannot see, such as JS errors, HTTP 5xx, blank screens, stuck spinners and contrast failures. At the end, the agent writes a **diary** of what confused or blocked it. A **triage** agent then reads all of this, reproduces the worst bugs itself and writes a markdown report. We fix the findings, then run the same personas again to confirm.

## 2. Ground rules

- **One module at a time.** The modules are the admin portal, merchant portal, customer web app, marketing site, POS web and POS native. Finish the whole loop for one module (section 4) and get sign-off before starting the next.
- **Ask before every test run.** A run creates and changes real records.
- **Test data only.** Use test accounts and a test brand/outlet. Sign-up test emails must contain `-test` (for example `amin-test1@gmail.com`), so they can be found and removed later. SMTP and SSO are off in every Meikigo environment during the testing phase, so no email is actually sent. The database is the **shared hosted Supabase** project, so everything the agents create is visible to the whole team.
- **Payments stay in sandbox.** `Chip__*__Environment=Sandbox` must be set in `meikigo-api/.env`. `preflight` checks this.
- **Platform-wide settings.** Personas for the admin portal must not save these (commission, plan caps, billing). Write those personas as "look, don't save", or limit them to one named setting that they must restore afterwards.
- **Agents stay naive.** Never give a persona docs, URLs to guess, or hints about how the app works. If the agent needs a hint, that is a usability finding in itself.
- **Commit and push on `main`** in each `meikigo-*` repo, and only when asked. Do not create branches. The `qa-agents` rig lives in the root repo (`misc`, branch `master`).

## 3. One-time setup

```bash
cd qa-agents
npm install
node node_modules/@playwright/mcp/cli.js install-browser webkit    # browser builds matching Playwright MCP
node node_modules/@playwright/mcp/cli.js install-browser firefox
cp config/secrets.env.example config/secrets.env                   # fill with TEST accounts
```

- Credentials come from `test-credential/test-credential.md` (gitignored) and are copied into `config/secrets.env`.
- Set the customer app's outlet URL (`/o/<brandId>/<outletId>`) in `config/targets.json`.
- Start the apps as described in `meikigo-doc/howtorun.md`: the API on :8083, the portals on their `.test` hosts, and the POS web build on port 3003 (`npx expo start --web --port 3003`). Port 3003 is already in the API's CORS list.
- **Native POS:** install a **Release** build on the iPad simulator named in `targets.json`. A debug build without Metro shows a red "No script URL" screen. For Android, use the `Pixel_Tablet` emulator with the debug APK and Metro.

## 4. The loop for one module

### Step 1: Preflight

```bash
node bin/preflight.mjs
```

Every check for the module must say `OK`. Preflight checks the API health, CHIP sandbox mode, the browser builds that Playwright MCP expects, whether the target app can be reached, the devices, and the secrets.

### Step 2: Run the personas

```bash
node bin/run.mjs --personas admin --concurrency 3 --run runs/<date>-admin
```

- Personas for the same module run in parallel (3 is a good default).
- Native POS personas run one at a time per device, which the runner handles automatically.
- Use `--dry-run` to check the configs without starting any agents.
- Each persona folder in `runs/` gets: `prompt.md`, `transcript.jsonl`, `diary.md`, `oracle.jsonl`, `evidence/` (screenshots), `artifacts/` (page snapshots, session log) and `meta.json`.
- Optional fast smoke crawl: `node bin/crawl.mjs --apps <app>`. Lightpanda cannot fill login forms, so the crawl only covers public pages.

### Step 3: Read the diaries

Before triage, read each `diary.md`. Check two things:

- **Did the persona change anything it should not have?** If it did, restore it now.
- **Did it fail because of the rig and not the app?** The first admin run failed because the browser build did not match. Delete that run and rerun it.

### Step 4: Triage

```bash
node bin/triage.mjs --run runs/<date>-admin --max-repro 6
```

This writes `runs/<date>-admin/report.md` and copies it to `reports/<date>-admin.md`. The triage agent has no docs either. It judges only from the evidence and from what a reasonable user expects. It marks each bug CONFIRMED (reproduced, or seen in 2 or more sessions) or UNCONFIRMED.

### Step 5: Report back and wait

Summarise the report for the product owner: bugs by severity, usability issues, and what was not tested. **Then stop and wait for instructions.**

### Step 6: Solution write-up

On request, write `reports/<report name> - solution.md`. For each bug, give:

- the **root cause**, found by reading the code, with file and line
- a **confidence** level: Confirmed means proven by code or a test; Likely means strongly indicated
- the proposed fix and how to test it

Do not change any code in this step.

### Step 7: Fix one bug at a time

For each bug, in the order the product owner asks:

1. **Reproduce it first.** Use a small Playwright script that acts like a person, for example moving the mouse and clicking without hovering first. The reproduction often shows the real cause, or shows the bug is worse than reported.
2. **Fix the root cause at the shared layer.** Grep every caller. Keep the diff small. Before adding new code, try deleting code, a CSS or platform feature, or something the codebase already has.
3. **Verify.** Rerun the reproduction. Run typecheck, lint (compare with `main` so old errors are not blamed on the fix) and axe. Run API tests in the `mcr.microsoft.com/dotnet/sdk:10.0` Docker image, because there is no local .NET SDK.
4. Record the result under the bug in the solution doc (or the retest report): what changed, how it was verified, and what was deliberately skipped.
5. Commit and push only when asked: `git pull --rebase`, rerun the affected tests if the rebase pulled in changes, then `git push origin main`.

### Step 8: Retest

```bash
node bin/run.mjs --personas admin --run runs/<date>-admin-retest
node bin/triage.mjs --run runs/<date>-admin-retest
```

Old findings must be gone. New findings start the loop again from Step 5. When they are fixed, add a "Fix status" table to the top of the retest report, a "Fix" line under each bug, and mark any usability items the fixes cover.

### Step 9: Sign-off, then the next module

Commit the reports (from the `qa-agents` rig) when asked. Then ask for permission to start the next module.

## 5. Writing a persona

Save each persona as `personas/<app>/<id>.md`:

```markdown
---
app: merchant                     # key in config/targets.json
secrets: [OWNER_EMAIL, OWNER_PASSWORD]
maxActions: 60
---
You are Pak Hamid, 52, owner of a small barbershop. You are not good with computers.

A new barber called Faiz starts next Monday. Add him so he can take customers.
Then check he appears in your staff list.
```

- Give the persona a real person (age, job, patience, tech skill) and **one** concrete goal with a checkable end state.
- Include one "chaos" persona per app. It double-clicks, uses Back mid-form, refreshes, and types emoji, Malay or Chinese text, long strings, zero or negative prices, and past dates.
- For risky areas, say what must not be touched, and ask the persona to restore anything it changes.
- Login values never reach the model on web runs: the agent types the secret *name* and Playwright MCP fills in the value. Native runs put the test-account values in the prompt, because mobile-mcp has no masking.

## 6. Reading the results

| Where | What it tells you |
|---|---|
| `signals.json` | Deduplicated oracle findings, ranked: JS exceptions, framework error overlays, HTTP and server-action 5xx, blank screens, error text shown, stuck loading, 4xx, a11y |
| `diary.md` | What a real user would complain about: confusion, jargon, missing features |
| `artifacts/*.yml` | Accessibility snapshots, which are what the agent actually "saw" |
| `coverage.json` | Routes reached. Important pages that were never reached point to a navigation problem |
| `_triage/` | The triage agent's own reproduction screenshots |

Severity scale used in reports:
- **Critical:** wrong money, data loss or leak, or a core task impossible.
- **High:** a core task often fails, or an error page on a main screen.
- **Medium:** a secondary feature fails, or a wrong value is shown.
- **Low:** cosmetic, wording or accessibility problems that do not block a task.

## 7. Lessons learned (admin module, 2026-09-27)

- **Playwright MCP bundles its own Playwright.** Install browsers with `node node_modules/@playwright/mcp/cli.js install-browser …`. Preflight checks the exact revision.
- **The oracle can miss hidden 500s.** A Next.js server action wraps a backend 500 in HTTP 200 (`{"ok":false,"error":{"status":500}}`). The oracle now flags `server-action-5xx`, and on-screen text such as "An unexpected error occurred".
- **Agents only see the accessibility tree.** A native `<datalist>` dropdown was invisible to them. UI feedback must show up in the accessibility snapshot, which also helps screen-reader users.
- **"Two clicks" was really "wrong page".** A human-like move-and-click reproduction showed that each click landed on the item above. Always reproduce the way a person would, not with Playwright's auto-waiting `click()`.
- **Sample-data fixes need a dev server restart.** The admin CHIP mock store lives on `globalThis` for the whole server session. Restart the dev server after editing `lib/chip-mock.ts`.
- **One theme token can explain several bugs.** Low contrast on chips, alerts and secondary buttons all came from shadcn's `--accent` overriding HeroUI's. Look for the shared cause before patching components one by one.
- **Light mode was never exercised by default** (the app defaults to dark). To check contrast in light mode, force it with `localStorage.theme = "light"`.
- **The in-memory EF provider hides concurrency bugs.** It never runs queries at the same time, so `Task.WhenAll` on one DbContext passed the tests and failed on the real database.
- **Look at diaries for rig failures.** An agent that "gave up" after 2 actions usually means a setup problem, not a product bug.

## 8. Progress

Last updated: 2026-09-29 (marketing retest added).

### Module status

| Module | Status | Reports |
|---|---|---|
| Admin portal | **Done**: tested, fixed, retested, all findings fixed and pushed | `2026-09-27-admin.md`, `2026-09-27-admin - solution.md`, `2026-09-27-admin-retest.md` |
| Merchant portal | Next. Waiting on the product owner to confirm that the merchant test account owns only test brands | – |
| Marketing site (`meiki-marketing-site.test:3002`) | **Tested, fixed, retested (2026-09-29).** First run: 8 findings, all fixed or closed (marketing `79cb346`, `f6c3a91`, `50c3e4e`; brand `eff7828`, `d26c45b`; 2 fixed upstream). Retest: 0 Critical/High, 1 Medium (plan limits vs descriptions, needs a product decision), 2 Low ("Something went wrong" on a wrong password, `.text-muted` on off-white at 4.05:1). Sign-up emails are now unique per run (`{{RUN_TAG}}`) | `2026-09-28-marketing.md`, `2026-09-28-marketing - solution.md`, `2026-09-29-marketing-retest.md` |
| Customer web app | Not started. Needs a test outlet URL in `config/targets.json`. The customer account will be created by a persona in the booking flow | – |
| POS web (Expo web on :3003) | Not started. Needs the barber PIN (`POS_BARBER_PIN`) | – |
| POS native (iOS / Android) | Not started. The iOS Release build is installed on the iPad Pro 13" (M5) simulator. The Android debug APK is built but not installed, and needs Metro with `EXPO_PUBLIC_MEIKIGO_API_BASE_URL=http://10.0.2.2:8083` | – |

### Admin portal timeline

1. **Rig setup:** Playwright MCP (WebKit/Firefox), the oracle, Lightpanda crawl, triage, preflight, and 18 personas across the apps. The first admin run was thrown away because the WebKit build did not match the one Playwright MCP expects. Preflight now catches this.
2. **First run** (3 personas): 6 bugs and 7 usability issues. See `2026-09-27-admin.md`.
3. **Solution write-up:** root causes with file and line. See `2026-09-27-admin - solution.md`.
4. **Fixes, all pushed to `main`:**

   | Finding | Fix | Commit |
   |---|---|---|
   | BUG-001 Withheld is the lifetime margin, and Gross ≠ Net + Withheld | API scopes the margin to sales since the previous payout. UI shows Gross = Net + Withheld (admin and merchant portals) | api `fcdc599`, admin `0861238`, brand `bce187f` |
   | BUG-002 Sidebar needs two clicks (really: it opened the wrong page) | Section titles and profile card keep their height. Hover-expand is mouse-only. Touch devices get the drawer. Fixed the drawer that never opened on phones | admin `85de0fa` |
   | BUG-003/004/004b Contrast, tablists without tabs, dropped ARIA props | `HeroLinkButton` forwards props. Real tabs. Money switcher is a `nav` | admin `762ef6c` |
   | BUG-005 PressResponder warning | Removed the 9 trigger-less Modal/Drawer roots | admin `327488d` |
   | BUG-006 Low contrast (dark and light) | Pinned `--accent-soft-foreground`. Darker light-mode `--muted` | admin `183fe69` |
   | U1–U7 usability | Plain wording, test clock collapsed, sample-data notice on the dashboard, one term "payment complaints", settings search, greeting | admin `96e2e97` |

5. **Retest** (same 3 personas): the first-run findings did not come back. 6 new findings, 0 Critical/High. See `2026-09-27-admin-retest.md`.
6. **Retest fixes, all pushed:**

   | Finding | Fix | Commit |
   |---|---|---|
   | Shop Money tab returns 500 | Sequential DbContext queries in place of `Task.WhenAll` | api `f4dc389` |
   | Fade Room "no bank account" | Sample data made consistent | admin `54d031b` |
   | Settings search gives no feedback | Visible result list, Enter opens the first match, "No settings found" | admin `1d12eae` |
   | Developer text still on screen | Rewrote the remaining API, cron and webhook wording | admin `56d601f` |
   | "CHIP state column" hint | Hint points to Details | admin `8c6aca3` |
   | Reference badge contrast | Foreground text on a foreground/10 fill | admin `494f374` |

7. **Rig improvements from the admin module:** the oracle flags server-action 5xx and on-screen error text. Console warnings are deduplicated across routes. The rig and reports are committed to the root repo `misc` (`a559607`).

### Open items

- **Product decisions** (from the admin retest):
  - Should there be a support opening-hours setting? Staff confuse it with "Support visit length".
  - Should "Money (7)" count payouts, complaints and bills together?
  - Should "Payouts to approve" count payouts whose Approve is disabled?
  - The "Unlock" button needs an explanation.
  - Inline Edit in Shop categories needs a visible editing state.
- **Admin areas not yet tested:**
  - saving settings, approving or rejecting payouts, and resolving complaints
  - customer Unlock, and opening or closing a support visit
  - sign-out, wrong-password login, and other staff roles
  - Firefox/Chromium and mobile viewports
- **Environment:**
  - The shared Supabase session pooler hits `EMAXCONNSESSION` (pool_size 15), so the shop Money tab takes about 8s. Consider the transaction pooler (port 6543) for the API.
  - The admin portal runs with `MEIKIGO_CHIP_MOCK=true`, so all Money screens show sample data.
- **Stale docs:** many `meikigo-doc` files still mention HitPay and Keycloak. The project now uses CHIP and Supabase Auth. The agent definitions in `.claude/agents` are already updated.

### Next step

Start the merchant portal module (5 personas) after the product owner confirms that the test brand is safe to modify.
