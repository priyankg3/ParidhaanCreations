# Coupon Models
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class Coupon(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coupon_id: str = Field(default_factory=lambda: f"coupon_{uuid.uuid4().hex[:12]}")
    code: str
    discount_type: str = "percentage"  # percentage, fixed
    discount_value: float
    min_order_amount: float = 0
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    used_count: int = 0
    is_active: bool = True
    expires_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CouponCreate(BaseModel):
    code: str
    discount_type: str = "percentage"
    discount_value: float
    min_order_amount: float = 0
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    expires_at: Optional[str] = None

class CouponValidate(BaseModel):
    code: str
    cart_total: float
