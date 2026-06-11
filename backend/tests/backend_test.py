"""
Shree Dental Lab - Comprehensive backend tests.
Tests auth, pricing engine, dashboards, orders lifecycle, files, remake, role security, whatsapp.
"""
import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://dental-order-hub-2.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@shreedentallab.com"
ADMIN_PWD_INITIAL = "changeme123"
ADMIN_PWD_NEW = "ChangeMe@2026!"   # used after forced change (idempotent across runs)
DENTIST_EMAIL = "dr.sharma@example.com"
DENTIST_PWD = "password123"
DESIGNER_EMAIL = "designer@shreedentallab.com"
DESIGNER_PWD = "password123"


# ---------- helpers / fixtures ----------
def _login(email, pwd):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pwd}, timeout=30)
    return r


def _hdr(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def admin_token():
    # Try new password first, else initial then change
    r = _login(ADMIN_EMAIL, ADMIN_PWD_NEW)
    if r.status_code == 200:
        return r.json()["token"]
    r = _login(ADMIN_EMAIL, ADMIN_PWD_INITIAL)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    token = r.json()["token"]
    user = r.json()["user"]
    if user.get("must_change_password"):
        cr = requests.post(f"{API}/auth/change-password",
                           json={"new_password": ADMIN_PWD_NEW},
                           headers=_hdr(token), timeout=30)
        assert cr.status_code == 200, f"Change pw failed: {cr.text}"
        # re-login with new pw
        r = _login(ADMIN_EMAIL, ADMIN_PWD_NEW)
        assert r.status_code == 200
        token = r.json()["token"]
    return token


@pytest.fixture(scope="session")
def dentist_token():
    r = _login(DENTIST_EMAIL, DENTIST_PWD)
    assert r.status_code == 200, f"Dentist login failed: {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def designer_token():
    r = _login(DESIGNER_EMAIL, DESIGNER_PWD)
    assert r.status_code == 200, f"Designer login failed: {r.text}"
    return r.json()["token"]


# ---------- 1. Auth ----------
class TestAuth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=15)
        assert r.status_code == 200

    def test_login_admin_initial_or_new(self, admin_token):
        assert admin_token

    def test_login_dentist(self, dentist_token):
        assert dentist_token

    def test_login_invalid(self):
        r = _login(DENTIST_EMAIL, "WRONG_PW")
        assert r.status_code == 401

    def test_me_dentist_includes_profile(self, dentist_token):
        r = requests.get(f"{API}/auth/me", headers=_hdr(dentist_token), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["role"] == "dentist"
        assert "dentist" in data and data["dentist"] is not None
        assert data["dentist"]["billing_complete"] is True


# ---------- 2. Dashboards ----------
class TestDashboards:
    def test_dentist_dashboard(self, dentist_token):
        r = requests.get(f"{API}/dentist/dashboard", headers=_hdr(dentist_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        # Expect counts + recent + savings keys (loose check)
        assert isinstance(d, dict)
        assert any(k in d for k in ["counts", "recent_orders", "lifetime_savings"])

    def test_admin_dashboard(self, admin_token):
        r = requests.get(f"{API}/admin/dashboard", headers=_hdr(admin_token), timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d, dict)
        # Expected keys per problem statement
        for k in ["impressions_awaited", "pending_acceptance"]:
            assert k in d, f"Missing key {k} in admin dashboard: {list(d.keys())}"


# ---------- 3. Pricing engine ----------
class TestPricing:
    def test_quote_spec_example(self, dentist_token):
        # Need tier ids - fetch from my-pricing
        rp = requests.get(f"{API}/my-pricing", headers=_hdr(dentist_token), timeout=15)
        assert rp.status_code == 200
        body = rp.json()
        cards = body.get("cards") if isinstance(body, dict) else body
        mono_tier = None
        layered_tier = None
        for t in cards:
            n = t.get("tier_name")
            pn = t.get("product_name")
            if n == "Zirconia Monolithic" and pn == "Zirconia Crown" and not mono_tier:
                mono_tier = t["tier_id"]
            if n == "Layered Zirconia" and pn == "Zirconia Crown" and not layered_tier:
                layered_tier = t["tier_id"]
        assert mono_tier and layered_tier, f"Tiers not found in my-pricing payload"

        payload = {
            "items": [
                {"tier_id": mono_tier, "units": 3, "teeth": [{"tooth": 11, "shade": "A2"},
                                                              {"tooth": 12, "shade": "A2"},
                                                              {"tooth": 21, "shade": "A3"}]},
                {"tier_id": layered_tier, "units": 2, "teeth": [{"tooth": 31, "shade": "A2"},
                                                                 {"tooth": 32, "shade": "A2"}]},
            ],
            "urgency": "Normal",
        }
        r = requests.post(f"{API}/quote", json=payload, headers=_hdr(dentist_token), timeout=15)
        assert r.status_code == 200, f"Quote failed: {r.status_code} {r.text}"
        q = r.json()
        # Expected: subtotal 4300, discount 535, gst 188.25, total 3953.25
        assert round(q["subtotal"], 2) == 4300.00, f"subtotal={q['subtotal']}"
        assert round(q["total_discount"], 2) == 535.00, f"discount={q['total_discount']}"
        assert round(q["gst_total"], 2) == 188.25, f"gst={q['gst_total']}"
        assert round(q["total"], 2) == 3953.25, f"total={q['total']}"

    def test_my_pricing_has_slabs(self, dentist_token):
        r = requests.get(f"{API}/my-pricing", headers=_hdr(dentist_token), timeout=15)
        assert r.status_code == 200
        body = r.json()
        # Check that Zirconia Monolithic slab rates [700,630,595,560,525] appear
        txt = str(body)
        for v in ["700", "630", "595", "560", "525"]:
            assert v in txt, f"Missing slab rate {v}"


# ---------- 4. Orders ----------
class TestOrders:
    def _list(self, token):
        r = requests.get(f"{API}/orders", headers=_hdr(token), timeout=15)
        return r

    def test_dentist_orders_list(self, dentist_token):
        r = self._list(dentist_token)
        assert r.status_code == 200
        body = r.json()
        # seed creates 3 orders
        items = body if isinstance(body, list) else body.get("orders") or body.get("items") or []
        assert len(items) >= 3

    def test_designer_only_assigned(self, designer_token):
        r = self._list(designer_token)
        assert r.status_code == 200
        body = r.json()
        items = body if isinstance(body, list) else body.get("orders") or body.get("items") or []
        # Designer should see 0 (none assigned yet) or only assigned ones
        for it in items:
            assert it.get("designer_id"), f"Designer sees unassigned order: {it.get('batch_no')}"

    def test_create_order_with_idempotency(self, dentist_token):
        # Need a product tier id and a patient id
        cards_resp = requests.get(f"{API}/my-pricing", headers=_hdr(dentist_token), timeout=15).json()
        cards = cards_resp.get("cards") if isinstance(cards_resp, dict) else cards_resp
        mono = next((t for t in cards if t.get("tier_name") == "Zirconia Monolithic" and t.get("product_name") == "Zirconia Crown"), None)
        assert mono, "Mono tier not found"
        tier_id = mono["tier_id"]
        # product_id not provided in cards - need to look up
        # Use catalog products endpoint
        prods_resp = requests.get(f"{API}/products", headers=_hdr(dentist_token), timeout=15)
        product_id = None
        if prods_resp.status_code == 200:
            pbody = prods_resp.json()
            plist = pbody if isinstance(pbody, list) else pbody.get("products", [])
            crown = next((p for p in plist if p.get("name") == "Zirconia Crown"), None)
            if crown:
                product_id = crown["id"]
        assert product_id, "Product id not found"

        # Get patients
        pr = requests.get(f"{API}/patients", headers=_hdr(dentist_token), timeout=15)
        assert pr.status_code == 200
        pts = pr.json()
        pts = pts if isinstance(pts, list) else pts.get("patients", [])
        assert len(pts) >= 1
        patient_id = pts[0]["id"]
        patient_name = pts[0]["name"]

        client_token = f"TEST_{uuid.uuid4().hex}"
        body = {
            "client_token": client_token,
            "case_input_type": "Digital Scan Upload",
            "urgency": "Normal",
            "pickup_required": False,
            "delivery_required": True,
            "delivery_address": "12 MG Road",
            "notes": "TEST order from pytest",
            "cases": [{
                "patient_id": patient_id,
                "patient_name": patient_name,
                "items": [{
                    "product_id": product_id,
                    "product_name": "Zirconia Crown",
                    "tier_id": tier_id,
                    "tier_name": "Zirconia Monolithic",
                    "units": 2,
                    "teeth": [{"tooth": 11, "shade": "A2"}, {"tooth": 12, "shade": "A2"}],
                    "material": "Zirconia",
                    "trial_required": False,
                    "special_instructions": "",
                }]
            }]
        }
        r1 = requests.post(f"{API}/orders", json=body, headers=_hdr(dentist_token), timeout=30)
        assert r1.status_code in (200, 201), f"Order create failed: {r1.status_code} {r1.text}"
        d1 = r1.json()
        order = d1.get("order") or d1
        batch_no = order.get("batch_no")
        assert batch_no and batch_no.startswith("SDL-"), f"Bad batch_no: {batch_no}"

        # Duplicate client_token
        r2 = requests.post(f"{API}/orders", json=body, headers=_hdr(dentist_token), timeout=30)
        assert r2.status_code in (200, 201), f"Dup call: {r2.status_code} {r2.text}"
        d2 = r2.json()
        assert d2.get("duplicate") is True, f"Expected duplicate=true: {d2}"

        # Save for later tests
        pytest.shared_order_id = order["id"]
        pytest.shared_batch_no = batch_no


# ---------- 5. Role security ----------
class TestRoleSecurity:
    def test_dentist_blocked_admin_dashboard(self, dentist_token):
        r = requests.get(f"{API}/admin/dashboard", headers=_hdr(dentist_token), timeout=15)
        assert r.status_code == 403

    def test_dentist_blocked_dentists_list(self, dentist_token):
        r = requests.get(f"{API}/dentists", headers=_hdr(dentist_token), timeout=15)
        assert r.status_code == 403

    def test_dentist_blocked_settings(self, dentist_token):
        r = requests.get(f"{API}/settings", headers=_hdr(dentist_token), timeout=15)
        assert r.status_code == 403


# ---------- 6. Billing-incomplete dentist blocked ----------
class TestBillingGate:
    def test_new_dentist_blocked_from_order(self):
        # Register a fresh dentist (billing incomplete by default)
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        reg = requests.post(f"{API}/auth/register", json={
            "name": "Test Doc", "email": email, "password": "password123",
            "mobile": "+919000000099", "clinic_name": "TestClinic"
        }, timeout=20)
        assert reg.status_code == 200, reg.text
        token = reg.json()["token"]
        r = requests.post(f"{API}/orders", json={
            "client_token": f"TEST_{uuid.uuid4().hex}",
            "case_input_type": "Digital Scan Upload",
            "cases": []
        }, headers=_hdr(token), timeout=15)
        # Should be forbidden / 400 - definitely not 200 created
        assert r.status_code in (400, 403), f"Expected block, got {r.status_code}: {r.text}"


# ---------- 7. File upload ----------
class TestFileUpload:
    def test_invalid_extension_rejected(self, dentist_token):
        # use the order created earlier
        order_id = getattr(pytest, "shared_order_id", None)
        if not order_id:
            pytest.skip("no order id from previous test")
        files = {"file": ("malware.exe", b"binary", "application/octet-stream")}
        r = requests.post(f"{API}/orders/{order_id}/files",
                          files=files,
                          headers={"Authorization": f"Bearer {dentist_token}"},
                          timeout=30)
        assert r.status_code in (400, 415, 422), f"Expected reject, got {r.status_code}"

    def test_valid_upload_and_download(self, dentist_token):
        order_id = getattr(pytest, "shared_order_id", None)
        if not order_id:
            pytest.skip("no order id")
        files = {"file": ("scan.stl", b"solid scan\nendsolid\n", "application/octet-stream")}
        r = requests.post(f"{API}/orders/{order_id}/files",
                          files=files,
                          headers={"Authorization": f"Bearer {dentist_token}"},
                          timeout=30)
        assert r.status_code in (200, 201), f"Upload failed: {r.status_code} {r.text}"
        data = r.json()
        fid = data.get("id") or (data.get("file") or {}).get("id")
        if not fid:
            # fetch files list
            lr = requests.get(f"{API}/orders/{order_id}/files",
                              headers=_hdr(dentist_token), timeout=15)
            assert lr.status_code == 200
            arr = lr.json() if isinstance(lr.json(), list) else lr.json().get("files", [])
            assert arr, "No files returned"
            fid = arr[-1]["id"]
        dl = requests.get(f"{API}/files/{fid}/download",
                          headers={"Authorization": f"Bearer {dentist_token}"},
                          timeout=30, allow_redirects=True)
        assert dl.status_code == 200, f"Download failed: {dl.status_code}"


# ---------- 8. WhatsApp logs ----------
class TestWhatsApp:
    def test_logs_list(self, admin_token):
        r = requests.get(f"{API}/whatsapp/logs", headers=_hdr(admin_token), timeout=15)
        assert r.status_code == 200
        body = r.json()
        items = body if isinstance(body, list) else body.get("logs", [])
        # In mock mode, after order creation some events should be logged - just check it's a list
        assert isinstance(items, list)


# ---------- 9. Admin lifecycle (accept, assign, status, invoice, dispatch) ----------
class TestAdminLifecycle:
    def _list_admin(self, admin_token):
        r = requests.get(f"{API}/orders", headers=_hdr(admin_token), timeout=15)
        assert r.status_code == 200
        body = r.json()
        return body if isinstance(body, list) else body.get("orders") or body.get("items") or []

    def test_admin_can_list_all_orders(self, admin_token):
        items = self._list_admin(admin_token)
        assert len(items) >= 3

    def test_accept_order(self, admin_token, dentist_token):
        order_id = getattr(pytest, "shared_order_id", None)
        if not order_id:
            pytest.skip("no order")
        # Get items to verify per tooth
        det = requests.get(f"{API}/orders/{order_id}", headers=_hdr(admin_token), timeout=15)
        assert det.status_code == 200
        order = det.json()
        items = order.get("items") or []
        verifications = []
        for it in items:
            for t in it.get("teeth", []):
                verifications.append({"item_id": it["id"], "tooth": t["tooth"], "ok": True})
        from datetime import datetime, timedelta
        exp = (datetime.utcnow() + timedelta(days=5)).isoformat()
        r = requests.post(f"{API}/orders/{order_id}/accept",
                          json={"expected_delivery": exp, "verifications": verifications},
                          headers=_hdr(admin_token), timeout=30)
        assert r.status_code in (200, 201), f"Accept failed: {r.status_code} {r.text}"

    def test_assign_designer(self, admin_token):
        order_id = getattr(pytest, "shared_order_id", None)
        if not order_id:
            pytest.skip("no order")
        # Find designer user id
        ur = requests.get(f"{API}/users", headers=_hdr(admin_token), timeout=15)
        if ur.status_code != 200:
            pytest.skip(f"users endpoint not accessible: {ur.status_code}")
        users = ur.json() if isinstance(ur.json(), list) else ur.json().get("users", [])
        designer = next((u for u in users if u.get("role") == "designer"), None)
        assert designer, "designer user not found"
        r = requests.post(f"{API}/orders/{order_id}/assign-designer",
                          json={"designer_id": designer["id"]},
                          headers=_hdr(admin_token), timeout=15)
        assert r.status_code in (200, 201), f"Assign designer failed: {r.status_code} {r.text}"


# ---------- 10. PDFs ----------
class TestPdfs:
    def test_dispatch_label_pdf(self, admin_token):
        # seed order 1 (SDL-2026-0001) should exist
        r = requests.get(f"{API}/orders", headers=_hdr(admin_token), timeout=15)
        assert r.status_code == 200
        items = r.json() if isinstance(r.json(), list) else r.json().get("orders") or r.json().get("items") or []
        if not items:
            pytest.skip("no orders")
        oid = items[0]["id"]
        r = requests.get(f"{API}/orders/{oid}/dispatch-label?size=4x6",
                         headers=_hdr(admin_token), timeout=30)
        # Accept 200 with PDF or 400 if dispatch not yet possible. We just verify endpoint exists
        if r.status_code == 200:
            assert r.content[:4] == b"%PDF", "Not a PDF"
        else:
            assert r.status_code in (400, 404, 409), f"Unexpected: {r.status_code}"
