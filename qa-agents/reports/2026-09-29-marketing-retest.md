> Evidence paths are relative to `runs/2026-09-29-marketing-retest/`.

# Meikigo exploratory test report — 2026-09-29

## Summary
This retest covered the Meikigo marketing website and the first step of the Merchant Portal that sign-up leads to. The main task works: sign-up, first login and landing on onboarding all succeeded, both for the personas and in my own checks. Six of the eight bugs from the 2026-09-28 run no longer appear (see "Retest of 2026-09-28 bugs"). Most of today's alarming signals turned out not to be product bugs. The "account already exists" error and the failed login came from a test email that yesterday's run had already registered. The "blank" Compare page was a screenshot artifact. What is left: one Medium issue (plan limits that contradict the plan descriptions), two Low issues, and several usability problems about navigation and missing information.

| App | Personas run | Goals completed | Confirmed bugs (by severity) | Usability issues |
|---|---|---|---|---|
| Marketing website (+ Merchant Portal login/onboarding step 1) | 4 personas + 1 automated crawler | 3 of 4 (1 partly) | Critical 0 · High 0 · Medium 1 · Low 2 | 9 |

## Bugs

### BUG-001: Plan limits on the pricing cards contradict the plan descriptions
- **ID:** BUG-001
- **Fix:** FIXED on 2026-09-29, not committed. The limits were checked against the API seed (`PlanCapsConfiguration.cs`). Starter 4/5/2/1, Plus 8/8/4/3 and Pro 20/15/unlimited/9 (outlets/barbers/logins/staff) **already match** the cards and `llms-full.txt`, so the fault was in the wording. In `data.ts`, Pro's tagline "For multi-outlet operations." is now "For chains run from HQ." (Pro adds 20 outlets and the HQ dashboard). Each tier lists its own products/services cap from the API: Starter "3 products & 5 services", Plus "10 products & 10 services" (unchanged), Pro "30 products & 30 services". Verified on the rendered `/barbershop#pricing`, and "multi-outlet" no longer appears anywhere on the site.
- **Severity:** Medium (the user is misled about which plan they need and what it costs)
- **Status:** CONFIRMED (reproduced: I saw the same text)
- **App:** Marketing website
- **Page/route:** `/barbershop#pricing`, and the same pricing block on `/compare`
- **Steps to reproduce:**
  1. Open http://meiki-marketing-site.test:3002/barbershop.
  2. Click **Pricing** in the top bar and read the three plan cards.
- **Expected:** The limits and descriptions tell the same story. A plan described as "For multi-outlet operations" should be the one you need for more than one outlet.
- **Actual:**
  - **Starter** (RM109, "Get your shop online, today.") already includes **4 outlets**, 5 barbers, 2 logins and 1 staff.
  - **Plus** (RM199) includes 8 outlets but still only 8 barbers.
  - **Pro** (RM329) is described as "For multi-outlet operations", which suggests a two-shop owner needs Pro, although Starter already covers 4 outlets.
  - Plus lists "10 products & 10 services". This reads like a cap that appears only on the middle plan, with no matching line on Starter or Pro.
  - The `/compare` page repeats "Up to 5 barbers, 4 outlets, 2 logins" for Starter.
  - I cannot tell whether the limits or the descriptions are wrong. Product needs to decide which is right and fix the other.
- **Evidence:**
  - Persona screenshot: `marketing-curious-owner__webkit/artifacts/page-2026-09-29T14-06-15-939Z.png`
  - My reproduction: `_triage/artifacts/pricing-cards.png` (the text above was taken from the live page)
  - Diary: "The cheapest plan, 'Starter' (RM109/month), already includes '4 outlets' … Yet the top plan, 'Pro' (RM329/month), is labelled 'For multi-outlet operations' … this made me suspicious the plan descriptions are just marketing copy, not accurate limits."
  - Yearly prices were checked and are correct: RM1,090 / RM1,990 / RM3,290 = 10 × monthly.
- **Found by:** marketing-curious-owner__webkit

### BUG-002: A wrong password shows "Something went wrong", which sounds like a system error
- **ID:** BUG-002
- **Fix:** FIXED on 2026-09-29, not committed. `LoginForm` rendered sign-in errors through `PlanLimitNotice`, whose non-plan fallback is titled "Something went wrong". Sign-in now shows its own destructive `Alert` with only the message, which reads "Wrong email or password. Check both and try again, or use Forgot password below." (`actions/auth.ts`). The shared destructive `Alert` variant (`ui/alert.tsx`, used in 7 files) had red text on the card at about 3.2:1. It now uses foreground text, with a red icon and border. In WebKit, a wrong password shows the new message, "Something went wrong" is gone, the Forgot password link is present, the correct password signs in, and axe WCAG A/AA is clean in dark and light.
- **Severity:** Low
- **Status:** CONFIRMED (signal plus my reproduction)
- **App:** Merchant Portal
- **Page/route:** `meiki-brand.test:3000/login?callbackUrl=%2F`
- **Steps to reproduce:**
  1. Open http://meiki-brand.test:3000/login (or click **Login** on the marketing site).
  2. Enter an existing account's email and a wrong password.
  3. Click **Sign in**.
- **Expected:** A plain message such as "Wrong email or password", ideally with a link to **Forgot password?**
- **Actual:** A red box with the heading **"Something went wrong"** and the line "Your email/password is invalid" underneath. The heading suggests the system failed, not that the user typed the wrong password. The chaos persona read it as a broken account ("the account seems to exist but I can't get into it").
- **Evidence:**
  - Signal `error-message-shown`, detail "Something went wrong", at `http://meiki-brand.test:3000/login?callbackUrl=%2F` (2026-09-29T14:07:53Z)
  - Screenshot: `marketing-chaos-signup__webkit/evidence/001-error-message-shown.png`
  - My reproduction with `triage-test0929a@gmail.com` and a wrong password showed the same two lines. The correct password then signed in and opened `/onboarding/organisation`.
- **Found by:** marketing-chaos-signup__webkit

### BUG-003: Grey subtitle text on the off-white pricing section fails colour contrast
- **ID:** BUG-003
- **Fix:** NOT A BUG, closed on 2026-09-29. Once the reveal animation finishes, the subtitle is `rgb(110,110,100)` on `#f9f9f4`, about 4.9:1, and axe is clean on `/compare` and `/barbershop`. The 4.05 reading was taken mid fade-in. **Harness fixed:** the oracle now waits 2.5s after load, scans twice, and records only nodes that fail both scans. It still reports the real light-theme dashboard failures.
- **Severity:** Low
- **Status:** CONFIRMED (reproduced by measurement)
- **App:** Marketing website
- **Page/route:** `/compare`, pricing section subtitle "No contracts. No hidden fees." The same pricing block is also on `/barbershop`, so it is probably affected too; I did not measure it there.
- **Steps to reproduce:**
  1. Open http://meiki-marketing-site.test:3002/compare.
  2. Scroll to "Simple pricing that grows with your shop."
  3. Check the contrast of the grey line under the heading.
- **Expected:** At least 4.5:1 contrast for body text (WCAG AA).
- **Actual:**
  - Text colour `rgb(110,110,100)` (`.text-muted`) on the off-white background (≈ `#F9F9F4`) gives **4.05:1**.
  - The same grey on pure white ("You're no longer billed per chair.") gives 5.15:1 and passes.
  - The fault is this grey token used on the off-white section background.
- **Evidence:** Signal `a11y` / `color-contrast` (serious, 2 nodes) at `meiki-marketing-site.test:3002/compare`, sample `.mb-8.barbershop-section-head > div > .text-muted.text-body-lg.mt-4`. My computed-style measurement is described above.
- **Found by:** marketing-curious-owner__webkit

### Signals reviewed and judged not to be bugs
Listed so nobody spends time on them again.

- **409 `EMAIL_ALREADY_REGISTERED` on sign-up, and the later failed login** (marketing-chaos-signup__webkit). The persona blamed a double-click that created the account twice. In fact `aiman-test1@gmail.com` was registered in **yesterday's** run (2026-09-28) with a different password (`password123`). So the 409 and the "invalid password" were both correct.
  - I tested the double-click with a fresh email (`triage-test0929a@gmail.com`). It sent **one** `POST /api/auth/v1/account/register` (200) and showed "Your account is created." (`_triage/artifacts/signup-after-doubleclick.png`).
  - **Action for the QA harness:** give personas a unique email per run (include the date) so this does not come up again.
- **"Blank sections" on `/compare`** (curious-owner diary; screenshots `marketing-curious-owner__webkit/artifacts/page-2026-09-29T14-06-29-215Z.png`, `…14-06-36-148Z.png`). The sections use scroll-triggered fade-in, and the persona took full-page screenshots without scrolling. When I scrolled, and also when I jumped straight to the middle of the page, every section showed its content (`_triage/artifacts/compare-3barber-scrolled.png`). The "Compiling" pill is the Next.js dev-mode indicator.
- **Horizontal overflow 4104px > 1440px on `/barbershop`** (signal, `marketing-chaos-signup__webkit/evidence/002-horizontal-overflow.png`). The wide element is the scrolling ticker strip (`.c-ticker__track`), which is clipped. In WebKit at 1440px and at 390px, the page `scrollWidth` stayed equal to the viewport from the first 100 ms of load onward, and the page could not be scrolled sideways. The screenshot also shows nothing wrong. Likely a detector false positive; not reproduced.
- **Colour contrast on `/blog/meikigo-vs-fresha-malaysia`** (13 nodes, sample `a[href$="blog"]`). The scan ran 0.3 s after the page loaded. After load, the flagged "Blog" links measure 5.15:1 and pass. The scan probably caught the text mid fade-in. Not reproduced.
- **"Full name accepts a 210-character name"** (chaos diary). The field has `maxLength=100`, and typing stops at 100 characters. The request I captured sent 98 characters (100 UTF-16 units, including emoji). This is working validation. The missing message is listed under usability.

### Retest of 2026-09-28 bugs
| Old ID | Issue | Status today | Evidence |
|---|---|---|---|
| BUG-001 | Privacy/Terms links were `#` | **Fixed** | Footer links now go to `/privacy` and `/terms`; the crawler got HTTP 200 for both |
| BUG-002 | No error text for bad sign-up input | **Fixed** | Inline errors ("Enter your full name.", "Enter a full email address…", "Use at least 8 characters.") in `marketing-chaos-signup__webkit/artifacts/page-2026-09-29T14-06-45-679Z.png`; the password rule is now shown up front |
| BUG-003 | "HitPay" named on the barbershop page and blog | **Probably fixed** | "HitPay" does not appear in any persona page snapshot today, including `/barbershop` and the blog article |
| BUG-004 | Blank screen after sign-in | **Not seen** | No `blank-screen` signal today; two sign-ins went `/` → `/onboarding/organisation` |
| BUG-005 | Login did not pre-fill email | **Fixed** | Signup diary: "my email pre-filled and there was a clear message" |
| BUG-006 | Colour contrast | **Partly fixed** | Only `/compare` still fails (today's BUG-003) |
| BUG-007 | FAQ `<li>` outside a list | **Not seen** | No `listitem` signal today; 3 personas visited `/barbershop` |
| BUG-008 | Blog link told apart by colour only | **Not seen** | No `link-in-text-block` signal today |

"Not seen" means the check did not fire in today's run. I did not re-test these items directly.

## Usability issues

### Marketing website: navigation
- **Pricing, Compare and Blog can only be found after picking a business type.** The homepage top bar has only **Start free** and **Login**. The footer has How it works, Your business, Privacy and Terms. Pricing, Compare and Blog appear only on `/barbershop`. 2 personas.
  - Curious owner: "The homepage itself has no pricing link — you only find 'Pricing' after clicking into a specific business type (Barbershop). A first-time visitor could easily leave without knowing prices exist."
  - Mobile visitor: "The homepage footer only has 4 links … no Blog link. I only found the Blog by first going through 'Choose your business'."
- **The homepage has no mobile menu, but `/barbershop` does.** 1 persona. "The homepage has no hamburger/menu button at all, but the Barbershop sub-page does — felt inconsistent, like two different sites."
- **"Start free" / "Choose your business" is a picker, not a sign-up, and it shows options you cannot choose.** Food & Beverage and Retail are marked "Coming soon". 2 personas.
  - Chaos: "The 'Start free' button on the homepage doesn't go anywhere by itself … Two 'Coming soon' options … can't actually be clicked — not clear why they're shown at all."
  - Mobile: "'Choose your business' looks like a normal button but is actually a dropdown that only offers 'Barbershop' live."

### Marketing website: product information
- **Nothing says what language the app is in.** A Malay-speaking owner could not find whether the app works in Bahasa Melayu, even after checking the homepage, `/barbershop` and the FAQ. 1 persona. "Nowhere on the site does it say the app works in Bahasa Melayu — I only saw 'Made for Malaysian barbershops,' which is about the target customer, not the app's language."
- **The plan terms "logins", "staff" and "barbers" are not explained, and the founding-shops / referral offer is hard to follow.** 1 persona. "I don't know what a 'login' is versus a barber account, or what 'staff' means if barbers are already counted separately." And: the founding-shops offer "mixes together an 'apply to be picked' offer and a 'refer a friend' offer in a confusing way."
- **The only way to contact the company is a `mailto:` link** to support@meikigo.com. There is no form, chat or phone number. 1 persona. "On a phone without an email app set up you might not be able to actually send anything."

### Marketing website: sign-up
- **The "already exists" error gives no way forward.** The error reads "An account with email '…' already exists." and offers no **Log in** or **Forgot password?** link (checked in my reproduction; the only links in the form are Terms and Privacy). 1 persona. "The error … gave me no next step (no 'forgot password' link right there), so I had to guess to go try the Login page myself."
- **The 100-character name limit is silent.** Typing or pasting just stops at 100 characters, with no counter or message, and the field still shows a green tick. 1 persona (the persona did not notice the cut and believed 210 characters were accepted).
- **After sign-up, the user has to log in again on a different-looking site.** "Set up my business" goes to `meiki-brand.test:3000/login`, where the password must be typed again. The email is now pre-filled. 2 personas logged in again this way; 1 complained. "Since I just signed up seconds earlier, I expected to be logged in automatically … The sign-up flow spans two different-looking sites/domains … it wasn't obvious at first these were part of the same product."

### Merchant Portal: onboarding step 1
- **"SSM registration number" and "SSM entity category" assume the owner already has a registered business.** 1 persona. "A first-timer without a registered business yet might not know this term or have that number ready. The page did note it isn't verified, which helped a little."

## Coverage

**Marketing website (`meiki-marketing-site.test:3002`)**
- Reached by personas:
  - `/`
  - `/barbershop`, including the `#pricing`, `#faq` and `#features` anchors (23 visits)
  - `/compare`
  - `/blog`
  - `/blog/meikigo-vs-fresha-malaysia`
- Reached only by the crawler: `/privacy` and `/terms` (both HTTP 200). No persona opened them, even from the sign-up form's Terms/Privacy links.
- Never reached:
  - Where the founding-shops **Apply** button leads
  - The "See how it works" section on the homepage
  - The per-plan **Start free** buttons
  - The Food & Beverage and Retail pages (disabled, "Coming soon")

**Merchant Portal (`meiki-brand.test:3000`), entered from sign-up only**
- Reached: `/login`, `/` (redirect), `/onboarding/organisation` (step 1 of 2).
- Never reached:
  - Onboarding step 2 and anything after onboarding
  - The **Forgot password?** flow (nobody used it, even the persona who was locked out of an old account)
  - The **Sign up** tab on the portal login page

## Not tested / limits
- **Only the marketing website was in scope.** The Merchant Portal was tested only as far as onboarding step 1. The booking, POS and payment apps were not part of this run, so no payment flows were tested.
- **All personas used WebKit**, and so did my reproduction (Safari 26.6 user agent). Chromium, Firefox and real mobile devices were not covered. The mobile persona used a phone-sized viewport, not a real phone.
- **The environment runs Next.js in dev mode** (the "Compiling" pill and Next.js Dev Tools button are visible). Load timing and the scroll-reveal behaviour may differ in a production build.
- **Email was not tested.** No verification or welcome email was checked, and the password-reset flow was not exercised.
- **Accessibility** rests on automated axe scans of the pages the personas happened to visit, plus my contrast measurement on two elements. No screen-reader or keyboard-only pass was done.
- **Reproductions (6):**
  1. `/compare` blank sections: not a bug
  2. `/barbershop` horizontal overflow: not reproduced
  3. Double-submit, 409 and failed login: not a bug; this check also confirmed BUG-002
  4. Long name in sign-up: a working 100-character limit
  5. Pricing card text: BUG-001
  6. Colour contrast: BUG-003 confirmed; the blog finding was not reproduced
- **Test accounts created during triage, to clean up:** `triage-test0929a@gmail.com` and `triage-test0929b@gmail.com` (the second has a 98-character emoji/Chinese name).
- **Persona test data is reused across runs.** Yesterday's `aiman-test1@gmail.com` caused today's false "double-submit" alarm. Future runs should use per-run unique emails.
