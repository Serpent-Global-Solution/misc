# Legal Documents — Handoff to Haziq (Updated 2026-10-24)

Status snapshot of the T&C / Privacy Notice work, so this can be picked up without
re-reading the whole history. Full reasoning and detail for everything below lives in
[`README.md`](./README.md) and [`final.md`](./final.md).

## What's done

- All three documents (`client-terms-of-service.md`, `client-privacy-notice.md`,
  `merchant-terms-of-purchase.md`) and the master [`final.md`](./final.md) are filled in
  with real entity details (Serpents Capital Solution, reg. no. 202603217394 (003880138-D)),
  contact info, retention periods, a full payment-processing section (CHIP), sub-processor/cross-border
  disclosure (Supabase Singapore under PDPA s.129), full PDPA rights, and standard contract
  boilerplate (IP, suspension, dispute resolution, liability caps, general provisions).
- **Court jurisdiction resolved (2026-10-24)**: Based on registered business location at
  Emporis Duplex, Kota Damansara, jurisdiction is set to the State of Selangor (Petaling
  Jaya Subordinate Courts, High Court of Malaya in Shah Alam) and Kuala Lumpur.
- **Cross-border transfer legal basis resolved (2026-10-24)**: Explicit consent + contractual
  safeguards with Supabase under PDPA Section 129.
- **Consumer-risk redlines adopted (2026-10-24)**: Formally adopted the loyalty-forfeiture
  warning modal requirement on account deletion, symmetric no-show/cancellation remedy,
  and dedicated yearly billing non-refundable checkbox.
- **PRO tier support clarified (2026-10-24)**: Priority support on prompt, best-effort basis;
  no uptime or response-time SLA in base contract terms.
- **All terms merged into a single consolidated file**: [`final.md`](./final.md).

## Still open — needs a decision or action, not more drafting

1. **Sdn Bhd vs. staying a partnership** — researched, decision held. Partnership
   (current structure) costs ~RM60/year but leaves you and Faris personally,
   unlimited-liability exposed for anything the business does. Incorporating costs
   ~RM1,800–2,500 one-time + ~RM5,000–15,000/year ongoing, but shields personal assets.
   Recommendation given was to incorporate before/near launch — held for you two to
   decide. See README's "Tier 4" section for the full breakdown.
2. **Get CHIP's MSB/licensing confirmation in writing** — we're treating "Meikigo
   doesn't need its own MSB licence" as resolved based on the platform-partner model,
   but this should be backed by something in writing from CHIP (the partner agreement
   or an equivalent written confirmation) before a lawyer treats it as settled.
3. **Build two backlogged UI features** (Tier 3):
   - Account deletion in `meikigo-customer-webapp` with loyalty forfeiture warning modal.
   - Yearly billing-cycle selection in `meikigo-brand`'s checkout with the dedicated
     non-refundable acknowledgment checkbox.
4. **Engineering gap**: `meikigo-api`'s `SettlementService.cs` only supports on-demand,
   merchant-initiated payouts today — it does not yet implement the
   frequency-selection + forced month-end disbursement policy now written into the
   merchant terms (§4). The document states the intended policy; the system needs to
   catch up to it before launch.
5. **Full lawyer review** — the actual gate. Hand [`final.md`](./final.md) to a Malaysian
   lawyer for flat-fee review and sign-off.
6. **Business registration renewal** — Serpents Capital Solution's registration expires
   16 August 2027. Unrelated to the documents themselves, just a calendar reminder.
