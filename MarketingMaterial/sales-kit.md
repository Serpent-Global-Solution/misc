# Meikigo Sales Kit — Barbershops, Selangor

For step A5 of `growth-engine-plan.md`. Use it from payday onward (sign-up and demos need Supabase back).

**We are recruiting pilot (founding) shops first, paying customers second.** Every first contact is an invitation to apply as a founding shop, not a sales pitch. Paid plans come up only when the owner asks about price, or after the pilot.
Every claim here comes from `meikigo-marketing-site/MESSAGING.md` and the site's pricing data. If you're not sure a feature exists, say "let me check" and don't promise it.

---

## 0. The rules

1. **Log every touch in the CRM, the same day.** On the lead: change Status, fill **Objection** if they gave one, add a note with what they said, in their words. Those words feed the website copy and the weekly brief.
2. **Use the tagged link for the channel you're on.** It opens the founding-shops section, and the application records where it came from:

   | Channel | Link |
   |---|---|
   | Walk-in visit | `meikigo.com/barbershop?ref=visit#founding-shops` |
   | Phone call | `meikigo.com/barbershop?ref=call#founding-shops` |
   | WhatsApp | `meikigo.com/barbershop?ref=wa#founding-shops` |
   | Supply store | `meikigo.com/barbershop?ref=supplier#founding-shops` |

   Applications land in `meikigo-admin` → **Applications**. Set each one to Contacted / Accepted / Rejected there, and email the shop by hand. Nothing is sent automatically.

3. **WhatsApp: 5–10 new chats a day maximum.** The number runs on an unofficial gateway and can be banned. Calls and visits have no limit, so lean on those.
4. **Work the CRM by Priority A first, grouped by area.** `barbershop-data/cleaned/scoring_report.md` lists A shops per area, so you can plan a day of visits in one neighbourhood.
5. **Never say:**
   - offline mode
   - "100+ shops"
   - "no fee" on DuitNow/card (a CHIP processing fee applies; confirm the rate before quoting a number)
   - tap-to-pay / NFC (customers scan a QR on their own phone)
   - "customers don't sign up" (no app, but they make a browser account)
   - per-barber commission rates (it's one service % and one product % per outlet)
   - payroll on Starter/Plus (Pro only)
   - invented shop names or testimonials

---

## 1. What we're selling, in one breath

> One tablet at the counter runs the walk-in queue, online bookings (customers scan a QR, no app download), payment in cash, DuitNow QR or card, and the end-of-day report per barber. Flat price per shop, from RM109 a month, not per barber. 14-day trial with Plus features, no card, no contract.

| Plan | Price | Fits |
|---|---|---|
| Starter | RM109/mo (RM1,090/yr) | up to 5 barbers, 4 outlets, 2 logins. Queue + booking, loyalty, commissions, expenses, attendance, cash/DuitNow/card |
| Plus | RM199/mo | up to 8 barbers. Adds advanced analytics, tax export, email marketing allowance |
| Pro | RM329/mo | chains. Adds payroll & payslips, HQ dashboard, scheduled reports, dedicated onboarding |

Works on any iPhone, iPad or Android phone or tablet the shop already has.

---

## 1b. The pilot invite: lead with this in every first contact

**What they get.** Use exactly what the website says, nothing more:
- If picked, 14 days of every Plus feature. No card.
- Plus stays free every month a shop they referred makes RM199 or more in sales through Meikigo.
- We pick founding shops at our own discretion.

**What we ask.** Honest feedback while they use it. The application form asks if they're willing.

**What they do.** Apply at the tagged link: shop name, contact, area, number of chairs, walk-ins per day. About 2 minutes.

> ⚠️ **Owner decision needed:** `requirements.md` says what an accepted founding shop gets is "not defined yet" beyond the website wording above. Before visits start, decide whether picked shops get anything more than the 14-day Plus trial plus the referral rule, e.g. a longer free period or help with setup. Until then, promise only the website wording.

**Who to pick.** Shops that will actually use it every day and talk to us: busy enough to feel queue pain (the A list), an owner who is reachable, and willing to give feedback.

---

## 2. By segment

Openers are given in casual BM and English. Pick whichever the owner answers in. The BM still needs a native speaker's polish.

### A. Busy independent barbershop (`busy_independent`, 145 at A priority)
**Their pain:** Saturday queue. Walk-ins leave when the wait looks long, bookings clash with walk-ins, and at close someone counts cash and works out each barber's cut by hand.

- **BM:** "Bang, kedai abang ni ramai gila hujung minggu. Macam mana abang urus walk-in dengan booking sekarang? Ada pelanggan yang blah sebab tunggu lama tak?"
- **EN:** "Your shop is packed on weekends. How do you handle walk-ins and bookings at the same time right now? Do people ever walk out because of the wait?"

**Ask:**
1. How do you track who's next today: paper, memory, WhatsApp?
2. On a busy Saturday, roughly how many walk away?
3. How long does closing take: cash count plus each barber's commission?

**Show:** the queue screen, then a customer scanning the QR and joining from their phone, then the end-of-day report per barber.
**Ask for:** "We're picking a few founding barbershops around [area] to run it free and tell us what to fix. Want to apply? It takes 2 minutes." Fill in the application together on your phone using the `?ref=` link.

### B. Switcher: already on Fresha / Setmore (`switcher`, 26)
**Their pain:** the booking app handles appointments, but walk-ins, the till and commissions are still separate. With Fresha's per-barber pricing, the bill grows with every hire.

- **EN:** "I saw you take bookings through Fresha. Does it also run your walk-ins and the till, or is that separate?"

**Honest maths (Fresha only, checked 27 Oct 2026):**
- 3 barbers on Fresha Team is RM135/mo (RM45 × 3, excl. tax and add-ons), vs Meikigo Starter at RM109.
- **With 1–2 barbers, Fresha is cheaper. Say so.**
- For Setmore, ask what they pay. We have no checked price, so don't guess.

**Ask:**
1. What do you use for walk-ins and payment besides the booking app?
2. How many barbers now, and planning to hire?

**Ask for:** the founding-shop application, then run Meikigo alongside the current app during the pilot. No need to switch on day one.

### C. Small independent barbershop (`small_independent`, 378, mostly B priority)
**Their pain:** smaller volume, more price-sensitive. Usually paper book plus WhatsApp.

- **BM:** "Abang ambil booking macam mana sekarang, WhatsApp je ke? Pelanggan boleh scan QR terus booking, tak payah download app."

**Lead with:** the founding-shop invite (free during the pilot). If they ask about price later, it's a flat RM109, not analytics.
**Watch for:** "too expensive" (see objections). A 1-chair shop may honestly not need us yet. Log `Price` or `Happy with paper` and move on politely.

### D. Chain / multiple branches (`chain`, 103)
**Their pain:** the owner can't see every outlet's numbers without phoning managers.

**Ask for the owner or HQ person, not the barber at the counter.** If you can't reach them, log `Not decision-maker` and ask for their number.

- **EN:** "Do you see each branch's daily sales and each barber's numbers in one place, or do managers send them to you?"

**Plan fit:**
- Starter covers 4 outlets, Plus 8, Pro 20.
- Pro is the one with the HQ dashboard and payroll.

**Ask for:** a founder call or demo, then invite one branch as a founding shop. Chains are bigger deals and slower.

### E. Salon (`salon`, 409, B/C priority)
The product and copy are built for barbershops. Only pitch salons that run **walk-ins plus chairs plus commission** the way a barbershop does. Skip spa, nail and beauty-treatment-heavy places. Lowest priority. Don't spend visit days on them.

---

## 3. Walk-in visit checklist

**When:**
- Weekday, about 11am–12pm or 3–5pm. Avoid Saturday/Sunday rush.
- Avoid Friday 12:30–2:30pm (Friday prayers).
- If they're busy, ask when to come back and log it as a CRM Task.

**Bring:**
- [ ] A charged tablet logged into a **demo shop** with sample barbers, services and a few queue tickets. Set this up once Supabase is back. The demo account must not be a real shop's data.
- [ ] Your phone, to play the customer: scan the QR, join the queue.
- [ ] A small printed card with a QR to `meikigo.com/barbershop?ref=visit`, your name and your WhatsApp.
- [ ] The CRM open on your phone at the lead.

**The 2-minute demo:**
1. "This is today's queue." Show waiting and in-chair.
2. Scan the shop QR with your phone and join the queue. It appears on the tablet. "Your customer does this from the door or from home. No app."
3. Pick a barber and finish a cut. Checkout: cash, or DuitNow/card by QR on the customer's phone.
4. End-of-day report: sales per barber, commission done.
5. Stop. Ask: "Which part would save you the most time?" Then listen.

**Before leaving:** leave the card, ask for the owner's WhatsApp if you don't have it, and log the visit in the CRM.

---

## 4. Phone call (2 minutes)

> "Hi, is this [shop name]? I'm [name] from Meikigo. We make a system for barbershops in Malaysia. One tablet for walk-in queue, booking and payment. We're choosing a few founding barbershops in [area] to use it free and tell us what to improve. Can I ask one quick question? How do you handle walk-ins and bookings on a busy day?"

- **Interested:** offer a visit, or send the `?ref=call#founding-shops` link on WhatsApp so they can apply.
- **Not now:** "No problem. Can I WhatsApp you a link to look at later?" Log it.
- **No:** thank them, log `Not interested`, and don't call again.

---

## 5. WhatsApp first message (within the daily cap)

Personal, one at a time, never a blast. Say who you are and how to opt out.

- **BM:** "Salam/Hi bang, saya [nama] dari Meikigo. Kami tengah pilih beberapa kedai gunting di [kawasan] jadi *founding shop*, guna sistem kami percuma dan bagi feedback. Sistem ni satu tablet untuk queue walk-in, booking (pelanggan scan QR, tak payah app) dan bayaran tunai/DuitNow/kad. Kalau berminat, mohon sini (2 minit): meikigo.com/barbershop?ref=wa#founding-shops. Kalau tak berminat, balas 'stop', saya tak ganggu lagi 🙏"
- **EN:** "Hi, I'm [name] from Meikigo. We're choosing a few barbershops in [area] as founding shops, to use our system free and give us feedback. It's one tablet for walk-in queue, booking (customers scan a QR, no app) and cash/DuitNow/card payment. If you're interested, apply here (2 minutes): meikigo.com/barbershop?ref=wa#founding-shops. If not, reply 'stop' and I won't message again."

**Follow-up:** one only, after 3–4 days, if there's no reply. Then stop.

---

## 6. Objections → what to say → what to log

| They say | Say (honestly) | CRM Objection |
|---|---|---|
| "Apa catch dia? / What's the catch?" | No catch. We need real shops using it daily and telling us what's wrong. You give feedback, you get the system free during the pilot. Promise only the website wording on what happens after. | Other (note it) |
| "Mahal / too expensive" | Flat RM109 for the whole shop, not per barber. Ask how much time closing takes each night. If they're 1–2 barbers on a per-staff app, admit that may be cheaper. Offer the 14-day trial. | Price |
| "Dah guna Fresha / Setmore" | "Does it run walk-ins and the till too?" Offer to run Meikigo alongside for 2 weeks. Use the 3-barber maths only if it's true for them. | Already use Fresha/Setmore |
| "Takde tablet" | Any phone or tablet works, including an old Android. No card terminal needed. | No tablet |
| "Buku je cukup / paper works" | Ask about Saturday walk-aways and closing time. If they're truly fine, respect it. | Happy with paper |
| "Kena tanya boss" | Get the owner's name and number, and offer to come back when they're in. | Not decision-maker |
| "Pelanggan malas daftar" | Booking is no app download; they scan and book in the browser (they do create an account). Walk-ins don't need to book at all. | Other (note it) |
| "Takut internet slow / putus" | Don't claim offline mode. Ask how often it drops, and log the answer. This is product feedback. | Other (note it) |
| "Tak berminat" | Thank them. Don't push. | Not interested |

If they don't sign up at the end, also set **Lost Reason** (Pricing, Competition, Missing Features, No Decision-Maker, Poor Fit, …) when you close the lead.

---

## 7. Barber supply stores (~95, in `barbershop-data/barbersupplier/`)

**Why:** they visit and talk to many shops every week.
**Pitch:** "Your customers are barbershops. We're choosing founding barbershops to use our system free during our pilot. Could we leave cards at your counter, or could you mention it to shops that ask?"
**Link:** `meikigo.com/barbershop?ref=supplier#founding-shops`

> ⚠️ **Owner decision needed:** the pilot's referral reward is shop-to-shop only (a shop keeps Plus free when a shop it referred makes RM199+). There's nothing for a supply store. Decide whether stores get anything in return; until then, ask only for the favour.

---

## 8. End of each day (5 minutes)

- [ ] Every lead you touched has a Status change and a note.
- [ ] Objection or Lost Reason set where given.
- [ ] Follow-ups booked as CRM Tasks.
- [ ] Any new pain in the owner's own words gets a line in the note. This is the raw material for the website and the weekly brief.
