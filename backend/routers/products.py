# Products Router
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from pydantic import BaseModel

router = APIRouter(prefix="/products", tags=["Products"])

db = None

def init_router(database):
    global db
    db = database

class ProductDimensions(BaseModel):
    length: float = 10
    breadth: float = 10
    height: float = 5
    weight: float = 0.2

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

@router.get("")
async def get_products(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    featured: Optional[bool] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    badge: Optional[str] = None,
    limit: int = Query(50, le=100),
    skip: int = 0
):
    """Get products with filters"""
    query = {}
    
    if category:
        query["category"] = category
    if subcategory:
        query["subcategory"] = subcategory
    if featured is not None:
        # Check both 'featured' and 'is_featured' fields for compatibility
        query["$or"] = [{"is_featured": featured}, {"featured": featured}]
    if badge:
        query["badge"] = badge
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search.lower()]}}
        ]
    if min_price is not None or max_price is not None:
        query["price"] = {}
        if min_price is not None:
            query["price"]["$gte"] = min_price
        if max_price is not None:
            query["price"]["$lte"] = max_price
    
    products = await db.products.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    return products

@router.get("/{product_id}")
async def get_product(product_id: str):
    """Get single product by ID"""
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@router.get("/{product_id}/related")
async def get_related_products(product_id: str, limit: int = 4):
    """Get related products"""
    product = await db.products.find_one({"product_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Find products in same category
    related = await db.products.find(
        {
            "product_id": {"$ne": product_id},
            "category": product.get("category")
        },
        {"_id": 0}
    ).limit(limit).to_list(limit)
    
    # If not enough, get any products
    if len(related) < limit:
        more = await db.products.find(
            {"product_id": {"$ne": product_id, "$nin": [p["product_id"] for p in related]}},
            {"_id": 0}
        ).limit(limit - len(related)).to_list(limit - len(related))
        related.extend(more)
    
    return related
