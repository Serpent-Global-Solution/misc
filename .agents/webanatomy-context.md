# Web Anatomy context

- **Product**: Meikigo is a barbershop POS that runs walk-in queue, QR booking (no customer app), Cash/DuitNow/card payments, and commission reports on one tablet for Malaysian barbershops.
- **ICP**: Malaysian barbershops and unisex salons — owner-operators (1–5 chairs), multi-outlet chain owners, and shop managers — mixing walk-ins with WhatsApp bookings and still on paper books or hand-counted commissions.
- **Industry**: SaaS (secondary lens: vertical SMB POS)
- **Locale**: en
- **Competitors**: Fresha, Square Appointments, Toast
- **Conversion goal**: Start the 14-day trial (Plus-equivalent, no card, no contract)
- **Priority pages**: 1. Persona page `/barbershop` (audit first); 2. Homepage `/`; 3. Comparator `/compare`; 4. Pricing section
- **Proof assets**: Capability claims only (devices, tenders, BYOD). Testimonials labelled as early notes. No pilot shops or metrics yet. Price floor from RM109/mo (Starter).
- **Voice and tone**: Direct, plain, honest comparisons. Avoid: hype, unverified social proof, feature claims the product does not have.
- **Constraints**: No offline-first / "works without internet" claims. No "Trusted by 100+ barbershops" until verified. Payroll/payslips only as a Pro feature, never default. No marketplace discovery claims. No invented shop names in proof blocks. Public brand is Meikigo (not Miki); tiers Starter / Plus / Pro.
- **Tech stack**: Next.js 16, React 19, Tailwind 4, motion; Dockerfile + nginx; hosting planned on Netlify; analytics backlogged (Netlify Web Analytics planned, @vercel/analytics dependency present).
- **Page access**: codebase (`meikigo-marketing-site/src/app`)
- **MCP**: not connected
- **Benchmark notes**: Compare stance: booking apps stop at the appointment; Meikigo covers booking, payment and report on one tablet. Cost stack for a 3-barber shop: Starter RM109 vs ~RM200/mo + fees (footnoted, not a quote).
- **Confidence and gaps**: Confirmed by user: product, ICP, industry, competitors, conversion goal, priority page (`/barbershop` first). Inferred from `MESSAGING.md` and `package.json`, not yet confirmed: proof assets, voice and tone, constraints, tech stack, locale, page order after `/barbershop`. MCP inferred as not connected (no Web Anatomy tools in session).

_Last updated: 2026-09-28_
