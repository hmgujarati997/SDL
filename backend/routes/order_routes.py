import os
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File, Form, Request
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import Optional, List
import io
from datetime import datetime, timezone, timedelta

from deps import (db, gen_id, now_iso, fmt_ist, get_current_user, require_roles,
                  log_activity, get_setting, create_notification, UPLOAD_DIR)
from constants import (ALLOWED_FILE_EXT, ZIRCONIA_STAGES, ALL_STATUSES,
                       DENTIST_VISIBLE_STATUSES, dentist_facing_status)
from engine import compute_quote
from services import send_whatsapp, invoice_pdf, dispatch_label_pdf
import razorpay as _razorpay

router = APIRouter(tags=["orders"])

MAX_FILE_MB = 400

EVENT_FOR_STATUS = {
    "Order Accepted": "order_accepted",
    "Sent to Designer": "sent_to_designer",
    "Design Received": "design_received",
    "Cutting Started": "cutting_started",
    "Sintering Started": "sintering_started",
    "Glazing Started": "glazing_started",
    "QC Done / Ready for Packaging": "ready_packaging",
    "Packed / Dispatch Label Printed": "packed",
    "Dispatched": "dispatched",
    "Delivered": "delivered",
    "Trial Dispatched": "trial_dispatched",
    "Impression Received": "impression_received",
}

# WhatsApp messages are sent ONLY for these events (order received & couriered/dispatched).
# All other status changes still create in-app notifications but no WhatsApp.
WHATSAPP_SEND_EVENTS = {"order_placed", "impression_placed", "dispatched", "design_assigned"}


async def _dentist_of(batch):
    return await db.dentists.find_one({"id": batch["dentist_id"]}, {"_id": 0})


async def notify(batch, event, fields, *, title, body, status_text=None):
    dent = await _dentist_of(batch)
    suffix = batch["batch_no"]
    patient = ""
    cases = await db.order_cases.find({"batch_id": batch["id"]}, {"_id": 0}).to_list(50)
    if cases:
        patient = ", ".join(c["patient_name"] for c in cases[:2])
    # WhatsApp is sent ONLY when an order is received and when it is couriered (dispatched).
    if event in WHATSAPP_SEND_EVENTS:
        await send_whatsapp(
            event=event, to_phone=(dent or {}).get("whatsapp", ""),
            dentist_name=(dent or {}).get("name", ""), order_no=batch["batch_no"],
            patient_name=patient, fields=fields, deep_link_suffix=suffix,
        )
    if dent:
        await create_notification(dent["user_id"], title, body, order_id=batch["id"], kind="order")


def f5(a, b, c, d, e):
    return {"1": a, "2": b, "3": c, "4": d, "5": e}


# ---------------- Create order ----------------
class TeethItem(BaseModel):
    product_id: str
    product_name: str
    tier_id: str
    tier_name: str
    teeth: List[dict] = []
    units: Optional[int] = None
    material: Optional[str] = "Zirconia"
    trial_required: bool = False
    special_instructions: Optional[str] = ""
    stump_shade: Optional[str] = ""
    expected_delivery: Optional[str] = None


class CaseIn(BaseModel):
    patient_id: Optional[str] = None
    new_patient: Optional[dict] = None
    case_input_type: Optional[str] = "Digital Scan Upload"
    notes: Optional[str] = ""
    items: List[TeethItem]


class OrderIn(BaseModel):
    case_input_type: str = "Digital Scan Upload"
    urgency: str = "Normal"
    pickup_required: bool = False
    delivery_required: bool = True
    delivery_address: Optional[str] = ""
    notes: Optional[str] = ""
    impression_method: Optional[str] = None  # courier / pickup
    cases: List[CaseIn]
    client_token: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    razorpay_signature: Optional[str] = None


async def _next_batch_no():
    year = datetime.now(timezone.utc).year
    prefix = f"SDL-{year}-"
    last = await db.order_batches.find({"batch_no": {"$regex": f"^{prefix}"}}).sort("batch_no", -1).to_list(1)
    n = 1
    if last:
        try:
            n = int(last[0]["batch_no"].split("-")[-1].split("R")[0]) + 1
        except Exception:
            n = await db.order_batches.count_documents({}) + 1
    return f"{prefix}{n:04d}"


def _quote_items_from_body(body):
    out = []
    for c in body.cases:
        pname = (c.new_patient or {}).get("name", "") if c.new_patient else ""
        for it in c.items:
            units = it.units or len(it.teeth)
            out.append({"tier_id": it.tier_id, "product_id": it.product_id,
                        "product_name": it.product_name, "tier_name": it.tier_name,
                        "units": units, "teeth": it.teeth, "patient_name": pname})
    return out


async def _resolve_quote(items_for_quote, dent, urgency):
    tier_ids = list({i["tier_id"] for i in items_for_quote})
    tiers = await db.product_tiers.find({"id": {"$in": tier_ids}}, {"_id": 0}).to_list(100)
    tiers_by_id = {t["id"]: t for t in tiers}
    rates_rows = await db.dentist_product_pricing.find({"dentist_id": dent["id"]}, {"_id": 0}).to_list(200)
    rates = {r["tier_id"]: r["rate"] for r in rates_rows}
    offers = await db.offers.find({"active": True}, {"_id": 0}).to_list(100)
    gst_cfg = await get_setting("gst", {"enabled": True})
    offers_enabled = await get_setting("offers_enabled", True)
    intra = dent.get("state", "").strip().lower() == "gujarat"
    return compute_quote(items_for_quote, tiers_by_id, rates, offers, urgency,
                         gst_cfg.get("enabled", True), intra, offers_enabled)


async def _rp_config():
    rp = await get_setting("razorpay", {}) or {}
    enabled = bool(rp.get("enabled") and rp.get("key_id") and rp.get("key_secret"))
    return rp, enabled


async def _create_rp_order(amount_inr, receipt):
    rp, enabled = await _rp_config()
    if not enabled:
        return {"id": "order_mock_" + gen_id()[:12], "mock": True, "key_id": rp.get("key_id", "")}
    client = _razorpay.Client(auth=(rp["key_id"], rp["key_secret"]))
    order = client.order.create({
        "amount": int(round(amount_inr * 100)), "currency": "INR",
        "payment_capture": 1, "receipt": receipt[:40]})
    return {"id": order["id"], "mock": False, "key_id": rp["key_id"]}


async def _verify_rp(order_id, payment_id, signature):
    rp, enabled = await _rp_config()
    if not enabled:
        # Mock mode: accept simulated payments
        return str(order_id).startswith("order_mock_")
    client = _razorpay.Client(auth=(rp["key_id"], rp["key_secret"]))
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature})
        return True
    except Exception:
        return False


@router.post("/orders/checkout")
async def order_checkout(body: OrderIn, user: dict = Depends(require_roles("dentist"))):
    dent = await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0})
    if not dent:
        raise HTTPException(400, "Profile not found")
    if not dent.get("billing_complete"):
        raise HTTPException(400, "Please complete your billing profile before placing an order.")
    items = _quote_items_from_body(body)
    if not items:
        raise HTTPException(400, "Add at least one item before checkout.")
    quote = await _resolve_quote(items, dent, body.urgency)
    total = round(quote["total"], 2)
    rp = await _create_rp_order(total, "chk_" + gen_id()[:12])
    return {
        "amount": total, "currency": "INR",
        "razorpay_order_id": rp["id"], "key_id": rp["key_id"], "mock": rp["mock"],
        "prefill": {"name": dent.get("name", ""), "email": dent.get("email", ""),
                    "contact": dent.get("mobile", "")},
    }


@router.post("/orders")
async def create_order(body: OrderIn, user: dict = Depends(require_roles("dentist"))):
    dent = await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0})
    if not dent:
        raise HTTPException(400, "Profile not found")
    if not dent.get("billing_complete"):
        raise HTTPException(400, "Please complete your billing profile before placing an order.")

    # duplicate submission guard
    if body.client_token:
        existing = await db.order_batches.find_one({"client_token": body.client_token})
        if existing:
            return {"id": existing["id"], "batch_no": existing["batch_no"], "duplicate": True}

    is_impression = body.case_input_type == "Physical Impression" or any(
        c.case_input_type == "Physical Impression" for c in body.cases)
    bid = gen_id()
    batch_no = await _next_batch_no()

    all_items_for_quote = []
    cases_docs, items_docs = [], []
    for c in body.cases:
        # resolve patient
        if c.new_patient:
            pid = gen_id()
            await db.patients.insert_one({
                "id": pid, "dentist_id": dent["id"], "name": c.new_patient.get("name"),
                "age": c.new_patient.get("age"), "gender": c.new_patient.get("gender", ""),
                "phone": c.new_patient.get("phone", ""), "patient_code": c.new_patient.get("patient_code", ""),
                "notes": c.new_patient.get("notes", ""), "created_at": now_iso()})
            pname = c.new_patient.get("name")
        else:
            pat = await db.patients.find_one({"id": c.patient_id}, {"_id": 0})
            if not pat:
                raise HTTPException(400, "Patient not found")
            pid, pname = pat["id"], pat["name"]
        cid = gen_id()
        cstatus = "Impression Awaited" if (c.case_input_type == "Physical Impression" or is_impression) else "Order Received"
        cases_docs.append({"id": cid, "batch_id": bid, "patient_id": pid, "patient_name": pname,
                           "status": cstatus, "notes": c.notes, "case_input_type": c.case_input_type})
        for it in c.items:
            units = it.units or len(it.teeth)
            item_id = gen_id()
            items_docs.append({
                "id": item_id, "batch_id": bid, "case_id": cid, "product_id": it.product_id,
                "product_name": it.product_name, "tier_id": it.tier_id, "tier_name": it.tier_name,
                "units": units, "teeth": it.teeth, "material": it.material,
                "trial_required": it.trial_required, "special_instructions": it.special_instructions,
                "stump_shade": it.stump_shade, "expected_delivery": it.expected_delivery,
                "status": cstatus, "patient_name": pname})
            all_items_for_quote.append({
                "tier_id": it.tier_id, "product_id": it.product_id, "product_name": it.product_name,
                "tier_name": it.tier_name, "units": units, "teeth": it.teeth, "patient_name": pname})

    # pricing
    quote = await _resolve_quote(all_items_for_quote, dent, body.urgency)

    # ---- Payment-first enforcement ----
    total = round(quote["total"], 2)
    paid_ok = False
    if total > 0:
        if not body.razorpay_order_id or not body.razorpay_payment_id:
            raise HTTPException(402, "Payment is required before placing the order.")
        verified = await _verify_rp(body.razorpay_order_id, body.razorpay_payment_id,
                                    body.razorpay_signature or "")
        if not verified:
            raise HTTPException(400, "Payment could not be verified. Your order was not placed.")
        paid_ok = True

    status = "Impression Awaited" if is_impression else "Order Received"
    batch = {
        "id": bid, "batch_no": batch_no, "dentist_id": dent["id"], "dentist_name": dent["name"],
        "clinic_name": dent.get("clinic_name", ""), "status": status,
        "case_input_type": body.case_input_type, "urgency": body.urgency,
        "pickup_required": body.pickup_required, "delivery_required": body.delivery_required,
        "delivery_address": dent.get("delivery_address") or dent.get("clinic_address") or dent.get("billing_address") or "",
        "notes": body.notes, "is_impression": is_impression, "pricing": quote,
        "amounts": {"total": total, "paid": total if paid_ok else 0, "pending": 0,
                    "status": "Paid" if paid_ok else "Unpaid"},
        "is_remake": False, "parent_id": None, "remake_index": 0, "designer_id": None,
        "file_issue": None, "expected_delivery": None, "client_token": body.client_token,
        "created_at": now_iso(), "updated_at": now_iso(),
    }
    await db.order_batches.insert_one(batch)
    if paid_ok:
        await db.payments.insert_one({
            "id": gen_id(), "order_id": bid, "order_no": batch_no, "amount": total,
            "status": "Paid", "method": "razorpay", "razorpay_order_id": body.razorpay_order_id,
            "razorpay_payment_id": body.razorpay_payment_id, "created_at": now_iso(),
            "paid_at": now_iso(), "mock": str(body.razorpay_order_id).startswith("order_mock_")})
    for c in cases_docs:
        await db.order_cases.insert_one(c)
    for it in items_docs:
        await db.order_items.insert_one(it)
    await db.order_status_history.insert_one({
        "id": gen_id(), "order_id": bid, "level": "batch", "ref_id": bid,
        "old": None, "new": status, "note": "Order placed", "user_name": dent["name"], "created_at": now_iso()})
    await log_activity(bid, f"Order placed ({batch_no})", user, dentist_visible=True)

    # impression shipment + pickup request
    if is_impression:
        await db.impression_shipments.insert_one({
            "id": gen_id(), "batch_id": bid, "method": body.impression_method or "courier",
            "courier_name": "", "tracking_no": "", "status": "Impression Awaited",
            "condition": None, "created_at": now_iso()})
        if body.impression_method == "pickup":
            await db.pickup_requests.insert_one({
                "id": gen_id(), "batch_id": bid, "batch_no": batch_no, "dentist_id": dent["id"],
                "dentist_name": dent["name"], "address": dent.get("clinic_address") or dent.get("billing_address", ""),
                "status": "Requested", "created_at": now_iso()})

    # notify
    units = sum(i["units"] for i in all_items_for_quote)
    patient_names = ", ".join(c["patient_name"] for c in cases_docs[:2])
    lab = await get_setting("lab", {})
    if is_impression:
        await notify(batch, "impression_placed",
                     f5("Your impression order has been placed.", f"Order No: {batch_no}",
                        f"Patient: {patient_names} | Units: {units}",
                        f"Ship impressions to: {lab.get('receiving_address') or lab.get('address','')}",
                        "Add the courier tracking ID from your dashboard once shipped."),
                     title="Impression order placed", body=f"Order {batch_no} placed. Ship impressions to the lab.")
    else:
        await notify(batch, "order_placed",
                     f5("Your order has been received by Shree Dental Lab.", f"Order No: {batch_no}",
                        f"Patient: {patient_names} | Units: {units}", "Current Status: Order Received",
                        "We will check the uploaded files and update you shortly."),
                     title="Order placed", body=f"Order {batch_no} received.")
    # notify admins
    admins = await db.users.find({"role": "admin"}, {"_id": 0}).to_list(20)
    for a in admins:
        await create_notification(a["id"], "New order", f"{dent['name']} placed {batch_no}", order_id=bid, kind="new_order")
    return {"id": bid, "batch_no": batch_no, "duplicate": False}


# ---------------- List & detail ----------------
@router.get("/orders")
async def list_orders(status: Optional[str] = None, q: Optional[str] = None,
                      designer_id: Optional[str] = None, remake: Optional[bool] = None,
                      user: dict = Depends(get_current_user)):
    query = {}
    is_dentist = user["role"] == "dentist"
    is_employee = user["role"] == "employee"
    TERMINAL = ["Delivered", "Cancelled"]
    if is_dentist:
        dent = await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0})
        query["dentist_id"] = dent["id"] if dent else "__none__"
    elif user["role"] == "designer":
        query["designer_id"] = user["id"]
    if status:
        if is_dentist:
            # Translate the dentist-facing filter back to internal statuses.
            from constants import DENTIST_WIP_LABEL
            if status == DENTIST_WIP_LABEL:
                query["status"] = {"$nin": list(DENTIST_VISIBLE_STATUSES)}
            else:
                query["status"] = status
        elif is_employee and status in TERMINAL:
            # Staff only ever see running orders, never completed/cancelled ones.
            query["status"] = {"$nin": TERMINAL}
        else:
            query["status"] = status
    elif is_employee:
        # Staff list shows running orders only — delivered/cancelled drop off.
        query["status"] = {"$nin": TERMINAL}
    if designer_id:
        query["designer_id"] = designer_id
    if remake is not None:
        query["is_remake"] = remake
    if q:
        query["$or"] = [
            {"batch_no": {"$regex": q, "$options": "i"}},
            {"dentist_name": {"$regex": q, "$options": "i"}},
            {"clinic_name": {"$regex": q, "$options": "i"}},
        ]
    batches = await db.order_batches.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for b in batches:
        b["cases"] = await db.order_cases.find({"batch_id": b["id"]}, {"_id": 0}).to_list(50)
        if is_dentist:
            b["status"] = dentist_facing_status(b["status"])
    return batches


@router.get("/designer/orders")
async def designer_orders(user: dict = Depends(require_roles("designer", "admin"))):
    q = {"designer_id": user["id"]} if user["role"] == "designer" else {"designer_id": {"$ne": None}}
    if user["role"] != "designer":
        return await db.order_batches.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Designers get only the bare minimum: order no, status, dates, review flag.
    rows = await db.order_batches.find(
        q, {"_id": 0, "id": 1, "batch_no": 1, "status": 1, "created_at": 1,
            "updated_at": 1, "designer_id": 1, "design_submitted": 1}).sort("created_at", -1).to_list(500)
    return rows


DESIGNER_FILE_CATEGORIES = {"dentist", "photo", "design"}


async def _designer_files(bid):
    files = await db.order_files.find(
        {"batch_id": bid, "deleted": {"$ne": True}},
        {"_id": 0, "id": 1, "filename": 1, "category": 1, "size": 1,
         "uploaded_by_role": 1, "created_at": 1}).sort("created_at", 1).to_list(500)
    return [f for f in files if f.get("category") in DESIGNER_FILE_CATEGORIES]


async def _designer_view(batch, files):
    # Designers get the written instructions (order/case notes + per-item special
    # instructions + design specs) so they can design accordingly — but still no
    # patient identity, dentist, or pricing.
    cases = await db.order_cases.find(
        {"batch_id": batch["id"]}, {"_id": 0, "id": 1, "notes": 1}).to_list(200)
    items = await db.order_items.find(
        {"batch_id": batch["id"]},
        {"_id": 0, "case_id": 1, "product_name": 1, "tier_name": 1, "units": 1,
         "teeth": 1, "special_instructions": 1, "stump_shade": 1}).to_list(500)
    case_notes = [c.get("notes", "") for c in cases if c.get("notes")]
    return {
        "id": batch["id"], "batch_no": batch["batch_no"], "status": batch["status"],
        "created_at": batch.get("created_at"), "updated_at": batch.get("updated_at"),
        "design_submitted": batch.get("design_submitted", False), "files": files,
        "order_notes": batch.get("notes", ""),
        "case_notes": case_notes,
        "items": items,
    }


@router.get("/designer/orders/{bid}")
async def designer_order_detail(bid: str, user: dict = Depends(require_roles("designer", "admin"))):
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0}) or \
        await db.order_batches.find_one({"batch_no": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    if user["role"] == "designer" and batch.get("designer_id") != user["id"]:
        raise HTTPException(403, "This case is not assigned to you")
    files = await _designer_files(batch["id"])
    return await _designer_view(batch, files)


def _mask_detail_for_dentist(detail):
    """Strip the lab's internal SOP from an order detail before sending to a dentist.
    Collapses internal production statuses to "Work in Progress" and removes
    staff identities / internal notes from the status timeline and activity log."""
    detail["status"] = dentist_facing_status(detail.get("status"))
    masked, last = [], None
    for h in detail.get("history", []):
        new = dentist_facing_status(h.get("new"))
        if new == last:
            continue  # collapse consecutive internal steps into one WIP entry
        masked.append({
            "id": h.get("id"),
            "new": new,
            "old": dentist_facing_status(h.get("old")),
            "created_at": h.get("created_at"),
            "user_name": "Shree Dental Lab",
            "note": h.get("note") if new in DENTIST_VISIBLE_STATUSES else "",
        })
        last = new
    detail["history"] = masked
    for a in detail.get("activity", []):
        if (a.get("action") or "").startswith("Status changed:"):
            a["action"] = "Status updated"
            a["actor_name"] = "Shree Dental Lab"
    return detail


async def record_status_change(bid, old, new, note, user_name, level="batch", ref_id=None):
    """Append a status transition to order_status_history so stage durations stay accurate."""
    await db.order_status_history.insert_one({
        "id": gen_id(), "order_id": bid, "level": level, "ref_id": ref_id or bid,
        "old": old, "new": new, "note": note, "user_name": user_name, "created_at": now_iso()})


_TERMINAL_STATUSES = {"Delivered", "Cancelled"}


def _parse_iso(s):
    if not s:
        return None
    try:
        dt = datetime.fromisoformat(s)
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
    except Exception:
        return None


def _compute_stage_durations(history):
    """Derive how long each status stage took from the status history timeline.
    Consecutive entries with the same status are merged. The current (last) stage
    is 'ongoing' unless the order is in a terminal state."""
    items = sorted([h for h in history if h.get("created_at")], key=lambda h: h["created_at"])
    now = datetime.now(timezone.utc)
    raw = []
    for i, h in enumerate(items):
        start = _parse_iso(h["created_at"])
        if not start:
            continue
        if i + 1 < len(items):
            end, ongoing = _parse_iso(items[i + 1]["created_at"]), False
        elif h.get("new") in _TERMINAL_STATUSES:
            end, ongoing = start, False
        else:
            end, ongoing = now, True
        dur = int(max(0, (end - start).total_seconds())) if end else 0
        raw.append({
            "status": h.get("new"), "entered_at": h["created_at"],
            "duration_seconds": dur, "ongoing": ongoing,
            "note": h.get("note"), "user_name": h.get("user_name"),
        })
    # Merge consecutive entries that share the same status.
    stages = []
    for s in raw:
        if stages and stages[-1]["status"] == s["status"]:
            stages[-1]["duration_seconds"] += s["duration_seconds"]
            stages[-1]["ongoing"] = s["ongoing"]
        else:
            stages.append(s)
    total = 0
    if items:
        first = _parse_iso(items[0]["created_at"])
        last = items[-1]
        end = _parse_iso(last["created_at"]) if last.get("new") in _TERMINAL_STATUSES else now
        if first and end:
            total = int(max(0, (end - first).total_seconds()))
    return {"stages": stages, "total_seconds": total}



async def _order_detail(batch):
    bid = batch["id"]
    batch["cases"] = await db.order_cases.find({"batch_id": bid}, {"_id": 0}).to_list(100)
    batch["items"] = await db.order_items.find({"batch_id": bid}, {"_id": 0}).to_list(500)
    batch["files"] = await db.order_files.find({"batch_id": bid, "deleted": {"$ne": True}}, {"_id": 0}).to_list(500)
    batch["history"] = await db.order_status_history.find({"order_id": bid}, {"_id": 0}).sort("created_at", 1).to_list(500)
    batch["activity"] = await db.order_activity_logs.find({"order_id": bid}, {"_id": 0}).sort("created_at", 1).to_list(500)
    batch["invoices"] = await db.invoices.find({"order_id": bid}, {"_id": 0}).to_list(50)
    batch["payments"] = await db.payments.find({"order_id": bid}, {"_id": 0}).sort("created_at", -1).to_list(50)
    batch["whatsapp_logs"] = await db.whatsapp_logs.find({"order_no": batch["batch_no"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    batch["impression"] = await db.impression_shipments.find_one({"batch_id": bid}, {"_id": 0})
    batch["remakes"] = await db.order_batches.find({"parent_id": bid}, {"_id": 0}).to_list(20)
    batch["dispatch"] = await db.dispatch_details.find_one({"batch_id": bid}, {"_id": 0})
    return batch


@router.get("/orders/{bid}")
async def get_order(bid: str, user: dict = Depends(get_current_user)):
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0}) or \
        await db.order_batches.find_one({"batch_no": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    if user["role"] == "designer":
        # Designers only ever see order no + files via the restricted view.
        if batch.get("designer_id") != user["id"]:
            raise HTTPException(403, "This case is not assigned to you")
        return await _designer_view(batch, await _designer_files(batch["id"]))
    if user["role"] == "dentist":
        dent = await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0})
        if not dent or batch["dentist_id"] != dent["id"]:
            raise HTTPException(403, "Forbidden")
    detail = await _order_detail(batch)
    if user["role"] == "dentist":
        detail["activity"] = [a for a in detail["activity"] if a.get("dentist_visible")]
        detail = _mask_detail_for_dentist(detail)
    elif user["role"] in ("admin", "employee"):
        detail["stage_durations"] = _compute_stage_durations(detail["history"])
    return detail


@router.delete("/orders/{bid}")
async def delete_order(bid: str, user: dict = Depends(require_roles("admin"))):
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    # Include any child remake orders so nothing is orphaned.
    children = await db.order_batches.find({"parent_id": bid}, {"id": 1, "_id": 0}).to_list(100)
    ids = [bid] + [c["id"] for c in children]
    # Remove physical files from disk.
    files = await db.order_files.find({"batch_id": {"$in": ids}}, {"stored_name": 1, "_id": 0}).to_list(2000)
    for f in files:
        try:
            (UPLOAD_DIR / f["stored_name"]).unlink(missing_ok=True)
        except Exception:
            pass
    # batch_id-keyed collections
    for coll in ("order_cases", "order_items", "order_files",
                 "dispatch_details", "impression_shipments"):
        await db[coll].delete_many({"batch_id": {"$in": ids}})
    # order_id-keyed collections
    for coll in ("order_activity_logs", "order_status_history",
                 "invoices", "payments", "notifications"):
        await db[coll].delete_many({"order_id": {"$in": ids}})
    await db.order_batches.delete_many({"id": {"$in": ids}})
    return {"ok": True, "deleted": batch.get("batch_no"), "count": len(ids)}



# ---------------- Files ----------------
@router.post("/orders/{bid}/files")
async def upload_file(bid: str, file: UploadFile = File(...), level: str = Form("batch"),
                      case_id: str = Form(None), item_id: str = Form(None),
                      category: str = Form("dentist"), user: dict = Depends(get_current_user)):
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_FILE_EXT:
        raise HTTPException(400, f"File type {ext} not allowed")
    data = await file.read()
    if len(data) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(400, "File too large")
    stored = gen_id() + ext
    (UPLOAD_DIR / stored).write_bytes(data)
    doc = {"id": gen_id(), "batch_id": bid, "case_id": case_id, "item_id": item_id, "level": level,
           "filename": file.filename, "stored_name": stored, "size": len(data), "ext": ext,
           "uploaded_by": user["id"], "uploaded_by_name": user["name"], "uploaded_by_role": user["role"],
           "category": category, "deleted": False, "created_at": now_iso()}
    await db.order_files.insert_one(doc)
    await log_activity(bid, f"{user['role'].title()} uploaded file: {file.filename}", user,
                       dentist_visible=(category in ("dentist", "designer")))
    # Designer submitted a design → flag for admin review + notify all admins
    if user["role"] == "designer" or category == "design":
        await db.order_batches.update_one({"id": bid}, {"$set": {
            "design_submitted": True, "design_submitted_at": now_iso()}})
        admins = await db.users.find({"role": "admin"}, {"id": 1, "_id": 0}).to_list(50)
        for a in admins:
            await create_notification(a["id"], "Design uploaded",
                                      f"{user['name']} uploaded a design for {batch['batch_no']}. Please review.",
                                      order_id=bid, kind="design")
    # clear file issue if dentist re-uploads
    if user["role"] == "dentist" and batch.get("file_issue"):
        await db.order_batches.update_one({"id": bid}, {"$set": {"file_issue": None}})
    doc.pop("_id", None)
    return doc


@router.get("/files/{fid}/download")
async def download_file(fid: str, request: Request, user: dict = Depends(get_current_user)):
    f = await db.order_files.find_one({"id": fid}, {"_id": 0})
    if not f or f.get("deleted"):
        raise HTTPException(404, "File not found")
    if user["role"] == "dentist":
        batch = await db.order_batches.find_one({"id": f["batch_id"]}, {"_id": 0})
        dent = await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0})
        if not batch or not dent or batch["dentist_id"] != dent["id"]:
            raise HTTPException(403, "Forbidden")
    path = UPLOAD_DIR / f["stored_name"]
    if not path.exists():
        raise HTTPException(404, "File missing on disk")
    import mimetypes
    ext = os.path.splitext(f["filename"])[1].lower()
    is_image = ext in (".jpg", ".jpeg", ".png", ".webp", ".gif")
    media_type = mimetypes.guess_type(f["filename"])[0] or "application/octet-stream"
    disposition = "inline" if is_image else "attachment"
    return StreamingResponse(io.BytesIO(path.read_bytes()),
                             media_type=media_type if is_image else "application/octet-stream",
                             headers={"Content-Disposition": f'{disposition}; filename="{f["filename"]}"'})


@router.delete("/files/{fid}")
async def delete_file(fid: str, reason: str = "", user: dict = Depends(require_roles("admin"))):
    f = await db.order_files.find_one({"id": fid}, {"_id": 0})
    if not f:
        raise HTTPException(404, "Not found")
    await db.order_files.update_one({"id": fid}, {"$set": {"deleted": True, "delete_reason": reason}})
    await log_activity(f["batch_id"], f"Admin deleted file {f['filename']} (reason: {reason})", user)
    return {"ok": True}


# ---------------- Status updates ----------------
class StatusIn(BaseModel):
    status: str
    note: Optional[str] = ""
    level: str = "batch"
    ref_id: Optional[str] = None


@router.post("/orders/{bid}/status")
async def update_status(bid: str, body: StatusIn,
                        user: dict = Depends(require_roles("admin", "employee"))):
    if user["role"] == "employee" and "update_status" not in (user.get("permissions") or []):
        raise HTTPException(403, "No permission to update status")
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    from routes.status_routes import active_status_labels
    if body.status not in await active_status_labels():
        raise HTTPException(400, "Invalid status")
    old = batch["status"]
    upd = {"status": body.status, "updated_at": now_iso()}
    if body.status != "Sent to Designer":
        upd["design_submitted"] = False
    # expected delivery on acceptance
    if body.status == "Order Accepted" and not batch.get("expected_delivery"):
        items = await db.order_items.find({"batch_id": bid}, {"_id": 0}).to_list(200)
        tat = 4
        if items:
            tiers = await db.product_tiers.find({"id": {"$in": [i["tier_id"] for i in items]}}, {"_id": 0}).to_list(50)
            tat = max([t.get("tat_days", 4) for t in tiers] or [4])
        if batch["urgency"] in ("Urgent", "Same-day"):
            tat = max(1, tat - 2)
        upd["expected_delivery"] = (datetime.now(timezone.utc) + timedelta(days=tat)).isoformat()
    await db.order_batches.update_one({"id": bid}, {"$set": upd})
    await db.order_items.update_many({"batch_id": bid}, {"$set": {"status": body.status}})
    await db.order_cases.update_many({"batch_id": bid}, {"$set": {"status": body.status}})
    await db.order_status_history.insert_one({
        "id": gen_id(), "order_id": bid, "level": body.level, "ref_id": body.ref_id or bid,
        "old": old, "new": body.status, "note": body.note, "user_name": user["name"], "created_at": now_iso()})
    await log_activity(bid, f"Status changed: {old} -> {body.status}", user, dentist_visible=True,
                       meta={"note": body.note})
    batch["status"] = body.status
    ev = EVENT_FOR_STATUS.get(body.status)
    if ev:
        cases = await db.order_cases.find({"batch_id": bid}, {"_id": 0}).to_list(50)
        pname = ", ".join(c["patient_name"] for c in cases[:2])
        await notify(batch, ev, f5(f"Update for your order.", f"Order No: {batch['batch_no']}",
                                   f"Patient: {pname}", f"Current Status: {body.status}",
                                   "Track your order from the dashboard."),
                     title="Order update", body=f"{batch['batch_no']}: {body.status}")
    return {"ok": True, "status": body.status, "expected_delivery": upd.get("expected_delivery")}


# ---------------- Accept (per-tooth verify) ----------------
@router.post("/orders/{bid}/accept")
async def accept_order(bid: str, body: dict = Body(default={}),
                       user: dict = Depends(require_roles("admin"))):
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    # apply corrections: [{item_id, teeth:[{tooth,shade}]}]
    for corr in body.get("corrections", []):
        await db.order_items.update_one({"id": corr["item_id"]}, {"$set": {"teeth": corr["teeth"]}})
        await log_activity(bid, f"Tooth/shade corrected on item by admin", user, dentist_visible=True,
                           meta={"item_id": corr["item_id"], "teeth": corr["teeth"]})
    return await update_status(bid, StatusIn(status="Order Accepted", note=body.get("note", "")), user)


# ---------------- File issue ----------------
@router.post("/orders/{bid}/file-issue")
async def file_issue(bid: str, body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    reason = body.get("reason", "Other")
    await db.order_batches.update_one({"id": bid}, {"$set": {"file_issue": {"reason": reason, "note": body.get("note", ""), "at": now_iso()}}})
    await log_activity(bid, f"File issue raised: {reason}", user, dentist_visible=True, meta=body)
    await notify(batch, "file_issue",
                 f5("We need updated files for your order.", f"Order No: {batch['batch_no']}",
                    f"Issue: {reason}", "Please upload the correct scan/design file from your dashboard.",
                    "Once uploaded, we will continue processing your order."),
                 title="File issue", body=f"{batch['batch_no']}: {reason}")
    return {"ok": True}


# ---------------- Assign designer ----------------
@router.post("/orders/{bid}/assign-designer")
async def assign_designer(bid: str, body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    designer = await db.users.find_one({"id": body["designer_id"], "role": "designer"}, {"_id": 0})
    if not designer:
        raise HTTPException(400, "Designer not found")
    await db.order_batches.update_one({"id": bid}, {"$set": {"designer_id": designer["id"], "designer_name": designer["name"], "design_submitted": False}})
    await log_activity(bid, f"Assigned to designer {designer['name']}", user, dentist_visible=False)
    await create_notification(designer["id"], "New assignment", f"Order assigned to you", order_id=bid, kind="assignment")
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0})
    # Notify the designer on WhatsApp (uses their team mobile number).
    cases = await db.order_cases.find({"batch_id": bid}, {"_id": 0}).to_list(50)
    case_count = len(cases)
    designer_phone = designer.get("whatsapp") or designer.get("mobile") or ""
    await send_whatsapp(
        event="design_assigned", to_phone=designer_phone,
        dentist_name=designer["name"], order_no=batch["batch_no"], patient_name="",
        fields=f5("A new design has been assigned to you.",
                  f"Order No: {batch['batch_no']}",
                  f"Cases: {case_count}",
                  "Please download the scan files and start the design.",
                  "Upload the finished design from your dashboard."),
        deep_link_suffix=bid,
    )
    await update_status(bid, StatusIn(status="Sent to Designer", note=f"Assigned to {designer['name']}"), user)
    return {"ok": True}


# ---------------- Impression flow ----------------
@router.post("/orders/{bid}/impression/receive")
async def impression_receive(bid: str, body: dict = Body(...), user: dict = Depends(require_roles("admin", "employee"))):
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    condition = body.get("condition", "OK")
    await db.impression_shipments.update_one({"batch_id": bid},
        {"$set": {"status": "Impression Received", "condition": condition, "received_at": now_iso()}})
    if condition in ("Damaged", "Incomplete"):
        await db.order_batches.update_one({"id": bid}, {"$set": {"status": "On Hold"}})
        await record_status_change(bid, batch["status"], "On Hold", f"Impression {condition}", user["name"])
        await log_activity(bid, f"Impression received - {condition}, On Hold", user, dentist_visible=True)
        await notify(batch, "impression_damaged",
                     f5("There is an issue with your received impression.", f"Order No: {batch['batch_no']}",
                        f"Condition: {condition}", "Your order is On Hold.",
                        "Please contact the lab or re-send the impression."),
                     title="Impression issue", body=f"{batch['batch_no']}: {condition}")
        return {"ok": True, "on_hold": True}
    await update_status(bid, StatusIn(status="Impression Received", note="Parcel received OK"), user)
    await notify(batch, "impression_received",
                 f5("Your impression has been received at the lab.", f"Order No: {batch['batch_no']}",
                    "Condition: OK", "We will now scan the impression.", "Production will begin shortly."),
                 title="Impression received", body=f"{batch['batch_no']}: received")
    return {"ok": True}


@router.post("/orders/{bid}/impression/scanned")
async def impression_scanned(bid: str, user: dict = Depends(require_roles("admin", "employee"))):
    await db.impression_shipments.update_one({"batch_id": bid}, {"$set": {"status": "In-House Scanning"}})
    await update_status(bid, StatusIn(status="In-House Scanning", note="Lab scanned impression"), user)
    return {"ok": True}


@router.post("/orders/{bid}/impression/ship")
async def impression_ship(bid: str, body: dict = Body(...), user: dict = Depends(require_roles("dentist"))):
    """Dentist submits the courier + tracking ID for the impression they are sending to the lab."""
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    dent = await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0})
    if not dent or batch["dentist_id"] != dent["id"]:
        raise HTTPException(403, "Forbidden")
    if not batch.get("is_impression"):
        raise HTTPException(400, "This order does not require a physical impression")
    tracking = (body.get("tracking_no") or "").strip()
    if not tracking:
        raise HTTPException(400, "Tracking ID is required")
    courier = (body.get("courier_name") or "").strip()
    if not courier:
        raise HTTPException(400, "Courier / service name is required")
    await db.impression_shipments.update_one({"batch_id": bid}, {"$set": {
        "courier_name": courier, "tracking_no": tracking,
        "shipped_at": now_iso(), "shipped_by_dentist": True}}, upsert=True)
    await log_activity(bid, f"Dentist shipped impression — {courier} #{tracking}".strip(),
                       user, dentist_visible=True)
    admins = await db.users.find({"role": "admin"}, {"id": 1, "_id": 0}).to_list(50)
    for a in admins:
        await create_notification(a["id"], "Impression shipped",
                                  f"{dent['name']} shipped impression for {batch['batch_no']} — "
                                  f"{courier + ' ' if courier else ''}#{tracking}",
                                  order_id=bid, kind="impression")
    return {"ok": True, "tracking_no": tracking, "courier_name": courier}



# ---------------- Cancel / Hold ----------------
@router.post("/orders/{bid}/cancel")
async def cancel_order(bid: str, body: dict = Body(default={}), user: dict = Depends(get_current_user)):
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    if user["role"] == "dentist":
        dent = await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0})
        if batch["dentist_id"] != dent["id"]:
            raise HTTPException(403, "Forbidden")
        if batch["status"] not in ("Order Received",):
            raise HTTPException(400, "Order can only be cancelled while in 'Order Received'")
    await db.order_batches.update_one({"id": bid}, {"$set": {"status": "Cancelled"}})
    await record_status_change(bid, batch["status"], "Cancelled", body.get("reason", ""), user["name"])
    await log_activity(bid, f"Order cancelled. Reason: {body.get('reason','')}", user, dentist_visible=True)
    return {"ok": True}


@router.post("/orders/{bid}/hold")
async def hold_order(bid: str, body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    await db.order_batches.update_one({"id": bid}, {"$set": {"status": "On Hold"}})
    await record_status_change(bid, batch["status"], "On Hold", body.get("reason", ""), user["name"])
    await log_activity(bid, f"Order put On Hold. Reason: {body.get('reason','')}", user, dentist_visible=True)
    return {"ok": True}


@router.put("/orders/{bid}/notes")
async def add_note(bid: str, body: dict = Body(...), user: dict = Depends(require_roles("admin", "employee", "designer"))):
    dv = body.get("dentist_visible", False)
    await log_activity(bid, body.get("note", ""), user, dentist_visible=dv, meta={"type": "note"})
    return {"ok": True}


# ---------------- Remake ----------------
@router.post("/orders/{bid}/remake")
async def raise_remake(bid: str, body: dict = Body(...), user: dict = Depends(get_current_user)):
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    doc = {"id": gen_id(), "batch_id": bid, "batch_no": batch["batch_no"], "reason": body.get("reason"),
           "scope": body.get("scope", "batch"), "ref_id": body.get("ref_id"), "notes": body.get("notes", ""),
           "status": "Requested", "new_file_required": None, "created_at": now_iso(),
           "raised_by": user["name"]}
    await db.remake_requests.insert_one(doc)
    await log_activity(bid, f"Remake requested: {body.get('reason')}", user, dentist_visible=True)
    admins = await db.users.find({"role": "admin"}, {"_id": 0}).to_list(20)
    for a in admins:
        await create_notification(a["id"], "Remake requested", f"{batch['batch_no']}: {body.get('reason')}", order_id=bid, kind="remake")
    await notify(batch, "remake_received",
                 f5("We have received your remake request.", f"Order No: {batch['batch_no']}",
                    f"Reason: {body.get('reason')}", "Our team will review and update you.",
                    "Thank you for your patience."),
                 title="Remake received", body=f"{batch['batch_no']}: remake request received")
    doc.pop("_id", None)
    return doc


@router.post("/remakes/{rid}/process")
async def process_remake(rid: str, body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    remake = await db.remake_requests.find_one({"id": rid}, {"_id": 0})
    if not remake:
        raise HTTPException(404, "Not found")
    parent = await db.order_batches.find_one({"id": remake["batch_id"]}, {"_id": 0})
    new_file_required = body.get("new_file_required", True)
    # remake index
    existing = await db.order_batches.count_documents({"parent_id": parent["id"]})
    r_no = f"{parent['batch_no']}-R{existing + 1}"
    rid_batch = gen_id()
    start_status = "Order Received" if new_file_required else body.get("start_status", "Order Accepted")
    new_batch = dict(parent)
    new_batch.pop("_id", None)
    new_batch.update({
        "id": rid_batch, "batch_no": r_no, "status": start_status, "is_remake": True,
        "parent_id": parent["id"], "remake_index": existing + 1,
        "amounts": {"total": 0, "paid": 0, "pending": 0, "status": "Free Remake"},
        "pricing": {**parent.get("pricing", {}), "total": 0, "total_discount": 0},
        "file_issue": None, "client_token": None, "created_at": now_iso(), "updated_at": now_iso(),
    })
    await db.order_batches.insert_one(new_batch)
    # copy cases/items
    cases = await db.order_cases.find({"batch_id": parent["id"]}, {"_id": 0}).to_list(100)
    for c in cases:
        nc = dict(c); nc["id"] = gen_id(); nc["batch_id"] = rid_batch; nc["status"] = start_status
        await db.order_cases.insert_one(nc)
    items = await db.order_items.find({"batch_id": parent["id"]}, {"_id": 0}).to_list(500)
    for it in items:
        ni = dict(it); ni["id"] = gen_id(); ni["batch_id"] = rid_batch; ni["status"] = start_status
        await db.order_items.insert_one(ni)
    if not new_file_required:
        files = await db.order_files.find({"batch_id": parent["id"], "deleted": {"$ne": True}}, {"_id": 0}).to_list(200)
        for fdoc in files:
            nf = dict(fdoc); nf["id"] = gen_id(); nf["batch_id"] = rid_batch
            await db.order_files.insert_one(nf)
    await db.remake_requests.update_one({"id": rid}, {"$set": {"status": "Processed", "new_file_required": new_file_required, "remake_batch_id": rid_batch, "remake_no": r_no}})
    await db.order_status_history.insert_one({
        "id": gen_id(), "order_id": rid_batch, "level": "batch", "ref_id": rid_batch,
        "old": None, "new": start_status, "note": "Remake created", "user_name": user["name"], "created_at": now_iso()})
    await log_activity(rid_batch, f"Remake order {r_no} created from {parent['batch_no']}", user, dentist_visible=True)
    await notify(new_batch, "remake_created",
                 f5("A remake order has been created.", f"Order No: {r_no}",
                    f"Parent Order: {parent['batch_no']}",
                    ("Please upload a new scan file." if new_file_required else "Existing files will be reused."),
                    "We will keep you updated."),
                 title="Remake created", body=f"{r_no} created")
    return {"ok": True, "remake_no": r_no, "remake_batch_id": rid_batch}


# ---------------- Dispatch ----------------
@router.post("/orders/{bid}/dispatch")
async def dispatch(bid: str, body: dict = Body(...), user: dict = Depends(require_roles("admin", "employee"))):
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    doc = {"id": gen_id(), "batch_id": bid, "courier_name": body.get("courier_name", ""),
           "tracking_no": body.get("tracking_no", ""), "dispatch_date": body.get("dispatch_date", now_iso()),
           "expected_delivery": body.get("expected_delivery", ""), "notes": body.get("notes", ""),
           "packed_by": user["name"], "packed_at": now_iso(), "created_at": now_iso()}
    await db.dispatch_details.update_one({"batch_id": bid}, {"$set": doc}, upsert=True)
    await update_status(bid, StatusIn(status="Dispatched", note=f"Courier {body.get('courier_name','')} #{body.get('tracking_no','')}"), user)
    return {"ok": True}


@router.get("/orders/{bid}/dispatch-label")
async def dispatch_label(bid: str, size: str = "4x4", user: dict = Depends(require_roles("admin", "employee"))):
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    cases = await db.order_cases.find({"batch_id": bid}, {"_id": 0}).to_list(50)
    items = await db.order_items.find({"batch_id": bid}, {"_id": 0}).to_list(200)
    dent = await _dentist_of(batch)
    disp = await db.dispatch_details.find_one({"batch_id": bid}, {"_id": 0}) or {}
    teeth = ", ".join(str(t["tooth"]) for it in items for t in it.get("teeth", []))
    public = os.environ.get("APP_PUBLIC_URL", "")
    lab = (await get_setting("lab", {})) or {}
    d = dent or {}
    recv_addr = d.get("delivery_address") or d.get("clinic_address") or d.get("billing_address") or batch.get("delivery_address") or ""
    city_line = ", ".join([x for x in [d.get("city", ""), d.get("state", ""), d.get("pincode", "")] if x])
    label = {
        "order_no": batch["batch_no"],
        "patient_names": ", ".join(c["patient_name"] for c in cases),
        "teeth": teeth,
        "sender": {
            "name": lab.get("name", "Shree Dental Lab"),
            "address": lab.get("address", ""),
            "state": lab.get("state", ""),
            "phone": lab.get("phone", ""),
        },
        "receiver": {
            "name": batch["dentist_name"],
            "clinic": batch.get("clinic_name", ""),
            "address": recv_addr,
            "city_line": city_line,
            "phone": d.get("mobile", ""),
        },
        "courier_name": disp.get("courier_name", ""), "tracking_no": disp.get("tracking_no", ""),
        "packed_by": disp.get("packed_by", user["name"]),
        "track_url": f"{public}/orders/{batch['batch_no']}",
    }
    pdf = dispatch_label_pdf(label, size=size)
    await log_activity(bid, "Dispatch label printed", user)
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="label_{batch["batch_no"]}.pdf"'})


# ---------------- Invoice ----------------
@router.post("/orders/{bid}/invoice")
async def generate_invoice(bid: str, body: dict = Body(default={}), user: dict = Depends(require_roles("admin"))):
    batch = await db.order_batches.find_one({"id": bid}, {"_id": 0})
    if not batch:
        raise HTTPException(404, "Order not found")
    existing = await db.invoices.find_one({"order_id": bid}, {"_id": 0})
    fy = _fy()
    seq = await db.invoices.count_documents({}) + 1
    inv_no = existing["invoice_no"] if existing else f"SDL/INV/{fy}/{seq:04d}"
    pricing = batch.get("pricing", {})
    inv = {
        "id": existing["id"] if existing else gen_id(), "invoice_no": inv_no, "order_id": bid,
        "order_no": batch["batch_no"], "dentist_id": batch["dentist_id"],
        "line_items": pricing.get("line_items", []), "subtotal": pricing.get("subtotal", 0),
        "total_discount": pricing.get("total_discount", 0), "manual_discount": batch["amounts"].get("manual_discount", 0),
        "gst_enabled": pricing.get("gst_enabled", True), "cgst": pricing.get("cgst", 0),
        "sgst": pricing.get("sgst", 0), "igst": pricing.get("igst", 0), "gst_total": pricing.get("gst_total", 0),
        "total": batch["amounts"]["total"], "paid": batch["amounts"]["paid"],
        "pending": batch["amounts"]["pending"], "created_at": now_iso(),
    }
    await db.invoices.update_one({"order_id": bid}, {"$set": inv}, upsert=True)
    await log_activity(bid, f"Invoice generated {inv_no}", user, dentist_visible=True)
    return inv


def _fy():
    now = datetime.now(timezone.utc)
    y = now.year
    if now.month >= 4:
        return f"{y}-{str(y+1)[2:]}"
    return f"{y-1}-{str(y)[2:]}"


@router.get("/invoices/{iid}/pdf")
async def invoice_pdf_route(iid: str, user: dict = Depends(get_current_user)):
    inv = await db.invoices.find_one({"id": iid}, {"_id": 0}) or await db.invoices.find_one({"order_id": iid}, {"_id": 0})
    if not inv:
        raise HTTPException(404, "Invoice not found")
    dent = await db.dentists.find_one({"id": inv["dentist_id"]}, {"_id": 0})
    if user["role"] == "dentist":
        mydent = await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0})
        if not mydent or mydent["id"] != inv["dentist_id"]:
            raise HTTPException(403, "Forbidden")
    lab = await get_setting("lab", {})
    pdf = invoice_pdf(inv, lab, dent or {})
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="{inv["invoice_no"].replace("/", "_")}.pdf"'})


@router.get("/invoices")
async def list_invoices(user: dict = Depends(get_current_user)):
    if user["role"] == "dentist":
        dent = await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0})
        return await db.invoices.find({"dentist_id": dent["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


# ---------------- Payments ----------------
# Payment is collected upfront via Razorpay at order placement (see /orders/checkout
# and the verification inside create_order). No pending/partial/manual payment flow.
