# Categories Router
from fastapi import APIRouter, HTTPException, Header, Cookie
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/categories", tags=["Categories"])

db = None
require_admin = None

def init_router(database, admin_checker):
    global db, require_admin
    db = database
    require_admin = admin_checker

class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: str
    image: str
    parent_id: Optional[str] = None
    display_order: int = 0
    gst_rate: Optional[float] = None
    hsn_code: Optional[str] = None

@router.get("")
async def get_categories():
    """Get all categories with hierarchical structure"""
    categories = await db.categories.find({}, {"_id": 0}).sort("display_order", 1).to_list(100)
    
    # Build hierarchical structure
    parent_categories = [c for c in categories if not c.get("parent_id")]
    
    # Add subcategories to each parent
    for parent in parent_categories:
        parent["subcategories"] = [
            c for c in categories if c.get("parent_id") == parent["category_id"]
        ]
    
    return parent_categories

@router.get("/all")
async def get_all_categories_flat():
    """Get all categories as flat list (for admin)"""
    categories = await db.categories.find({}, {"_id": 0}).sort("display_order", 1).to_list(100)
    return categories

@router.post("")
async def create_category(
    category: CategoryCreate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create a new category (admin only)"""
    await require_admin(authorization, session_token)
    
    # Check if slug exists
    existing = await db.categories.find_one({"slug": category.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Category slug already exists")
    
    category_data = {
        "category_id": f"cat_{uuid.uuid4().hex[:12]}",
        "name": category.name,
        "slug": category.slug,
        "description": category.description,
        "image": category.image,
        "parent_id": category.parent_id,
        "display_order": category.display_order,
        "gst_rate": category.gst_rate,
        "hsn_code": category.hsn_code,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.categories.insert_one(category_data)
    return {"message": "Category created", "category_id": category_data["category_id"]}

@router.put("/{category_id}")
async def update_category(
    category_id: str,
    category: CategoryCreate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update a category (admin only)"""
    await require_admin(authorization, session_token)
    
    result = await db.categories.update_one(
        {"category_id": category_id},
        {"$set": {
            "name": category.name,
            "slug": category.slug,
            "description": category.description,
            "image": category.image,
            "parent_id": category.parent_id,
            "display_order": category.display_order,
            "gst_rate": category.gst_rate,
            "hsn_code": category.hsn_code
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category updated"}

@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete a category (admin only)"""
    await require_admin(authorization, session_token)
    
    result = await db.categories.delete_one({"category_id": category_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category deleted"}
