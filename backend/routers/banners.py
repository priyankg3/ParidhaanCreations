# Banners Router
from fastapi import APIRouter, HTTPException, Header, Cookie, Query
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/banners", tags=["Banners"])

db = None
require_admin = None

def init_router(database, admin_checker):
    global db, require_admin
    db = database
    require_admin = admin_checker

class BannerCreate(BaseModel):
    title: Optional[str] = None  # Made optional
    subtitle: Optional[str] = None
    image_url: str
    mobile_image_url: Optional[str] = None
    link_type: str = "none"
    link_url: Optional[str] = None
    link_category: Optional[str] = None
    link_product_id: Optional[str] = None
    link_collection_id: Optional[str] = None
    button_text: Optional[str] = None
    position: int = 0
    is_active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None

class BannerUpdate(BannerCreate):
    title: Optional[str] = None
    image_url: Optional[str] = None

@router.get("")
async def get_banners(
    position: Optional[str] = Query(None, description="Filter by position: hero, promotional, sidebar"),
    is_active: bool = True
):
    """Get banners for public display"""
    query = {"is_active": is_active}
    
    if position:
        query["position_type"] = position
    
    # Check date validity
    now = datetime.now(timezone.utc)
    
    banners = await db.banners.find(query, {"_id": 0}).sort("position", 1).to_list(20)
    
    # Filter by date range
    valid_banners = []
    for banner in banners:
        start_date = banner.get("start_date")
        end_date = banner.get("end_date")
        
        if start_date:
            try:
                if isinstance(start_date, str):
                    start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                if start_date.tzinfo is None:
                    start_date = start_date.replace(tzinfo=timezone.utc)
                if now < start_date:
                    continue
            except Exception:
                pass
        
        if end_date:
            try:
                if isinstance(end_date, str):
                    end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                if end_date.tzinfo is None:
                    end_date = end_date.replace(tzinfo=timezone.utc)
                if now > end_date:
                    continue
            except Exception:
                pass
        
        valid_banners.append(banner)
    
    return valid_banners

@router.get("/all")
async def get_all_banners(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get all banners including inactive (admin)"""
    await require_admin(authorization, session_token)
    banners = await db.banners.find({}, {"_id": 0}).sort("position", 1).to_list(100)
    return banners

@router.get("/stats")
async def get_banner_stats(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get banner analytics (admin)"""
    await require_admin(authorization, session_token)
    
    banners = await db.banners.find({}, {"_id": 0}).to_list(100)
    
    stats = {
        "total_banners": len(banners),
        "active_banners": len([b for b in banners if b.get("is_active")]),
        "total_impressions": sum(b.get("impressions", 0) for b in banners),
        "total_clicks": sum(b.get("clicks", 0) for b in banners),
        "banners": [{
            "banner_id": b.get("banner_id"),
            "title": b.get("title"),
            "impressions": b.get("impressions", 0),
            "clicks": b.get("clicks", 0),
            "ctr": round((b.get("clicks", 0) / b.get("impressions", 1)) * 100, 2) if b.get("impressions", 0) > 0 else 0
        } for b in banners]
    }
    
    return stats

@router.post("")
async def create_banner(
    banner: BannerCreate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create new banner (admin)"""
    await require_admin(authorization, session_token)
    
    banner_data = {
        "banner_id": f"banner_{uuid.uuid4().hex[:12]}",
        **banner.model_dump(),
        "impressions": 0,
        "clicks": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.banners.insert_one(banner_data)
    return {"message": "Banner created", "banner_id": banner_data["banner_id"]}

@router.put("/{banner_id}")
async def update_banner(
    banner_id: str,
    banner: BannerUpdate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update banner (admin)"""
    await require_admin(authorization, session_token)
    
    update_data = {k: v for k, v in banner.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.banners.update_one(
        {"banner_id": banner_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    return {"message": "Banner updated"}

@router.patch("/{banner_id}/status")
async def update_banner_status(
    banner_id: str,
    is_active: bool,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Toggle banner active status (admin)"""
    await require_admin(authorization, session_token)
    
    result = await db.banners.update_one(
        {"banner_id": banner_id},
        {"$set": {"is_active": is_active, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    return {"message": f"Banner {'activated' if is_active else 'deactivated'}"}

@router.post("/{banner_id}/track")
async def track_banner_interaction(
    banner_id: str,
    interaction_type: str = "impression"
):
    """Track banner impressions and clicks (public)"""
    field = "impressions" if interaction_type == "impression" else "clicks"
    
    await db.banners.update_one(
        {"banner_id": banner_id},
        {"$inc": {field: 1}}
    )
    
    return {"status": "ok"}

@router.delete("/{banner_id}")
async def delete_banner(
    banner_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete banner (admin)"""
    await require_admin(authorization, session_token)
    
    result = await db.banners.delete_one({"banner_id": banner_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    return {"message": "Banner deleted"}

@router.post("/reorder")
async def reorder_banners(
    banner_orders: List[dict],
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Reorder banners (admin)"""
    await require_admin(authorization, session_token)
    
    for item in banner_orders:
        await db.banners.update_one(
            {"banner_id": item["banner_id"]},
            {"$set": {"position": item["position"]}}
        )
    
    return {"message": "Banners reordered"}
