# Cart Router
from fastapi import APIRouter, HTTPException, Header, Cookie, Response
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/cart", tags=["Cart"])

db = None
get_current_user = None

def init_router(database, user_getter):
    global db, get_current_user
    db = database
    get_current_user = user_getter

class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = 1
    selected_size: Optional[str] = None
    selected_color: Optional[str] = None

class CartItemUpdate(BaseModel):
    quantity: int

@router.get("")
async def get_cart(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get user's cart"""
    user = await get_current_user(authorization, session_token)
    
    if user:
        cart = await db.cart.find_one({"user_id": user.user_id}, {"_id": 0})
    else:
        # Guest cart using session
        cart = await db.cart.find_one({"guest_session": session_token}, {"_id": 0}) if session_token else None
    
    if not cart:
        return {"cart_id": None, "items": [], "total": 0}
    
    # Populate product details
    populated_items = []
    for item in cart.get("items", []):
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if product:
            populated_items.append({
                **item,
                "product": product
            })
    
    cart["items"] = populated_items
    return cart

@router.post("/add")
async def add_to_cart(
    item: CartItemAdd,
    response: Response,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Add item to cart"""
    user = await get_current_user(authorization, session_token)
    
    # Check if product exists
    product = await db.products.find_one({"product_id": item.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Find or create cart
    if user:
        cart = await db.cart.find_one({"user_id": user.user_id})
        cart_query = {"user_id": user.user_id}
    else:
        if not session_token:
            session_token = f"guest_{uuid.uuid4().hex}"
            response.set_cookie(
                key="session_token",
                value=session_token,
                httponly=True,
                secure=True,
                samesite="none",
                max_age=60 * 60 * 24 * 30
            )
        cart = await db.cart.find_one({"guest_session": session_token})
        cart_query = {"guest_session": session_token}
    
    cart_item = {
        "product_id": item.product_id,
        "quantity": item.quantity,
        "selected_size": item.selected_size,
        "selected_color": item.selected_color
    }
    
    if cart:
        # Check if item already in cart
        existing_idx = None
        for idx, existing_item in enumerate(cart.get("items", [])):
            if (existing_item["product_id"] == item.product_id and
                existing_item.get("selected_size") == item.selected_size and
                existing_item.get("selected_color") == item.selected_color):
                existing_idx = idx
                break
        
        if existing_idx is not None:
            # Update quantity
            await db.cart.update_one(
                cart_query,
                {"$inc": {f"items.{existing_idx}.quantity": item.quantity}}
            )
        else:
            # Add new item
            await db.cart.update_one(
                cart_query,
                {
                    "$push": {"items": cart_item},
                    "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
                }
            )
    else:
        # Create new cart
        new_cart = {
            "cart_id": f"cart_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id if user else None,
            "guest_session": session_token if not user else None,
            "items": [cart_item],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.cart.insert_one(new_cart)
    
    return {"message": "Item added to cart"}

@router.put("/item/{product_id}")
async def update_cart_item(
    product_id: str,
    update: CartItemUpdate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update cart item quantity"""
    user = await get_current_user(authorization, session_token)
    
    if user:
        cart_query = {"user_id": user.user_id}
    else:
        cart_query = {"guest_session": session_token}
    
    cart = await db.cart.find_one(cart_query)
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    # Find item index
    item_idx = None
    for idx, item in enumerate(cart.get("items", [])):
        if item["product_id"] == product_id:
            item_idx = idx
            break
    
    if item_idx is None:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    
    if update.quantity <= 0:
        # Remove item
        await db.cart.update_one(
            cart_query,
            {"$pull": {"items": {"product_id": product_id}}}
        )
    else:
        # Update quantity
        await db.cart.update_one(
            cart_query,
            {"$set": {f"items.{item_idx}.quantity": update.quantity}}
        )
    
    return {"message": "Cart updated"}

@router.delete("/item/{product_id}")
async def remove_from_cart(
    product_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Remove item from cart"""
    user = await get_current_user(authorization, session_token)
    
    if user:
        cart_query = {"user_id": user.user_id}
    else:
        cart_query = {"guest_session": session_token}
    
    await db.cart.update_one(
        cart_query,
        {"$pull": {"items": {"product_id": product_id}}}
    )
    
    return {"message": "Item removed from cart"}

@router.delete("")
async def clear_cart(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Clear entire cart"""
    user = await get_current_user(authorization, session_token)
    
    if user:
        await db.cart.delete_one({"user_id": user.user_id})
    else:
        await db.cart.delete_one({"guest_session": session_token})
    
    return {"message": "Cart cleared"}
