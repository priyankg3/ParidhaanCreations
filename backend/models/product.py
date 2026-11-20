# Product Models
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid

class ProductDimensions(BaseModel):
    """Product dimensions for shipping calculations"""
    model_config = ConfigDict(extra="ignore")
    length: float = 10  # in cm
    breadth: float = 10  # in cm
    height: float = 5   # in cm
    weight: float = 0.2  # in kg

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str = Field(default_factory=lambda: f"prod_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    price: float
    compare_at_price: Optional[float] = None  # Original price for showing discount
    cost_price: Optional[float] = None  # Cost for profit calculations
    category_id: Optional[str] = None
    images: List[str] = []
    stock: int = 0
    sku: Optional[str] = None  # Stock Keeping Unit
    barcode: Optional[str] = None  # Product barcode
    is_featured: bool = False
    badge: Optional[str] = None  # NEW_ARRIVAL, HOT, TRENDING, BESTSELLER, LIMITED, SALE, FEATURED, OUT_OF_STOCK
    laddu_gopal_size: Optional[str] = None  # For Laddu Gopal dresses
    colors: List[str] = []  # Available colors
    sizes: List[str] = []  # Available sizes
    material: Optional[str] = None
    dimensions: ProductDimensions = Field(default_factory=ProductDimensions)
    gst_rate: Optional[float] = None  # Product-specific GST rate (overrides category)
    hsn_code: Optional[str] = None  # HSN code for GST
    tags: List[str] = []  # Product tags for search
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    compare_at_price: Optional[float] = None
    cost_price: Optional[float] = None
    category_id: Optional[str] = None
    images: List[str] = []
    stock: int = 0
    sku: Optional[str] = None
    barcode: Optional[str] = None
    is_featured: bool = False
    badge: Optional[str] = None
    laddu_gopal_size: Optional[str] = None
    colors: List[str] = []
    sizes: List[str] = []
    material: Optional[str] = None
    length: Optional[float] = 10
    breadth: Optional[float] = 10
    height: Optional[float] = 5
    weight: Optional[float] = 0.2
    gst_rate: Optional[float] = None
    hsn_code: Optional[str] = None
    tags: List[str] = []
