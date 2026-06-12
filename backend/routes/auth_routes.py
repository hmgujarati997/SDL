from fastapi import APIRouter, Request, Response, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional

from deps import (db, gen_id, now_iso, hash_password, verify_password,
                  create_access_token, get_current_user)

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    mobile: str
    clinic_name: Optional[str] = ""
    whatsapp: Optional[str] = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ChangePwIn(BaseModel):
    current_password: Optional[str] = None
    new_password: str


def _set_cookie(response: Response, token: str):
    response.set_cookie("access_token", token, httponly=True, secure=True,
                        samesite="none", max_age=604800, path="/")


async def _attach_profile(user: dict):
    out = dict(user)
    out.pop("password_hash", None)
    out.pop("_id", None)
    if user.get("role") == "dentist":
        prof = await db.dentists.find_one({"user_id": user["id"]}, {"_id": 0})
        out["dentist"] = prof
    return out


@router.post("/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    uid = gen_id()
    user = {
        "id": uid, "email": email, "password_hash": hash_password(body.password),
        "name": body.name, "role": "dentist", "mobile": body.mobile,
        "active": True, "must_change_password": False, "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    await db.dentists.insert_one({
        "id": gen_id(), "user_id": uid, "name": body.name, "clinic_name": body.clinic_name or "",
        "mobile": body.mobile, "whatsapp": body.whatsapp or body.mobile, "email": email,
        "billing_address": "", "clinic_address": "", "city": "", "state": "", "pincode": "",
        "gst_number": "", "pan_number": "", "delivery_address": "",
        "alt_contact_name": "", "alt_contact_number": "",
        "status": "active", "billing_complete": False, "lifetime_savings": 0, "created_at": now_iso(),
    })
    token = create_access_token(uid, email, "dentist")
    _set_cookie(response, token)
    full = await _attach_profile(user)
    return {"token": token, "user": full}


@router.post("/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account deactivated. Contact admin.")
    token = create_access_token(user["id"], email, user["role"])
    _set_cookie(response, token)
    full = await _attach_profile(user)
    return {"token": token, "user": full}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return await _attach_profile(user)


@router.post("/change-password")
async def change_password(body: ChangePwIn, user: dict = Depends(get_current_user)):
    full = await db.users.find_one({"id": user["id"]})
    if user.get("must_change_password") is False and body.current_password is not None:
        if not verify_password(body.current_password, full["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one({"id": user["id"]}, {"$set": {
        "password_hash": hash_password(body.new_password), "must_change_password": False}})
    return {"ok": True}
