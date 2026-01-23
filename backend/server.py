from fastapi import FastAPI, APIRouter, HTTPException, Cookie, Response, Request, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import razorpay
import requests
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionResponse, CheckoutStatusResponse, CheckoutSessionRequest

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

razorpay_client = razorpay.Client(auth=(os.environ['RAZORPAY_KEY_ID'], os.environ['RAZORPAY_KEY_SECRET']))

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    is_admin: bool = False
    created_at: datetime

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    product_id: str = Field(default_factory=lambda: f"prod_{uuid.uuid4().hex[:12]}")
    name: str
    description: str
    price: float
    category: str
    images: List[str]
    stock: int
    featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    images: List[str]
    stock: int
    featured: bool = False

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    name: str
    slug: str
    description: str
    image: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: str
    image: str

class CartItem(BaseModel):
    product_id: str
    quantity: int

class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    cart_id: str = Field(default_factory=lambda: f"cart_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    items: List[CartItem]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float

class ShippingAddress(BaseModel):
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    order_id: str = Field(default_factory=lambda: f"order_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    guest_email: Optional[str] = None
    items: List[OrderItem]
    total_amount: float
    status: str = "pending"
    payment_method: str
    payment_status: str = "pending"
    shipping_address: ShippingAddress
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    items: List[OrderItem]
    total_amount: float
    payment_method: str
    shipping_address: ShippingAddress
    guest_email: Optional[str] = None

class Banner(BaseModel):
    model_config = ConfigDict(extra="ignore")
    banner_id: str = Field(default_factory=lambda: f"banner_{uuid.uuid4().hex[:12]}")
    title: str
    image: str
    link: Optional[str] = None
    position: int
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BannerCreate(BaseModel):
    title: str
    image: str
    link: Optional[str] = None
    position: int
    active: bool = True

class Coupon(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coupon_id: str = Field(default_factory=lambda: f"coupon_{uuid.uuid4().hex[:12]}")
    code: str
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    valid_from: datetime
    valid_to: datetime
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CouponCreate(BaseModel):
    code: str
    discount_percentage: Optional[float] = None
    discount_amount: Optional[float] = None
    valid_from: datetime
    valid_to: datetime
    active: bool = True

class CouponValidate(BaseModel):
    code: str
    total_amount: float

async def get_current_user(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    token = session_token or (authorization.replace("Bearer ", "") if authorization else None)
    if not token:
        return None
    
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        return None
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    
    return User(**user_doc)

async def require_admin(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

@api_router.post("/auth/session")
async def create_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session ID")
    
    try:
        auth_response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        auth_response.raise_for_status()
        auth_data = auth_response.json()
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid session: {str(e)}")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if user_doc:
        user_id = user_doc["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": auth_data["name"], "picture": auth_data["picture"]}}
        )
    else:
        user_data = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data["picture"],
            "is_admin": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_data)
    
    session_token = auth_data["session_token"]
    session_data = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
        "created_at": datetime.now(timezone.utc)
    }
    await db.user_sessions.insert_one(session_data)
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    user_response = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user_response

@api_router.get("/auth/me")
async def get_me(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

@api_router.post("/auth/logout")
async def logout(response: Response, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    token = session_token or (authorization.replace("Bearer ", "") if authorization else None)
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/products")
async def get_products(category: Optional[str] = None, search: Optional[str] = None, featured: Optional[bool] = None):
    query = {}
    if category:
        query["category"] = category
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if featured is not None:
        query["featured"] = featured
    
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products")
async def create_product(product: ProductCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    product_obj = Product(**product.model_dump())
    doc = product_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.products.insert_one(doc)
    return product_obj

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product: ProductCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": product.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return await db.products.find_one({"product_id": product_id}, {"_id": 0})

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    result = await db.products.delete_one({"product_id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

@api_router.get("/categories")
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.post("/categories")
async def create_category(category: CategoryCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    category_obj = Category(**category.model_dump())
    doc = category_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.categories.insert_one(doc)
    return category_obj

@api_router.get("/cart")
async def get_cart(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None), guest_session: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    query = {"user_id": user.user_id} if user else {"session_id": guest_session}
    cart = await db.cart.find_one(query, {"_id": 0})
    return cart or {"items": []}

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, response: Response, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None), guest_session: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    
    if user:
        identifier = {"user_id": user.user_id}
    else:
        if not guest_session:
            guest_session = f"guest_{uuid.uuid4().hex[:12]}"
            response.set_cookie(key="guest_session", value=guest_session, max_age=30*24*60*60)
        identifier = {"session_id": guest_session}
    
    cart = await db.cart.find_one(identifier, {"_id": 0})
    
    if cart:
        items = cart["items"]
        found = False
        for existing_item in items:
            if existing_item["product_id"] == item.product_id:
                existing_item["quantity"] += item.quantity
                found = True
                break
        if not found:
            items.append(item.model_dump())
        
        await db.cart.update_one(
            identifier,
            {"$set": {"items": items, "updated_at": datetime.now(timezone.utc)}}
        )
    else:
        cart_obj = Cart(**identifier, items=[item])
        doc = cart_obj.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        await db.cart.insert_one(doc)
    
    return {"message": "Item added to cart"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None), guest_session: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    identifier = {"user_id": user.user_id} if user else {"session_id": guest_session}
    
    cart = await db.cart.find_one(identifier, {"_id": 0})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    items = [item for item in cart["items"] if item["product_id"] != product_id]
    await db.cart.update_one(identifier, {"$set": {"items": items, "updated_at": datetime.now(timezone.utc)}})
    return {"message": "Item removed from cart"}

@api_router.post("/cart/clear")
async def clear_cart(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None), guest_session: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    identifier = {"user_id": user.user_id} if user else {"session_id": guest_session}
    await db.cart.delete_one(identifier)
    return {"message": "Cart cleared"}

@api_router.get("/wishlist")
async def get_wishlist(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    
    wishlist = await db.wishlist.find_one({"user_id": user.user_id}, {"_id": 0})
    if not wishlist:
        return {"product_ids": []}
    return wishlist

@api_router.post("/wishlist/add/{product_id}")
async def add_to_wishlist(product_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    
    wishlist = await db.wishlist.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if wishlist:
        if product_id not in wishlist["product_ids"]:
            await db.wishlist.update_one(
                {"user_id": user.user_id},
                {"$push": {"product_ids": product_id}}
            )
    else:
        await db.wishlist.insert_one({
            "wishlist_id": f"wishlist_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id,
            "product_ids": [product_id],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "Added to wishlist"}

@api_router.delete("/wishlist/remove/{product_id}")
async def remove_from_wishlist(product_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    
    await db.wishlist.update_one(
        {"user_id": user.user_id},
        {"$pull": {"product_ids": product_id}}
    )
    return {"message": "Removed from wishlist"}

@api_router.post("/orders")
async def create_order(order: OrderCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    
    order_data = order.model_dump()
    if user:
        order_data["user_id"] = user.user_id
    
    order_obj = Order(**order_data)
    doc = order_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.orders.insert_one(doc)
    return order_obj

@api_router.get("/orders")
async def get_orders(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    
    orders = await db.orders.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if user and order.get("user_id") != user.user_id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return order

@api_router.get("/banners")
async def get_banners():
    banners = await db.banners.find({"active": True}, {"_id": 0}).sort("position", 1).to_list(100)
    return banners

@api_router.post("/banners")
async def create_banner(banner: BannerCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    banner_obj = Banner(**banner.model_dump())
    doc = banner_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.banners.insert_one(doc)
    return banner_obj

@api_router.post("/coupons/validate")
async def validate_coupon(coupon_data: CouponValidate):
    coupon = await db.coupons.find_one({"code": coupon_data.code.upper(), "active": True}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid coupon code")
    
    valid_from = coupon["valid_from"]
    valid_to = coupon["valid_to"]
    if isinstance(valid_from, str):
        valid_from = datetime.fromisoformat(valid_from)
    if isinstance(valid_to, str):
        valid_to = datetime.fromisoformat(valid_to)
    
    now = datetime.now(timezone.utc)
    if valid_from.tzinfo is None:
        valid_from = valid_from.replace(tzinfo=timezone.utc)
    if valid_to.tzinfo is None:
        valid_to = valid_to.replace(tzinfo=timezone.utc)
    
    if now < valid_from or now > valid_to:
        raise HTTPException(status_code=400, detail="Coupon has expired")
    
    discount = 0
    if coupon.get("discount_percentage"):
        discount = (coupon_data.total_amount * coupon["discount_percentage"]) / 100
    elif coupon.get("discount_amount"):
        discount = coupon["discount_amount"]
    
    return {
        "valid": True,
        "discount": discount,
        "final_amount": max(0, coupon_data.total_amount - discount)
    }

@api_router.post("/coupons")
async def create_coupon(coupon: CouponCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    coupon_obj = Coupon(**coupon.model_dump())
    doc = coupon_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["valid_from"] = doc["valid_from"].isoformat()
    doc["valid_to"] = doc["valid_to"].isoformat()
    doc["code"] = doc["code"].upper()
    await db.coupons.insert_one(doc)
    return coupon_obj

@api_router.post("/payments/stripe/session")
async def create_stripe_session(request: Request, order_id: str, origin_url: str):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    host_url = origin_url
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=os.environ['STRIPE_API_KEY'], webhook_url=webhook_url)
    
    success_url = f"{origin_url}/order-success?session_id={{{{CHECKOUT_SESSION_ID}}}}"
    cancel_url = f"{origin_url}/checkout"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(order["total_amount"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"order_id": order_id}
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "order_id": order_id,
        "session_id": session.session_id,
        "amount": order["total_amount"],
        "currency": "usd",
        "payment_status": "pending",
        "payment_method": "stripe",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/stripe/status/{session_id}")
async def get_stripe_status(session_id: str):
    webhook_url = f"{os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=os.environ['STRIPE_API_KEY'], webhook_url=webhook_url)
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if transaction and transaction["payment_status"] != "paid" and status.payment_status == "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid"}}
        )
        
        await db.orders.update_one(
            {"order_id": status.metadata.get("order_id")},
            {"$set": {"payment_status": "paid", "status": "confirmed"}}
        )
    
    return status

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    webhook_url = f"{os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=os.environ['STRIPE_API_KEY'], webhook_url=webhook_url)
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        if webhook_response.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {"payment_status": "paid"}}
            )
            
            await db.orders.update_one(
                {"order_id": webhook_response.metadata.get("order_id")},
                {"$set": {"payment_status": "paid", "status": "confirmed"}}
            )
        
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/payments/razorpay/order")
async def create_razorpay_order(order_id: str):
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    amount_in_paise = int(order["total_amount"] * 100)
    
    razorpay_order = razorpay_client.order.create({
        "amount": amount_in_paise,
        "currency": "INR",
        "payment_capture": 1
    })
    
    await db.payment_transactions.insert_one({
        "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
        "order_id": order_id,
        "razorpay_order_id": razorpay_order["id"],
        "amount": order["total_amount"],
        "currency": "INR",
        "payment_status": "pending",
        "payment_method": "razorpay",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return razorpay_order

@api_router.post("/payments/razorpay/verify")
async def verify_razorpay_payment(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str):
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": razorpay_order_id,
            "razorpay_payment_id": razorpay_payment_id,
            "razorpay_signature": razorpay_signature
        })
        
        transaction = await db.payment_transactions.find_one({"razorpay_order_id": razorpay_order_id}, {"_id": 0})
        if transaction:
            await db.payment_transactions.update_one(
                {"razorpay_order_id": razorpay_order_id},
                {"$set": {"payment_status": "paid", "razorpay_payment_id": razorpay_payment_id}}
            )
            
            await db.orders.update_one(
                {"order_id": transaction["order_id"]},
                {"$set": {"payment_status": "paid", "status": "confirmed"}}
            )
        
        return {"status": "success", "message": "Payment verified"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Payment verification failed: {str(e)}")

@api_router.get("/admin/analytics")
async def get_analytics(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    
    total_orders = await db.orders.count_documents({})
    total_revenue = 0
    orders = await db.orders.find({"payment_status": "paid"}, {"_id": 0}).to_list(10000)
    for order in orders:
        total_revenue += order["total_amount"]
    
    total_products = await db.products.count_documents({})
    total_users = await db.users.count_documents({})
    
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_products": total_products,
        "total_users": total_users
    }

@api_router.get("/admin/orders")
async def get_all_orders(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
    return orders

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    result = await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order status updated"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()