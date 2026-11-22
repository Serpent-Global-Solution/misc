# Meikigo Growth Engine — Build Plan & Tracker

Source: `marketing-tool.md` (the brief) → reviewed with `/be-ambitious` on 2026-11-22.
Status legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

## Goal

**Pilot first, then paying.** Meikigo recruits founding (pilot) shops before selling paid plans. Updated 2026-11-22.

- **Stage 1 target (pilot):** **10 founding shops actively using Meikigo by 31 Jan 2027.** "Active" = real queue/checkout transactions in at least 3 of the last 4 weeks, read from Meikigo's own database. An accepted application that never transacts doesn't count.
- **Stage 2 target (paying):** set once the pilot shows what shops do after it. Paying shops still active at day 60.
- **Pass/fail judge:** Meikigo's own records (applications, transactions, billing), with the source attached. Not the quality of any brief, not opinion. Report the real number even if we miss.

## Constraints

- RM0 extra tools. Free platforms only (Search Console, Bing Webmaster, Netlify, existing CRM).
- **Sign-up is paused** until the Supabase subscription is paid (payday). No lead contact until then.
- WhatsApp outreach capped at ~5–10 msgs/day (unofficial OpenWA, ban risk) → ~5 months to cover 1,089 leads. Calls, walk-ins and supply-store partners have no such cap.
- All copy follows the "do not say" list in `gemini-context.md`.

## Strategy in one paragraph

The market is small and listable (1,089 Selangor leads in the CRM), so **direct sales is the engine and SEO supports it** — not the other way round. Barbershop owners don't post pain on forums; the real signal is our own conversations. So before payday we build the measurement and the sales kit; after payday we sell and let logged conversations drive content, pitch and product decisions.

## What the data shows (checked 2026-11-22)

- `barbershop-data/cleaned/leads_import.csv`: 1,089 leads, 1,088 in Selangor. 680 barber shops, 409 hair/beauty salons. 118 flagged as possible branch/chain. Median 66 Google reviews.
- 24 leads already use a booking tool per their website (15 Setmore, 9 Fresha) → "switch" pitch. Rest: paper/WhatsApp.
- `barbershop-data/barbersupplier/`: 1,607 rows, mostly barbershops in other states (~1,017). Only ~95 are real barber supply stores → supplier channel is small.
- No sign-up source attribution in meikigo-api. No Search Console / analytics on meikigo.com (only `robots.txt`, `sitemap.xml`).

## Reminders (owner)

- [ ] **Haziq: deploy.** Either order is safe (the API ignores fields it doesn't know; new fields are optional).
  - meikigo-marketing-site (Netlify CLI): image fallback `2b05a0c` (fixes live broken photos), sign-up source `9e3774f`, founding form `2ff857e` + dropdown fix `1076fcb`, GA4 `05009b9`.
  - meikigo-api: `7fd943e` (sign-up source + missing outlets column), `814e3a4` (pilot-screening fields). Two migrations run on startup; needs Supabase back.
  - meikigo-admin: `87c99c5` (shop profile + source on Applications).
- [ ] **Authorize Jira** (Atlassian sign-in link), so the growth-engine ticket and the SCRUM-58 comment can be created.
- [ ] **Find the 8 missing homepage photos:** Barbershop-Happy, Dinner-Table, Happy-Retail, 80s-Funk, Randomized Groceries Edit, People Preparing Food, Preparing Food Different Workers, Randomized Products Image (and Stressed-Barber). Or download them from Supabase after payday.
- [x] **GA4 wired in** (`G-7DQBRXH3HD`, site commit after `2ff857e`); privacy notice + legal docs updated. Goes live with Haziq's deploy. GA admin settings done (14-month retention, Haziq added).
- [ ] **After deploy:** Search Console → add URL-prefix property `https://meikigo.com/` → verify with the "Google Analytics" method → submit `sitemap.xml`.
- [ ] **Lawyer check:** the US-transfer basis for Google Analytics (Google's data processing terms), alongside the existing Singapore one.
- [ ] **Payday:** pay Supabase → test sign-up source end to end → set up the demo shop for walk-in visits.
- [ ] **Decide:** what supply stores get in return for referring shops (sales kit §7).

## To reconfirm with Haziq

1. **Missing migration.** Commit `0b74c85` added `outlets.require_discount_approval` with no migration. Did he add the column by hand on the shared DB, or run an uncommitted migration? Has `0b74c85` been deployed? (The new `AddSignupSource` migration adds it with `IF NOT EXISTS`, so it's safe either way.)
2. **Supabase projects.** Which is production: `wviiswdlplbzdoeibzvu` (marketing images) or `nekeahobppbrosrctppv` (apps' `.env.example`)? Same paid account?
3. **5 API tests already failing on main.** ClientServiceTests.RegisterAsync_CreatesRealSupabaseUser…, PlanCapsAndDisputeStaffEndpointTests.UpdatingPlanCapsCanClearMaxLoginsWithSentinel, SupportAndPiiAccessTests (2), QueuePostgresTests.SelfServiceBooking_WithAnOffset_IsStoredAsUtc. Known?
4. **GoDaddy access** for the Search Console Domain property (DNS).
5. **"Free for life" for pilot shops.** Must be defined in writing before telling pilots, because a vague "free" offer can count as misleading under the Consumer Protection Act 1999:
   - **Which plan:** Plus?
   - **Per shop or per outlet:** if they open a second outlet, is that free too?
   - **What still costs money:** the CHIP processing fee on DuitNow and card always applies; add-ons probably do too.
   - **How a shop keeps it:** e.g. stays active and keeps giving feedback during the pilot.
   - **What ends it:** e.g. inactive for X months, or the account is closed.

   Suggested wording: "Founding shops keep Plus free for as long as the shop stays active on Meikigo. Payment processing fees still apply." The website's founding section and `requirements.md` (Brand Referral Pilot: PlusFree re-earned monthly) must be updated to match.

## Phase A — Build now (pre-payday, no contact)

### A1. Score & segment the leads `[x]` — owner spot-check passed (20/20 ok)
Result (2026-11-22): **A 199 · B 556 · C 334.** A = 145 busy independent barbershops + 45 chains + 9 switchers. Script: `barbershop-data/cleaned/score_leads.py` (weights at the top, re-run after tuning). Spot-check sheet: `barbershop-data/cleaned/spotcheck_20.md`.
Known limit: booking-tool detection only looks at the `website` column; the raw scrape's `booking_link` isn't carried into `leads_import.csv`, so switchers may be undercounted.
Script ranks all 1,089 leads by segment + priority with a one-line reason.
- Inputs: `leads_import.csv`. Signals: barber vs salon, independent vs chain, review count (busyness/queue pain), existing booking tool, reachable channel.
- Output: `barbershop-data/cleaned/leads_scored.csv` + summary (counts per segment/priority, A-priority shops per area for walk-in routes).
- **Verify:** owner spot-checks 20 shops on Google Maps and agrees with the ranking.

### A2. CRM logging fields `[x]`
Done 2026-11-22 via `meikigo-crm-stack/seed/import_scores.py` (re-runnable). Added `segment`, `priority`, `score_reason`, `objection`; reused CRM's built-in `lead_score` and `lost_reason`/`lost_notes` (Lost Reason list: Pricing, Competition, Missing Features, No Decision-Maker, Poor Fit, …). New **Sales** section at top of the lead side panel. All 1,089 scraped leads scored; the 2 inbound WhatsApp leads are unscored.
- Run `scripts/crm backup` first — live CRM holds real leads (never `down -v`).
- Objection list (v1): price · already use Fresha/Setmore · no tablet · happy with paper · not decision-maker · not interested · other.
- **Verify:** backup exists; a lead in the CRM UI shows segment + priority.

### A3. Sign-up source attribution `[x]` (code) · `[!]` production test waits for payday
Done 2026-11-22. meikigo-api `7fd943e`: optional `source` on register + founding application → `user_accounts.signup_source` / `founding_shop_applications.source` (migration `AddSignupSource`); bad values become null, never block a sign-up. Marketing site `9e3774f`: remembers `?ref=`/`?utm_source=` (else first external referrer host, e.g. `google.com`, `chatgpt.com`) and sends it with both forms.
Checked: 5 new API tests pass; migration applies / rolls back / re-applies on a throwaway Postgres; in the browser, landing on `/blog?ref=visit` → moving to `/barbershop` → sign-up sent `"source":"visit"`.
**To read results later:** `select signup_source, count(*) from user_accounts group by 1;` (same for `founding_shop_applications.source`).
**Deploy order:** either order is safe (the API ignores unknown fields). Not deployed yet.
Marketing site captures `?utm_source` / `?ref` → passes to sign-up → meikigo-api stores it on the shop record (migration).
- Tags: `ref=wa` · `ref=call` · `ref=visit` · `ref=supplier` · `ref=blog` · `ref=ai`.
- **Verify:** unit/integration test + local sign-up stores the source. `[!]` End-to-end on hosted Supabase waits for payday.

### A4. Free search measurement + GA4 `[ ]` — not blocked: verify by HTML tag, no GoDaddy needed
Owner creates a Search Console **URL-prefix** property for `https://meikigo.com/` (HTML tag method) and a GA4 property, then sends the verification tag + GA4 Measurement ID. Claude adds both, swaps `track()` from Vercel to GA4 (existing Start free/sign-up events keep working), updates the privacy notice line (PDPA disclosure), deploys via Netlify CLI. The DNS-based Domain property can be added later when GoDaddy access returns.
Google Search Console + Bing Webmaster verification on meikigo.com, submit `sitemap.xml`, deploy via Netlify CLI.
- Owner does the account/verify clicks in their own Google account.
- **Verify:** both consoles show the site verified and the sitemap read.

### A5. Sales kit `[~]` — drafted in `MarketingMaterial/sales-kit.md`, awaiting owner read. Open item: what supply stores get in return (§7)
Ready so payday = calling, not writing.
- Short script per top segment (busy independent / switcher / small shop / chain / salon).
- Walk-in demo checklist (tablet, QR booking flow, payment flow).
- Supply-store partner pitch (~95 stores).
- Objection list matching A2.
- **Verify:** owner reads it; nothing claims a feature we don't have (check against `gemini-context.md`).

## Phase B — After payday

- [ ] B1. Pay Supabase, re-enable sign-up, test A3 end to end on production.
- [ ] B2. Work the A-priority list: walk-ins by area cluster + calls; WhatsApp within the daily cap. Every touch logged in CRM with stage + objection.
- [ ] B3. Contact supply stores with the partner pitch.
- [ ] B4. After ~3 weeks of logged conversations: weekly brief script (CRM + Search Console → top objections with counts, funnel per segment, 3 decisions with for/against).
- [ ] B5. Monthly AI-assistant citation test (manual, logged): "best barbershop POS Malaysia", "Fresha alternative Malaysia", "Meikigo vs Fresha".
- [ ] B6. Day-60 check on every paying shop.

## Deliberately not building

- Weekly brief / dashboards before there is conversation data (would be empty).
- Google Maps review scraping (breaks Google's terms) — read a handful by hand if needed.
- Automated AI-citation testing (paid APIs).
- Expanding to the ~1,017 other-state barbershops before Selangor shows a working funnel.

## Log

- 2026-11-22 — Plan agreed. Answers: sign-up paused (Supabase), CRM writes OK with backup, include salons (ranked lower), target set at 15 paying shops by 31 Jan 2027. Started A1.
- 2026-11-22 — A1 scoring built: 199 A / 556 B / 334 C. Spot-check 20/20 ok.
- 2026-11-22 — Pilot candidates: 293 pass the data pre-screen (barbershop-data 47bb608), CRM fields Pilot Track/Rank + public view "Pilot candidates" (crm-stack 4deb38c, backup 22:58). Chain detection by brand name moved chains 103 → 221. Criteria + wave plan in sales kit §1b.
- 2026-11-22 — Founding form extended for pilot selection (api 814e3a4, site 2ff857e, admin 87c99c5): role, outlets, current system, payment mix, device; WhatsApp required; feedback commitment spelled out. Admin view not visually checked (needs API + login).
- 2026-11-22 — A5 sales kit drafted, then rewritten pilot-first (founding-shop invite in every first contact). Goal changed to Stage 1 pilot target. A4 unblocked (HTML-tag verification).
- 2026-11-22 — A3 code done (api 7fd943e, site 9e3774f). Found: (1) meikigo.com/barbershop images load from the paused Supabase project and are broken; (2) Vercel Analytics script 404s on Netlify, so existing site events aren't recorded; (3) 0b74c85 shipped `Outlet.RequireDiscountApproval` without a migration (now covered idempotently in AddSignupSource); (4) 5 API tests already fail on HEAD.
- 2026-11-22 — A2 done: CRM backup 19:53 (Telegram), scores imported 1,089/1,089, Sales panel verified in the UI. Commits: meikigo-project 50c3b54, barbershop-data 2c8e947, meikigo-crm-stack 4c1e39f (none pushed).
