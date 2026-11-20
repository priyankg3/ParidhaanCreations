# Media Router - Showcase Videos, Background Music
from fastapi import APIRouter, HTTPException, Header, Cookie, UploadFile, File, Form
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging
import cloudinary
import cloudinary.uploader

router = APIRouter(tags=["Media"])

db = None
require_admin = None

def init_router(database, admin_checker):
    global db, require_admin
    db = database
    require_admin = admin_checker

# ============ SHOWCASE VIDEOS (Previously Instagram) ============

@router.get("/instagram-videos")
async def get_showcase_videos():
    """Get all active showcase videos (public)"""
    videos = await db.instagram_videos.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("display_order", 1).to_list(20)
    return videos

@router.get("/showcase-videos")
async def get_showcase_videos_v2():
    """Get all active showcase videos (public) - new endpoint"""
    videos = await db.instagram_videos.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("display_order", 1).to_list(20)
    return videos

@router.post("/admin/showcase-videos/upload")
async def upload_showcase_video(
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Upload a new showcase video (admin only)"""
    await require_admin(authorization, session_token)
    
    # Validate file type
    allowed_types = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/mov"]
    content_type = file.content_type or ""
    
    if not any(t in content_type for t in ["video/", "application/octet-stream"]):
        raise HTTPException(status_code=400, detail=f"Invalid file type: {content_type}. Only video files allowed.")
    
    try:
        content = await file.read()
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            content,
            folder="paridhaan/showcase_videos",
            resource_type="video",
            eager=[
                {"width": 400, "height": 600, "crop": "fill", "format": "jpg"},  # Thumbnail
            ],
            eager_async=True
        )
        
        video_url = result.get("secure_url")
        
        # Generate thumbnail URL (Cloudinary auto-generates)
        thumbnail_url = video_url.replace("/upload/", "/upload/w_400,h_600,c_fill/").replace(".mp4", ".jpg").replace(".mov", ".jpg").replace(".webm", ".jpg")
        
        # Get current count for display order
        count = await db.instagram_videos.count_documents({})
        
        video_data = {
            "video_id": f"showcase_{uuid.uuid4().hex[:12]}",
            "thumbnail_url": thumbnail_url,
            "video_url": video_url,
            "instagram_url": None,  # No longer required
            "caption": caption,
            "is_active": True,
            "display_order": count,
            "duration": result.get("duration"),
            "public_id": result.get("public_id"),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.instagram_videos.insert_one(video_data)
        
        return {
            "message": "Video uploaded successfully",
            "video_id": video_data["video_id"],
            "video_url": video_url,
            "thumbnail_url": thumbnail_url
        }
        
    except Exception as e:
        logging.error(f"Video upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/instagram-videos")
async def create_instagram_video(
    thumbnail_url: str,
    instagram_url: Optional[str] = None,
    video_url: Optional[str] = None,
    caption: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Add new showcase video with URLs (admin only) - legacy endpoint"""
    await require_admin(authorization, session_token)
    
    count = await db.instagram_videos.count_documents({})
    
    video_data = {
        "video_id": f"showcase_{uuid.uuid4().hex[:12]}",
        "thumbnail_url": thumbnail_url,
        "video_url": video_url,
        "instagram_url": instagram_url,
        "caption": caption,
        "is_active": True,
        "display_order": count,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.instagram_videos.insert_one(video_data)
    return {"message": "Video added", "video_id": video_data["video_id"]}

@router.put("/admin/showcase-videos/{video_id}")
async def update_showcase_video(
    video_id: str,
    caption: Optional[str] = None,
    is_active: Optional[bool] = None,
    display_order: Optional[int] = None,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update showcase video (admin only)"""
    await require_admin(authorization, session_token)
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if caption is not None:
        update_data["caption"] = caption
    if is_active is not None:
        update_data["is_active"] = is_active
    if display_order is not None:
        update_data["display_order"] = display_order
    
    result = await db.instagram_videos.update_one(
        {"video_id": video_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return {"message": "Video updated"}

@router.delete("/instagram-videos/{video_id}")
async def delete_instagram_video(
    video_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete showcase video (admin only)"""
    await require_admin(authorization, session_token)
    
    # Get video to delete from Cloudinary too
    video = await db.instagram_videos.find_one({"video_id": video_id})
    if video and video.get("public_id"):
        try:
            cloudinary.uploader.destroy(video["public_id"], resource_type="video")
        except:
            pass
    
    result = await db.instagram_videos.delete_one({"video_id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    
    return {"message": "Video deleted"}

# ============ BACKGROUND MUSIC ============

@router.get("/background-music")
async def get_background_music():
    """Get all active background music tracks (public)"""
    tracks = await db.background_music.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("display_order", 1).to_list(100)
    return tracks

@router.post("/admin/background-music")
async def upload_background_music(
    file: UploadFile = File(...),
    title: str = Form(...),
    artist: Optional[str] = Form(None),
    display_order: int = Form(0),
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Upload new background music track (admin only)"""
    await require_admin(authorization, session_token)
    
    # Validate file type - be lenient
    content = await file.read()
    
    try:
        result = cloudinary.uploader.upload(
            content,
            folder="paridhaan/music",
            resource_type="video"  # Cloudinary uses 'video' for audio
        )
        
        track_data = {
            "music_id": f"music_{uuid.uuid4().hex[:12]}",
            "title": title,
            "artist": artist,
            "audio_url": result.get("secure_url"),
            "public_id": result.get("public_id"),
            "duration": result.get("duration"),
            "display_order": display_order,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.background_music.insert_one(track_data)
        
        return {
            "message": "Music track uploaded successfully",
            "music_id": track_data["music_id"],
            "audio_url": track_data["audio_url"]
        }
        
    except Exception as e:
        logging.error(f"Music upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.put("/admin/background-music/{music_id}")
async def update_background_music(
    music_id: str,
    is_active: bool = True,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update music track status (admin only)"""
    await require_admin(authorization, session_token)
    
    result = await db.background_music.update_one(
        {"music_id": music_id},
        {"$set": {"is_active": is_active, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Track not found")
    
    return {"message": "Track updated"}

@router.delete("/admin/background-music/{music_id}")
async def delete_background_music(
    music_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete music track (admin only)"""
    await require_admin(authorization, session_token)
    
    track = await db.background_music.find_one({"music_id": music_id})
    if track and track.get("public_id"):
        try:
            cloudinary.uploader.destroy(track["public_id"], resource_type="video")
        except:
            pass
    
    result = await db.background_music.delete_one({"music_id": music_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Track not found")
    
    return {"message": "Track deleted"}
