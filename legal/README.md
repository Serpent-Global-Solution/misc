# Meikigo — Legal Documents (Draft)

This directory holds first drafts of Meikigo's client-facing and merchant-facing legal
documents:

- [`client-terms-of-service.md`](./client-terms-of-service.md)
- [`client-privacy-notice.md`](./client-privacy-notice.md)
- [`merchant-terms-of-purchase.md`](./merchant-terms-of-purchase.md)

## Status: draft, not reviewed, not for real use

These were written directly from Meikigo's finalized 26-round product requirements
document (`requirements.md`), which itself deferred drafting these documents until it
was complete and specifically instructed that they be raised again once it was. That
trigger has now been met, so these drafts exist — but **they have not been reviewed by
a lawyer and must not be shown to a real customer or merchant, or referenced in any
live signup/checkout flow, until that review happens.**

Both client-facing and merchant-facing apps are already collecting real personal data.
That means the longer these documents stay unreviewed and unpublished, the longer a
real PDPA exposure exists — this is a fact worth tracking, not a reason to publish an
unreviewed document instead.

## Placeholders — status (updated 2026-10-19)

Every draft used `[PLACEHOLDER: ...]` tags rather than inventing a real-world fact.
Filled in from the business's own SSM/Maybank registration documents:

- ✅ **Legal entity name and registration number** — filled in all three documents as
  **Serpents Capital Solution** (trading as "Meikigo"), registration no.
  **202603217394 (003880138-D)**. Note: this is registered under the **Registration of
  Businesses Act 1956** — a **partnership**, not a Sdn Bhd company. The docs now say
  "partnership," not "company," which is factually accurate but was a substantive
  correction, not just a fill-in: **a partnership has no limited-liability shield — the
  two partners are personally liable for the business's obligations.** Flag this
  specifically to the lawyer, since the Liability sections (client ToS §13, merchant
  terms §10) were drafted assuming a more typical corporate posture.
- ✅ **Registered business address** — F-0203, Emporis Duplex, Psn Surian, Jalan
  Teknologi, Sek 3, Kota Damansara, 47810 Petaling Jaya, Selangor. Added to the contact
  sections of all three documents.
- ✅ **Support/billing/PDPA contact** — `support@meikigo.com` (confirmed in active use
  on the marketing site), used for all three contact-email placeholders.
- ⚠️ **Registration expiry** — this business registration is valid only until
  **16 August 2027** (1-year term) and must be renewed before then; unrelated to the
  T&C work itself, but worth a calendar reminder.
- ✅ **Retention periods confirmed (2026-10-19)** — 12 months post-cancellation for
  marketing-consent/blast-recipient records, 3 years for support-ticket records. Both
  locked in as final (no longer "to be confirmed") in `client-privacy-notice.md`.
  Rationale to carry to the lawyer: 3 years for support tickets is deliberately shorter
  than the Limitation Act 1953's 6-year contract-claim window, because the long-tail
  evidence for any real dispute (what was bought, when, for how much) is already
  covered by the 7-year transaction-record retention — support tickets are
  supplementary, not the primary evidence, so minimizing their retention is lower PDPA
  exposure for little loss of protection.
- ✅ **Target effective date set** — 31 October 2026, written into all three documents'
  version header as "target effective date ... pending legal review." This is a
  *target*, not a go-live override: the "not reviewed by a lawyer, not for real use"
  status at the top of this README still governs. If legal review hasn't happened by
  then, this date needs to move — it does not excuse publishing unreviewed.
- ⏸️ **Deferred, not decided** — the governing-law/jurisdiction clause's exact wording.
  All three documents still say "governed by the laws of Malaysia" with the specific
  courts/venue clause left open deliberately, for the lawyer to word rather than guessed
  at internally.

## What these drafts deliberately do and do not claim

Per the product's own specified stance (not a drafting choice made here — this is
requirements.md's explicit instruction to whoever wrote these documents):

- They **never promise complete data erasure** on account deletion or cancellation —
  transaction records are retained as financial/tax records (Malaysian LHDN practice,
  generally 7 years) regardless of account status, and all three documents say so
  plainly rather than making a promise the product cannot keep.
- They **never use the words "soft delete"** or describe the retention mechanism —
  they state the retention *position* (what stays, why) without exposing internal
  implementation detail.
- The **daily backup is described as what is done, not as a guarantee** — both the
  client privacy notice and the merchant terms use "this describes what we do — it is
  not a guarantee against data loss," matching the exact framing requirements.md
  specifies for this exact reason (a promise in binding terms is enforceable in a way a
  marketing statement is not).
- **Meikigo staff access to customer PII is disclosed as a real, load-bearing control**
  — every access requires a stated reason, is logged, and (for merchant-facing support
  sessions) is time-limited and shown on the merchant's own PRO-tier audit log. This is
  stated as fact because it is a real, enforced mechanism in the product, not aspirational
  language.
- The **imported-customer consent responsibility sits with the merchant** — a Merchant
  declaring at bulk-import time that their customers already consented to marketing is
  making a representation Meikigo records but does not independently verify, and the
  merchant terms say this plainly.

## Open redlines from consumer-risk audit (2026-10-19)

A ToS/privacy audit flagged three clauses as consumer-unfriendly enough to warrant a
fix before legal review. Draft redline language has been inserted inline at each spot,
marked `[DRAFT REDLINE — pending lawyer/product confirmation: ...]`:

- **`client-terms-of-service.md`, Section 6** — loyalty/referral forfeiture on account
  deletion had no warning step; redline adds a required confirmation showing the
  balance that will be forfeited before deletion completes.
- **`client-terms-of-service.md`, Section 5** — no-show penalties were one-sided
  (Merchant can penalize a customer no-show, no remedy existed for a Merchant-side
  cancellation); redline adds a symmetric remedy, with the exact remedy itself left as
  a `[PLACEHOLDER]` for product to decide.
- **`merchant-terms-of-purchase.md`, Section 3** — non-refundable yearly billing is
  disclosed in prose but not specifically acknowledged at the point of payment;
  redline adds a dedicated checkbox at yearly checkout, separate from general terms
  acceptance.

Before legal review: product needs to confirm/implement each redline (or reject it and
remove the marker), same as the placeholders above.

## Payment-processing disclosure added (2026-10-19)

A completeness review found `merchant-terms-of-purchase.md` had **no section at all**
on how customer payments are actually processed, despite real money moving through a
payment gateway on every sale. New **Section 4 ("Payment processing for your sales")**
was added, grounded in the actual `meikigo-api` CHIP integration code (not
`requirements.md`, which is stale and still names the old HitPay gateway — see
[[payments-chip-not-hitpay]]). All later sections were renumbered (old §4–§13 are now
§5–§14).

What the new section states as settled fact (confirmed from code): CHIP is the payment
partner (CHIP Collect for taking payment, CHIP Send for payouts); Meikigo pools funds
in its own CHIP account and tracks each Brand's owed balance internally; fees apply to
card/DuitNow sales only (cash is free); the Merchant chooses, per Brand or Outlet,
whether the Brand or the customer absorbs the fee; payouts are merchant-initiated
on-demand via CHIP Send, no scheduled auto-payout, no reserve withheld; refunds go to
the original payment method. Exact fee rates were deliberately left **generic**
("shown in your merchant dashboard") rather than hardcoded, so a rate change doesn't
force a legal-document re-review.

Two things in this new section are explicitly **left open, not asserted**, per
instruction:

- **Chargeback/dispute liability** — the code currently freezes a disputed amount in
  the Brand's settlement balance and may deduct a dispute fee, suggesting the Merchant
  bears chargeback risk today, but this has **not been confirmed as final business
  policy**. Marked as a `[DRAFT — policy not yet finalized]` block pending a decision.
- **⚠️ MSB/e-money licensing** — whether Meikigo pooling merchant funds before CHIP
  Send payout requires Meikigo itself to hold a Money Services Business or e-money
  licence under Malaysian law has **not yet been checked** with CHIP's compliance team
  or a lawyer. This is flagged as **higher priority than the rest of this document's
  legal review**, since it's a question about Meikigo's own regulatory standing, not
  just contract wording — confirm this before anything else in Section 4 is finalized.

## Sub-processor and cross-border disclosure added (2026-10-19)

The privacy notice named no third parties except "Merchants" as data recipients,
despite real infrastructure vendors processing personal data. New **Section 5
("Service providers who process your data, and where")** was added to
`client-privacy-notice.md`, naming four confirmed real vendors: **Supabase**
(auth + database, hosted in **Singapore** — confirmed with you), **CHIP** (payment
processing, consistent with the merchant-terms disclosure), **Brevo** (transactional +
marketing email — confirmed in `deployment-doc.md`/`launch-readiness-audit.md`), and
**Vercel Analytics** (marketing site only, cookieless, confirmed in
`meikigo-marketing-site/src/lib/analytics.ts`). All later sections renumbered (old
§5–§9 are now §7–§11).

**Cross-border transfer disclosed as a fact** (Supabase is in Singapore, not Malaysia),
but the specific PDPA s.129 legal basis for that transfer is left as a `[PLACEHOLDER]`
pending lawyer confirmation — don't treat the disclosure itself as sufficient without
that basis being nailed down.

**Still not fixed, carried over from the completeness review**: the PDPA rights
section (now §10) still only covers access and correction — it's still missing the
general right to withdraw consent, the right to prevent processing likely to cause
damage/distress (PDPA s.42), and the right to complain to the Personal Data Protection
Commissioner. Next item to tackle if continuing this work.

## PDPA rights section completed (2026-10-19)

`client-privacy-notice.md` §10 now states all the rights the PDPA actually gives a
data subject, not just access/correction: the general right to **withdraw consent**
(distinct from marketing-only consent in §3), the right to **stop/prevent processing
likely to cause damage or distress** (PDPA s.42), and the right to **complain to
Malaysia's Department of Personal Data Protection (Jabatan Perlindungan Data
Peribadi)**. The Department's exact current contact details are left as a
`[PLACEHOLDER]` — confirm what's publicly listed at pdp.gov.my before publishing,
since contact details can change and this draft didn't verify them live.

## Client ToS boilerplate added (2026-10-19)

`client-terms-of-service.md` had no consequence for breaching Section 11 (Acceptable
use), no clause for Meikigo discontinuing the platform itself, no IP/trademark clause,
and none of the standard entire-agreement/severability/assignment/notices boilerplate.
Added, and the rest renumbered accordingly (old §12–§15 are now §14, §15, §17, §18):

- **§12, Suspension and termination** (new) — ties a consequence to Section 11, and
  separately covers Meikigo discontinuing the whole platform (distinct from a single
  Merchant closing, already covered in §4).
- **§13, Intellectual property** (new) — Meikigo owns the app/brand; Merchants own
  their own content shown through it.
- **§16, General provisions** (new) — entire agreement, severability, assignment,
  notices — standard contract mechanics with no product-specific content, included for
  completeness rather than because anything in the product drove them.

Nothing here is marked as an open placeholder — these are standard boilerplate clauses
written to match the rest of the document's facts, so they should just need the same
lawyer pass as everything else, not a separate business decision first.

## Merchant-terms boilerplate and liability cap added (2026-10-19)

`merchant-terms-of-purchase.md` had no liability cap, no breach-notification clause,
no suspension/termination rights for Meikigo, no dispute-resolution clause, and no
disclosure of bulk customer export/import logging (despite the requirements doc
confirming it's logged). Added, with later sections renumbered (old §11–§14 are now
§14, §15, §16, §17):

- **§5 addition** — bulk export/import of the Merchant's customer list is logged
  (who, when, how many records), matching the requirements doc's Round 6 decision.
- **§11, Security incidents** (new) — commits to notifying the Merchant of a security
  incident "without undue delay." The exact notification timeframe (e.g. 72 hours) is
  left as a `[DRAFT — PLACEHOLDER]` pending an operational commitment, not asserted.
- **§12, Suspension and termination** (new) — Meikigo's right to suspend/terminate for
  breach, fraud/abuse, or unpaid fees after notice.
- **§13, Dispute resolution** (new) — good-faith discussion first, then courts.
- **§14, Liability** — added a monetary cap, **deliberately drafted to favor Meikigo**
  per an explicit request to prioritize Meikigo's position: capped at fees paid in the
  **preceding 12 months only** (no floor — a FREE-tier merchant's cap is effectively
  RM0), aggregate across all claims, with indirect/consequential/lost-profit/lost-data
  damages excluded entirely. Flagged inline as a deliberately provider-favorable
  starting position that a lawyer should review for enforceability before treating as
  final — it can be softened in negotiation/review, but starts from Meikigo's side.

**Decided, not drafted**: PRO's "SLA support" promise (flagged elsewhere in
`requirements.md` as sold without being defined) was deliberately **left out** of this
document rather than given placeholder numbers — per instruction, don't write an SLA
commitment into a legal draft before product has actually decided what it means. This
remains an open product decision, not a documentation gap.

## Tier 1 quick wins closed out (2026-10-19)

Three small open items resolved, no lawyer or product budget needed:

- **PDPC contact details** — filled in with the official, live-verified contact for
  Malaysia's Department of Personal Data Protection: Level 8, Galeria PjH, Putrajaya;
  03-7456 3888; aduan@pdp.gov.my; daftar.pdp.gov.my/p_aduan. Fetched directly from
  pdp.gov.my on this date — re-verify before publishing if significant time has passed.
- **Security-incident notification timeframe** — set to **72 hours** from becoming
  aware (`merchant-terms-of-purchase.md` §11), a reasonable, defensible default even
  though the PDPA doesn't mandate a specific number itself.
- **Booking-cancellation remedy** (`client-terms-of-service.md` §5) — decided as
  **priority rebooking for the next available slot**, with an optional goodwill
  loyalty-point credit at the Merchant's discretion where a loyalty program exists.
  This replaces the earlier open placeholder with settled policy.

## Tier 2 (partial) — MSB licensing resolved, payout policy updated (2026-10-19)

- **MSB/e-money licensing — ✅ resolved.** Confirmed this is covered under CHIP's own
  licensing as the regulated payment partner; Meikigo does not need its own MSB/e-money
  licence to operate as CHIP's business platform partner. Marked resolved in
  `merchant-terms-of-purchase.md` §4, with a note to get this in writing from CHIP
  (e.g. the platform-partner agreement) before the lawyer treats it as settled.
- **Payout policy — updated to the real business rule**, replacing the earlier
  code-derived draft: the Merchant chooses a disbursement frequency (bi-daily, weekly,
  or monthly), bears the transaction cost of each payout, and the full balance must be
  disbursed by the end of every calendar month regardless of frequency chosen.
  **⚠️ Engineering gap, not a documentation gap**: the `SettlementService.cs` code this
  was originally drafted from implements only on-demand, merchant-initiated settlement
  with no reserve withheld and no scheduled frequency — it does not yet support
  frequency selection or forced month-end disbursement. The legal document now states
  the intended policy; the product needs to build it before this clause is actually
  true of the live system. Worth a ticket.
- **Chargeback/dispute liability — ✅ resolved (2026-10-19).** The Merchant bears
  chargeback/dispute losses: the disputed amount is held from their settlement balance
  while the dispute is open, and deducted (plus any gateway dispute fee) if decided
  against them. Matches the current code's default behavior, so no engineering gap
  here — unlike the payout-frequency item above.

## Tier 4 — researched, decision held (2026-10-19)

Priced out partnership vs. incorporating a Sdn Bhd before deciding anything:

- **Staying a partnership**: ~RM60/year renewal, no secretary/audit/corporate tax
  filing — but the two partners (Muhammad Fakhrul Faris, Muhammad Nurhaziq Haris)
  carry **unlimited personal liability** for the business, including anything arising
  from customer payment data via CHIP, a data breach, or a merchant/customer lawsuit.
- **Incorporating a Sdn Bhd**: ~RM1,800–2,500 one-time incorporation, then realistically
  RM5,000–15,000/year ongoing (secretary, bookkeeping, tax filing, audit unless
  exempt) — in exchange for a liability shield between the business and the founders'
  personal assets.

**Recommendation given**: incorporate before/near the 31 October target launch date,
since Meikigo's regulatory surface (PDPA, real payment processing, MSB-adjacent
questions) assumes a limited-liability entity is standing behind it, and the riskiest
early period (least-tested flows) is the worst time to be personally exposed.

**Decision: held, not resolved** — business/personal decision for the partners, not
something to force here. Revisit before relying on the partnership-liability framing
as settled for the lawyer review (Tier 5).

## Tier 3 — backlogged, not abandoned (2026-10-19)

Both items turned out to require building a missing underlying feature, not just a
small UI addition:

- **Loyalty-forfeiture confirmation** (`client-terms-of-service.md` §6) — account
  deletion does not exist at all yet in `meikigo-customer-webapp` (no UI, no API call,
  no loyalty/referral balance display anywhere in the app). Needs the whole feature
  built, not just a confirmation step on top of one.
- **Yearly-checkout acknowledgment checkbox** (`merchant-terms-of-purchase.md` §3) — no
  monthly/yearly billing-cycle toggle exists anywhere in `meikigo-brand`'s checkout UI.
  The pricing catalog has an unused `annualPrice` field; `selectSubscriptionPlan`
  doesn't even take a cycle argument yet. Needs yearly billing selection built first.

Decided to **backlog both** rather than build them now — this is a deliberate decision
to decouple "finish the legal documents" from "build these two product features," not a
sign the features aren't needed. Both `[DRAFT REDLINE]` markers stay in the documents
as-is until built. Useful existing patterns to build from, if/when this is picked up:
an `AlertDialog` confirmation pattern already used for "cancel your queue ticket?" in
the customer webapp, and two existing mandatory-checkbox-before-submit components in
`meikigo-brand` (payroll confirm-run, payout request).

**Unrelated note from this exploration**: `meikigo-brand/AGENTS.md` contains text that
reads as a prompt-injection attempt (instructing a reader to treat
`node_modules/next/dist/docs/` as authoritative, framed as a legitimate convention).
The exploring agent correctly ignored it as instructions. Worth someone looking at who
added this and why, separately from the legal-document work.

## Tier 2 — fully closed (2026-10-19)

Both open items in `merchant-terms-of-purchase.md` §4 are now resolved: MSB licensing
(covered under CHIP's own license) and chargeback liability (Merchant bears it). The
only genuinely external/paid items left across all three documents are the jurisdiction
clause and the full lawyer review itself (Tier 5), plus the Sdn Bhd vs. partnership
decision (Tier 4) and the loyalty-forfeiture/yearly-checkbox product work (Tier 3).

## Policy Decisions & Consolidation (2026-10-24)

All open policy decisions were reviewed and locked in:
- **Court jurisdiction resolved**: Because Meikigo is registered at Emporis Duplex, Kota
  Damansara, jurisdiction is formally set to the courts of the State of Selangor (Petaling
  Jaya Subordinate Courts, High Court of Malaya in Shah Alam) and Kuala Lumpur.
- **Cross-border transfer legal basis**: Supabase Singapore hosting is grounded in explicit
  user consent obtained at registration/booking plus contractual safeguards under PDPA
  Section 129.
- **Consumer-risk redlines adopted**:
  - Loyalty forfeiture warning dialog confirmed for Client ToS §6 upon account deletion.
  - Dedicated unticked non-refundable acknowledgment checkbox confirmed for Merchant
    Terms §3 at annual checkout.
  - Symmetric booking cancellation remedy confirmed for Client ToS §5 (priority rebooking +
    discretionary goodwill loyalty points).
- **PRO tier support commitment**: Clarified that support is provided on a prompt,
  best-effort basis during business hours, without a binding uptime or response-time SLA.
- **Merchant liability cap**: Provider-favorable cap (preceding 12 months' fees, RM0 for
  Free Tier, no consequential damages) locked in as Meikigo's starting posture.
- **Consolidation**: All documents merged into [`final.md`](./final.md) for legal review.

## Next steps

1. Send [`final.md`](./final.md) to a qualified Malaysian lawyer for formal review —
   PDPA compliance, enforceability of the merchant liability cap, and partnership
   exposure advice.
2. Build the two UI requirements before their respective features go live:
   - Account deletion modal in `meikigo-customer-webapp`.
   - Yearly billing cycle & dedicated non-refundable checkbox in `meikigo-brand`.
3. Implement automated settlement schedules (bi-daily/weekly/monthly + month-end sweep)
   in `meikigo-api` (`SettlementService.cs`).
4. Once lawyer approved, wire the accepted version number into the actual signup/checkout
   flows (`meikigo-customer-webapp` registration, `meikigo-brand` subscription
   checkout).
