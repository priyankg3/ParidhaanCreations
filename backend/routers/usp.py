"""
USP Strip Router — manages the static trust/USP items shown below the hero.

Different from the Ticker (which scrolls) — these are static icon+text
blocks shown as a strip (4 across on desktop/tablet, 2x2 grid on mobile),
meant for persistent trust signals like "Free shipping above ₹999",
"Cash on Delivery", "Handcrafted in Vrindavan", "100% authentic".

Public GET returns active items ordered by `order`. Admin CRUD lives
behind `require_admin`.
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Cookie, Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/usp", tags=["USP Strip"])

# Lazy DB connection (same pattern as ticker.py — those routers predate
# server.py's init_router convention, see backend/db.py).
_MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
_DB_NAME = os.environ.get("DB_NAME", "spiritual_bazaar")
_client = AsyncIOMotorClient(_MONGO_URL)
db = _client[_DB_NAME]

# Admin-gate function wired at app startup by server.py.
require_admin = None


def init_router(admin_checker) -> None:
    global require_admin
    require_admin = admin_checker


class USPItem(BaseModel):
    icon: str = Field(min_length=1, max_length=8, description="Emoji or short icon identifier")
    text: str = Field(min_length=1, max_length=80, description="Short USP text (one line)")
    is_active: bool = True
    order: int = 0


# ---------- public ----------

@router.get("")
async def get_usp_items():
    """Public: active USP items ordered for rendering."""
    items = await db.usp_items.find(
        {"is_active": True}, {"_id": 0}
    ).sort("order", 1).to_list(20)
    return items


# ---------- admin ----------

async def _ensure_admin(authorization: Optional[str], session_token: Optional[str]) -> None:
    if require_admin is None:
        raise HTTPException(500, "Admin auth not configured")
    await require_admin(authorization, session_token)


@router.get("/all")
async def get_all_usp_items(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    """Admin: all items including inactive ones."""
    await _ensure_admin(authorization, session_token)
    items = await db.usp_items.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return items


@router.post("")
async def create_usp_item(
    item: USPItem,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    await _ensure_admin(authorization, session_token)
    doc = {
        "usp_id": f"usp_{uuid.uuid4().hex[:12]}",
        "icon": item.icon,
        "text": item.text,
        "is_active": item.is_active,
        "order": item.order,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.usp_items.insert_one(doc)
    return {"message": "USP item created", "usp_id": doc["usp_id"]}


@router.put("/{usp_id}")
async def update_usp_item(
    usp_id: str,
    item: USPItem,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    await _ensure_admin(authorization, session_token)
    result = await db.usp_items.update_one(
        {"usp_id": usp_id},
        {"$set": {
            "icon": item.icon,
            "text": item.text,
            "is_active": item.is_active,
            "order": item.order,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "USP item not found")
    return {"message": "USP item updated"}


@router.delete("/{usp_id}")
async def delete_usp_item(
    usp_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    await _ensure_admin(authorization, session_token)
    result = await db.usp_items.delete_one({"usp_id": usp_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "USP item not found")
    return {"message": "USP item deleted"}


@router.patch("/{usp_id}/toggle")
async def toggle_usp_item(
    usp_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    await _ensure_admin(authorization, session_token)
    existing = await db.usp_items.find_one({"usp_id": usp_id})
    if not existing:
        raise HTTPException(404, "USP item not found")
    new_status = not existing.get("is_active", True)
    await db.usp_items.update_one(
        {"usp_id": usp_id},
        {"$set": {
            "is_active": new_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    return {"message": f"USP item {'activated' if new_status else 'deactivated'}",
            "is_active": new_status}


# ---------- seed (one-time, idempotent) ----------

@router.post("/seed-defaults")
async def seed_default_usp_items(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    """
    One-time admin-triggered seed. Inserts 4 sensible defaults if the
    collection is empty. Idempotent — running it again on a non-empty
    collection does nothing.
    """
    await _ensure_admin(authorization, session_token)
    count = await db.usp_items.count_documents({})
    if count > 0:
        return {"message": "USP items already exist — no seed needed", "existing_count": count}

    defaults = [
        {"icon": "🚚", "text": "Free Shipping over ₹999", "order": 0},
        {"icon": "💵", "text": "Cash on Delivery", "order": 1},
        {"icon": "🙏", "text": "Handcrafted in Vrindavan & Barsana", "order": 2},
        {"icon": "🏆", "text": "100% Authentic Products", "order": 3},
    ]
    now = datetime.now(timezone.utc).isoformat()
    docs = [{
        "usp_id": f"usp_{uuid.uuid4().hex[:12]}",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
        **d,
    } for d in defaults]
    await db.usp_items.insert_many(docs)
    return {"message": "Seeded 4 default USP items", "items": docs}
