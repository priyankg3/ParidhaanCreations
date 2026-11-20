# Wishlist Router
from fastapi import APIRouter, HTTPException, Header, Cookie
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])

db = None
get_current_user = None

def init_router(database, user_getter):
    global db, get_current_user
    db = database
    get_current_user = user_getter

@router.get("")
async def get_wishlist(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get user's wishlist with product details"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Login required to view wishlist")
    
    wishlist = await db.wishlist.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not wishlist or not wishlist.get("product_ids"):
        return {"items": [], "count": 0}
    
    # Fetch product details
    products = await db.products.find(
        {"product_id": {"$in": wishlist["product_ids"]}},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "items": products,
        "count": len(products)
    }

@router.post("/add/{product_id}")
async def add_to_wishlist(
    product_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Add product to wishlist"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Login required to use wishlist")
    
    # Check if product exists
    product = await db.products.find_one({"product_id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get or create wishlist
    wishlist = await db.wishlist.find_one({"user_id": user.user_id})
    
    if wishlist:
        if product_id in wishlist.get("product_ids", []):
            return {"message": "Product already in wishlist", "in_wishlist": True}
        
        await db.wishlist.update_one(
            {"user_id": user.user_id},
            {
                "$push": {"product_ids": product_id},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
    else:
        await db.wishlist.insert_one({
            "user_id": user.user_id,
            "product_ids": [product_id],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "Product added to wishlist", "in_wishlist": True}

@router.delete("/remove/{product_id}")
async def remove_from_wishlist(
    product_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Remove product from wishlist"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    
    await db.wishlist.update_one(
        {"user_id": user.user_id},
        {
            "$pull": {"product_ids": product_id},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"message": "Product removed from wishlist", "in_wishlist": False}

@router.get("/check/{product_id}")
async def check_wishlist(
    product_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Check if product is in wishlist"""
    user = await get_current_user(authorization, session_token)
    if not user:
        return {"in_wishlist": False}
    
    wishlist = await db.wishlist.find_one({"user_id": user.user_id})
    
    in_wishlist = wishlist and product_id in wishlist.get("product_ids", [])
    
    return {"in_wishlist": in_wishlist}
