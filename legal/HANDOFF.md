# Legal Documents — Handoff to Haziq (2026-10-20)

Status snapshot of the T&C / Privacy Notice work, so this can be picked up without
re-reading the whole history. Full reasoning and detail for everything below lives in
[`README.md`](./README.md) — this file is just the action-item list.

## What's done

- All three documents (`client-terms-of-service.md`, `client-privacy-notice.md`,
  `merchant-terms-of-purchase.md`) are filled in with real entity details (Serpents
  Capital Solution, reg. no. 202603217394 (003880138-D)), contact info, retention
  periods, a full payment-processing section (CHIP), sub-processor/cross-border
  disclosure (Supabase/Brevo/Vercel Analytics, Singapore hosting), full PDPA rights,
  and standard contract boilerplate (IP, suspension, dispute resolution, liability
  caps, general provisions).
- A consumer-risk audit was run against the client ToS and merchant terms; three
  unfair-clause fixes were redlined in: loyalty-forfeiture warning on deletion,
  symmetric no-show remedy, yearly-billing checkout acknowledgment.
- Payment-processing specifics confirmed and written in: CHIP is covered under its own
  licensing (no separate MSB licence needed for Meikigo), chargebacks are borne by the
  Merchant, and payout policy is merchant-chosen frequency (bi-daily/weekly/monthly)
  with forced month-end disbursement.

## Still open — needs a decision or action, not more drafting

1. **Sdn Bhd vs. staying a partnership** — researched, not decided. Partnership
   (current structure) costs ~RM60/year but leaves you and Faris personally,
   unlimited-liability exposed for anything the business does. Incorporating costs
   ~RM1,800–2,500 one-time + ~RM5,000–15,000/year ongoing, but shields personal assets.
   Recommendation given was to incorporate before/near launch — held for you two to
   decide. See README's "Tier 4" section for the full breakdown.
2. **Get CHIP's MSB/licensing confirmation in writing** — we're treating "Meikigo
   doesn't need its own MSB licence" as resolved based on the platform-partner model,
   but this should be backed by something in writing from CHIP (the partner agreement
   or an equivalent written confirmation) before a lawyer treats it as settled.
3. **Define PRO's SLA** — `requirements.md` itself flags that PRO's "SLA support" was
   sold without a defined uptime/response-time commitment. Deliberately left out of
   the merchant terms rather than inventing numbers — needs an actual product decision.
4. **Build two backlogged features** (Tier 3, deliberately deferred, not forgotten):
   - Account deletion in `meikigo-customer-webapp` doesn't exist yet at all (no UI, no
     API call) — needed before the loyalty-forfeiture confirmation clause can be real.
   - Yearly billing-cycle selection in `meikigo-brand`'s checkout doesn't exist yet
     either (pricing catalog has an unused `annualPrice` field) — needed before the
     yearly-checkout acknowledgment checkbox can be real.
   Both have reusable UI patterns already in their respective codebases — see README.
5. **Jurisdiction/courts clause wording** — deliberately left as a placeholder in all
   three documents, needs a lawyer.
6. **Full lawyer review** — the actual gate. Once 1–3 above are settled, hand all three
   documents + this README to a Malaysian lawyer. Budget-constrained for now; a
   flat-fee *review* (not drafting from scratch) is the cheaper path once ready.
7. **Engineering gap**: `meikigo-api`'s `SettlementService.cs` only supports on-demand,
   merchant-initiated payouts today — it does not yet implement the
   frequency-selection + forced month-end disbursement policy now written into the
   merchant terms (§4). The document states the intended policy; the system needs to
   catch up to it before launch.
8. **Business registration renewal** — Serpents Capital Solution's registration expires
   16 August 2027. Unrelated to the documents themselves, just a calendar reminder.

## Where to look for more detail

`legal/README.md` has the full changelog — every decision made, every question asked
and answered, and why — organized by the tiers referenced above.
