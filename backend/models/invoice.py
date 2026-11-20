# Invoice Models
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

class Invoice(BaseModel):
    """Tax Invoice model for GST compliance"""
    model_config = ConfigDict(extra="ignore")
    invoice_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    invoice_number: str  # Sequential number like PC-2024-0001
    order_id: str
    # Seller details
    seller_name: str = "Paridhaan Creations"
    seller_gstin: Optional[str] = None
    seller_address: Optional[str] = None
    seller_state: str = "Rajasthan"
    seller_state_code: str = "08"
    # Buyer details
    buyer_name: str
    buyer_address: str
    buyer_city: str
    buyer_state: str
    buyer_state_code: Optional[str] = None
    buyer_pincode: str
    buyer_phone: Optional[str] = None
    buyer_email: Optional[str] = None
    buyer_gstin: Optional[str] = None  # If B2B
    # Items
    items: List[Dict[str, Any]] = []
    # Amounts
    subtotal: float = 0
    discount: float = 0
    shipping: float = 0
    cgst_total: float = 0
    sgst_total: float = 0
    igst_total: float = 0
    total_tax: float = 0
    grand_total: float = 0
    amount_in_words: Optional[str] = None
    # Metadata
    invoice_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_date: Optional[datetime] = None
    payment_status: str = "paid"
    notes: Optional[str] = None
    terms: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
