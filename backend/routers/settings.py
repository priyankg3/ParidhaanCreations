# Settings Router
from fastapi import APIRouter, HTTPException, Header, Cookie, UploadFile, File
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import cloudinary
import cloudinary.uploader

router = APIRouter(prefix="/settings", tags=["Settings"])

db = None
require_admin = None
get_current_user = None

def init_router(database, admin_checker, user_getter):
    global db, require_admin, get_current_user
    db = database
    require_admin = admin_checker
    get_current_user = user_getter

class SiteSettingsUpdate(BaseModel):
    header_logo: Optional[str] = None
    footer_logo: Optional[str] = None
    favicon: Optional[str] = None
    site_name: Optional[str] = None
    tagline: Optional[str] = None
    primary_color: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    address: Optional[str] = None
    social_instagram: Optional[str] = None
    social_facebook: Optional[str] = None
    social_twitter: Optional[str] = None
    video_required_for_returns: Optional[bool] = None
    return_window_days: Optional[int] = None

class GSTSettingsUpdate(BaseModel):
    business_name: Optional[str] = None
    gstin: Optional[str] = None
    state: Optional[str] = None
    state_code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    pan_number: Optional[str] = None
    cin_number: Optional[str] = None
    authorized_signatory: Optional[str] = None
    invoice_prefix: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account: Optional[str] = None
    bank_ifsc: Optional[str] = None

@router.get("")
async def get_site_settings():
    """Get site settings (public)"""
    settings = await db.site_settings.find_one({"setting_id": "site_settings"}, {"_id": 0})
    return settings or {}

@router.put("")
async def update_site_settings(
    settings: SiteSettingsUpdate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update site settings (admin only)"""
    await require_admin(authorization, session_token)
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    for field, value in settings.model_dump(exclude_none=True).items():
        update_data[field] = value
    
    await db.site_settings.update_one(
        {"setting_id": "site_settings"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}

@router.post("/upload-logo")
async def upload_logo(
    logo_type: str,
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Upload logo (admin only)"""
    await require_admin(authorization, session_token)
    
    if logo_type not in ["header", "footer", "favicon"]:
        raise HTTPException(status_code=400, detail="Invalid logo type")
    
    content = await file.read()
    
    try:
        result = cloudinary.uploader.upload(
            content,
            folder="paridhaan/logos",
            public_id=f"{logo_type}_logo"
        )
        
        logo_url = result.get("secure_url")
        
        # Update settings
        field_name = f"{logo_type}_logo" if logo_type != "favicon" else "favicon"
        await db.site_settings.update_one(
            {"setting_id": "site_settings"},
            {"$set": {field_name: logo_url, "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        
        return {"message": "Logo uploaded", "url": logo_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.get("/gst")
async def get_gst_settings(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get GST settings (admin only)"""
    await require_admin(authorization, session_token)
    
    settings = await db.gst_settings.find_one({"setting_id": "gst_settings"}, {"_id": 0})
    return settings or {}

@router.put("/gst")
async def update_gst_settings(
    settings: GSTSettingsUpdate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update GST settings (admin only)"""
    await require_admin(authorization, session_token)
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    for field, value in settings.model_dump(exclude_none=True).items():
        update_data[field] = value
    
    await db.gst_settings.update_one(
        {"setting_id": "gst_settings"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "GST settings updated"}
