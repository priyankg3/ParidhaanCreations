# Banner Models
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict
from datetime import datetime, timezone
import uuid

class Banner(BaseModel):
    """Banner model with placement support and comprehensive options"""
    model_config = ConfigDict(extra="ignore")
    banner_id: str = Field(default_factory=lambda: f"banner_{uuid.uuid4().hex[:12]}")
    title: str
    subtitle: Optional[str] = None
    image: str
    link_type: str = "none"  # none, product, category, collection, external
    link_url: Optional[str] = None  # External URL
    link_product_id: Optional[str] = None  # Link to specific product
    link_category_id: Optional[str] = None  # Link to specific category
    link_collection_id: Optional[str] = None  # Link to specific collection
    button_text: Optional[str] = None  # CTA button text
    button_style: str = "primary"  # primary, secondary, outline
    text_position: str = "left"  # left, center, right
    text_color: str = "#ffffff"
    overlay_opacity: float = 0.3  # 0-1 for background overlay
    placement: str = "hero"  # Where the banner appears
    # placements: hero, below_hero, category_top, category_bottom, product_sidebar, 
    #            cart_top, checkout, footer_above, popup
    display_order: int = 0  # Order within placement group
    is_active: bool = True
    start_date: Optional[str] = None  # ISO date string
    end_date: Optional[str] = None  # ISO date string
    target_audience: str = "all"  # all, new_users, returning_users
    device_type: str = "all"  # all, mobile, desktop
    # Analytics
    impressions: int = 0
    clicks: int = 0
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BannerCreate(BaseModel):
    title: str
    subtitle: Optional[str] = None
    image: str
    link_type: str = "none"
    link_url: Optional[str] = None
    link_product_id: Optional[str] = None
    link_category_id: Optional[str] = None
    link_collection_id: Optional[str] = None
    button_text: Optional[str] = None
    button_style: str = "primary"
    text_position: str = "left"
    text_color: str = "#ffffff"
    overlay_opacity: float = 0.3
    placement: str = "hero"
    display_order: int = 0
    is_active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    target_audience: str = "all"
    device_type: str = "all"

class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image: Optional[str] = None
    link_type: Optional[str] = None
    link_url: Optional[str] = None
    link_product_id: Optional[str] = None
    link_category_id: Optional[str] = None
    link_collection_id: Optional[str] = None
    button_text: Optional[str] = None
    button_style: Optional[str] = None
    text_position: Optional[str] = None
    text_color: Optional[str] = None
    overlay_opacity: Optional[float] = None
    placement: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    target_audience: Optional[str] = None
    device_type: Optional[str] = None
