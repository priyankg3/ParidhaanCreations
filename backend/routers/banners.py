"""
Banners Router — unified schema.

Replaces the previous split between banners.py (legacy, mounted) and
banners_v2.py (modern, orphaned). Keeps all the rich features the admin
UI expects (9 placements, draft/active/paused/scheduled statuses,
animations, text position, overlay, mobile/desktop toggles) AND stays
back-compatible with the data shape the old frontend + stored banners
rely on.

Policy: the API accepts *either* the legacy or the modern field names
on write, normalises on read so downstream consumers see a stable
shape, and never silently drops a query param. Nothing in the DB is
destructively migrated — existing banner docs keep working as-is.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Cookie, File, Form, Header, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

try:
    import cloudinary
    import cloudinary.uploader
except ImportError:  # pragma: no cover
    cloudinary = None

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/banners", tags=["Banners"])

db = None
require_admin = None


def init_router(database, admin_checker):
    global db, require_admin
    db = database
    require_admin = admin_checker


# ---------- vocabularies ----------

# Nine placement zones (matches what the admin UI already exposes)
PLACEMENTS = {
    "hero",             # Homepage hero slider
    "below_hero",       # Below hero slot
    "popup",            # Modal popup
    "category_header",  # Top of category pages
    "category_sidebar", # Side banner on category pages
    "category_footer",  # Bottom of category pages
    "product_page",     # Banner on PDP
    "cart_page",        # Promotional banner in cart
    "checkout_page",    # Offer banner during checkout
}

ANIMATIONS = {"none", "fade", "slide-left", "slide-right", "slide-up", "zoom", "bounce"}

TEXT_POSITIONS = {"left", "center", "right"}

LINK_TYPES = {"none", "url", "category", "product", "collection"}

# Status enum — the admin UI thinks in these; `is_active` is derived
STATUSES = {"draft", "active", "paused", "scheduled", "expired"}


# ---------- schemas ----------

class BannerPayload(BaseModel):
    """Unified input — accepts legacy OR modern field names."""
    # Content
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    button_text: Optional[str] = None

    # Images — any of these is accepted on write, normalised on read
    image: Optional[str] = None            # legacy alias (very old docs)
    image_url: Optional[str] = None        # preferred
    image_desktop: Optional[str] = None    # legacy alias used by HomePage
    image_mobile: Optional[str] = None
    mobile_image_url: Optional[str] = None # legacy alias

    # Placement + ordering
    placement: Optional[str] = None       # preferred
    position_type: Optional[str] = None   # legacy alias
    banner_type: Optional[str] = None     # v2 alias
    position: int = 0                     # ordering within a placement

    # Status (both shapes supported)
    status: Optional[str] = None          # preferred: draft/active/paused/scheduled/expired
    is_active: Optional[bool] = None      # legacy bool

    # Links (both shapes supported; see _normalise_link_fields)
    link: Optional[str] = None            # legacy convenience: full URL or path
    link_url: Optional[str] = None
    link_type: Optional[str] = None
    link_target: Optional[str] = None
    link_category: Optional[str] = None   # legacy
    link_product_id: Optional[str] = None # legacy
    link_collection_id: Optional[str] = None  # legacy
    collection_slug: Optional[str] = None     # legacy

    # Styling
    background_color: Optional[str] = None  # legacy alias for overlay_color
    overlay_color: Optional[str] = None
    text_color: Optional[str] = None
    text_position: Optional[str] = None

    # Behaviour
    animation: Optional[str] = None
    show_on_mobile: bool = True
    show_on_desktop: bool = True
    popup_delay: Optional[int] = None       # ms, for popup banners

    # Scheduling
    start_date: Optional[str] = None
    end_date: Optional[str] = None


# ---------- helpers ----------

def _canonical_placement(doc_or_payload: dict) -> Optional[str]:
    """Pick whichever placement-like field is present (preferred → legacy)."""
    return (
        doc_or_payload.get("placement")
        or doc_or_payload.get("banner_type")
        or doc_or_payload.get("position_type")
    )


def _canonical_image(doc: dict) -> Optional[str]:
    return doc.get("image_url") or doc.get("image_desktop") or doc.get("image")


def _canonical_mobile_image(doc: dict) -> Optional[str]:
    return doc.get("mobile_image_url") or doc.get("image_mobile")


def _canonical_overlay(doc: dict) -> Optional[str]:
    return doc.get("overlay_color") or doc.get("background_color")


def _canonical_link(doc: dict) -> dict[str, Optional[str]]:
    """
    Turn whatever link-shaped fields exist on a banner into a normalised
    (link, link_type, link_target) triple plus a convenience `link` URL/path.
    The HomePage inline carousel reads `banner.link`; the BannerSystem.js
    components read `link_type` + `link_target`. We supply both.
    """
    link_type = doc.get("link_type") or "none"
    link_target = doc.get("link_target")
    link_url = doc.get("link_url")

    # Legacy-field inference
    if link_type == "none" or (not link_target and not link_url):
        if doc.get("link_url") or doc.get("link"):
            link_type = "url"
            link_url = doc.get("link_url") or doc.get("link")
        elif doc.get("link_product_id"):
            link_type = "product"
            link_target = doc["link_product_id"]
        elif doc.get("link_collection_id") or doc.get("collection_slug"):
            link_type = "collection"
            link_target = doc.get("link_collection_id") or doc.get("collection_slug")
        elif doc.get("link_category"):
            link_type = "category"
            link_target = doc["link_category"]

    # Build a friendly `link` field for consumers that just want a path/URL
    convenience_link: Optional[str] = None
    if link_type == "url":
        convenience_link = link_url or doc.get("link")
    elif link_type == "category" and link_target:
        convenience_link = f"/products?category={link_target}"
    elif link_type == "product" and link_target:
        convenience_link = f"/products/{link_target}"
    elif link_type == "collection" and link_target:
        convenience_link = f"/collection/{link_target}"
    else:
        convenience_link = doc.get("link")

    return {
        "link": convenience_link,
        "link_type": link_type,
        "link_target": link_target,
        "link_url": link_url,
    }


def _status_from_doc(doc: dict) -> str:
    """Prefer explicit `status`; fall back to deriving from `is_active`."""
    if doc.get("status") in STATUSES:
        return doc["status"]
    return "active" if doc.get("is_active", True) else "paused"


def _is_active_from_status(status: Optional[str], legacy_is_active: Optional[bool]) -> bool:
    """Convert status enum back to is_active bool for storage/back-compat."""
    if status:
        return status == "active"
    if legacy_is_active is not None:
        return bool(legacy_is_active)
    return True


def _normalise_output(doc: dict) -> dict:
    """
    Return a banner doc with both the preferred and legacy field names
    present, so every downstream consumer finds what it expects regardless
    of how the doc was originally saved.
    """
    out = dict(doc)
    # Placement
    placement = _canonical_placement(doc)
    if placement:
        out["placement"] = placement
        out["banner_type"] = placement
        out["position_type"] = placement
    # Images
    img = _canonical_image(doc)
    if img:
        out["image_url"] = img
        out["image_desktop"] = img
        out["image"] = img
    mob = _canonical_mobile_image(doc)
    if mob:
        out["mobile_image_url"] = mob
        out["image_mobile"] = mob
    # Overlay
    overlay = _canonical_overlay(doc)
    if overlay:
        out["overlay_color"] = overlay
        out["background_color"] = overlay
    # Status & is_active
    status = _status_from_doc(doc)
    out["status"] = status
    out["is_active"] = status == "active"
    # Links
    out.update(_canonical_link(doc))
    return out


def _within_schedule(doc: dict, now: datetime) -> bool:
    """Date-range gate. A missing bound is treated as open-ended."""
    for key, cmp in (("start_date", lambda d: now >= d), ("end_date", lambda d: now <= d)):
        raw = doc.get(key)
        if not raw:
            continue
        try:
            when = raw if isinstance(raw, datetime) else datetime.fromisoformat(
                str(raw).replace("Z", "+00:00")
            )
            if when.tzinfo is None:
                when = when.replace(tzinfo=timezone.utc)
            if not cmp(when):
                return False
        except Exception:
            # Malformed date → err on the side of showing the banner
            continue
    return True


# ---------- public reads ----------

@router.get("")
async def get_banners(
    # The frontend sends `placement`; older callers may send `position` or
    # `banner_type`. Accept all three — never silently drop a filter.
    placement: Optional[str] = Query(None),
    position: Optional[str] = Query(None),
    banner_type: Optional[str] = Query(None),
    position_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    limit: int = Query(50, le=100),
):
    """Public: list banners for a placement, respecting schedule."""
    wanted_placement = placement or banner_type or position or position_type

    mongo_filter: dict[str, Any] = {}
    # Match placement across any of the three stored field names so legacy
    # docs with only `position_type` still match a `placement=...` query.
    if wanted_placement:
        mongo_filter["$or"] = [
            {"placement": wanted_placement},
            {"banner_type": wanted_placement},
            {"position_type": wanted_placement},
        ]

    # Status filtering: prefer explicit `status`, fall back to `is_active`.
    if status is not None:
        if status == "active":
            mongo_filter["$and"] = mongo_filter.get("$and", []) + [{
                "$or": [{"status": "active"}, {"status": {"$exists": False}, "is_active": True}]
            }]
        else:
            mongo_filter["status"] = status
    elif is_active is not None:
        if is_active:
            mongo_filter["$and"] = mongo_filter.get("$and", []) + [{
                "$or": [{"status": "active"}, {"is_active": True}, {"status": {"$exists": False}, "is_active": {"$exists": False}}]
            }]
        else:
            mongo_filter["$or"] = mongo_filter.get("$or", []) + [{"is_active": False}, {"status": "paused"}]
    else:
        # Default = only active, so no accidental leaks of drafts/paused.
        mongo_filter["$and"] = mongo_filter.get("$and", []) + [{
            "$or": [{"status": "active"}, {"status": {"$exists": False}, "is_active": True}, {"is_active": True, "status": {"$exists": False}}]
        }]

    raw = await db.banners.find(mongo_filter, {"_id": 0}).sort("position", 1).to_list(limit)
    now = datetime.now(timezone.utc)
    return [_normalise_output(b) for b in raw if _within_schedule(b, now)]


# ---------- admin reads ----------

@router.get("/all")
async def get_all_banners(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    await require_admin(authorization, session_token)
    raw = await db.banners.find({}, {"_id": 0}).sort("position", 1).to_list(200)
    return [_normalise_output(b) for b in raw]


@router.get("/stats")
async def get_banner_stats(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    await require_admin(authorization, session_token)
    raw = await db.banners.find({}, {"_id": 0}).to_list(500)
    banners = [_normalise_output(b) for b in raw]

    total_impressions = sum(b.get("impressions", 0) for b in banners)
    total_clicks = sum(b.get("clicks", 0) for b in banners)

    def ctr(imp: int, clk: int) -> float:
        return round((clk / imp) * 100, 2) if imp > 0 else 0.0

    return {
        "total_banners": len(banners),
        "active_banners": sum(1 for b in banners if b.get("status") == "active"),
        "total_impressions": total_impressions,
        "total_clicks": total_clicks,
        "overall_ctr": ctr(total_impressions, total_clicks),
        "banners": [
            {
                "banner_id": b.get("banner_id"),
                "title": b.get("title"),
                "placement": b.get("placement"),
                "status": b.get("status"),
                "impressions": b.get("impressions", 0),
                "clicks": b.get("clicks", 0),
                "ctr": ctr(b.get("impressions", 0), b.get("clicks", 0)),
            }
            for b in banners
        ],
    }


# ---------- create / update / delete ----------

def _validate_choices(payload: BannerPayload) -> None:
    placement = _canonical_placement(payload.model_dump())
    if placement and placement not in PLACEMENTS:
        raise HTTPException(400, f"Invalid placement. Allowed: {sorted(PLACEMENTS)}")
    if payload.animation and payload.animation not in ANIMATIONS:
        raise HTTPException(400, f"Invalid animation. Allowed: {sorted(ANIMATIONS)}")
    if payload.text_position and payload.text_position not in TEXT_POSITIONS:
        raise HTTPException(400, f"Invalid text_position. Allowed: {sorted(TEXT_POSITIONS)}")
    if payload.link_type and payload.link_type not in LINK_TYPES:
        raise HTTPException(400, f"Invalid link_type. Allowed: {sorted(LINK_TYPES)}")
    if payload.status and payload.status not in STATUSES:
        raise HTTPException(400, f"Invalid status. Allowed: {sorted(STATUSES)}")


def _store_shape(payload: BannerPayload, *, is_create: bool) -> dict:
    """
    Build the document to write. We store BOTH legacy and modern names
    so a future reader using either shape keeps working. On update we
    skip None fields so partial PATCHes don't nuke existing values.
    """
    data = payload.model_dump(exclude_none=True) if not is_create else payload.model_dump()

    # Canonicalise placement into all three slots
    placement = _canonical_placement(data)
    if placement:
        data["placement"] = placement
        data["banner_type"] = placement
        data["position_type"] = placement

    # Image canonicalisation
    img = _canonical_image(data)
    if img:
        data["image_url"] = img
        data["image_desktop"] = img
        data["image"] = img
    mob = _canonical_mobile_image(data)
    if mob:
        data["mobile_image_url"] = mob
        data["image_mobile"] = mob

    overlay = _canonical_overlay(data)
    if overlay:
        data["overlay_color"] = overlay
        data["background_color"] = overlay

    # Status / is_active sync
    if "status" in data or "is_active" in data:
        status = data.get("status")
        if not status and "is_active" in data:
            status = "active" if data["is_active"] else "paused"
        data["status"] = status
        data["is_active"] = status == "active"

    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    return data


@router.post("")
async def create_banner(
    banner: BannerPayload,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    await require_admin(authorization, session_token)
    _validate_choices(banner)

    doc = _store_shape(banner, is_create=True)
    if not _canonical_image(doc):
        raise HTTPException(400, "image_url (or image / image_desktop) is required")

    doc["banner_id"] = f"banner_{uuid.uuid4().hex[:12]}"
    doc["impressions"] = 0
    doc["clicks"] = 0
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    # Default status if the admin didn't specify one
    doc.setdefault("status", "active")
    doc.setdefault("is_active", doc["status"] == "active")

    await db.banners.insert_one(doc)
    return {"message": "Banner created", "banner_id": doc["banner_id"]}


@router.put("/{banner_id}")
async def update_banner(
    banner_id: str,
    banner: BannerPayload,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    await require_admin(authorization, session_token)
    _validate_choices(banner)

    update_data = _store_shape(banner, is_create=False)
    # Nothing to do if the payload was empty
    if not update_data or update_data == {"updated_at": update_data["updated_at"]}:
        return {"message": "Nothing to update"}

    result = await db.banners.update_one(
        {"banner_id": banner_id}, {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Banner not found")
    return {"message": "Banner updated"}


@router.patch("/{banner_id}/status")
async def update_banner_status(
    banner_id: str,
    status: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    """Admin UI uses `?status=active`; legacy calls use `?is_active=true`."""
    await require_admin(authorization, session_token)

    if status is None and is_active is None:
        raise HTTPException(400, "Provide either `status` or `is_active`")
    if status and status not in STATUSES:
        raise HTTPException(400, f"Invalid status. Allowed: {sorted(STATUSES)}")

    effective_status = status or ("active" if is_active else "paused")
    update = {
        "status": effective_status,
        "is_active": effective_status == "active",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.banners.update_one({"banner_id": banner_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(404, "Banner not found")
    return {"message": f"Banner status set to {effective_status}", "status": effective_status}


@router.delete("/{banner_id}")
async def delete_banner(
    banner_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    await require_admin(authorization, session_token)
    result = await db.banners.delete_one({"banner_id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Banner not found")
    return {"message": "Banner deleted"}


@router.post("/reorder")
async def reorder_banners(
    banner_orders: list,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    """
    Accepts either:
      [{"banner_id": "...", "position": 0}, ...]   (v1 shape)
      ["banner_id_1", "banner_id_2", ...]          (v2 shape)
    """
    await require_admin(authorization, session_token)
    for i, item in enumerate(banner_orders):
        if isinstance(item, str):
            bid, pos = item, i
        elif isinstance(item, dict):
            bid, pos = item.get("banner_id"), int(item.get("position", i))
        else:
            continue
        if bid:
            await db.banners.update_one({"banner_id": bid}, {"$set": {"position": pos}})
    return {"message": "Banners reordered"}


# ---------- tracking (fixes the 404 on every impression/click) ----------

@router.post("/{banner_id}/impression")
async def track_impression(banner_id: str):
    """What HomePage.js already calls on popup display."""
    await db.banners.update_one({"banner_id": banner_id}, {"$inc": {"impressions": 1}})
    return {"status": "ok"}


@router.post("/{banner_id}/click")
async def track_click(banner_id: str):
    """What HomePage.js already calls on banner click."""
    await db.banners.update_one({"banner_id": banner_id}, {"$inc": {"clicks": 1}})
    return {"status": "ok"}


@router.post("/{banner_id}/track")
async def track_interaction(
    banner_id: str,
    interaction_type: str = Query("impression"),
):
    """Legacy endpoint, kept so nothing breaks."""
    field = "impressions" if interaction_type == "impression" else "clicks"
    await db.banners.update_one({"banner_id": banner_id}, {"$inc": {field: 1}})
    return {"status": "ok"}


# ---------- image upload (ported from the deleted banners_v2.py) ----------

@router.post("/upload")
async def upload_banner_image(
    file: UploadFile = File(...),
    banner_type: str = Form("hero"),
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
):
    """Upload banner image/video to Cloudinary."""
    await require_admin(authorization, session_token)
    if cloudinary is None:
        raise HTTPException(500, "Cloudinary not configured on this server")

    if not (file.content_type and (file.content_type.startswith("image/") or file.content_type.startswith("video/"))):
        raise HTTPException(400, "File must be an image or video")

    content = await file.read()
    max_size = 50 * 1024 * 1024 if file.content_type.startswith("video/") else 10 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(400, f"File too large. Max: {max_size // (1024 * 1024)}MB")

    folder = f"paridhaan/banners/{banner_type}"
    resource_type = "video" if file.content_type.startswith("video/") else "image"
    try:
        result = cloudinary.uploader.upload(
            content,
            folder=folder,
            resource_type=resource_type,
            transformation=[{"quality": "auto:best", "fetch_format": "auto"}]
            if resource_type == "image"
            else None,
        )
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")

    return {
        "success": True,
        "url": result["secure_url"],
        "public_id": result["public_id"],
        "resource_type": result.get("resource_type"),
        "format": result.get("format"),
        "width": result.get("width"),
        "height": result.get("height"),
    }
