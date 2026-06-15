from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, List
import os

from deps import db, gen_id, now_iso, get_current_user, require_roles, get_setting, UPLOAD_DIR
from engine import compute_quote, resolve_unit_rate, best_slab_discount

router = APIRouter(tags=["catalog"])

LOGO_EXT = {".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"}


# ---------- Products & Tiers ----------
@router.get("/products")
async def list_products(active_only: bool = False, user: dict = Depends(get_current_user)):
    q = {"active": True} if active_only else {}
    products = await db.products.find(q, {"_id": 0}).to_list(200)
    for p in products:
        p["tiers"] = await db.product_tiers.find({"product_id": p["id"]}, {"_id": 0}).to_list(50)
    return products


@router.post("/products")
async def create_product(body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    doc = {"id": gen_id(), "active": True, "created_at": now_iso(), **body}
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/products/{pid}")
async def update_product(pid: str, body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    body.pop("id", None)
    await db.products.update_one({"id": pid}, {"$set": body})
    return {"ok": True}


@router.delete("/products/{pid}")
async def delete_product(pid: str, user: dict = Depends(require_roles("admin"))):
    await db.products.delete_one({"id": pid})
    await db.product_tiers.delete_many({"product_id": pid})
    return {"ok": True}


@router.post("/tiers")
async def create_tier(body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    doc = {"id": gen_id(), "active": True, "gst_rate": 5, "urgent_surcharge": 0,
           "urgent_surcharge_type": "flat", "tat_days": 4, "unit_type": "per tooth",
           "most_popular": False, "created_at": now_iso(), **body}
    await db.product_tiers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/tiers/{tid}")
async def update_tier(tid: str, body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    body.pop("id", None)
    await db.product_tiers.update_one({"id": tid}, {"$set": body})
    return {"ok": True}


@router.delete("/tiers/{tid}")
async def delete_tier(tid: str, user: dict = Depends(require_roles("admin"))):
    await db.product_tiers.delete_one({"id": tid})
    return {"ok": True}


# ---------- Offers ----------
@router.get("/offers")
async def list_offers(user: dict = Depends(require_roles("admin"))):
    return await db.offers.find({}, {"_id": 0}).to_list(200)


@router.post("/offers")
async def create_offer(body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    doc = {"id": gen_id(), "active": True, "scope": "per_tier_per_batch",
           "discount_type": "percentage", "applies_to": "all", "show_on_form": True,
           "created_at": now_iso(), **body}
    await db.offers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/offers/{oid}")
async def update_offer(oid: str, body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    body.pop("id", None)
    await db.offers.update_one({"id": oid}, {"$set": body})
    return {"ok": True}


# ---------- Settings ----------
@router.get("/settings/public")
async def public_settings():
    return {"lab": await get_setting("lab", {})}


@router.get("/settings")
async def get_settings(user: dict = Depends(require_roles("admin"))):
    docs = await db.settings.find({}, {"_id": 0}).to_list(100)
    return {d["key"]: d["value"] for d in docs}


@router.put("/settings/{key}")
async def update_settings(key: str, body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    await db.settings.update_one({"key": key}, {"$set": {"value": body.get("value", body)}}, upsert=True)
    return {"ok": True}


@router.post("/settings/logo")
async def upload_logo(file: UploadFile = File(...), user: dict = Depends(require_roles("admin"))):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in LOGO_EXT:
        raise HTTPException(400, f"Unsupported image type {ext}. Use PNG, JPG, WEBP, SVG or GIF.")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "Logo must be under 5 MB")
    stored = "logo_" + gen_id() + ext
    (UPLOAD_DIR / stored).write_bytes(data)
    public_url = os.environ.get("APP_PUBLIC_URL", "").rstrip("/")
    logo_url = f"{public_url}/api/assets/{stored}"
    lab = await get_setting("lab", {}) or {}
    lab["logo_url"] = logo_url
    await db.settings.update_one({"key": "lab"}, {"$set": {"value": lab}}, upsert=True)
    return {"logo_url": logo_url}


@router.post("/settings/favicon")
async def upload_favicon(file: UploadFile = File(...), user: dict = Depends(require_roles("admin"))):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in LOGO_EXT and ext != ".ico":
        raise HTTPException(400, f"Unsupported icon type {ext}. Use PNG, ICO, JPG, WEBP or SVG.")
    data = await file.read()
    if len(data) > 2 * 1024 * 1024:
        raise HTTPException(400, "Favicon must be under 2 MB")
    stored = "favicon_" + gen_id() + ext
    (UPLOAD_DIR / stored).write_bytes(data)
    public_url = os.environ.get("APP_PUBLIC_URL", "").rstrip("/")
    favicon_url = f"{public_url}/api/assets/{stored}"
    lab = await get_setting("lab", {}) or {}
    lab["favicon_url"] = favicon_url
    await db.settings.update_one({"key": "lab"}, {"$set": {"value": lab}}, upsert=True)
    return {"favicon_url": favicon_url}


@router.get("/assets/{name}")
async def serve_asset(name: str):
    # Public (no auth) — used for logos on the landing page, login and WhatsApp header.
    if "/" in name or ".." in name:
        raise HTTPException(400, "Invalid name")
    path = UPLOAD_DIR / name
    if not path.exists():
        raise HTTPException(404, "Not found")
    return FileResponse(str(path))


# ---------- Dentist-specific pricing ----------
@router.get("/dentist-pricing/{dentist_id}")
async def get_dentist_pricing(dentist_id: str, user: dict = Depends(require_roles("admin"))):
    rows = await db.dentist_product_pricing.find({"dentist_id": dentist_id}, {"_id": 0}).to_list(200)
    return {r["tier_id"]: r["rate"] for r in rows}


@router.put("/dentist-pricing/{dentist_id}")
async def set_dentist_pricing(dentist_id: str, body: dict = Body(...), user: dict = Depends(require_roles("admin"))):
    """body: {tier_id: rate, ...} ; null/empty removes override."""
    for tier_id, rate in body.items():
        if rate in (None, "", 0):
            await db.dentist_product_pricing.delete_one({"dentist_id": dentist_id, "tier_id": tier_id})
        else:
            await db.dentist_product_pricing.update_one(
                {"dentist_id": dentist_id, "tier_id": tier_id},
                {"$set": {"id": gen_id(), "dentist_id": dentist_id, "tier_id": tier_id, "rate": float(rate)}},
                upsert=True)
    return {"ok": True}


async def _dentist_rates(dentist_id):
    rows = await db.dentist_product_pricing.find({"dentist_id": dentist_id}, {"_id": 0}).to_list(200)
    return {r["tier_id"]: r["rate"] for r in rows}


# ---------- My Pricing (dentist rate card) ----------
@router.get("/my-pricing")
async def my_pricing(user: dict = Depends(get_current_user), dentist_id: Optional[str] = None):
    if user["role"] == "dentist":
        dent = await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0})
        did = dent["id"] if dent else None
    else:
        did = dentist_id
    rates = await _dentist_rates(did) if did else {}
    offers = await db.offers.find({"active": True}, {"_id": 0}).to_list(100)
    products = await db.products.find({"active": True}, {"_id": 0}).to_list(100)
    cards = []
    for p in products:
        tiers = await db.product_tiers.find({"product_id": p["id"], "active": True}, {"_id": 0}).to_list(50)
        for t in tiers:
            base = resolve_unit_rate(t, rates.get(t["id"]))
            if base <= 0:
                continue
            offer = next((o for o in offers if t["id"] in (o.get("tier_ids") or [])), None)
            slabs = offer.get("slabs", []) if offer else [{"min_units": 1, "discount": 0}]
            rows = []
            for s in sorted(slabs, key=lambda x: x["min_units"]):
                disc = s.get("discount", 0)
                per = round(base * (1 - disc / 100.0), 2)
                rows.append({"min_units": s["min_units"], "discount": disc, "per_unit": per})
            cards.append({
                "product_name": p["name"], "tier_id": t["id"], "tier_name": t["name"],
                "base_rate": base, "gst_rate": t.get("gst_rate", 5),
                "urgent_surcharge": t.get("urgent_surcharge", 0),
                "urgent_surcharge_type": t.get("urgent_surcharge_type", "flat"),
                "most_popular": t.get("most_popular", False),
                "description": t.get("description", ""), "rows": rows,
            })
    return {"cards": cards}


# ---------- Live quote ----------
class QuoteItem(BaseModel):
    tier_id: str
    product_id: Optional[str] = None
    product_name: Optional[str] = None
    tier_name: Optional[str] = None
    units: int = 0
    teeth: List[dict] = []
    patient_name: Optional[str] = None
    case_label: Optional[str] = None


class QuoteIn(BaseModel):
    items: List[QuoteItem]
    urgency: str = "Normal"


@router.post("/quote")
async def quote(body: QuoteIn, user: dict = Depends(get_current_user)):
    dent = await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0}) if user["role"] == "dentist" else None
    did = dent["id"] if dent else None
    rates = await _dentist_rates(did) if did else {}
    tier_ids = list({i.tier_id for i in body.items})
    tiers = await db.product_tiers.find({"id": {"$in": tier_ids}}, {"_id": 0}).to_list(100)
    tiers_by_id = {t["id"]: t for t in tiers}
    offers = await db.offers.find({"active": True}, {"_id": 0}).to_list(100)
    gst_cfg = await get_setting("gst", {"enabled": True})
    offers_enabled = await get_setting("offers_enabled", True)
    intra = (dent.get("state", "").strip().lower() == "gujarat") if dent else True
    items = [i.dict() for i in body.items]
    for it in items:
        it["units"] = it.get("units") or len(it.get("teeth", []))
    return compute_quote(items, tiers_by_id, rates, offers, body.urgency,
                         gst_cfg.get("enabled", True), intra, offers_enabled)
