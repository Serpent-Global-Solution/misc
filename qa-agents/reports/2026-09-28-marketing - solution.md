# Solutions: marketing site test report, 2026-09-28

This follows `2026-09-28-marketing.md`. For each finding it gives the root cause (read from the code, with contrast values measured by axe in WebKit) and a proposed fix. **Nothing has been changed yet.**

Confidence: **Confirmed** means the cause was proven in the code or by measurement. **Likely** means it is strongly indicated but not yet proven.

## Summary

| ID | Severity | Root cause | Where to fix | Confidence |
|---|---|---|---|---|
| BUG-001 | Medium | Privacy and Terms are hard-coded as `href: '#'` in both footers. No legal pages exist, but drafts are in `legal/` | `meikigo-marketing-site` `Footer.tsx`, `BarbershopFooter.tsx`, new `/privacy`, `/terms` routes | Confirmed |
| BUG-002 | Medium | The form relies on the browser's native validation tooltip. The field shows no error text, has no `aria-invalid`, and the focus border is lime (the same colour as valid) | `src/components/ui/signup-animated-field.tsx`, `SignupScreen.tsx` | Confirmed |
| BUG-003 | Medium | HitPay copy is left in the blog post, `llms-full.txt`, and the prototype mock data that feeds the barbershop carousel | `BarbershopBlogPost.tsx`, `public/llms-full.txt`, `components/prototype/portal/**` | Confirmed |
| BUG-004 | Low | The merchant portal's `/` is a server component that waits for 2 API calls before it redirects. There is no `loading.tsx` at the app root, so the page is blank until then | `meikigo-brand` `src/app/loading.tsx` (new) | Confirmed |
| BUG-005 | Low | The login page reads `email` from the URL for the banner, but `LoginForm` hard-codes `defaultValues.email: ""` | `meikigo-brand` `app/login/page.tsx`, `components/auth/login-form.tsx` | Confirmed |
| BUG-006 | Low | The `--color-stone` (#919183) text token is 3.0–3.2:1 on white or paper. The merchant login button is white on lavender #918df6 (2.85:1). The barbershop "problem line" is dimmed by an inline animated colour | marketing `globals.css` tokens, brand `globals.css` `--primary`, `BarbershopProblem.tsx` | Confirmed (tokens), Likely (problem line) |
| BUG-007 | Low | FAQ `<li>` items are wrapped in a `<div>`, not a `<ul>` | `BarbershopFaq.tsx`, `FAQ.tsx` | Confirmed |
| BUG-008 | Low | The blog note link is styled by colour only (`--color-graphite` text, no underline) | `globals.css` `.barbershop-blog-note a` | Likely (unconfirmed in the report) |

Suggested order: BUG-003 (copy) → BUG-002 → BUG-001 (needs legal sign-off on the drafts) → BUG-005 → BUG-004 → accessibility fixes (006–008).

---

## BUG-001: Privacy and Terms links go nowhere

### Root cause (confirmed)
- `meikigo-marketing-site/src/components/Footer.tsx:11-12` and `src/components/barbershop/BarbershopFooter.tsx:17-18` both define `{ label: 'Privacy', href: '#' }` and `{ label: 'Terms', href: '#' }`.
- No `/privacy` or `/terms` route exists under `src/app`.
- The sign-up call sends `acceptTermsOfService: true` (`src/api/registrationapi.ts:36`), but the user is never shown the terms.
- Drafts already exist in the project root at `legal/client-privacy-notice.md`, `legal/client-terms-of-service.md` and `legal/merchant-terms-of-purchase.md`. `legal/README.md` marks them **"draft, not reviewed, not for real use"**.

### Fix
1. **Decision needed:** publish the drafts as they are, marked as a draft, while the environment is in testing, or wait for legal review.
2. Add `src/app/privacy/page.tsx` and `src/app/terms/page.tsx`. The site already renders blog posts from Markdown under `public/blog`, so reuse that renderer for the legal Markdown rather than writing a new one. Merchants sign up here, so the terms page should link to the merchant terms of purchase.
3. Point both footers to `/privacy` and `/terms`.
4. In the sign-up popup, add one line under the button: "By signing up you agree to the Terms and Privacy notice", with both links. This is what `acceptTermsOfService: true` claims already happened.
5. Add both routes to `public/sitemap.xml`.

### Status: FIXED UPSTREAM by a teammate in `afb0ad0` ("feat: add privacy and terms pages, signup updates")
- `/privacy` and `/terms` return 200 ("Privacy Notice — Meikigo", "Terms of Service — Meikigo"). The footer links point to them.
- The sign-up form now has a required "I accept the Terms of Service and Privacy Notice" checkbox that links to both pages.
- Not re-checked: whether the published text is the reviewed version of the `legal/` drafts. That is a legal question.

---

## BUG-002: Sign-up form rejects bad input with no message

### Root cause (confirmed)
- `SignupAnimatedField` passes `required` and `minLength` to the `<input>`, and the form uses native constraint validation. On an invalid submit, the browser only focuses the field. The native tooltip did not appear in WebKit, and some mobile browsers do not show it at all.
- The field never shows an error:
  - There is no element for error text.
  - There is no `aria-invalid` and no `aria-describedby`.
  - `borderForState()` has only pulsing, focused, valid and idle states. The **focused** border is lime (`--color-electric-lime` at 55%), so the invalid field the browser focuses looks accepted.
- The 8-character password rule lives only in `defaultFieldValid()` and is never shown to the user.
- The name field has no `maxLength`, so a 110-character name is accepted.

### Fix (one component, all fields)
In `src/components/ui/signup-animated-field.tsx`:
1. Add a `touched` state. Set it on blur, and on the input's native `invalid` event (`onInvalid`), which fires on submit. `onInvalid` also calls `e.preventDefault()` so the browser tooltip does not double up.
2. When `touched && !isValid`, render `<p id={`${id}-error`} className="signup-field__error">{message}</p>`. Use the input's `validationMessage`, or a per-field `errorText` prop for friendlier wording. Also set `aria-invalid` and `aria-describedby` on the input.
3. Add an `invalid` state to `borderForState()` that returns a red or orange border and takes priority over `focused`.
4. Add an optional `hint` prop, shown under the field until it is touched. Password gets "At least 8 characters".

In `src/components/SignupScreen.tsx`:
5. Set `maxLength={100}` on Full name.
6. Keep `required` and `minLength` as they are, so native validation still blocks the submit.

Test: submit an empty name, `aimangmail.com` and `a`. Expect three visible messages, `aria-invalid="true"` on each field, and no request to `/register`. Axe should find no `aria` issues on the popup.

### Status: FIXED on 2026-09-28. Not committed.
- `signup-animated-field.tsx`:
  - The field is marked `touched` when you blur it with a value, or on the native `invalid` event at submit. The `invalid` handler calls `preventDefault()`, so the browser tooltip no longer appears.
  - A touched, invalid field shows `<p id="…-error" class="signup-field__error">` with a plain message, and sets `aria-invalid` and `aria-describedby`.
  - Its border turns red. The invalid state takes priority over the lime focus border.
- `SignupScreen.tsx`: Full name has `maxLength={100}`. The password hint ("At least 8 characters…") was already added upstream in `afb0ad0`.
- `globals.css`: `.signup-field__error`, in the same red as `.signup-form__error`.
- Verified in WebKit:
  - An empty submit shows "Enter your full name. | Enter your email. | Enter your password."
  - Bad input (`A`, `aimangmail.com`, `a`) shows "Use at least 2 characters. | Enter a full email address, e.g. you@yourshop.com. | Use at least 8 characters."
  - 3 fields have `aria-invalid="true"`, and **0** register requests were sent.
  - The errors clear once the input is fixed.
  - axe (WCAG 2 A/AA) on the popup: clean. Typecheck and lint: clean.

---

## BUG-003: Outdated "HitPay" copy (the gateway is now CHIP)

### Root cause (confirmed)
There are three separate sources:
1. **Blog post:** `src/components/barbershop/blog/BarbershopBlogPost.tsx:91` says "Card tap still incurs HitPay gateway fees". The Markdown copy at `public/blog/meikigo-vs-fresha-malaysia.md` has no HitPay text, so the TSX and the Markdown have drifted apart.
2. **AI/SEO text:** `public/llms-full.txt:25` says "Card tap on an NFC-capable tablet via HitPay (HitPay gateway fees apply)". This file is served to AI crawlers, so assistants will repeat it.
3. **Barbershop carousel "Payment snapshot":** the carousel (`src/components/ui/loading-carousel.tsx`) embeds `PrototypeScreen`. Its reports screen uses the mock data in `src/components/prototype/portal/data/mock.ts`, where `PaymentMethod = 'cash' | 'duitnow' | 'hitpay'`. From there it reaches:
   - `Reports.tsx:91-92` and `:280`, which show the label "HitPay"
   - `Settings.tsx:247`, "POS HitPay / DuitNow QR"
   - `bookingsStore.tsx:495`, a 2% HitPay fee

### Fix
- Copy: "Card tap still incurs CHIP gateway fees". Or, without naming a brand: "Card payments still carry a small gateway fee".
- `llms-full.txt`: "Card tap on an NFC-capable tablet via CHIP (gateway fees apply)".
- Prototype: rename the method value `'hitpay'` to `'card'`, and make the labels "Card". This is a rename across `mock.ts`, `Reports.tsx`, `Settings.tsx` and `bookingsStore.tsx`. Keep the 2% demo fee, or align it with the real CHIP card rate if marketing wants the carousel numbers to be realistic.
- Check: `grep -ri hitpay meikigo-marketing-site/src meikigo-marketing-site/public` returns nothing.

### Status: FIXED on 2026-09-28. Not committed.
- Copy: the blog TSX and Markdown both say "Card tap still incurs CHIP gateway fees". `llms-full.txt` (2 places) now names CHIP.
- Sample data renamed. Portal: `'hitpay'` is now `'card'`, the Reports label "HitPay" is now "Card", and the Settings hint is "POS card / DuitNow QR". POS: `'hitpay'` is now `'qr'` and `'hitpay-card'` is now `'card'`, and `isHitPay` is now `viaGateway`. The 2% demo fee is unchanged. 10 files, 23 lines.
- Checked:
  - `grep -ri hitpay src public` returns nothing.
  - In WebKit, the text of `/`, `/barbershop` (scrolled through the carousel), `/compare`, `/blog`, the article, `/llms-full.txt` and the article `.md` contains no "HitPay".
  - Typecheck clean. Lint errors unchanged (14 before, 14 after, all pre-existing).

---

## BUG-004: Blank screen after sign-in (merchant portal)

### Root cause (confirmed)
`meikigo-brand/src/app/page.tsx` is an async server component. It calls `auth()`, then `getMyOrganisation()`, then `listBrands()`, and only then redirects. There is no `src/app/loading.tsx` (and no `(app)/loading.tsx`), so the browser shows an empty document until the server finishes. The shared Supabase pooler is slow at the moment (`EMAXCONNSESSION`), which makes the gap longer.

### Fix
Add `meikigo-brand/src/app/loading.tsx`, a centred spinner with the text "Getting your shop ready…". Next.js shows it automatically while `page.tsx` runs, so no other code is needed.

Optional follow-up: after sign-up, have the login form redirect straight to `/onboarding/organisation` when `registered=1`, which skips the lookup.

### Status: FIXED on 2026-09-29. Not committed.
- Added `meikigo-brand/src/app/loading.tsx`: a spinner and "Getting your shop ready…" on the carbon background, with `role="status"`.
- It is placed at the **root**, not in a route group. After sign-in the path goes `/` (async lookups), then a redirect, then `/brands/[id]/dashboard`, whose `(app)` and brand layouts are both async. Only a boundary above those layouts can cover the wait. A route-group-only `loading.tsx` was tried first: it covered `/`, but left a ~1.9s blank while the dashboard layouts rendered.
- The root boundary only shows when the top-level segment changes. Navigation inside the portal (Services, Customers, Bookings) was checked and never shows it.
- Timings in WebKit, from sign-in to dashboard:
  - Before: a blank screen for the whole wait.
  - After: the spinner covers about 2.7s at `/` and about 1.5s at the dashboard. A **~0.4s blank** remains during the server-redirect handoff, which Next.js gives no hook for.
- Typecheck and lint clean.

---

## BUG-005: Login page does not pre-fill the email after sign-up

### Root cause (confirmed)
- `meikigo-brand/src/app/login/page.tsx:22-29` reads `email` from the URL and shows it in the banner (`registeredEmail`).
- The form is rendered as `<LoginForm callbackUrl={…} />` (line 89) with no email passed in.
- `LoginForm` hard-codes `defaultValues: { email: "", password: "" }` (`components/auth/login-form.tsx:39`).

### Fix
- Pass `defaultEmail={registeredEmail ?? ""}` to `LoginForm`.
- In `LoginForm`, accept `defaultEmail?: string` and use `defaultValues: { email: defaultEmail ?? "", password: "" }`.
- Add `autoFocus` on the password field when `defaultEmail` is set.

### Status: FIXED UPSTREAM by a teammate in meikigo-brand `cd440f2` ("feat(auth): forgot/reset password flow…")
- `LoginForm` now takes `initialEmail`, and `login/page.tsx` passes `registeredEmail`.
- Verified in WebKit: `/login?registered=1&email=syafiq-test82%40gmail.com` shows the email pre-filled.
- Not done: auto-focusing the password field, which is optional polish.

---

## BUG-006: Contrast below WCAG AA

### Root cause (confirmed by measurement)

| Where | Element | Colours | Ratio |
|---|---|---|---|
| `/barbershop`, `/compare` | `.barbershop-pricing-footnote` | `--color-stone` #919183 on #f9f9f4 / #ffffff | 3.02 / 3.19 |
| `/compare` | fit-card `h3`, `.barbershop-cost-card__label`, spans | #919183 on #ffffff | 3.19 |
| `/barbershop` | `.barbershop-problem-line__text` | #bbbbb2 on #ffffff (inline `style={{ color }}` from the animation) | 1.93 |
| merchant `/login` | primary button (`.group/button`) | #ffffff on `--primary` #918df6 | 2.85 |

- In `meikigo-marketing-site/src/app/globals.css`, `--color-stone: #919183` (line 29) is used through `--color-ash-text` (line 50).
- In `meikigo-brand/src/app/globals.css`, `--primary` and `--accent` are both `#918df6` (lines 100 and 107).

### Fix
- **Marketing site:** point `--color-ash-text` at `--color-graphite` (#6e6e64, already a token, about 5.2:1 on white), or darken `--color-stone` to about `#6f6f63`. That is a one-line token change, and it fixes every `stone`-coloured caption at once. Check the design first: any dark section that uses stone on a dark background must stay readable.
- **Problem line** (`BarbershopProblem.tsx:67`): the dimmed colour is used for lines that are not yet active. These lines already get `aria-hidden={!active}`. Axe flagged one line that was visible and active while it was still mid-fade. Likely fix: make the inactive colour ≥ 4.5:1, or skip dimming for the active line. Alternatively, accept it as decorative motion and re-measure after the animation ends.
- **Merchant portal:** text on the lavender primary button should be dark (`--carbon`), or darken the button's `--primary` to about `#6c67e8` (white text at ≥ 4.5:1). This is a brand colour decision, so show design both options.

### Status: FIXED on 2026-09-29. Not committed.
- **Marketing site:** `--color-ash-text` (stone #919183) is also used on dark sections (Hero, ClosingCta, footer, promo banner), where it passes at about 6:1. So the token itself stays. Only the three light-card rules (`.barbershop-pricing-footnote`, `.barbershop-cost-card__label`/`.barbershop-fit-card__title`, `.barbershop-cost-card__price span`) now use `--color-graphite`, about 5.2:1.
- **Problem line** (`BarbershopProblem.tsx`): the scroll fill now has a floor of 60% ink on the **active** line, rgb(96,96,89), which is 6.34:1. Inactive, `aria-hidden` lines keep the full grey fade. A sweep of every 250px of scroll found no contrast failure on the active line.
- **Merchant portal:** chosen option is dark text on lavender. `--primary-foreground` and `--sidebar-primary-foreground` are now `#181925` in both themes (was white, 2.85:1). Every `text-primary-foreground` use sits on `bg-primary`.
- **Dev-server note:** the marketing dev server served stale CSS after the local `next build` of Sep 28, even after a restart. Clearing `.next` fixed it.
- **Verified with axe:**
  - Marketing: `/`, `/barbershop`, `/compare`, `/blog`, the article, `/privacy` and `/terms` are all clean.
  - Merchant `/login`: clean in dark and light.
- **New finding, outside this bug:** in the merchant portal's **light** theme, the brand dashboard has 9 contrast failures: `text-ash` labels at 2.84 and `text-muted-foreground` at 2.7. The dark theme is clean.

---

## BUG-007: FAQ items not inside a list

### Root cause (confirmed)
`BarbershopFaq.tsx:32` and `:65` (and `components/FAQ.tsx:42`) render `<li className="barbershop-faq__item list-none">` inside a `<div>` (line 51).

### Fix
Change that wrapper `<div>` to `<ul className="… list-none p-0">`, in both FAQ components. Keep the classes so the styling does not change.

### Status: FIXED on 2026-09-29. Not committed.
- The FAQ item root is now a `div` in `BarbershopFaq.tsx` (2 places) and `FAQ.tsx`. Each item sat inside a `RevealItem` `<div>` (the shared reveal wrapper used by 19 sections), so a `<ul>` wrapper would not have helped. The accordion does not need list semantics.
- axe `listitem`/`list`: clean on `/barbershop`. The page has 7 `div.barbershop-faq__item` and 0 `li`.

---

## BUG-008: Blog link marked by colour only (unconfirmed)

### Root cause (likely)
`.barbershop-blog-note` (`globals.css:6603`) sets the text colour, and its links have no underline.

### Fix
Add `.barbershop-blog-note a { text-decoration: underline; text-underline-offset: 2px; }`. Re-run axe (`link-in-text-block`) on `/blog/meikigo-vs-fresha-malaysia`.

---

### BUG-008 status: CLOSED on 2026-09-29, not reproducible. axe `link-in-text-block` is clean on `/blog` and the article.

---

## Usability issues

| # | Issue | Proposed fix | Where |
|---|---|---|---|
| U1 | No transaction fee rate published, yet the site says "No hidden fees" | **Decision needed:** publish the CHIP card and DuitNow rates next to "Cash, DuitNow QR & card" and in the FAQ. The rates live in the admin's CHIP commission settings, so marketing must pick the public figure | pricing section, FAQ |
| U2 | "Barbers", "staff" and "logins" are not defined | Add a one-line tooltip or footnote under the plan limits: barber = bookable chair; staff = non-barber team member; login = someone who can sign in to the portal or POS | pricing cards |
| U3 | Add-on prices are missing | Show the add-on unit prices. The admin already stores them (`/settings/addon-pricing`), so marketing needs the public numbers | pricing footnote |
| U4 | "14-day Plus-equivalent trial" is unclear | Say "Try every Plus feature free for 14 days. Then pick any plan; your data stays." Confirm what happens to Plus-only data after a downgrade | hero, FAQ |
| U5 | Homepage has no Blog, Pricing or FAQ links, and the crawler (and search engines) only reach the homepage | Add Pricing, Compare and Blog to the homepage `Footer.tsx` `footerLinks`, as real `<a href>` links. They already exist in `BarbershopFooter`. This also fixes crawlability | `Footer.tsx` |
| U6 | No language statement | **Decision needed:** state the supported languages ("English now, Bahasa Melayu coming"), or add BM | FAQ |
| U7 | Re-login needed after sign-up, and the two sites look like two products | Short term: BUG-005 pre-fill. Longer term: hand over a one-time sign-in token from `/register` so the portal signs the user in automatically (needs an API change) | `meikigo-api` register + brand login |
| U8 | "Start free" is not recognised as sign-up, and Business type comes first | Rename the popup heading "Create your free account", and move Business type below the account fields | `SignupScreen.tsx` |
| U9 | Browser Back does not close the sign-up popup | Push a history entry when the popup opens, and close it on `popstate` | `SignupExpandableScreen.tsx` / `expandable-screen.tsx` |
| U10 | "SSM registration number" is not explained (merchant onboarding) | Add a hint: "Your Companies Commission (SSM) number. You can add it later." | `meikigo-brand` onboarding organisation form |
| U11 | "Choose your business" looks like a button but is a two-level menu | Add a chevron and `aria-haspopup`. Label "Coming soon" items as not clickable | `HeroBusinessSelect.tsx` |
| U12 | The logo icon does nothing on the homepage | Expected behaviour (it links to `/`). No change, or scroll to the top on click | – |

Also noted: `/prototype-screens` is a dev export page that is publicly reachable and crawlable. `robots.txt` allows everything. Add `export const metadata = { robots: { index: false } }` to that page, or exclude it from production builds.

---

## Test data created
The run created three sign-up accounts on the shared Supabase: `syafiq-test82@gmail.com`, `aiman-test1@gmail.com` and `triage-test0928@gmail.com`. All contain `-test`, as agreed. SMTP is off, so no email was sent.

## Retest plan
1. Fix the bugs in the suggested order. Verify each in WebKit: axe on the sign-up popup and the pricing pages, `grep -ri hitpay`, the login pre-fill, and no blank frame after sign-in.
2. Rerun the 4 marketing personas: `node bin/run.mjs --personas marketing --run runs/<date>-marketing-retest`, then triage.
3. Expected results:
   - The chaos persona sees an error message for each bad input.
   - The owner persona no longer asks what HitPay is.
   - The crawler reaches `/barbershop`, `/compare` and `/blog` from the homepage.
   - The Privacy and Terms pages open.
