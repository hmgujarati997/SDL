"""Seed data: admin, products, tiers, offers, settings, sample dentists/patients/orders."""
from deps import db, gen_id, now_iso, hash_password
from constants import ZIRCONIA_STAGES, WHATSAPP_EVENTS
import os


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.dentists.create_index("user_id")
    await db.patients.create_index("dentist_id")
    await db.order_batches.create_index("dentist_id")
    await db.order_batches.create_index("batch_no")
    await db.order_items.create_index("batch_id")
    await db.order_cases.create_index("batch_id")
    await db.order_files.create_index("batch_id")
    await db.order_activity_logs.create_index("order_id")
    await db.whatsapp_logs.create_index("order_no")
    await db.notifications.create_index("user_id")


async def _setting(key, value):
    exists = await db.settings.find_one({"key": key})
    if not exists:
        await db.settings.insert_one({"id": gen_id(), "key": key, "value": value})


async def seed():
    await ensure_indexes()

    # Demo/sample data (sample products, offers, dentists, orders and the
    # designer/employee demo logins) is only seeded when SEED_DEMO_DATA is
    # explicitly enabled. In production this flag is OFF, so going live starts
    # with a clean database — only the admin account and core settings exist.
    seed_demo = os.environ.get("SEED_DEMO_DATA", "false").strip().lower() == "true"

    # Settings
    await _setting("lab", {
        "name": "Shree Dental Lab",
        "gstin": "24ABCDE1234F1Z5",
        "address": "Ahmedabad, Gujarat, India - 380001",
        "state": "Gujarat",
        "phone": "+91 90000 00000",
        "email": "info@shreedentallab.com",
        "logo_url": "https://customer-assets.emergentagent.com/job_3147c62a-2b30-4c49-a67d-6d5a71dfc726/artifacts/b9orur0u_Shree%20Dental%20Lab.png",
    })
    await _setting("razorpay", {"enabled": False, "key_id": "", "key_secret": "", "mode": "test"})
    await _setting("gst", {"enabled": True, "rate": 5})
    await _setting("offers_enabled", True)
    await _setting("whatsapp", {
        "enabled": False,
        "api_base_url": "",
        "vendor_uid": "",
        "api_token": "",
        "from_phone_number_id": "",
        "template_name": "shree_order_update",
        "language_code": "en",
        "image_header_url": "https://customer-assets.emergentagent.com/job_3147c62a-2b30-4c49-a67d-6d5a71dfc726/artifacts/b9orur0u_Shree%20Dental%20Lab.png",
        "events": {e: True for e in WHATSAPP_EVENTS},
    })

    # Admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@shreedentallab.com")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "changeme123")
    admin = await db.users.find_one({"email": admin_email})
    if not admin:
        await db.users.insert_one({
            "id": gen_id(), "email": admin_email, "password_hash": hash_password(admin_pw),
            "name": "Lab Admin", "role": "admin", "mobile": "+919000000000",
            "permissions": [], "active": True, "must_change_password": True,
            "created_at": now_iso(),
        })

    # Designer + Employee (demo logins — dev/preview only)
    if seed_demo:
        for email, name, role in [
            ("designer@shreedentallab.com", "Raj Designer", "designer"),
            ("employee@shreedentallab.com", "Amit Production", "employee"),
        ]:
            if not await db.users.find_one({"email": email}):
                await db.users.insert_one({
                    "id": gen_id(), "email": email, "password_hash": hash_password("password123"),
                    "name": name, "role": role, "mobile": "+919000000001",
                    "permissions": ["update_status"] if role == "employee" else [],
                    "active": True, "must_change_password": False, "created_at": now_iso(),
                })

    # Products + tiers (sample catalog — dev/preview only)
    if seed_demo and await db.products.count_documents({}) == 0:
        mono_ids, layered_ids = [], []

        def tier(pid, name, rate, popular=False, desc=""):
            return {
                "id": gen_id(), "product_id": pid, "name": name, "rate_per_unit": rate,
                "gst_rate": 5, "hsn": "9021", "urgent_surcharge": 200,
                "urgent_surcharge_type": "flat", "tat_days": 4, "unit_type": "per tooth",
                "description": desc, "most_popular": popular, "active": True,
            }

        products = [
            ("Zirconia Crown", "Crown & Bridge", [
                ("Zirconia Monolithic", 700, True, "Maximum strength for posterior teeth"),
                ("Layered Zirconia", 1100, False, "Hand-layered aesthetics for anterior"),
            ]),
            ("Zirconia Bridge", "Crown & Bridge", [
                ("Zirconia Monolithic", 700, True, "Full contour zirconia bridge"),
                ("Layered Zirconia", 1100, False, "Layered aesthetic bridge"),
            ]),
            ("Implant Crown", "Implant", [
                ("Standard", 1500, True, "Screw / cement retained implant crown"),
            ]),
            ("Other", "Misc", [
                ("Standard", 0, False, "Custom product - priced manually"),
            ]),
        ]
        for pname, cat, tiers in products:
            pid = gen_id()
            await db.products.insert_one({
                "id": pid, "name": pname, "category": cat, "unit_type": "per tooth",
                "description": f"{pname} restorations", "required_file_types": ["stl", "obj", "ply"],
                "default_tat": 4, "active": True, "created_at": now_iso(),
            })
            for tname, rate, popular, desc in tiers:
                t = tier(pid, tname, rate, popular, desc)
                await db.product_tiers.insert_one(t)
                if tname == "Zirconia Monolithic":
                    mono_ids.append(t["id"])
                elif tname == "Layered Zirconia":
                    layered_ids.append(t["id"])

        slabs = [
            {"min_units": 1, "discount": 0}, {"min_units": 2, "discount": 10},
            {"min_units": 3, "discount": 15}, {"min_units": 4, "discount": 20},
            {"min_units": 5, "discount": 25},
        ]
        await db.offers.insert_one({
            "id": gen_id(), "name": "Monolithic Volume Discount", "scope": "per_tier_per_batch",
            "tier_ids": mono_ids, "slabs": slabs, "discount_type": "percentage",
            "applies_to": "all", "show_on_form": True, "active": True, "created_at": now_iso(),
        })
        await db.offers.insert_one({
            "id": gen_id(), "name": "Layered Volume Discount", "scope": "per_tier_per_batch",
            "tier_ids": layered_ids, "slabs": slabs, "discount_type": "percentage",
            "applies_to": "all", "show_on_form": True, "active": True, "created_at": now_iso(),
        })

    # Workflow template
    if await db.workflow_templates.count_documents({}) == 0:
        await db.workflow_templates.insert_one({
            "id": gen_id(), "name": "Default Zirconia Workflow",
            "stages": ZIRCONIA_STAGES, "product_category": "Crown & Bridge", "created_at": now_iso(),
        })

    # Sample dentists / patients / orders (dev/preview only)
    if seed_demo and await db.dentists.count_documents({}) == 0:
        await _seed_sample_orders()

    if seed_demo:
        await _write_creds()


async def _seed_sample_orders():
    from engine import compute_quote

    # Dentist 1 (approved, full billing)
    d1_user = gen_id()
    await db.users.insert_one({
        "id": d1_user, "email": "dr.sharma@example.com", "password_hash": hash_password("password123"),
        "name": "Dr. Anil Sharma", "role": "dentist", "mobile": "+919812345678",
        "active": True, "must_change_password": False, "created_at": now_iso(),
    })
    d1 = gen_id()
    await db.dentists.insert_one({
        "id": d1, "user_id": d1_user, "name": "Dr. Anil Sharma", "clinic_name": "Sharma Dental Care",
        "mobile": "+919812345678", "whatsapp": "+919812345678", "email": "dr.sharma@example.com",
        "billing_address": "12 MG Road", "clinic_address": "12 MG Road", "city": "Ahmedabad",
        "state": "Gujarat", "pincode": "380001", "gst_number": "24XYZAB1234C1Z9", "pan_number": "XYZAB1234C",
        "delivery_address": "12 MG Road, Ahmedabad", "alt_contact_name": "Reception", "alt_contact_number": "+917900000000",
        "status": "approved", "billing_complete": True, "lifetime_savings": 0, "created_at": now_iso(),
    })

    # Dentist 2 (pending approval)
    d2_user = gen_id()
    await db.users.insert_one({
        "id": d2_user, "email": "dr.mehta@example.com", "password_hash": hash_password("password123"),
        "name": "Dr. Priya Mehta", "role": "dentist", "mobile": "+919900112233",
        "active": True, "must_change_password": False, "created_at": now_iso(),
    })
    await db.dentists.insert_one({
        "id": gen_id(), "user_id": d2_user, "name": "Dr. Priya Mehta", "clinic_name": "Smile Studio",
        "mobile": "+919900112233", "whatsapp": "+919900112233", "email": "dr.mehta@example.com",
        "billing_address": "", "city": "Surat", "state": "Gujarat", "pincode": "395001",
        "status": "pending", "billing_complete": False, "lifetime_savings": 0, "created_at": now_iso(),
    })

    # Patients for d1
    patients = []
    for nm, age, gender in [("Ramesh Patel", 45, "Male"), ("Kiran Shah", 52, "Male"), ("Sita Desai", 38, "Female")]:
        pid = gen_id()
        await db.patients.insert_one({
            "id": pid, "dentist_id": d1, "name": nm, "age": age, "gender": gender,
            "phone": "", "patient_code": "", "notes": "", "created_at": now_iso(),
        })
        patients.append((pid, nm))

    tiers = await db.product_tiers.find({"name": "Zirconia Monolithic"}, {"_id": 0}).to_list(10)
    layered = await db.product_tiers.find({"name": "Layered Zirconia"}, {"_id": 0}).to_list(10)
    crown = await db.products.find_one({"name": "Zirconia Crown"}, {"_id": 0})
    mono = tiers[0]
    lay = layered[0]
    offers = await db.offers.find({}, {"_id": 0}).to_list(20)

    counter = 1

    async def make_batch(dentist_id, dentist_name, clinic, status, items_spec, case_input="Digital Scan Upload", impression=False):
        nonlocal counter
        batch_no = f"SDL-2026-{counter:04d}"
        counter += 1
        bid = gen_id()
        all_items = []
        cases = []
        for pid, pname, specs in items_spec:
            cid = gen_id()
            cases.append({"id": cid, "batch_id": bid, "patient_id": pid, "patient_name": pname,
                          "status": status, "notes": "", "case_input_type": case_input})
            for tier, teeth in specs:
                item_id = gen_id()
                teeth_arr = [{"tooth": t, "shade": s} for t, s in teeth]
                all_items.append({
                    "id": item_id, "batch_id": bid, "case_id": cid,
                    "product_id": crown["id"], "product_name": crown["name"],
                    "tier_id": tier["id"], "tier_name": tier["name"],
                    "units": len(teeth_arr), "teeth": teeth_arr, "material": "Zirconia",
                    "trial_required": False, "special_instructions": "", "stump_shade": "",
                    "status": status, "patient_name": pname,
                })
        quote = compute_quote(
            [{"tier_id": it["tier_id"], "product_id": it["product_id"], "product_name": it["product_name"],
              "tier_name": it["tier_name"], "units": it["units"], "teeth": it["teeth"],
              "patient_name": it["patient_name"]} for it in all_items],
            {t["id"]: t for t in [mono, lay]}, {}, offers, "Normal", True, True, True,
        )
        await db.order_batches.insert_one({
            "id": bid, "batch_no": batch_no, "dentist_id": dentist_id, "dentist_name": dentist_name,
            "clinic_name": clinic, "status": status, "case_input_type": case_input,
            "urgency": "Normal", "pickup_required": False, "delivery_required": True,
            "delivery_address": "12 MG Road, Ahmedabad", "notes": "", "is_impression": impression,
            "pricing": quote, "amounts": {"total": quote["total"], "paid": 0, "pending": quote["total"], "status": "Unpaid"},
            "is_remake": False, "parent_id": None, "remake_index": 0, "designer_id": None,
            "expected_delivery": None, "created_at": now_iso(), "updated_at": now_iso(),
        })
        for cse in cases:
            await db.order_cases.insert_one(cse)
        for it in all_items:
            await db.order_items.insert_one(it)
        await db.order_status_history.insert_one({
            "id": gen_id(), "order_id": bid, "level": "batch", "ref_id": bid,
            "old": None, "new": status, "note": "Order created", "user_name": "System", "created_at": now_iso(),
        })
        if impression:
            await db.impression_shipments.insert_one({
                "id": gen_id(), "batch_id": bid, "method": "courier", "courier_name": "",
                "tracking_no": "", "status": "Impression Awaited", "condition": None, "created_at": now_iso(),
            })
        return bid

    # Order 1: multi-patient multi-tooth, In manufacturing
    await make_batch(d1, "Dr. Anil Sharma", "Sharma Dental Care", "Cutting Started", [
        (patients[0][0], patients[0][1], [(mono, [(11, "A2"), (12, "A2"), (21, "A3")])]),
        (patients[1][0], patients[1][1], [(lay, [(36, "A3"), (37, "A3")])]),
    ])
    # Order 2: Order Received
    await make_batch(d1, "Dr. Anil Sharma", "Sharma Dental Care", "Order Received", [
        (patients[2][0], patients[2][1], [(mono, [(14, "A1"), (15, "A1")])]),
    ])
    # Order 3: Physical impression - Impression Awaited
    await make_batch(d1, "Dr. Anil Sharma", "Sharma Dental Care", "Impression Awaited", [
        (patients[0][0], patients[0][1], [(mono, [(46, "A3.5")])]),
    ], case_input="Physical Impression", impression=True)


async def _write_creds():
    content = """# Test Credentials

## Admin
- Email: admin@shreedentallab.com
- Password: changeme123
- Role: admin (must_change_password = true on first login)

## Designer
- Email: designer@shreedentallab.com
- Password: password123

## Employee / Production
- Email: employee@shreedentallab.com
- Password: password123

## Dentist (approved, full billing)
- Email: dr.sharma@example.com
- Password: password123

## Dentist (pending approval)
- Email: dr.mehta@example.com
- Password: password123

## Auth endpoints
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- GET  /api/auth/me
"""
    from pathlib import Path
    Path("/app/memory/test_credentials.md").write_text(content)
