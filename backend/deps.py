"""Shared dependencies: db, auth, helpers."""
import os
import uuid
import jwt
import bcrypt
from pathlib import Path
from datetime import datetime, timezone, timedelta
from fastapi import Request, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_ALGORITHM = "HS256"
IST = timezone(timedelta(hours=5, minutes=30))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def gen_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def fmt_ist(dt) -> str:
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt)
        except Exception:
            return dt
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(IST).strftime("%d %b %Y, %I:%M %p")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def _extract_token(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    return token


async def get_current_user(request: Request) -> dict:
    token = _extract_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_roles(*roles):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if roles and user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _dep


async def log_activity(order_id, action, user, *, dentist_visible=False, meta=None):
    doc = {
        "id": gen_id(),
        "order_id": order_id,
        "action": action,
        "actor_id": user.get("id") if user else None,
        "actor_name": user.get("name") if user else "System",
        "actor_role": user.get("role") if user else "system",
        "dentist_visible": dentist_visible,
        "meta": meta or {},
        "created_at": now_iso(),
    }
    await db.order_activity_logs.insert_one(doc)
    return doc


async def get_setting(key, default=None):
    doc = await db.settings.find_one({"key": key}, {"_id": 0})
    return doc["value"] if doc else default


async def create_notification(user_id, title, body, *, order_id=None, kind="info"):
    await db.notifications.insert_one({
        "id": gen_id(),
        "user_id": user_id,
        "title": title,
        "body": body,
        "order_id": order_id,
        "kind": kind,
        "read": False,
        "created_at": now_iso(),
    })
