# Shree Dental Lab — Product Requirements & Build Log

## Original Problem Statement
Premium, mobile-friendly dental lab order-management platform for "Shree Dental Lab" (zirconia crowns/bridges/implant crowns). Dentists place multi-patient/multi-tooth orders via an FDI tooth chart with per-tooth VITA shades, see live tier-wise quantity-slab pricing, upload scans, pay via Razorpay, download GST invoices, track manufacturing, and raise remakes. Admin/team run the full manufacturing workflow, manage pricing master + offers, dispatch (4×6 labels), WhatsApp notifications + logs, and a tamper-proof activity log. Roles: dentist, admin, employee, designer. Brand: red #B82024 + gold #C9A45C, ivory bg, charcoal header. Tagline: Precision • Quality • Trust.

## Architecture
- **Backend** FastAPI (modular under `/app/backend/routes/`), MongoDB (UUID `id` keys, `_id` projected out), JWT auth (bcrypt). PDFs via reportlab + qrcode.
  - `deps.py` (db/auth/helpers), `constants.py`, `engine.py` (pricing+offers), `services.py` (WhatsApp+PDFs), `seed.py`.
  - Routes: auth, catalog (products/tiers/offers/dentist-pricing/settings/quote/my-pricing), people (profile/patients/dentists/users/dashboards/reports/notifications), orders (create/list/detail/files/status/accept/file-issue/assign/impression/cancel/remake/dispatch/invoice/payment), whatsapp (logs/webhook/retry/report).
- **Frontend** React + Tailwind + shadcn + framer-motion. AuthContext (localStorage token + cookie). Role-based PortalShell. `@/` alias.

## User Personas
Dentist (mobile-first ordering), Admin (full ops/desktop), Employee (production status by permission), Designer (assigned cases + design upload).

## Core Requirements (static)
RBAC, dentist-scoped data, tier-wise slab offers (highest qualifying slab applies to all units of that tier, never combined), frozen price breakup on orders, GST (CGST/SGST intra-Gujarat, IGST inter-state), configurable WhatsApp + Razorpay, soft-delete files, non-editable activity log.

## Implemented (2026-06-11) — MVP
- Public site: Home (hero), About, Products, Zirconia C&B, Contact, Login, Register.
- Auth: JWT, 4 roles, seeded admin (force password change), dentist registration + billing-gate.
- Dentist: dashboard (stats + lifetime savings), billing profile, patients (+duplicate warn), My Pricing rate cards, multi-step New Order (FDI tooth chart, tier compare cards, per-tooth shades, live price panel + offer nudges), orders list/detail, invoices, mock Razorpay pay, remake.
- Admin: dashboard (impressions/pickup/stages/overdue/failed counters), orders, production board (kanban), per-tooth accept + expected-delivery TAT, file-issue, assign designer, status workflow, impression receive/scan, dispatch + 4×6/A4 PDF label, invoice generate + GST PDF, manual + requested payments, dentists approval + dentist-specific pricing, pricing master (products/tiers), offers engine (slab editor + global toggle), team management, WhatsApp logs + retry + webhook, reports.
- Pricing engine verified to spec (3 mono + 2 layered = ₹3,953.25).
- Designer/Employee: scoped orders, design/production file upload, status updates.

## Testing
Backend 23/23 pytest PASSED. No critical/UI bugs. Mock: Razorpay payments, WhatsApp send (both configurable in Settings).

## Backlog / Next (P1/P2)
- P1: Trial workflow stages UI; pickup-request queue admin screen; per-case/per-item (partial) dispatch & invoice; reports CSV/Excel export; chunked/resumable large-file upload with progress + retry.
- P1: Live Razorpay (needs key_id/key_secret) + webhook signature verify; live WhatsApp (needs apiBaseUrl/vendorUid/token) + delivered/read badges.
- P2: per-tooth correction editor on accept screen; pontic/abutment marking on tooth chart; admin order filters (designer/product/date); employee permission matrix UI; offer "show on form" nudge per-tier admin badge "Most Popular" on order step.

## Next Action Items
1. Provide Razorpay keys + WhatsApp provider creds to switch off mock mode.
2. Build trial workflow + pickup queue + CSV export next iteration.
