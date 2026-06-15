from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from deps import (db, gen_id, now_iso, hash_password, get_current_user,
                  require_roles, create_notification)

router = APIRouter(tags=["people"])

REQUIRED_BILLING = ["name", "clinic_name", "mobile", "whatsapp", "email",
                    "billing_address", "city", "state", "pincode"]


# ---------- Dentist profile ----------
@router.get("/profile")
async def get_profile(user: dict = Depends(require_roles("dentist"))):
    return await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0})


@router.put("/profile")
async def update_profile(body: dict = Body(...), user: dict = Depends(require_roles("dentist"))):
    body.pop("id", None)
    body.pop("user_id", None)
    body.pop("status", None)
    complete = all(str(body.get(f, "")).strip() for f in REQUIRED_BILLING)
    body["billing_complete"] = complete
    await db.dentists.update_one({"user_id": user["id"]}, {"$set": body})
    return await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0})


# ---------- Patients ----------
class PatientIn(BaseModel):
    name: str
    age: Optional[int] = None
    gender: Optional[str] = ""
    phone: Optional[str] = ""
    patient_code: Optional[str] = ""
    notes: Optional[str] = ""
    force: bool = False


async def _my_dentist(user):
    return await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0})


@router.get("/patients")
async def list_patients(user: dict = Depends(require_roles("dentist"))):
    dent = await _my_dentist(user)
    return await db.patients.find({"dentist_id": dent["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("/patients")
async def create_patient(body: PatientIn, user: dict = Depends(require_roles("dentist"))):
    dent = await _my_dentist(user)
    dup = await db.patients.find_one({"dentist_id": dent["id"], "name": body.name, "age": body.age})
    if dup and not body.force:
        return {"duplicate": True, "existing_id": dup["id"],
                "message": f"A patient named {body.name} (age {body.age}) already exists."}
    doc = {"id": gen_id(), "dentist_id": dent["id"], "name": body.name, "age": body.age,
           "gender": body.gender, "phone": body.phone, "patient_code": body.patient_code,
           "notes": body.notes, "created_at": now_iso()}
    await db.patients.insert_one(doc)
    doc.pop("_id", None)
    return {"duplicate": False, "patient": doc}


@router.get("/patients/{pid}/history")
async def patient_history(pid: str, user: dict = Depends(require_roles("dentist"))):
    cases = await db.order_cases.find({"patient_id": pid}, {"_id": 0}).to_list(500)
    batch_ids = list({c["batch_id"] for c in cases})
    batches = await db.order_batches.find({"id": {"$in": batch_ids}}, {"_id": 0}).to_list(500)
    return {"patient": await db.patients.find_one({"id": pid}, {"_id": 0}), "orders": batches}


# ---------- Admin: dentists ----------
@router.get("/dentists")
async def list_dentists(status: Optional[str] = None, user: dict = Depends(require_roles("admin"))):
    q = {"status": status} if status else {}
    return await db.dentists.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.get("/dentists/{did}")
async def dentist_detail(did: str, user: dict = Depends(require_roles("admin"))):
    dent = await db.dentists.find_one({"id": did}, {"_id": 0})
    if not dent:
        raise HTTPException(404, "Not found")
    dent["patients"] = await db.patients.find({"dentist_id": did}, {"_id": 0}).to_list(500)
    dent["orders"] = await db.order_batches.find({"dentist_id": did}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return dent


@router.post("/dentists/{did}/status")
async def set_dentist_status(did: str, body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    status = body.get("status")
    await db.dentists.update_one({"id": did}, {"$set": {"status": status}})
    dent = await db.dentists.find_one({"id": did}, {"_id": 0})
    if dent:
        await db.users.update_one({"id": dent["user_id"]},
                                  {"$set": {"active": status != "deactivated"}})
        await create_notification(dent["user_id"], "Account update",
                                  f"Your account has been {status}.", kind="account")
    return {"ok": True}


@router.delete("/dentists/{did}")
async def delete_dentist(did: str, user: dict = Depends(require_roles("admin"))):
    dent = await db.dentists.find_one({"id": did}, {"_id": 0})
    if not dent:
        raise HTTPException(404, "Dentist not found")
    user_id = dent.get("user_id")
    batches = await db.order_batches.find({"dentist_id": did}, {"id": 1, "_id": 0}).to_list(5000)
    batch_ids = [b["id"] for b in batches]

    if batch_ids:
        await db.order_cases.delete_many({"batch_id": {"$in": batch_ids}})
        await db.order_items.delete_many({"batch_id": {"$in": batch_ids}})
        await db.order_files.delete_many({"batch_id": {"$in": batch_ids}})
        await db.order_activity_logs.delete_many({"batch_id": {"$in": batch_ids}})
        await db.order_status_history.delete_many({"batch_id": {"$in": batch_ids}})
        await db.payments.delete_many({"batch_id": {"$in": batch_ids}})
        await db.remake_requests.delete_many({"batch_id": {"$in": batch_ids}})
        await db.dispatch_details.delete_many({"batch_id": {"$in": batch_ids}})
        await db.impression_shipments.delete_many({"batch_id": {"$in": batch_ids}})

    await db.order_batches.delete_many({"dentist_id": did})
    await db.invoices.delete_many({"dentist_id": did})
    await db.patients.delete_many({"dentist_id": did})
    await db.dentist_product_pricing.delete_many({"dentist_id": did})
    await db.pickup_requests.delete_many({"dentist_id": did})
    await db.dentists.delete_one({"id": did})
    if user_id:
        await db.users.delete_one({"id": user_id})
        await db.notifications.delete_many({"user_id": user_id})
    return {"ok": True, "deleted": dent.get("name")}


# ---------- Admin: users (employee/designer/admin) ----------
@router.get("/users")
async def list_users(role: Optional[str] = None, user: dict = Depends(require_roles("admin"))):
    q = {"role": {"$in": ["admin", "employee", "designer"]}}
    if role:
        q["role"] = role
    users = await db.users.find(q, {"_id": 0, "password_hash": 0}).to_list(500)
    return users


@router.post("/users")
async def create_user(body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    email = body["email"].lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already exists")
    doc = {"id": gen_id(), "email": email, "password_hash": hash_password(body["password"]),
           "name": body["name"], "role": body["role"], "mobile": body.get("mobile", ""),
           "permissions": body.get("permissions", []), "active": True,
           "must_change_password": False, "created_at": now_iso()}
    await db.users.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


@router.put("/users/{uid}")
async def update_user(uid: str, body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    upd = {k: v for k, v in body.items() if k in ("name", "mobile", "permissions", "active", "role")}
    if body.get("password"):
        upd["password_hash"] = hash_password(body["password"])
    await db.users.update_one({"id": uid}, {"$set": upd})
    return {"ok": True}


@router.delete("/users/{uid}")
async def delete_user(uid: str, user: dict = Depends(require_roles("admin"))):
    if uid == user["id"]:
        raise HTTPException(400, "You cannot delete your own account.")
    target = await db.users.find_one({"id": uid}, {"_id": 0})
    if not target:
        raise HTTPException(404, "Team member not found")
    if target.get("role") not in ("admin", "employee", "designer"):
        raise HTTPException(400, "Only team members can be deleted here.")
    if target.get("role") == "admin":
        admin_count = await db.users.count_documents({"role": "admin"})
        if admin_count <= 1:
            raise HTTPException(400, "Cannot delete the last admin account.")
    await db.users.delete_one({"id": uid})
    await db.notifications.delete_many({"user_id": uid})
    return {"ok": True, "deleted": target.get("name")}


# ---------- Notifications ----------
@router.get("/notifications")
async def my_notifications(user: dict = Depends(get_current_user)):
    return await db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)


@router.post("/notifications/{nid}/read")
async def mark_read(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


@router.post("/notifications/read-all")
async def read_all(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# ---------- Dashboards ----------
@router.get("/dentist/dashboard")
async def dentist_dashboard(user: dict = Depends(require_roles("dentist"))):
    dent = await _my_dentist(user)
    batches = await db.order_batches.find({"dentist_id": dent["id"]}, {"_id": 0}).to_list(2000)
    def cnt(*statuses):
        return sum(1 for b in batches if b["status"] in statuses)
    pending_payment = sum(b["amounts"]["pending"] for b in batches if b["amounts"]["pending"] > 0)
    from constants import dentist_facing_status, DENTIST_WIP_LABEL
    in_progress = sum(1 for b in batches if dentist_facing_status(b["status"]) == DENTIST_WIP_LABEL)
    recent = [{**b, "status": dentist_facing_status(b["status"])}
              for b in sorted(batches, key=lambda b: b["created_at"], reverse=True)[:5]]
    invoices = await db.invoices.find({"dentist_id": dent["id"]}, {"_id": 0}).sort("created_at", -1).to_list(5)
    return {
        "total": len(batches),
        "pending": cnt("Order Received", "Impression Awaited"),
        "accepted": cnt("Order Accepted"),
        "in_progress": in_progress,
        "in_manufacturing": cnt("Sent to Designer", "Design Received", "Cutting Started",
                                "Sintering Started", "Glazing Started"),
        "ready": cnt("QC Done / Ready for Packaging", "Packed / Dispatch Label Printed"),
        "dispatched": cnt("Dispatched"),
        "delivered": cnt("Delivered"),
        "remake": sum(1 for b in batches if b.get("is_remake")),
        "pending_payment": round(pending_payment, 2),
        "lifetime_savings": dent.get("lifetime_savings", 0),
        "recent_orders": recent,
        "recent_invoices": invoices,
    }


@router.get("/admin/dashboard")
async def admin_dashboard(user: dict = Depends(require_roles("admin", "employee", "designer"))):
    batches = await db.order_batches.find({}, {"_id": 0}).to_list(5000)
    today = datetime.now(timezone.utc).date().isoformat()
    def cnt(*statuses):
        return sum(1 for b in batches if b["status"] in statuses)
    overdue = 0
    now = datetime.now(timezone.utc)
    for b in batches:
        ed = b.get("expected_delivery")
        if ed and b["status"] not in ("Delivered", "Cancelled"):
            try:
                if datetime.fromisoformat(ed) < now:
                    overdue += 1
            except Exception:
                pass
    wa_failed = await db.whatsapp_logs.count_documents({"status": "Failed"})
    rp_failed = await db.payments.count_documents({"status": "Failed"})
    pickup = await db.pickup_requests.count_documents({"status": {"$ne": "Picked Up"}})
    designers = await db.users.find({"role": "designer"}, {"_id": 0, "password_hash": 0}).to_list(50)
    designer_pending = []
    for d in designers:
        c = sum(1 for b in batches if b.get("designer_id") == d["id"] and b["status"] in ("Sent to Designer",))
        designer_pending.append({"name": d["name"], "pending": c})
    stages = {}
    for b in batches:
        stages[b["status"]] = stages.get(b["status"], 0) + 1
    return {
        "today": sum(1 for b in batches if str(b.get("created_at", "")).startswith(today)),
        "pending_acceptance": cnt("Order Received"),
        "impressions_awaited": cnt("Impression Awaited"),
        "pickup_requests": pickup,
        "file_issues": sum(1 for b in batches if b.get("file_issue")),
        "ready_dispatch": cnt("QC Done / Ready for Packaging", "Packed / Dispatch Label Printed"),
        "dispatched": cnt("Dispatched"),
        "delivered": cnt("Delivered"),
        "remakes": sum(1 for b in batches if b.get("is_remake")),
        "overdue": overdue,
        "pending_payments": round(sum(b["amounts"]["pending"] for b in batches), 2),
        "whatsapp_failed": wa_failed,
        "razorpay_failed": rp_failed,
        "stages": stages,
        "designer_pending": designer_pending,
        "total_orders": len(batches),
    }


# ---------- Reports ----------
def _in_range(created_at, from_date, to_date):
    if not created_at:
        return False
    day = str(created_at)[:10]
    if from_date and day < from_date:
        return False
    if to_date and day > to_date:
        return False
    return True


@router.get("/reports/summary")
async def reports_summary(from_date: Optional[str] = None, to_date: Optional[str] = None,
                          user: dict = Depends(require_roles("admin"))):
    all_batches = await db.order_batches.find({}, {"_id": 0}).to_list(5000)
    batches = [b for b in all_batches if _in_range(b.get("created_at"), from_date, to_date)]
    by_status, by_dentist = {}, {}
    total_discount = 0
    for b in batches:
        by_status[b["status"]] = by_status.get(b["status"], 0) + 1
        by_dentist[b["dentist_name"]] = by_dentist.get(b["dentist_name"], 0) + 1
        total_discount += b.get("pricing", {}).get("total_discount", 0)
    all_invoices = await db.invoices.find({}, {"_id": 0}).to_list(5000)
    invoices = [i for i in all_invoices if _in_range(i.get("created_at"), from_date, to_date)]
    paid = sum(i.get("paid", 0) for i in invoices)
    pending = sum(i.get("pending", 0) for i in invoices)
    revenue = sum(b.get("amounts", {}).get("total", 0) for b in batches)
    return {
        "by_status": by_status, "by_dentist": by_dentist,
        "total_offer_discount": round(total_discount, 2),
        "invoice_paid": round(paid, 2), "invoice_pending": round(pending, 2),
        "total_revenue": round(revenue, 2),
        "total_orders": len(batches), "total_invoices": len(invoices),
        "from_date": from_date, "to_date": to_date,
    }


@router.get("/reports/export")
async def reports_export(from_date: Optional[str] = None, to_date: Optional[str] = None,
                         user: dict = Depends(require_roles("admin"))):
    import csv as _csv
    import io
    from fastapi.responses import StreamingResponse

    all_batches = await db.order_batches.find({}, {"_id": 0}).sort("created_at", 1).to_list(5000)
    batches = [b for b in all_batches if _in_range(b.get("created_at"), from_date, to_date)]

    buf = io.StringIO()
    w = _csv.writer(buf)
    w.writerow(["Order No", "Date", "Dentist", "Clinic", "Status", "Units",
                "Subtotal", "Discount", "GST", "Total", "Paid", "Pending", "Payment Status"])
    for b in batches:
        pr = b.get("pricing", {}) or {}
        am = b.get("amounts", {}) or {}
        units = sum(li.get("units", 0) for li in pr.get("line_items", []))
        w.writerow([
            b.get("batch_no", ""), str(b.get("created_at", ""))[:10],
            b.get("dentist_name", ""), b.get("clinic_name", ""), b.get("status", ""),
            units, pr.get("subtotal", 0), pr.get("total_discount", 0),
            pr.get("gst_total", 0), am.get("total", 0), am.get("paid", 0),
            am.get("pending", 0), am.get("status", ""),
        ])

    buf.seek(0)
    label = f"{from_date or 'all'}_to_{to_date or 'all'}"
    headers = {"Content-Disposition": f'attachment; filename="report_{label}.csv"'}
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv", headers=headers)
