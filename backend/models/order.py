# Order Models
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

class OrderItem(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int
    image: Optional[str] = None
    selected_size: Optional[str] = None
    selected_color: Optional[str] = None
    gst_rate: Optional[float] = None  # GST rate applied
    hsn_code: Optional[str] = None  # HSN code
    cgst_amount: Optional[float] = None  # Central GST
    sgst_amount: Optional[float] = None  # State GST
    igst_amount: Optional[float] = None  # Inter-state GST (if applicable)

class GSTDetails(BaseModel):
    """GST breakdown for the order"""
    model_config = ConfigDict(extra="ignore")
    cgst_amount: float = 0  # Central GST
    sgst_amount: float = 0  # State GST (same state)
    igst_amount: float = 0  # Interstate GST (different state)
    total_gst: float = 0
    gst_breakdown: List[Dict[str, Any]] = []  # Item-wise GST breakdown
    is_interstate: bool = False
    seller_state: str = "Rajasthan"
    buyer_state: Optional[str] = None

class ShippingAddress(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    country: str = "India"

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    order_id: str = Field(default_factory=lambda: f"order_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    items: List[OrderItem] = []
    shipping_address: Optional[ShippingAddress] = None
    subtotal: float = 0
    discount: float = 0
    shipping_cost: float = 0
    gst_details: Optional[GSTDetails] = None
    total_amount: float = 0
    payment_method: str = "razorpay"
    payment_status: str = "pending"
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    status: str = "pending"  # pending, confirmed, processing, shipped, delivered, cancelled
    coupon_code: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    items: List[Dict]
    shipping_address: ShippingAddress
    subtotal: float
    discount: float = 0
    shipping_cost: float = 0
    total_amount: float
    coupon_code: Optional[str] = None
    notes: Optional[str] = None
