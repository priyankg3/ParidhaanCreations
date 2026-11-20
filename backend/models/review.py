# Review Models
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str = Field(default_factory=lambda: f"review_{uuid.uuid4().hex[:12]}")
    product_id: str
    user_id: Optional[str] = None
    user_name: str
    rating: int  # 1-5
    title: Optional[str] = None
    comment: Optional[str] = None
    images: List[str] = []
    is_verified_purchase: bool = False
    is_approved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    product_id: str
    rating: int
    title: Optional[str] = None
    comment: Optional[str] = None
