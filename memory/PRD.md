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

## Update (2026-06-12) — Session changes
- Homepage: bigger hero CTA buttons (RollButton `size="lg"`) + plain-language helper line for non-tech doctors; "How to order" on white bg; equal `aspect-[4/3]` restoration images; nav links enlarged.
- Production Board: removed "Delivered" column.
- Dentist approval REMOVED: registration sets dentist status "active"; removed approval banner; removed admin approve/reject/deactivate. Admin Dentists = searchable list with full detail expander + per-dentist pricing.
- Admin: DELETE dentist (typed-name confirmation, cascade delete) and full Team management (edit, change password, activate/deactivate, delete with self/last-admin guards).
- Pricing Master: inline-editable product name. Offers: click-to-edit offer name (pencil), Save Offer persists.
- Reports: date From/To + presets (Today/7d/30d/This month/All) + CSV export endpoint `/api/reports/export`.
- Login page: removed "Dentist, admin, designer & team access." subtitle.
- DEV FIX: file-watcher (inotify) wasn't firing → enabled WATCHPACK_POLLING/CHOKIDAR_USEPOLLING in frontend/.env so edits auto-recompile (was causing "changes not reflecting").

## PAY-UPFRONT payment model (2026-06-12) — IMPORTANT
- Order is created ONLY after full payment. New flow: NewOrder → POST /orders/checkout (creates Razorpay order for full quote) → Razorpay Checkout → POST /orders WITH razorpay_order_id/payment_id/signature (server verifies, then creates order as Paid). Missing/invalid payment → 402/400, no order.
- Removed ALL pending-payment UI/actions: dentist+admin "Pending Payment(s)" stat cards, OrderDetail PayButton + admin PaymentBlock (Send Payment Request/Set Paid), invoices "Pending" column, OrderDetail "Pending" row. Header shows green "Paid" pill.
- Removed backend endpoints: payment/request, payment/create, payments/{id}/verify, payment/manual.
- Razorpay SDK installed (razorpay==2.0.1). REAL mode activates when Admin→Settings→Razorpay has enabled+key_id+key_secret; otherwise MOCK mode (frontend auto-simulates success). Free remakes (₹0) skip payment.
- Verified: backend curl (checkout, 402 enforcement, mock placement → status Paid) + testing_agent frontend 9/9 PASS (iteration_2.json).

## Still pending from user
- Real Razorpay keys (Key ID + Secret) to switch off mock mode — user wants live, keys not yet provided.
- About/Contact premium restyle (P1). WhatsApp live creds (P1).

## Status Master (2026-06-12)
- New admin "Statuses" tab in Settings (/app/settings). Global workflow. Manages order statuses:
  add custom production stages, rename custom ones, recolor any (10-swatch palette), toggle
  Production Board visibility, reorder (up/down), delete custom (blocked if in use).
- CORE statuses (label-locked, cannot deactivate/delete; recolor/reorder/board-toggle allowed):
  Impression Awaited/Received, In-House Scanning, Order Received, Order Accepted, Sent to Designer,
  QC Done/Ready, Packed, Dispatched, Delivered, On Hold, Cancelled. Editable: Design Received,
  Cutting/Sintering/Glazing, Trial stages, + any custom. This keeps dashboards/flow automation intact.
- Backend: routes/status_routes.py (collection order_statuses, seeded 19 on first run via ensure_statuses).
  /meta + order status-update now validate against the master. Renaming a custom status migrates
  existing orders (order_batches/cases/items).
- Frontend: lib/statusColors.js (PALETTE + cached useStatuses hook), StatusBadge & ProductionBoard
  read colors/columns from the master. Board excludes Delivered/Cancelled by default (configurable).
- WhatsApp simplified: messages sent ONLY on order received (order_placed/impression_placed) and
  couriered (dispatched). All other status changes still create in-app notifications, no WhatsApp.
- Verified: backend curl (CRUD + core protection + in-use delete block + invalid-status reject) and
  testing_agent frontend 10/10 PASS (iteration_3.json).

## Designer workflow (2026-06-12)
- Designers see ONLY order number + files (no patient/dentist/pricing/timeline). Backend: GET /designer/orders
  (minimal projection), GET /designer/orders/{id} (assigned-only), and GET /orders/{id} returns the minimal
  designer view for role=designer; unassigned -> 403. Designers cannot update status (removed from update_status roles).
- Designer pages: pages/designer/DesignerOrders.jsx (assignment list) + DesignerOrderDetail.jsx (download clinic files,
  upload design via category 'design'). App.js routes designer role to these; Layout designer nav = only 'My Assignments'.
- On design upload: batch.design_submitted=true + all admins notified ('Design uploaded'). Admin OrderDetail shows a green
  'design-submitted-banner' to review; admin sets status 'Design Received' (clears flag). Reassigning a designer resets the flag.
- Verified: backend curl + testing_agent 7/7 PASS (iteration_4.json). NOTE: reset designer@shreedentallab.com password to password123.

## Session 2026-06-15 (fork)
- **File uploads fix**: expanded ALLOWED_FILE_EXT in constants.py to accept dental CAD/CAM formats
  (.constructioninfo, .3shape, .exocad, .exo, .lab, .cmg, .3ml, .pcd, .scan, .3mf, .off, .dxf, .step/.stp,
  .iges, .xml, .json, .txt, .csv + more image types). Verified .stl + .constructionInfo upload (HTTP 200).
- **Hide SOP from dentists**: dentists now only ever see Order Received / Work in Progress / Impression
  Awaited / Impression Received / Dispatched / Delivered / Cancelled. All internal production statuses
  collapse to "Work in Progress". Enforced at BACKEND (constants.dentist_facing_status + DENTIST_VISIBLE_STATUSES):
  get_order masks status + collapses history + scrubs "Status changed" activity (actor->"Shree Dental Lab");
  list_orders maps status + translates the "Work in Progress" filter to $nin; dentist_dashboard returns in_progress
  count + masks recent_orders. Frontend: StatusBadge has "Work in Progress" color, Orders.jsx dentist filter list,
  DentistDashboard shows "Work in Progress" card. Admin/staff still see full SOP. Verified end-to-end.
- **Delete order (admin)**: DELETE /api/orders/{id} (admin-only) hard-deletes batch + cases/items/files(+disk)/
  invoices/payments/history/activity/notifications + linked remakes. OrderDetail.jsx has a red "Delete Order" card
  with typed batch-no confirmation dialog (data-testid delete-order-btn / -dialog / -confirm-input / -confirm-btn).
  Verified: 200 + cleanup, dentist 403.
- **Removed "Made with Emergent" badge** from frontend/public/index.html.
- **Clean production DB (no demo data)**: seed.py now gates ALL demo/sample data (designer+employee demo logins,
  sample products/tiers/offers, sample dentists/patients/orders, test_credentials.md write) behind env flag
  SEED_DEMO_DATA. Preview/dev backend/.env has SEED_DEMO_DATA="true". Production has it OFF -> only admin account +
  core settings seed (verified via throwaway-DB sim: users=1 admin, products/dentists/orders=0). IMPORTANT for deploy:
  if a prior deploy already populated the production DB with demo data, that DB must be cleared once; future deploys
  start clean automatically.

## Pending / Backlog
- P0: SMTP email integration (welcome, password reset, order status) — needs user SMTP credentials. Playbook was pulled.
- P1: Password reset auth flow (depends on SMTP).
- P1: Apply premium homepage styling to inner public pages (About, Contact).
- P1: Razorpay mock -> live (needs Key ID + Secret).
- P1: WhatsApp API mock -> live (needs Vendor UID + Token).
- Optional: per-row trash icon on Orders list (admin) for quicker delete.

## Session 2026-06-15 (cont.) — more enhancements
- **Stage timing (admin)**: order detail returns `stage_durations` (admin/employee only) computed from status history; UI shows per-stage "took Xh Ym" + total turnaround. Closed history gaps in cancel/hold/impression-damaged via `record_status_change`.
- **IST timestamps site-wide**: `fmtDate`/`fmtDateTime` force Asia/Kolkata + show date+time+"IST"; added `fmtDateOnly` for date-only fields (expected delivery).
- **Designer WhatsApp on assignment**: new `design_assigned` event (in WHATSAPP_EVENTS + WHATSAPP_SEND_EVENTS); assign_designer sends WhatsApp to designer mobile. (Mock until live creds.)
- **Logo upload**: POST /api/settings/logo (admin) stores image, public GET /api/assets/{name}; Settings→Lab has upload + preview + URL field. Removed `learn_more_base_url` setting + dynamic WhatsApp button (Learn More is a static quick-reply).
- **Registration/profile**: removed Clinic Address field; Profile delivery address has a "same as billing address" checkbox that mirrors + locks the field.
- **Impression shipping (dentist→lab)**: admin sets lab `receiving_address`/`receiving_phone` (Settings→Lab). Dentist on Impression Awaited orders sees a "Ship Your Impression" card with the lab ship-to address/phone + courier + tracking ID form (POST /api/orders/{id}/impression/ship). Saves tracking on impression_shipments, notifies all admins; admin order page shows "Impression on the way" with courier/tracking/ship date.
- All verified via curl + screenshots.

## Session 2026-06-15 (fork) — Razorpay post-payment freeze fix
- **Bug**: After a successful Razorpay test payment, the order was created in DB but the page stayed frozen (had to refresh to see the order). Failure/cancel cases worked fine.
- **Root cause**: SPA + Razorpay — the Razorpay checkout overlay/iframe stayed mounted on top of the app after `handler` ran; `nav()` happened underneath but the overlay covered everything → looked frozen.
- **Fix** (`/app/frontend/src/pages/dentist/NewOrder.jsx`):
  1. Explicitly call `rzp.close()` inside the success `handler` to tear down the overlay before navigating.
  2. Added a `paid` flag so the programmatic close doesn't trigger the `modal.ondismiss` "Payment cancelled" toast.
  3. Made attachment uploads non-blocking (fire-and-forget `uploadAttachments`) so a slow/large file upload can't hang the redirect to the order detail page.
- Verified: frontend compiles, dentist portal + New Order route load. Real test payment requires user manual confirmation (Razorpay flow runs on Razorpay's domain, not automatable).
