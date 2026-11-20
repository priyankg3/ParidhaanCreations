# Orders Router
from fastapi import APIRouter, HTTPException, Header, Cookie
from typing import Optional, List, Dict
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/orders", tags=["Orders"])

db = None
get_current_user = None

def init_router(database, user_getter):
    global db, get_current_user
    db = database
    get_current_user = user_getter

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

class OrderCreate(BaseModel):
    items: List[Dict]
    shipping_address: ShippingAddress
    subtotal: float
    discount: float = 0
    shipping_cost: float = 0
    total_amount: float
    coupon_code: Optional[str] = None
    notes: Optional[str] = None

@router.get("")
async def get_user_orders(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get user's orders"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    orders = await db.orders.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return orders

@router.get("/{order_id}")
async def get_order(
    order_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get single order"""
    user = await get_current_user(authorization, session_token)
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify ownership or admin
    if user and (order.get("user_id") == user.user_id or user.is_admin):
        return order
    
    raise HTTPException(status_code=403, detail="Access denied")

@router.post("")
async def create_order(
    order_data: OrderCreate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create a new order"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Calculate GST
    gst_details = await calculate_order_gst(order_data.items, order_data.shipping_address.state)
    
    order = {
        "order_id": f"order_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        "items": order_data.items,
        "shipping_address": order_data.shipping_address.model_dump(),
        "subtotal": order_data.subtotal,
        "discount": order_data.discount,
        "shipping_cost": order_data.shipping_cost,
        "gst_details": gst_details,
        "total_amount": order_data.total_amount,
        "payment_method": "razorpay",
        "payment_status": "pending",
        "status": "pending",
        "coupon_code": order_data.coupon_code,
        "notes": order_data.notes,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order)
    
    # Clear cart
    await db.cart.delete_one({"user_id": user.user_id})
    
    return {"order_id": order["order_id"], "message": "Order created"}

async def calculate_order_gst(items: List[Dict], buyer_state: str) -> Dict:
    """Calculate GST for order items"""
    seller_state = "Rajasthan"
    is_interstate = buyer_state.lower() != seller_state.lower()
    
    gst_breakdown = []
    total_cgst = 0
    total_sgst = 0
    total_igst = 0
    
    for item in items:
        product = await db.products.find_one({"product_id": item["product_id"]})
        if not product:
            continue
        
        # Get GST rate
        gst_rate = product.get("gst_rate") or 18.0
        item_total = item.get("price", product["price"]) * item.get("quantity", 1)
        
        # Calculate GST
        gst_amount = (item_total * gst_rate) / (100 + gst_rate)
        
        if is_interstate:
            igst = gst_amount
            cgst = sgst = 0
            total_igst += igst
        else:
            cgst = sgst = gst_amount / 2
            igst = 0
            total_cgst += cgst
            total_sgst += sgst
        
        gst_breakdown.append({
            "product_id": item["product_id"],
            "gst_rate": gst_rate,
            "taxable_amount": item_total - gst_amount,
            "cgst": round(cgst, 2),
            "sgst": round(sgst, 2),
            "igst": round(igst, 2)
        })
    
    return {
        "cgst_amount": round(total_cgst, 2),
        "sgst_amount": round(total_sgst, 2),
        "igst_amount": round(total_igst, 2),
        "total_gst": round(total_cgst + total_sgst + total_igst, 2),
        "gst_breakdown": gst_breakdown,
        "is_interstate": is_interstate,
        "seller_state": seller_state,
        "buyer_state": buyer_state
    }
