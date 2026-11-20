# Category Models
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
import uuid

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[str] = None
    gst_rate: Optional[float] = 18.0  # Default GST rate for category
    hsn_code: Optional[str] = None  # HSN code for the category
    display_order: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    image: Optional[str] = None
    parent_id: Optional[str] = None
    gst_rate: Optional[float] = 18.0
    hsn_code: Optional[str] = None
