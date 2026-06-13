"""Status Master — manage the global order workflow statuses.

Core statuses are referenced by automation (dashboards, flow transitions, WhatsApp)
so their LABEL is locked (cannot rename/delete); admins can still recolour, reorder
and toggle board visibility. Custom statuses are fully editable.
"""
import re
from fastapi import APIRouter, Depends, HTTPException, Body
from deps import db, gen_id, require_roles

router = APIRouter(tags=["statuses"])

ALLOWED_COLORS = ["red", "amber", "blue", "indigo", "purple", "gold", "teal", "green", "orange", "gray"]

# key, label, color, core, show_on_board
STATUS_SEED = [
    ("impression_awaited", "Impression Awaited", "amber", True, True),
    ("impression_received", "Impression Received", "amber", True, True),
    ("inhouse_scanning", "In-House Scanning", "amber", True, True),
    ("order_received", "Order Received", "red", True, True),
    ("order_accepted", "Order Accepted", "blue", True, True),
    ("sent_to_designer", "Sent to Designer", "indigo", True, True),
    ("design_received", "Design Received", "indigo", False, True),
    ("cutting", "Cutting Started", "purple", False, True),
    ("sintering", "Sintering Started", "purple", False, True),
    ("glazing", "Glazing Started", "purple", False, True),
    ("ready_packaging", "QC Done / Ready for Packaging", "gold", True, True),
    ("packed", "Packed / Dispatch Label Printed", "gold", True, True),
    ("dispatched", "Dispatched", "teal", True, True),
    ("delivered", "Delivered", "green", True, False),
    ("trial_ready", "Trial Ready", "amber", False, False),
    ("trial_dispatched", "Trial Dispatched", "amber", False, False),
    ("trial_approved", "Trial Approved", "amber", False, False),
    ("on_hold", "On Hold", "orange", True, True),
    ("cancelled", "Cancelled", "gray", True, False),
]


async def ensure_statuses():
    if await db.order_statuses.count_documents({}) > 0:
        return
    docs = []
    for i, (key, label, color, core, board) in enumerate(STATUS_SEED):
        docs.append({"id": gen_id(), "key": key, "label": label, "color": color,
                     "core": core, "show_on_board": board, "active": True, "order": i})
    await db.order_statuses.insert_many(docs)


async def list_statuses_raw():
    await ensure_statuses()
    return await db.order_statuses.find({}, {"_id": 0}).sort("order", 1).to_list(200)


async def active_status_labels():
    rows = await list_statuses_raw()
    return [r["label"] for r in rows if r.get("active", True)]


@router.get("/statuses")
async def get_statuses(user: dict = Depends(require_roles("admin", "employee", "designer", "dentist"))):
    return await list_statuses_raw()


@router.post("/statuses")
async def add_status(body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    label = (body.get("label") or "").strip()
    if not label:
        raise HTTPException(400, "Status name is required.")
    existing = await db.order_statuses.find_one({"label": label})
    if existing:
        raise HTTPException(400, "A status with this name already exists.")
    color = body.get("color", "gray")
    if color not in ALLOWED_COLORS:
        color = "gray"
    key = "custom_" + re.sub(r"[^a-z0-9]+", "_", label.lower()).strip("_")
    last = await db.order_statuses.find({}, {"order": 1, "_id": 0}).sort("order", -1).to_list(1)
    order = (last[0]["order"] + 1) if last else 0
    doc = {"id": gen_id(), "key": key, "label": label, "color": color,
           "core": False, "show_on_board": bool(body.get("show_on_board", True)),
           "active": True, "order": order}
    await db.order_statuses.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/statuses/{sid}")
async def update_status_master(sid: str, body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    st = await db.order_statuses.find_one({"id": sid}, {"_id": 0})
    if not st:
        raise HTTPException(404, "Status not found.")
    upd = {}
    if "color" in body and body["color"] in ALLOWED_COLORS:
        upd["color"] = body["color"]
    if "show_on_board" in body:
        upd["show_on_board"] = bool(body["show_on_board"])
    if "active" in body:
        if st["core"] and not body["active"]:
            raise HTTPException(400, "Core statuses cannot be deactivated.")
        upd["active"] = bool(body["active"])
    # label rename (custom only) — migrate existing orders
    new_label = (body.get("label") or "").strip()
    if new_label and new_label != st["label"]:
        if st["core"]:
            raise HTTPException(400, "Core statuses cannot be renamed.")
        dup = await db.order_statuses.find_one({"label": new_label, "id": {"$ne": sid}})
        if dup:
            raise HTTPException(400, "A status with this name already exists.")
        old_label = st["label"]
        upd["label"] = new_label
        for coll in (db.order_batches, db.order_cases, db.order_items):
            await coll.update_many({"status": old_label}, {"$set": {"status": new_label}})
    if upd:
        await db.order_statuses.update_one({"id": sid}, {"$set": upd})
    return await db.order_statuses.find_one({"id": sid}, {"_id": 0})


@router.delete("/statuses/{sid}")
async def delete_status(sid: str, user: dict = Depends(require_roles("admin"))):
    st = await db.order_statuses.find_one({"id": sid}, {"_id": 0})
    if not st:
        raise HTTPException(404, "Status not found.")
    if st["core"]:
        raise HTTPException(400, "Core statuses cannot be deleted.")
    in_use = await db.order_batches.count_documents({"status": st["label"]})
    if in_use > 0:
        raise HTTPException(400, f"{in_use} order(s) currently use this status. Move them to another status first.")
    await db.order_statuses.delete_one({"id": sid})
    return {"ok": True}


@router.put("/statuses/order/reorder")
async def reorder_statuses(body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    ids = body.get("ids", [])
    for i, sid in enumerate(ids):
        await db.order_statuses.update_one({"id": sid}, {"$set": {"order": i}})
    return {"ok": True}
