# Support Router
from fastapi import APIRouter, HTTPException, Header, Cookie, UploadFile, File
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid
import cloudinary
import cloudinary.uploader

router = APIRouter(prefix="/support", tags=["Support"])

db = None
get_current_user = None

def init_router(database, user_getter):
    global db, get_current_user
    db = database
    get_current_user = user_getter

class TicketCreate(BaseModel):
    subject: str
    category: str
    message: str
    order_id: Optional[str] = None
    guest_email: Optional[str] = None
    guest_name: Optional[str] = None
    images: List[str] = []
    videos: List[str] = []
    is_return_request: bool = False
    return_reason: Optional[str] = None

class TicketReply(BaseModel):
    message: str

@router.get("/tickets")
async def get_user_tickets(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get user's support tickets"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    tickets = await db.support_tickets.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return tickets

@router.get("/tickets/{ticket_id}")
async def get_ticket(
    ticket_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get single ticket"""
    user = await get_current_user(authorization, session_token)
    
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Verify ownership or admin
    if user and (ticket.get("user_id") == user.user_id or user.is_admin):
        return ticket
    
    raise HTTPException(status_code=403, detail="Access denied")

@router.post("/tickets")
async def create_ticket(
    ticket_data: TicketCreate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create a new support ticket"""
    user = await get_current_user(authorization, session_token)
    
    # For return requests, verify order exists
    if ticket_data.is_return_request and ticket_data.order_id:
        order = await db.orders.find_one({"order_id": ticket_data.order_id})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        # Check video requirement
        site_settings = await db.site_settings.find_one({"setting_id": "site_settings"})
        if site_settings and site_settings.get("video_required_for_returns", True):
            if not ticket_data.videos or len(ticket_data.videos) == 0:
                raise HTTPException(
                    status_code=400, 
                    detail="Video proof is required for return requests"
                )
    
    ticket = {
        "ticket_id": f"ticket_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id if user else None,
        "guest_email": ticket_data.guest_email if not user else None,
        "guest_name": ticket_data.guest_name if not user else None,
        "subject": ticket_data.subject,
        "category": ticket_data.category,
        "order_id": ticket_data.order_id,
        "status": "open",
        "priority": "high" if ticket_data.is_return_request else "normal",
        "images": ticket_data.images,
        "videos": ticket_data.videos,
        "is_return_request": ticket_data.is_return_request,
        "return_reason": ticket_data.return_reason,
        "return_status": "pending_review" if ticket_data.is_return_request else None,
        "messages": [{
            "sender": "customer",
            "message": ticket_data.message,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.support_tickets.insert_one(ticket)
    return {"ticket_id": ticket["ticket_id"], "message": "Ticket created successfully"}

@router.post("/tickets/{ticket_id}/reply")
async def reply_to_ticket(
    ticket_id: str,
    reply: TicketReply,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Add reply to ticket"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Verify ownership
    if ticket.get("user_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    message = {
        "sender": "customer",
        "message": reply.message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {
            "$push": {"messages": message},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Reply added"}

@router.post("/upload-image")
async def upload_support_image(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Upload image for support ticket"""
    await get_current_user(authorization, session_token)  # Auth check
    
    content = await file.read()
    
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="Image too large")
    
    try:
        result = cloudinary.uploader.upload(
            content,
            folder="paridhaan/support_images",
            resource_type="image"
        )
        return {"image_url": result.get("secure_url")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@router.post("/upload-video")
async def upload_support_video(
    file: UploadFile = File(...),
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Upload video for return proof"""
    await get_current_user(authorization, session_token)  # Auth check
    
    allowed_types = ["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid video type")
    
    content = await file.read()
    
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="Video too large (max 50MB)")
    
    try:
        result = cloudinary.uploader.upload(
            content,
            folder="paridhaan/support_videos",
            resource_type="video",
            chunk_size=6000000
        )
        return {"video_url": result.get("secure_url")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
