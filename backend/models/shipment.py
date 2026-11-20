# Shipment Models
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

class Shipment(BaseModel):
    """Shipment tracking model for Shiprocket integration"""
    model_config = ConfigDict(extra="ignore")
    shipment_id: str = Field(default_factory=lambda: f"ship_{uuid.uuid4().hex[:12]}")
    order_id: str
    shiprocket_order_id: Optional[str] = None
    shiprocket_shipment_id: Optional[str] = None
    awb_code: Optional[str] = None  # Airway Bill code for tracking
    courier_company: Optional[str] = None
    courier_id: Optional[int] = None
    status: str = "pending"  # pending, pickup_scheduled, picked_up, in_transit, delivered, cancelled
    pickup_date: Optional[str] = None
    delivered_date: Optional[str] = None
    tracking_url: Optional[str] = None
    tracking_history: List[Dict[str, Any]] = []
    label_url: Optional[str] = None  # Shipping label PDF URL
    manifest_url: Optional[str] = None  # Manifest PDF URL
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
