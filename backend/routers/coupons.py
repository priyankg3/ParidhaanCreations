# Coupons Router
from fastapi import APIRouter, HTTPException, Header, Cookie
from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/coupons", tags=["Coupons"])

db = None
require_admin = None
get_current_user = None

def init_router(database, admin_checker, user_getter):
    global db, require_admin, get_current_user
    db = database
    require_admin = admin_checker
    get_current_user = user_getter

class CouponCreate(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: str = "percentage"  # percentage, fixed
    discount_value: float
    min_order_amount: float = 0
    max_discount: Optional[float] = None
    usage_limit: Optional[int] = None
    per_user_limit: int = 1
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    is_active: bool = True
    applicable_categories: List[str] = []
    applicable_products: List[str] = []
    first_order_only: bool = False

class CouponValidate(BaseModel):
    code: str
    cart_total: float
    user_id: Optional[str] = None

@router.post("/validate")
async def validate_coupon(coupon_data: CouponValidate):
    """Validate a coupon code"""
    coupon = await db.coupons.find_one({"code": coupon_data.code.upper()}, {"_id": 0})
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    
    if not coupon.get("is_active"):
        raise HTTPException(status_code=400, detail="Coupon is no longer active")
    
    # Check validity dates
    now = datetime.now(timezone.utc)
    
    if coupon.get("valid_from"):
        valid_from = coupon["valid_from"]
        if isinstance(valid_from, str):
            valid_from = datetime.fromisoformat(valid_from.replace('Z', '+00:00'))
        if now < valid_from:
            raise HTTPException(status_code=400, detail="Coupon is not yet active")
    
    if coupon.get("valid_until"):
        valid_until = coupon["valid_until"]
        if isinstance(valid_until, str):
            valid_until = datetime.fromisoformat(valid_until.replace('Z', '+00:00'))
        if now > valid_until:
            raise HTTPException(status_code=400, detail="Coupon has expired")
    
    # Check minimum order amount
    if coupon_data.cart_total < coupon.get("min_order_amount", 0):
        min_amount = coupon.get("min_order_amount", 0)
        raise HTTPException(
            status_code=400,
            detail=f"Minimum order amount of ₹{min_amount} required"
        )
    
    # Check usage limit
    if coupon.get("usage_limit") and coupon.get("usage_count", 0) >= coupon["usage_limit"]:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    
    # Check per-user limit
    if coupon_data.user_id and coupon.get("per_user_limit"):
        user_usage = await db.orders.count_documents({
            "user_id": coupon_data.user_id,
            "coupon_code": coupon["code"],
            "payment_status": "paid"
        })
        if user_usage >= coupon["per_user_limit"]:
            raise HTTPException(status_code=400, detail="You have already used this coupon")
    
    # Check first order only
    if coupon.get("first_order_only") and coupon_data.user_id:
        previous_orders = await db.orders.count_documents({
            "user_id": coupon_data.user_id,
            "payment_status": "paid"
        })
        if previous_orders > 0:
            raise HTTPException(status_code=400, detail="This coupon is for first-time buyers only")
    
    # Calculate discount
    if coupon["discount_type"] == "percentage":
        discount = (coupon_data.cart_total * coupon["discount_value"]) / 100
        if coupon.get("max_discount"):
            discount = min(discount, coupon["max_discount"])
    else:
        discount = coupon["discount_value"]
    
    return {
        "valid": True,
        "code": coupon["code"],
        "discount_type": coupon["discount_type"],
        "discount_value": coupon["discount_value"],
        "calculated_discount": round(discount, 2),
        "description": coupon.get("description"),
        "min_order_amount": coupon.get("min_order_amount", 0)
    }

@router.get("/user/first-time-buyer")
async def check_first_time_buyer(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Check if current user is a first-time buyer"""
    user = await get_current_user(authorization, session_token)
    
    if not user:
        return {"is_first_time_buyer": True, "message": "Guest users are considered first-time buyers"}
    
    # Check for previous paid orders
    previous_orders = await db.orders.count_documents({
        "user_id": user.user_id,
        "payment_status": "paid"
    })
    
    is_first_time = previous_orders == 0
    
    # Get applicable first-order coupons if first-time buyer
    first_order_coupons = []
    if is_first_time:
        coupons = await db.coupons.find({
            "first_order_only": True,
            "is_active": True
        }, {"_id": 0, "code": 1, "description": 1, "discount_type": 1, "discount_value": 1}).to_list(5)
        first_order_coupons = coupons
    
    return {
        "is_first_time_buyer": is_first_time,
        "order_count": previous_orders,
        "available_coupons": first_order_coupons
    }

@router.post("")
async def create_coupon(
    coupon: CouponCreate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create new coupon (admin)"""
    await require_admin(authorization, session_token)
    
    # Check if code exists
    existing = await db.coupons.find_one({"code": coupon.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    coupon_data = {
        "coupon_id": f"coupon_{uuid.uuid4().hex[:12]}",
        **coupon.model_dump(),
        "code": coupon.code.upper(),
        "usage_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.coupons.insert_one(coupon_data)
    return {"message": "Coupon created", "coupon_id": coupon_data["coupon_id"]}

@router.get("")
async def get_coupons(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get all coupons (admin)"""
    await require_admin(authorization, session_token)
    coupons = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return coupons

@router.get("/{coupon_id}")
async def get_coupon(
    coupon_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get single coupon (admin)"""
    await require_admin(authorization, session_token)
    
    coupon = await db.coupons.find_one({"coupon_id": coupon_id}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    return coupon

@router.put("/{coupon_id}")
async def update_coupon(
    coupon_id: str,
    coupon_update: CouponCreate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update coupon (admin)"""
    await require_admin(authorization, session_token)
    
    update_data = coupon_update.model_dump()
    update_data["code"] = update_data["code"].upper()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.coupons.update_one(
        {"coupon_id": coupon_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    return {"message": "Coupon updated"}

@router.delete("/{coupon_id}")
async def delete_coupon(
    coupon_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete coupon (admin)"""
    await require_admin(authorization, session_token)
    
    result = await db.coupons.delete_one({"coupon_id": coupon_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    return {"message": "Coupon deleted"}
