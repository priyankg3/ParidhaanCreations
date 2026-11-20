# Uploads Router - Image and File uploads via Cloudinary
from fastapi import APIRouter, HTTPException, Header, Cookie, UploadFile, File, Form
from fastapi.responses import FileResponse
from typing import Optional, List
from datetime import datetime, timezone
import os
import cloudinary
import cloudinary.uploader
import logging

router = APIRouter(tags=["Uploads"])

db = None
require_admin = None
get_current_user = None
UPLOAD_DIR = None

def init_router(database, admin_checker, user_getter, upload_dir):
    global db, require_admin, get_current_user, UPLOAD_DIR
    db = database
    require_admin = admin_checker
    get_current_user = user_getter
    UPLOAD_DIR = upload_dir

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

@router.post("/upload/image")
async def upload_image(
    file: UploadFile = File(...),
    folder: str = Form("paridhaan/products"),
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Upload single image to Cloudinary"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid image type")
    
    content = await file.read()
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    
    try:
        result = cloudinary.uploader.upload(
            content,
            folder=folder,
            resource_type="image",
            transformation={"quality": "auto", "fetch_format": "auto"}
        )
        
        return {
            "success": True,
            "url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "width": result.get("width"),
            "height": result.get("height")
        }
    except Exception as e:
        logging.error(f"Upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/upload/images")
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    folder: str = Form("paridhaan/products"),
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Upload multiple images to Cloudinary"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    uploaded = []
    errors = []
    
    for file in files:
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            errors.append({"file": file.filename, "error": "Invalid type"})
            continue
        
        content = await file.read()
        
        if len(content) > MAX_FILE_SIZE:
            errors.append({"file": file.filename, "error": "Too large"})
            continue
        
        try:
            result = cloudinary.uploader.upload(
                content,
                folder=folder,
                resource_type="image"
            )
            uploaded.append({
                "filename": file.filename,
                "url": result.get("secure_url"),
                "public_id": result.get("public_id")
            })
        except Exception as e:
            errors.append({"file": file.filename, "error": str(e)})
    
    return {
        "uploaded": uploaded,
        "errors": errors,
        "total_uploaded": len(uploaded),
        "total_errors": len(errors)
    }

@router.get("/cloudinary/status")
async def cloudinary_status(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Check Cloudinary configuration status (admin)"""
    await require_admin(authorization, session_token)
    
    return {
        "configured": bool(os.environ.get("CLOUDINARY_URL") or os.environ.get("CLOUDINARY_CLOUD_NAME")),
        "cloud_name": os.environ.get("CLOUDINARY_CLOUD_NAME", "Not set")
    }

@router.get("/cloudinary/signature")
async def get_upload_signature(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get Cloudinary upload signature for direct uploads (admin)"""
    await require_admin(authorization, session_token)
    
    timestamp = int(datetime.now(timezone.utc).timestamp())
    
    try:
        signature = cloudinary.utils.api_sign_request(
            {"timestamp": timestamp, "folder": "paridhaan"},
            os.environ.get("CLOUDINARY_API_SECRET", "")
        )
        
        return {
            "signature": signature,
            "timestamp": timestamp,
            "cloud_name": os.environ.get("CLOUDINARY_CLOUD_NAME"),
            "api_key": os.environ.get("CLOUDINARY_API_KEY")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cloudinary/upload")
async def cloudinary_upload(
    file: UploadFile = File(...),
    folder: Optional[str] = Form("paridhaan/products"),
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Direct Cloudinary upload endpoint"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    content = await file.read()
    
    try:
        # Determine resource type
        resource_type = "image"
        if file.content_type and file.content_type.startswith("video/"):
            resource_type = "video"
        elif file.content_type and file.content_type.startswith("audio/"):
            resource_type = "video"  # Cloudinary uses 'video' for audio
        
        result = cloudinary.uploader.upload(
            content,
            folder=folder,
            resource_type=resource_type
        )
        
        return {
            "success": True,
            "url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "resource_type": result.get("resource_type"),
            "format": result.get("format"),
            "bytes": result.get("bytes")
        }
    except Exception as e:
        logging.error(f"Cloudinary upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cloudinary/{public_id:path}")
async def delete_cloudinary_asset(
    public_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete asset from Cloudinary (admin)"""
    await require_admin(authorization, session_token)
    
    try:
        result = cloudinary.uploader.destroy(public_id)
        return {"success": result.get("result") == "ok", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/uploads/{filename}")
async def serve_uploaded_file(filename: str):
    """Serve locally uploaded files"""
    if not UPLOAD_DIR:
        raise HTTPException(status_code=500, detail="Upload directory not configured")
    
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Security check
    if not str(file_path.resolve()).startswith(str(UPLOAD_DIR.resolve())):
        raise HTTPException(status_code=403, detail="Access denied")
    
    return FileResponse(file_path)

@router.delete("/upload/{filename}")
async def delete_uploaded_file(
    filename: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete locally uploaded file (admin)"""
    await require_admin(authorization, session_token)
    
    if not UPLOAD_DIR:
        raise HTTPException(status_code=500, detail="Upload directory not configured")
    
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        file_path.unlink()
        return {"message": "File deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
