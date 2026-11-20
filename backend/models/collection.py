# Collection Models
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid

class Collection(BaseModel):
    """Collection for grouping products (festivals, occasions, themes)"""
    model_config = ConfigDict(extra="ignore")
    collection_id: str = Field(default_factory=lambda: f"coll_{uuid.uuid4().hex[:12]}")
    name: str
    slug: str  # URL-friendly name
    description: Optional[str] = None
    image: Optional[str] = None  # Collection banner/thumbnail
    collection_type: str = "festival"  # festival, occasion, seasonal, curated
    badge: Optional[str] = None  # FESTIVE, NEW, HOT, etc.
    product_ids: List[str] = []  # Products in this collection
    is_active: bool = True
    display_order: int = 0
    start_date: Optional[str] = None  # For seasonal collections
    end_date: Optional[str] = None
    # SEO fields
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CollectionCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image: Optional[str] = None
    collection_type: str = "festival"
    badge: Optional[str] = None
    product_ids: List[str] = []
    is_active: bool = True
    display_order: int = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    collection_type: Optional[str] = None
    badge: Optional[str] = None
    product_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None
    display_order: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
