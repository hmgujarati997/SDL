from fastapi import APIRouter, Depends, Body, Request
from typing import Optional

from deps import db, now_iso, require_roles
from services import send_whatsapp

router = APIRouter(tags=["whatsapp"])


@router.get("/whatsapp/logs")
async def whatsapp_logs(status: Optional[str] = None, q: Optional[str] = None,
                        user: dict = Depends(require_roles("admin"))):
    query = {}
    if status:
        query["status"] = status
    if q:
        query["$or"] = [{"order_no": {"$regex": q, "$options": "i"}},
                        {"dentist_name": {"$regex": q, "$options": "i"}},
                        {"phone": {"$regex": q, "$options": "i"}}]
    return await db.whatsapp_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("/whatsapp/logs/{lid}/retry")
async def retry_log(lid: str, user: dict = Depends(require_roles("admin"))):
    log = await db.whatsapp_logs.find_one({"id": lid}, {"_id": 0})
    if not log:
        return {"ok": False, "error": "not found"}
    new = await send_whatsapp(event=log["event"], to_phone=log["phone"],
                              dentist_name=log["dentist_name"], order_no=log["order_no"],
                              patient_name=log.get("patient_name", ""), fields=log.get("fields", {}),
                              deep_link_suffix=log["order_no"])
    return {"ok": True, "status": new["status"]}


@router.post("/whatsapp/webhook")
async def whatsapp_webhook(request: Request):
    """Receive provider status updates: {wamid/message_id, status, timestamp, error}."""
    try:
        body = await request.json()
    except Exception:
        body = {}
    wamid = body.get("wamid") or body.get("message_id") or (body.get("data", {}) or {}).get("wamid")
    status = (body.get("status") or "").lower()
    if not wamid:
        return {"ok": True, "ignored": True}
    field = {"sent": "sent_at", "delivered": "delivered_at", "read": "read_at", "failed": "failed_at"}.get(status)
    upd = {"webhook_data": body}
    status_map = {"sent": "Sent", "delivered": "Delivered", "read": "Read", "failed": "Failed"}
    if status in status_map:
        upd["status"] = status_map[status]
    if field:
        upd[field] = now_iso()
    if status == "failed":
        upd["failure_reason"] = body.get("error", "delivery failed")
    await db.whatsapp_logs.update_one({"wamid": wamid},
                                      {"$set": upd, "$push": {"webhook_history": body}})
    return {"ok": True}


@router.get("/whatsapp/report")
async def whatsapp_report(user: dict = Depends(require_roles("admin"))):
    logs = await db.whatsapp_logs.find({}, {"_id": 0}).to_list(5000)
    by_status = {}
    for l in logs:
        by_status[l["status"]] = by_status.get(l["status"], 0) + 1
    return {"total": len(logs), "by_status": by_status}
