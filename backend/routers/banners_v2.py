# Banner Management System v2 - World Class
from fastapi import APIRouter, HTTPException, Header, Cookie, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
from db import get_database
from auth import get_current_user, require_admin
import cloudinary
import cloudinary.uploader

router = APIRouter(prefix="/banners", tags=["Banners"])

# Banner Types
BANNER_TYPES = ["hero", "promotional", "category", "offer", "announcement"]
ANIMATION_TYPES = ["none", "fade", "slide-left", "slide-right", "slide-up", "zoom", "bounce"]

class BannerCreate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None  # Direct URL (optional)
    mobile_image_url: Optional[str] = None
    banner_type: str = "hero"  # hero, promotional, category, offer, announcement
    animation: str = "fade"  # none, fade, slide-left, slide-right, slide-up, zoom, bounce
    link_url: Optional[str] = None
    link_type: str = "none"  # none, url, category, product, collection
    link_target: Optional[str] = None  # category slug, product id, collection id
    button_text: Optional[str] = None
    position: int = 0
    is_active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    overlay_color: Optional[str] = None  # e.g., "rgba(0,0,0,0.3)"
    text_color: Optional[str] = "#ffffff"
    text_position: str = "center"  # left, center, right
    show_on_mobile: bool = True
    show_on_desktop: bool = True

class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    mobile_image_url: Optional[str] = None
    banner_type: Optional[str] = None
    animation: Optional[str] = None
    link_url: Optional[str] = None
    link_type: Optional[str] = None
    link_target: Optional[str] = None
    button_text: Optional[str] = None
    position: Optional[int] = None
    is_active: Optional[bool] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    overlay_color: Optional[str] = None
    text_color: Optional[str] = None
    text_position: Optional[str] = None
    show_on_mobile: Optional[bool] = None
    show_on_desktop: Optional[bool] = None


@router.get("")
async def get_banners(
    banner_type: Optional[str] = None,
    active_only: bool = True
):
    """Get banners for frontend display"""
    db = await get_database()
    
    query = {}
    if banner_type:
        query["banner_type"] = banner_type
    if active_only:
        query["is_active"] = True
        # Check date range
        now = datetime.now(timezone.utc).isoformat()
        query["$or"] = [
            {"start_date": None, "end_date": None},
            {"start_date": {"$lte": now}, "end_date": None},
            {"start_date": None, "end_date": {"$gte": now}},
            {"start_date": {"$lte": now}, "end_date": {"$gte": now}}
        ]
    
    banners = await db.banners.find(query, {"_id": 0}).sort("position", 1).to_list(50)
    return banners


@router.get("/all")
async def get_all_banners(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get all banners for admin (including inactive)"""
    await require_admin(authorization, session_token)
    db = await get_database()
    
    banners = await db.banners.find({}, {"_id": 0}).sort([("banner_type", 1), ("position", 1)]).to_list(100)
    
    # Group by type for easier management
    grouped = {}
    for b in banners:
        btype = b.get("banner_type", "hero")
        if btype not in grouped:
            grouped[btype] = []
        grouped[btype].append(b)
    
    return {
        "banners": banners,
        "grouped": grouped,
        "total": len(banners),
        "types": BANNER_TYPES,
        "animations": ANIMATION_TYPES
    }


@router.post("")
async def create_banner(
    banner: BannerCreate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create a new banner"""
    await require_admin(authorization, session_token)
    db = await get_database()
    
    # Validate banner type
    if banner.banner_type not in BANNER_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid banner type. Must be one of: {BANNER_TYPES}")
    
    # Validate animation
    if banner.animation not in ANIMATION_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid animation. Must be one of: {ANIMATION_TYPES}")
    
    # Must have at least an image
    if not banner.image_url:
        raise HTTPException(status_code=400, detail="Image URL is required")
    
    banner_id = f"banner_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    banner_doc = {
        "banner_id": banner_id,
        **banner.dict(),
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.banners.insert_one(banner_doc)
    
    return {"message": "Banner created", "banner_id": banner_id}


@router.post("/upload")
async def upload_banner_image(
    file: UploadFile = File(...),
    banner_type: str = Form("hero"),
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Upload banner image to Cloudinary"""
    await require_admin(authorization, session_token)
    
    # Validate file type
    if not file.content_type.startswith("image/") and not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be an image or video")
    
    # Check file size (max 10MB for images, 50MB for videos)
    content = await file.read()
    max_size = 50 * 1024 * 1024 if file.content_type.startswith("video/") else 10 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail=f"File too large. Max size: {max_size // (1024*1024)}MB")
    
    try:
        # Upload to Cloudinary
        folder = f"paridhaan/banners/{banner_type}"
        resource_type = "video" if file.content_type.startswith("video/") else "image"
        
        result = cloudinary.uploader.upload(
            content,
            folder=folder,
            resource_type=resource_type,
            transformation=[
                {"quality": "auto:best", "fetch_format": "auto"}
            ] if resource_type == "image" else None
        )
        
        return {
            "success": True,
            "url": result["secure_url"],
            "public_id": result["public_id"],
            "resource_type": result["resource_type"],
            "format": result.get("format"),
            "width": result.get("width"),
            "height": result.get("height")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.put("/{banner_id}")
async def update_banner(
    banner_id: str,
    banner: BannerUpdate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update a banner"""
    await require_admin(authorization, session_token)
    db = await get_database()
    
    existing = await db.banners.find_one({"banner_id": banner_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    update_data = {k: v for k, v in banner.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.banners.update_one(
        {"banner_id": banner_id},
        {"$set": update_data}
    )
    
    return {"message": "Banner updated"}


@router.delete("/{banner_id}")
async def delete_banner(
    banner_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete a banner"""
    await require_admin(authorization, session_token)
    db = await get_database()
    
    result = await db.banners.delete_one({"banner_id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    return {"message": "Banner deleted"}


@router.post("/reorder")
async def reorder_banners(
    banner_ids: List[str],
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Reorder banners by position"""
    await require_admin(authorization, session_token)
    db = await get_database()
    
    for i, banner_id in enumerate(banner_ids):
        await db.banners.update_one(
            {"banner_id": banner_id},
            {"$set": {"position": i}}
        )
    
    return {"message": "Banners reordered"}


@router.patch("/{banner_id}/toggle")
async def toggle_banner_status(
    banner_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Toggle banner active status"""
    await require_admin(authorization, session_token)
    db = await get_database()
    
    existing = await db.banners.find_one({"banner_id": banner_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    new_status = not existing.get("is_active", True)
    await db.banners.update_one(
        {"banner_id": banner_id},
        {"$set": {"is_active": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Banner {'activated' if new_status else 'deactivated'}", "is_active": new_status}


def init_router(*args, **kwargs):
    """No-op initialiser.

    server.py's uniform `init_router(db, require_admin)` loop expects every
    router to accept dependencies by injection. This router predates that
    convention: it pulls them at request time via `from db import get_database`
    and `from auth import require_admin, get_current_user` (the `backend/db.py`
    and `backend/auth.py` shims). Nothing to wire up here, so we just accept
    the call and return.
    """
    return None
