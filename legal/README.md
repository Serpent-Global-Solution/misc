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

## Placeholders left in these drafts — fill in before legal review

Every draft uses `[PLACEHOLDER: ...]` tags rather than inventing a real-world fact.
Before sending these to a lawyer, someone with the actual information needs to fill in:

- **Company registration details** — the legal entity name and SSM registration number,
  used in all three documents.
- **A real registered business address** — not currently in any draft; needed for a
  complete Terms/Privacy document under Malaysian practice.
- **A real PDPA/data-protection contact address** — where a customer or merchant sends
  an access/correction request or a general privacy question. Currently a placeholder
  in both the client privacy notice and (implicitly, via cross-reference) the merchant
  terms.
- **A real support/billing contact address** — for general Terms questions and
  merchant billing questions. Currently a placeholder in all three documents.
- **The governing-law/jurisdiction clause's exact wording** — all three documents state
  "governed by the laws of Malaysia" but leave the specific courts/venue clause as a
  placeholder for a lawyer to word properly.
- **Exact retention periods for two categories** — marketing-consent/blast-recipient
  records and support-ticket records. The client privacy notice states these as
  "per current internal policy, to be confirmed" (12 months post-cancellation and 3
  years respectively, per internal notes) rather than asserting them as settled legal
  commitments — confirm the real numbers before publishing.
- **Effective date and version 1.0** — every document is dated `[PLACEHOLDER: effective
  date]`; this should be set to the actual date these are approved for use, and the
  version number should be bumped on every subsequent material change (the product
  already stores a version + timestamp against every acceptance record, so this
  matters for real audit trail, not just tidiness).

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

## Next steps

1. Fill in every placeholder above with real values.
2. Send all three documents to a qualified Malaysian lawyer for review — PDPA
   compliance, consumer-contract enforceability, and the specific retention/backup/
   support-access language should all be checked by someone qualified to do so, not
   assumed correct because they match the product spec.
3. Once approved, wire the accepted version number into the actual signup/checkout
   flows (`meikigo-customer-webapp` registration, `meikigo-brand` subscription
   checkout) so acceptance is recorded against the real, reviewed version — not this
   draft's version 1.0.
