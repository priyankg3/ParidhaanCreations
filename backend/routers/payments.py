# Payments Router - Razorpay Integration
from fastapi import APIRouter, HTTPException, Header, Cookie, Request
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import os
import hmac
import hashlib
import razorpay
import logging

router = APIRouter(prefix="/payments", tags=["Payments"])

db = None
get_current_user = None

# Razorpay client
razorpay_client = None

def init_router(database, user_getter):
    global db, get_current_user, razorpay_client
    db = database
    get_current_user = user_getter
    
    # Initialize Razorpay
    key_id = os.environ.get("RAZORPAY_KEY_ID")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    if key_id and key_secret:
        razorpay_client = razorpay.Client(auth=(key_id, key_secret))

class RazorpayOrderCreate(BaseModel):
    order_id: str

class RazorpayVerify(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    order_id: str

@router.post("/razorpay/create")
async def create_razorpay_order(
    data: RazorpayOrderCreate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create Razorpay order for payment"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if not razorpay_client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    
    # Get order
    order = await db.orders.find_one({"order_id": data.order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify ownership
    if order.get("user_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Create Razorpay order
        razorpay_order = razorpay_client.order.create({
            "amount": int(order["total_amount"] * 100),  # Amount in paise
            "currency": "INR",
            "receipt": data.order_id,
            "notes": {
                "order_id": data.order_id,
                "user_id": user.user_id
            }
        })
        
        # Update order with Razorpay order ID
        await db.orders.update_one(
            {"order_id": data.order_id},
            {"$set": {"razorpay_order_id": razorpay_order["id"]}}
        )
        
        return {
            "razorpay_order_id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "key_id": os.environ.get("RAZORPAY_KEY_ID")
        }
        
    except Exception as e:
        logging.error(f"Razorpay order creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create payment order")

@router.post("/razorpay/verify")
async def verify_razorpay_payment(
    data: RazorpayVerify,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Verify Razorpay payment signature"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Verify signature
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
    message = f"{data.razorpay_order_id}|{data.razorpay_payment_id}"
    
    expected_signature = hmac.new(
        key_secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    if expected_signature != data.razorpay_signature:
        # Update order as failed
        await db.orders.update_one(
            {"order_id": data.order_id},
            {"$set": {
                "payment_status": "failed",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        raise HTTPException(status_code=400, detail="Payment verification failed")
    
    # Payment successful
    await db.orders.update_one(
        {"order_id": data.order_id},
        {"$set": {
            "payment_status": "paid",
            "razorpay_payment_id": data.razorpay_payment_id,
            "status": "confirmed",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update product stock
    order = await db.orders.find_one({"order_id": data.order_id})
    if order:
        for item in order.get("items", []):
            await db.products.update_one(
                {"product_id": item["product_id"]},
                {"$inc": {"stock": -item.get("quantity", 1)}}
            )
    
    return {"message": "Payment verified successfully", "status": "success"}

@router.post("/razorpay/webhook")
async def razorpay_webhook(request: Request):
    """Handle Razorpay webhooks"""
    try:
        payload = await request.json()
        event = payload.get("event")
        
        if event == "payment.captured":
            payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment.get("notes", {}).get("order_id")
            
            if order_id:
                await db.orders.update_one(
                    {"order_id": order_id},
                    {"$set": {
                        "payment_status": "paid",
                        "razorpay_payment_id": payment.get("id"),
                        "status": "confirmed",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        return {"status": "ok"}
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        return {"status": "error"}
