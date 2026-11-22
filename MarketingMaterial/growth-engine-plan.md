# Meikigo Growth Engine — Build Plan & Tracker

Source: `marketing-tool.md` (the brief) → reviewed with `/be-ambitious` on 2026-11-22.
Status legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

## Goal

**Paying barbershops still active at day 60** — not leads, not traffic.

- **Target:** 15 paying shops by **31 Jan 2027**, each re-checked at day 60.
- **Pass/fail judge:** paying-shop records in Meikigo's own billing data, with sign-up source attached. Not the quality of any brief, not opinion. Report the real number even if we miss.

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

## Phase A — Build now (pre-payday, no contact)

### A1. Score & segment the leads `[~]` — built, awaiting owner spot-check
Result (2026-11-22): **A 199 · B 556 · C 334.** A = 145 busy independent barbershops + 45 chains + 9 switchers. Script: `barbershop-data/cleaned/score_leads.py` (weights at the top, re-run after tuning). Spot-check sheet: `barbershop-data/cleaned/spotcheck_20.md`.
Known limit: booking-tool detection only looks at the `website` column; the raw scrape's `booking_link` isn't carried into `leads_import.csv`, so switchers may be undercounted.
Script ranks all 1,089 leads by segment + priority with a one-line reason.
- Inputs: `leads_import.csv`. Signals: barber vs salon, independent vs chain, review count (busyness/queue pain), existing booking tool, reachable channel.
- Output: `barbershop-data/cleaned/leads_scored.csv` + summary (counts per segment/priority, A-priority shops per area for walk-in routes).
- **Verify:** owner spot-checks 20 shops on Google Maps and agrees with the ranking.

### A2. CRM logging fields `[ ]`
In `meikigo-crm-stack`: add custom fields `segment`, `priority`, `objection` (select), `lost_reason`. Import A1 scores.
- Run `scripts/crm backup` first — live CRM holds real leads (never `down -v`).
- Objection list (v1): price · already use Fresha/Setmore · no tablet · happy with paper · not decision-maker · not interested · other.
- **Verify:** backup exists; a lead in the CRM UI shows segment + priority.

### A3. Sign-up source attribution `[ ]`
Marketing site captures `?utm_source` / `?ref` → passes to sign-up → meikigo-api stores it on the shop record (migration).
- Tags: `ref=wa` · `ref=call` · `ref=visit` · `ref=supplier` · `ref=blog` · `ref=ai`.
- **Verify:** unit/integration test + local sign-up stores the source. `[!]` End-to-end on hosted Supabase waits for payday.

### A4. Free search measurement `[ ]`
Google Search Console + Bing Webmaster verification on meikigo.com, submit `sitemap.xml`, deploy via Netlify CLI.
- Owner does the account/verify clicks in their own Google account.
- **Verify:** both consoles show the site verified and the sitemap read.

### A5. Sales kit `[ ]`
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
- 2026-11-22 — A1 scoring built: 199 A / 556 B / 334 C. Waiting on 20-shop spot-check before A2 (CRM import).
