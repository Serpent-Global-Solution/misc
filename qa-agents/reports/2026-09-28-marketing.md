> Evidence paths are relative to `runs/2026-09-28-marketing/`.

# Meikigo exploratory test report — 2026-09-28

## Summary

This run covered only the **marketing website** (`meiki-marketing-site.test:3002`), plus the first step of the Merchant Portal that sign-up hands off to (`meiki-brand.test:3000`). Four personas and one crawler took part. All four personas reached their goal. Sign-up works from start to finish: account created → login → onboarding step 1. I found no JS exceptions, HTTP errors or critical/high problems. The main findings:
- The Privacy and Terms links go nowhere.
- The sign-up form never tells users why their input was rejected.
- Copy still names **HitPay** as the payment gateway. The platform now uses CHIP.
- A few smaller hand-off and accessibility problems.

| App | Personas run | Goals completed | Confirmed bugs (by severity) | Usability issues |
|---|---|---|---|---|
| Marketing website (+ Merchant Portal sign-in hand-off) | 4 agents + 1 crawler | 4 / 4 (the mobile visitor could not confirm Malay support) | Critical 0 · High 0 · Medium 3 · Low 4 (plus 1 unconfirmed Low) | 15 |

Two signals were ruled out as harness artifacts, not bugs:
- **`blank-screen` on `about:blank`** (marketing-chaos-signup): the agent pressed browser Back on the first page of a new tab (`page.goBack()` in the session log, line 369), so it left the site. This is normal browser behaviour.
- **Large blank gaps in full-page screenshots** (marketing-mobile-visitor): these are scroll-triggered reveal animations that do not fire during a full-page capture. The persona confirmed the page "seemed fine when I scrolled by hand".

---

## Bugs

### BUG-001: Privacy and Terms links go nowhere (`href="#"`)
- **ID:** BUG-001
- **Severity:** Medium
- **Status:** CONFIRMED (reproduced)
- **App:** Marketing website
- **Page/route:** Footer on `/` and on `/barbershop` (and likely every page that uses the same footer)
- **Steps to reproduce:**
  1. Open http://meiki-marketing-site.test:3002.
  2. Scroll to the footer.
  3. Click **Privacy** (or **Terms**).
- **Expected:** A privacy policy or terms of service page opens. The site collects name, email and password in its sign-up form, so users (and Malaysian PDPA rules) expect a privacy policy they can reach.
- **Actual:** The URL changes to `/#` and the page jumps to the top. There is no privacy or terms content anywhere, and the sign-up popup does not link to either.
- **Evidence:**
  - My reproduction: the DOM shows `Privacy -> #` and `Terms -> #` on both `/` and `/barbershop`.
  - Screenshot: `_triage/repro-privacy-link.png`
- **Found by:** Triage reproduction. The links appear in the page snapshots of all four personas, but no persona clicked them.

### BUG-002: Sign-up form rejects bad input without showing any error message
- **ID:** BUG-002
- **Severity:** Medium
- **Status:** CONFIRMED (reproduced)
- **App:** Marketing website
- **Page/route:** `/`: "Start free" → "You're almost running." sign-up popup
- **Steps to reproduce:**
  1. Open http://meiki-marketing-site.test:3002 and click **Start free** in the top bar.
  2. Enter Full name `Triage`, Email `triagegmail.com` (no @), Password `a`.
  3. Click **Start free**.
- **Expected:** A visible message next to each bad field, such as "Enter a valid email address" or "Use at least 8 characters".
- **Actual:**
  - Nothing is submitted, and focus moves to the first invalid field.
  - No error text appears on the page.
  - The focused invalid field gets a lime/green border, the same colour as the valid state, so it looks accepted.
  - The browser has error messages ready (`validationMessage` = "Enter an email address", "Use at least 8 characters"), but the form relies on the browser's native tooltip, which does not appear here.
  - No field sets `aria-invalid` or `aria-describedby`, so screen readers get no error either.
  - The 8-character password rule is never shown up front.
- **Evidence:**
  - Screenshots: `marketing-chaos-signup__webkit/artifacts/page-2026-09-28T00-09-13-871Z.png` (persona) and `_triage/repro-signup-no-error-text.png` (reproduction).
  - DOM check: `name` minLength=2, `password` minLength=8, no maxLength on any field, no error elements in the page.
- **Found by:** marketing-chaos-signup__webkit

### BUG-003: Outdated "HitPay" payment gateway named on the barbershop page and in a blog article
- **ID:** BUG-003
- **Severity:** Medium (misleads prospective customers about who processes their payments)
- **Status:** CONFIRMED (seen in 2 sessions and reproduced)
- **App:** Marketing website
- **Page/route:**
  - `/barbershop`: feature carousel, "Payment snapshot" demo
  - `/blog/meikigo-vs-fresha-malaysia`: article body
- **Steps to reproduce:**
  1. Open http://meiki-marketing-site.test:3002/barbershop.
  2. In the feature carousel, find the "Payment snapshot: From Payments ledger (prototype day)" card. It lists `CASH RM 60.00 · DUITNOW RM 85.00 · HITPAY RM 120.00`.
  3. Open **Blog** in the footer, then open "Meikigo vs Fresha for Malaysian barbershops". The text says: "Card tap still incurs HitPay gateway fees."
- **Expected:** Copy names the current payment provider (CHIP), or no gateway brand at all ("Card").
- **Actual:** HitPay is named as a payment method and as a fee source. The curious-owner persona did not know what HitPay was and wondered whether it was "a separate company I'd need to also deal with".
- **Evidence:**
  - My text extraction on `/barbershop` contains `HITPAY | RM 120.00`.
  - Page snapshots with the text: `marketing-curious-owner__webkit/artifacts/page-2026-09-28T00-08-52-159Z.yml` and `marketing-mobile-visitor__webkit/artifacts/page-2026-09-28T00-10-09-921Z.yml` (blog article, line 85).
- **Found by:** marketing-curious-owner__webkit, marketing-mobile-visitor__webkit (the text appears in their snapshots; only the owner commented on it)

### BUG-004: Blank white screen after signing in, before onboarding loads
- **ID:** BUG-004
- **Severity:** Low
- **Status:** CONFIRMED (signal plus reproduction)
- **App:** Merchant Portal (reached from the marketing sign-up)
- **Page/route:** `meiki-brand.test:3000/` → redirects to `/onboarding/organisation`
- **Steps to reproduce:**
  1. Sign up from the marketing site with a `-test` email, then click **Set up my business**.
  2. On the Merchant Portal login page, enter the same email and password and click **Sign in**.
  3. Watch the screen after "Signing in…" finishes.
- **Expected:** A loading indicator or skeleton, or a direct redirect to onboarding.
- **Actual:**
  - The browser lands on `/` and shows a completely empty page with no text and no spinner.
  - This lasted about 0.25 s in the persona's run and at least 1 s in my reproduction, before the redirect to `/onboarding/organisation`.
  - Sign-in itself took about 2.3 s.
  - The only thing visible is the Next.js dev "Rendering…" pill, so production timing may be shorter. Even so, the page has no loading state.
- **Evidence:**
  - Signal: `blank-screen` at `http://meiki-brand.test:3000/` (2026-09-28T00:09:18.370Z), followed by navigation to `/onboarding/organisation` at 00:09:19.664Z.
  - Screenshots: `marketing-signup__webkit/evidence/001-blank-screen.png`, `_triage/repro-post-login-3s.png`
- **Found by:** marketing-signup__webkit

### BUG-005: Login page does not pre-fill the email it was given after sign-up
- **ID:** BUG-005
- **Severity:** Low
- **Status:** CONFIRMED (reproduced)
- **App:** Merchant Portal
- **Page/route:** `meiki-brand.test:3000/login?callbackUrl=%2F&registered=1&email=<email>`
- **Steps to reproduce:**
  1. Complete sign-up on the marketing site.
  2. Click **Set up my business**.
  3. Look at the Email field on the login page.
- **Expected:** The Email field is filled in with the address from the URL. The banner already says "Account created for <email>".
- **Actual:** The banner shows the email, but the Email input is empty (DOM `value: ""`). The user has to type both email and password again, seconds after creating the account.
- **Evidence:**
  - Reproduction: DOM check of the input values on the login page.
  - Persona screenshot/snapshot: `marketing-signup__webkit/artifacts/page-2026-09-28T00-09-05-340Z.yml`
  - Screenshot `_triage/repro-post-login-750ms.png` shows the page after I typed the email myself.
  - Diary: "I had to type my email and password a second time on a separate login page."
- **Found by:** marketing-signup__webkit

### BUG-006: Text colour contrast below WCAG AA on several pages
- **ID:** BUG-006
- **Severity:** Low
- **Status:** CONFIRMED (`/barbershop` hit in 2 sessions; the other pages were seen once each)
- **App:** Marketing website and Merchant Portal login
- **Page/route and samples** (probably one shared design-token root cause):
  - `/barbershop`: `.barbershop-problem-line__text` (1–2 nodes)
  - `/compare`: `.barbershop-fit-card > h3` (8 nodes)
  - `/blog`: `.text-body-lg` (12 nodes)
  - `/blog/meikigo-vs-fresha-malaysia`: `a[href$="blog"]` (4 nodes)
  - `meiki-brand.test:3000/login`: `.group/button` (1 node)
- **Steps to reproduce:** Open any of the routes listed above and run an axe scan (rule `color-contrast`).
- **Expected:** At least 4.5:1 contrast for body text.
- **Actual:** axe reports `color-contrast` (serious) on each of these pages.
- **Evidence:** `a11y` signals `color-contrast` on the five routes listed above. No screenshots.
- **Found by:** marketing-curious-owner__webkit, marketing-mobile-visitor__webkit, marketing-signup__webkit

### BUG-007: FAQ list items are not inside a list
- **ID:** BUG-007
- **Severity:** Low
- **Status:** CONFIRMED (2 sessions)
- **App:** Marketing website
- **Page/route:** `/barbershop#faq`
- **Steps to reproduce:** Open `/barbershop` and run an axe scan (rule `listitem`) on the FAQ section.
- **Expected:** `<li>` elements sit inside a `<ul>` or `<ol>`, so screen readers announce "list, 7 items".
- **Actual:** 7 `.barbershop-faq__item` `<li>` elements sit directly inside a `<div>`.
- **Evidence:** `a11y` signal `listitem` (serious, 7 nodes), sample `div:nth-child(1) > .barbershop-faq__item.list-none`
- **Found by:** marketing-curious-owner__webkit, marketing-mobile-visitor__webkit

### BUG-008: Blog link is told apart from surrounding text only by colour
- **ID:** BUG-008
- **Severity:** Low
- **Status:** UNCONFIRMED (1 session, not reproduced)
- **App:** Marketing website
- **Page/route:** `/blog/meikigo-vs-fresha-malaysia`
- **Steps to reproduce:** Open the article and find the "compare" link inside the `.barbershop-blog-note` paragraph.
- **Expected:** The link is underlined or otherwise marked, not just coloured.
- **Actual:** axe `link-in-text-block` (serious): the link can only be told apart by colour.
- **Evidence:** `a11y` signal, sample `.barbershop-blog-note > a[href$="compare"]`
- **Found by:** marketing-mobile-visitor__webkit

---

## Usability issues

### Marketing website: sign-up

- **Password rule is hidden.** Nothing says a password needs 8 characters until the user fails, and even then no message appears (see BUG-002). 1 persona.
  > "No error messages anywhere on the form — just colored borders on fields, so I couldn't tell if my name was too long, my password too weak, etc., without guessing." (marketing-chaos-signup)
- **Full name has no length limit.** A ~110-character name mixing emoji and Chinese text got a green checkmark. Non-Latin names are fine, but the field has no `maxLength`, so very long names reach the backend. 1 persona.
  > "Emoji, Chinese characters, and a ~110-character name were all silently accepted with a green checkmark, no length or character warning at all." (marketing-chaos-signup)
- **Users must log in again straight after signing up.** Sign-up hands off to a separate login page on a different domain with a different look. 1 persona.
  > "Since I just made an account with those exact credentials, I expected to be signed in right away without re-entering everything." (marketing-signup)
- **Two sites feel like two products.** The switch from `marketing-site` to `brand` (Merchant Portal) made the user unsure they were still in Meikigo. 1 persona.
  > "I wasn't 100% sure I was still 'in Meikigo' until I saw the 'Meikigo for Business' logo again." (marketing-signup)
- **"Start free" is not recognised as sign-up.** The Business type field also comes before the account details. 1 persona.
  > "The 'Start free' button in the top nav doesn't say 'Sign up' — I only found the sign-up form by clicking it and hoping." (marketing-chaos-signup)
- **Browser Back does not close the sign-up popup.** The popup adds no history entry, so Back leaves the page instead. 1 persona.
  > "When I pressed the browser Back button after the popup, it took me to a totally blank white page instead of back to the homepage." (marketing-chaos-signup)

### Merchant Portal: onboarding step 1

- **"SSM registration number" is unexplained jargon.** 1 persona.
  > "I don't know what SSM is off the top of my head … a first-time user without that number handy might get stuck here." (marketing-signup)

### Marketing website: pricing and product information

- **No transaction fee rate is published.** "No hidden fees" appears next to the plans, yet the card/DuitNow fee percentage is never stated. The owner had to work it out from a demo card (Fees RM2.40 on RM265). 1 persona.
  > "As someone careful with money, not knowing the real transaction cut is exactly the kind of thing that makes me suspicious before trying it." (marketing-curious-owner)
- **"Barbers", "staff" and "logins" are not defined** in the plan limits (for example, Starter: 5 barbers · 2 logins · 1 staff). 1 persona.
  > "I had to guess what these limits mean for my actual headcount." (marketing-curious-owner)
- **Add-on prices are missing.** "Need more outlets or barbers? Add-ons available anytime." has no price (I confirmed this on the page). 1 persona.
  > "'Add-ons available anytime' is mentioned for extra outlets/barbers, but no price is shown for add-ons anywhere I looked." (marketing-curious-owner)
- **"14-day Plus-equivalent trial" is unclear.** Users can't tell what happens after the trial if they pick Starter. 1 persona.
  > "I wasn't sure what happens to my data/settings when it downgrades after 14 days." (marketing-curious-owner)

### Marketing website: navigation and mobile

- **The homepage has no link to Blog, Pricing or FAQ.** The homepage footer only has How it works, Your business, Privacy, Terms and Contact us (confirmed in the DOM). Those links only appear after picking Beauty → Barbershop. 1 persona.
  > "I couldn't find the Blog link from there — I only found it after clicking into a specific business type (Barbershop) page, which has a different, fuller menu." (marketing-mobile-visitor)
- **The logo icon looks like a button but seems dead.** It links to `/`, so tapping it on the homepage does nothing visible. 1 persona.
  > "The homepage has a small icon … next to 'Start free' that isn't clickable and does nothing when tapped." (marketing-mobile-visitor)
- **The site never says what languages it supports.** There is no BM/EN switch and no statement about Bahasa Melayu. 1 persona.
  > "I couldn't confirm this and had to check several pages before giving up on finding it." (marketing-mobile-visitor)
- **"Choose your business" is a two-level dropdown that looks like a plain button.** "Coming soon" on Food & Beverage and Retail left the user unsure what exists. 1 persona.
  > "'Choose your business' looked like a normal button but is actually a dropdown that then asks you to pick a sub-type." (marketing-mobile-visitor)

---

## Coverage

**Marketing website: routes reached**
- `/` (home)
- `/barbershop`, including `#pricing`, `#features` and `#faq`
- `/compare`
- `/blog`
- `/blog/meikigo-vs-fresha-malaysia`

**Merchant Portal (via sign-up hand-off): routes reached**
- `/login`
- `/` (blank redirect, BUG-004)
- `/onboarding/organisation` (step 1 of 2 only)

**Never reached**
- **Privacy and Terms pages.** These don't exist (BUG-001).
- **Food & Beverage and Retail vertical pages.** They are marked "Coming soon".
- **Any blog article other than the Fresha comparison, and the homepage "How it works" section.** No persona commented on the "How it works" section.
- **Onboarding step 2 (brand setup) and everything after it in the Merchant Portal.** No persona went past step 1.
- **The "Sign up" tab on the Merchant Portal login page.** This is a second sign-up path that may behave differently from the marketing popup.
- **Login with an existing account from the marketing "Login" button.**
- **Crawler coverage.** The crawler (`crawl-marketing__lightpanda`) only reached the homepage (2 page loads in 4 s). The homepage offers almost no crawlable links: nav items are buttons, footer links are `#` anchors or `#section` anchors, and the vertical cards are `group` elements, not `<a>` links. Search engines will have the same problem finding `/barbershop`, `/compare` and `/blog` from the homepage. This matches the mobile persona's trouble finding the blog.

---

## Not tested / limits

- **Only the marketing app was in scope for this run.** No booking, POS, payment or admin flows were exercised. Nothing here says anything about money handling.
- **All personas used WebKit.** Chromium and Firefox were not covered. Native form-validation tooltips (BUG-002) can look different in real Safari and Chrome than in automated WebKit. The missing on-page error text and `aria-invalid` are real regardless.
- **The environment runs Next.js in dev mode** ("Rendering…" and Next.js Dev Tools are visible). Timings such as the ~2.3 s sign-in and the blank screen in BUG-004 may be shorter in a production build.
- **Mobile was emulated by viewport size only**, with no real device or touch hardware.
- **Test accounts were created during the run:** `syafiq-test82@gmail.com` and `aiman-test1@gmail.com` (personas) and `triage-test0928@gmail.com` (triage). Clean them up if needed.
- **Email delivery and verification were not tested.** SMTP is off in this phase.
- **I reproduced 5 findings myself:** BUG-001, BUG-002, BUG-003, BUG-004 and BUG-005. I also checked the yearly pricing maths (RM1,090 / RM1,990 / RM3,290 = 10 × monthly, correct). The accessibility findings rest on the axe signals only.
