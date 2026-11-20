# Collections Router
from fastapi import APIRouter, HTTPException, Header, Cookie
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/collections", tags=["Collections"])

db = None
require_admin = None

def init_router(database, admin_checker):
    global db, require_admin
    db = database
    require_admin = admin_checker

class CollectionCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    banner_url: Optional[str] = None
    collection_type: str = "manual"  # manual, seasonal, festival
    product_ids: List[str] = []
    is_featured: bool = False
    is_active: bool = True
    position: int = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    banner_url: Optional[str] = None
    collection_type: Optional[str] = None
    product_ids: Optional[List[str]] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    position: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None

@router.get("")
async def get_collections(
    collection_type: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_active: Optional[bool] = True
):
    """Get collections (public)"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    if collection_type:
        query["collection_type"] = collection_type
    if is_featured is not None:
        query["is_featured"] = is_featured
    
    now = datetime.now(timezone.utc)
    
    collections = await db.collections.find(query, {"_id": 0}).sort("position", 1).to_list(100)
    
    # Filter by date range
    valid_collections = []
    for coll in collections:
        start_date = coll.get("start_date")
        end_date = coll.get("end_date")
        
        if start_date:
            try:
                if isinstance(start_date, str):
                    start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                if start_date.tzinfo is None:
                    start_date = start_date.replace(tzinfo=timezone.utc)
                if now < start_date:
                    continue
            except Exception:
                pass
        
        if end_date:
            try:
                if isinstance(end_date, str):
                    end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                if end_date.tzinfo is None:
                    end_date = end_date.replace(tzinfo=timezone.utc)
                if now > end_date:
                    continue
            except Exception:
                pass
        
        valid_collections.append(coll)
    
    return valid_collections

@router.get("/{collection_id_or_slug}")
async def get_collection(collection_id_or_slug: str):
    """Get single collection with products"""
    collection = await db.collections.find_one(
        {"$or": [{"collection_id": collection_id_or_slug}, {"slug": collection_id_or_slug}]},
        {"_id": 0}
    )
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    # Fetch products
    product_ids = collection.get("product_ids", [])
    products = []
    if product_ids:
        products = await db.products.find(
            {"product_id": {"$in": product_ids}},
            {"_id": 0}
        ).to_list(100)
    
    collection["products"] = products
    return collection

@router.get("/{collection_id_or_slug}/products")
async def get_collection_products(collection_id_or_slug: str):
    """Get products in a collection"""
    collection = await db.collections.find_one(
        {"$or": [{"collection_id": collection_id_or_slug}, {"slug": collection_id_or_slug}]},
        {"_id": 0}
    )
    
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    product_ids = collection.get("product_ids", [])
    if not product_ids:
        return []
    
    products = await db.products.find(
        {"product_id": {"$in": product_ids}},
        {"_id": 0}
    ).to_list(100)
    
    return products

@router.post("")
async def create_collection(
    collection: CollectionCreate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create new collection (admin)"""
    await require_admin(authorization, session_token)
    
    collection_data = {
        "collection_id": f"coll_{uuid.uuid4().hex[:12]}",
        **collection.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.collections.insert_one(collection_data)
    return {"message": "Collection created", "collection_id": collection_data["collection_id"]}

@router.put("/{collection_id}")
async def update_collection(
    collection_id: str,
    collection: CollectionUpdate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update collection (admin)"""
    await require_admin(authorization, session_token)
    
    update_data = {k: v for k, v in collection.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.collections.update_one(
        {"collection_id": collection_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    updated = await db.collections.find_one({"collection_id": collection_id}, {"_id": 0})
    return updated

@router.delete("/{collection_id}")
async def delete_collection(
    collection_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete collection (admin)"""
    await require_admin(authorization, session_token)
    
    result = await db.collections.delete_one({"collection_id": collection_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    return {"message": "Collection deleted"}

@router.post("/{collection_id}/products")
async def add_products_to_collection(
    collection_id: str,
    product_ids: List[str],
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Add products to collection (admin)"""
    await require_admin(authorization, session_token)
    
    collection = await db.collections.find_one({"collection_id": collection_id})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    existing_ids = set(collection.get("product_ids", []))
    new_ids = [pid for pid in product_ids if pid not in existing_ids]
    
    if new_ids:
        await db.collections.update_one(
            {"collection_id": collection_id},
            {
                "$push": {"product_ids": {"$each": new_ids}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
    
    return {"message": f"Added {len(new_ids)} products to collection"}

@router.delete("/{collection_id}/products/{product_id}")
async def remove_product_from_collection(
    collection_id: str,
    product_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Remove product from collection (admin)"""
    await require_admin(authorization, session_token)
    
    result = await db.collections.update_one(
        {"collection_id": collection_id},
        {
            "$pull": {"product_ids": product_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    
    return {"message": "Product removed from collection"}

@router.get("/admin/all")
async def get_all_collections_admin(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get all collections including inactive (admin)"""
    await require_admin(authorization, session_token)
    
    collections = await db.collections.find({}, {"_id": 0}).sort([("position", 1), ("created_at", -1)]).to_list(200)
    
    for coll in collections:
        coll["product_count"] = len(coll.get("product_ids", []))
    
    return collections
    
    collections = await db.collections.find({}, {"_id": 0}).sort([("position", 1), ("created_at", -1)]).to_list(200)
    
    for coll in collections:
        coll["product_count"] = len(coll.get("product_ids", []))
    
    return collections
