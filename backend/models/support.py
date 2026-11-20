# Support Ticket Models
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

class TicketMessage(BaseModel):
    sender: str  # 'customer' or 'admin'
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupportTicket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ticket_id: str = Field(default_factory=lambda: f"ticket_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    guest_email: Optional[str] = None
    guest_name: Optional[str] = None
    subject: str
    category: str  # order, product, payment, shipping, return, other
    order_id: Optional[str] = None
    status: str = "open"  # open, in_progress, resolved, closed
    priority: str = "normal"  # low, normal, high, urgent
    messages: List[TicketMessage] = []
    images: List[str] = []  # URLs of uploaded images
    videos: List[str] = []  # URLs of uploaded videos for return proof
    # Return request fields
    is_return_request: bool = False
    return_reason: Optional[str] = None
    return_status: Optional[str] = None  # pending_review, approved, rejected, pickup_scheduled, returned, refunded
    return_images: List[str] = []  # Images showing product condition
    admin_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketCreate(BaseModel):
    subject: str
    category: str
    message: str
    order_id: Optional[str] = None
    guest_email: Optional[str] = None
    guest_name: Optional[str] = None
    images: List[str] = []  # URLs of uploaded images
    videos: List[str] = []  # URLs of uploaded videos for return proof
    is_return_request: bool = False
    return_reason: Optional[str] = None

class TicketResponse(BaseModel):
    message: str
