# Cart Models
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    selected_size: Optional[str] = None
    selected_color: Optional[str] = None

class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    cart_id: str = Field(default_factory=lambda: f"cart_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None  # Optional for guest carts
    guest_session: Optional[str] = None  # For guest users
    items: List[CartItem] = []
    coupon_code: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # For abandoned cart tracking
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    recovery_email_sent: bool = False
    recovered: bool = False
