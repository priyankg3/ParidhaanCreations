from fastapi import FastAPI, APIRouter, HTTPException, Cookie, Response, Request, Header, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
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
from twilio.rest import Client as TwilioClient
import csv
import io
import shutil
from openpyxl import Workbook
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from collections import Counter

ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

razorpay_client = razorpay.Client(auth=(os.environ['RAZORPAY_KEY_ID'], os.environ['RAZORPAY_KEY_SECRET']))

# Initialize Twilio client if credentials are available
twilio_client = None
if os.environ.get('TWILIO_ACCOUNT_SID') and os.environ.get('TWILIO_AUTH_TOKEN'):
    twilio_client = TwilioClient(os.environ['TWILIO_ACCOUNT_SID'], os.environ['TWILIO_AUTH_TOKEN'])

async def send_order_notification(order_id: str, phone: str, status: str):
    """Send SMS notification for order updates"""
    if not twilio_client or not os.environ.get('TWILIO_PHONE_NUMBER'):
        logging.info(f"Twilio not configured. Skipping SMS for order {order_id}")
        return
    
    try:
        messages = {
            "confirmed": f"Your order #{order_id} has been confirmed! We'll notify you when it ships.",
            "shipped": f"Great news! Your order #{order_id} has been shipped and is on its way.",
            "delivered": f"Your order #{order_id} has been delivered. Thank you for shopping with Paridhaan Creations!",
            "cancelled": f"Your order #{order_id} has been cancelled. Contact us if you have questions."
        }
        
        message = twilio_client.messages.create(
            body=messages.get(status, f"Order {order_id} status: {status}"),
            from_=os.environ['TWILIO_PHONE_NUMBER'],
            to=phone
        )
        logging.info(f"SMS sent for order {order_id}: {message.sid}")
    except Exception as e:
        logging.error(f"Failed to send SMS for order {order_id}: {str(e)}")

async def send_email_notification(email: str, subject: str, body: str):
    """Send email notification (placeholder for actual email service)"""
    # This is a placeholder. In production, integrate with SendGrid, AWS SES, or similar
    logging.info(f"Email notification: To={email}, Subject={subject}")
    # TODO: Implement actual email sending
    pass

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    is_admin: bool = False
    created_at: datetime

class ProductDimensions(BaseModel):
    length: Optional[float] = None
    breadth: Optional[float] = None
    height: Optional[float] = None
    unit: str = "cm"  # cm, inches, feet

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
    # Advanced attributes
    dimensions: Optional[ProductDimensions] = None  # L x B x H with unit
    weight: Optional[float] = None  # Weight in grams
    weight_unit: str = "g"  # g, kg
    sizes: Optional[List[str]] = None  # Available sizes like ["S", "M", "L", "XL"] or ["6", "7", "8", "9"]
    sku: Optional[str] = None  # Stock Keeping Unit
    material: Optional[str] = None  # Material type
    color: Optional[str] = None  # Color
    brand: Optional[str] = None  # Brand name
    tags: Optional[List[str]] = None  # Tags for search
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    images: List[str]
    stock: int
    featured: bool = False
    # Advanced attributes
    length: Optional[float] = None
    breadth: Optional[float] = None
    height: Optional[float] = None
    dimension_unit: str = "cm"  # cm, inches, feet
    weight: Optional[float] = None
    weight_unit: str = "g"  # g, kg
    sizes: Optional[List[str]] = None
    sku: Optional[str] = None
    material: Optional[str] = None
    color: Optional[str] = None
    brand: Optional[str] = None
    tags: Optional[List[str]] = None

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
    coupon_code: Optional[str] = None
    discount_amount: float = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    items: List[OrderItem]
    total_amount: float
    payment_method: str
    shipping_address: ShippingAddress
    guest_email: Optional[str] = None
    coupon_code: Optional[str] = None
    discount_amount: float = 0

class Banner(BaseModel):
    model_config = ConfigDict(extra="ignore")
    banner_id: str = Field(default_factory=lambda: f"banner_{uuid.uuid4().hex[:12]}")
    title: str
    
    # Images - Desktop & Mobile
    image_desktop: str = ""  # Desktop image (required)
    image_mobile: str = ""   # Mobile image (optional, falls back to desktop)
    
    # Banner Placement/Zone
    placement: str = "hero"  # hero, below_hero, popup, category_header, category_sidebar, category_footer, product_page, cart_page, checkout_page
    
    # Link & CTA
    link: Optional[str] = None
    link_type: str = "internal"  # internal, external, category, product
    cta_text: Optional[str] = None  # "Shop Now", "Learn More", etc.
    
    # Targeting
    category: Optional[str] = None  # For category-specific banners
    target_audience: str = "all"  # all, new_users, returning_users
    target_device: str = "all"  # all, desktop, mobile
    
    # Status & Scheduling
    status: str = "active"  # draft, active, paused, scheduled, expired
    position: int = 1
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    # Analytics
    impressions: int = 0
    clicks: int = 0
    
    # Content Type
    content_type: str = "image"  # image, video, html
    video_url: Optional[str] = None  # For video banners
    html_content: Optional[str] = None  # For HTML/rich banners
    
    # Popup specific settings
    popup_delay: int = 0  # Seconds to wait before showing popup
    popup_frequency: str = "once_per_session"  # once_per_session, once_per_day, always
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BannerCreate(BaseModel):
    title: str
    image_desktop: str = ""
    image_mobile: str = ""
    placement: str = "hero"
    link: Optional[str] = None
    link_type: str = "internal"
    cta_text: Optional[str] = None
    category: Optional[str] = None
    target_audience: str = "all"
    target_device: str = "all"
    status: str = "active"
    position: int = 1
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    content_type: str = "image"
    video_url: Optional[str] = None
    html_content: Optional[str] = None
    popup_delay: int = 0
    popup_frequency: str = "once_per_session"

class BannerUpdate(BaseModel):
    title: Optional[str] = None
    image_desktop: Optional[str] = None
    image_mobile: Optional[str] = None
    placement: Optional[str] = None
    link: Optional[str] = None
    link_type: Optional[str] = None
    cta_text: Optional[str] = None
    category: Optional[str] = None
    target_audience: Optional[str] = None
    target_device: Optional[str] = None
    status: Optional[str] = None
    position: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    content_type: Optional[str] = None
    video_url: Optional[str] = None
    html_content: Optional[str] = None
    popup_delay: Optional[int] = None
    popup_frequency: Optional[str] = None

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

# Support Ticket Models
class TicketMessage(BaseModel):
    sender: str  # "customer" or "admin"
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SupportTicket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ticket_id: str = Field(default_factory=lambda: f"ticket_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    guest_email: Optional[str] = None
    guest_name: Optional[str] = None
    subject: str
    category: str  # "order", "product", "payment", "shipping", "other"
    order_id: Optional[str] = None
    status: str = "open"  # "open", "in_progress", "resolved", "closed"
    priority: str = "normal"  # "low", "normal", "high", "urgent"
    messages: List[TicketMessage] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TicketCreate(BaseModel):
    subject: str
    category: str
    message: str
    order_id: Optional[str] = None
    guest_email: Optional[str] = None
    guest_name: Optional[str] = None

class TicketResponse(BaseModel):
    message: str

class SiteSettings(BaseModel):
    """Site-wide settings including logos and branding"""
    model_config = ConfigDict(extra="ignore")
    setting_id: str = "site_settings"  # Single document
    header_logo: Optional[str] = None  # Header logo URL
    footer_logo: Optional[str] = None  # Footer logo URL (can be same as header)
    favicon: Optional[str] = None  # Favicon URL
    site_name: str = "Paridhaan Creations"
    tagline: Optional[str] = "Traditional & Handicraft Store"
    primary_color: Optional[str] = "#8B4513"  # Theme color
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    address: Optional[str] = None
    social_instagram: Optional[str] = None
    social_facebook: Optional[str] = None
    social_twitter: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SiteSettingsUpdate(BaseModel):
    header_logo: Optional[str] = None
    footer_logo: Optional[str] = None
    favicon: Optional[str] = None
    site_name: Optional[str] = None
    tagline: Optional[str] = None
    primary_color: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    whatsapp_number: Optional[str] = None
    address: Optional[str] = None
    social_instagram: Optional[str] = None
    social_facebook: Optional[str] = None
    social_twitter: Optional[str] = None

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str = Field(default_factory=lambda: f"review_{uuid.uuid4().hex[:12]}")
    product_id: str
    user_id: str
    user_name: str
    rating: int
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    product_id: str
    rating: int
    comment: str

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
    
    # Admin email configuration - ONLY this email gets admin access
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'priyankg3@gmail.com')
    is_admin = auth_data["email"].lower() == ADMIN_EMAIL.lower()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = await db.users.find_one({"email": auth_data["email"]}, {"_id": 0})
    
    if user_doc:
        user_id = user_doc["user_id"]
        # Update user and set admin status based on email
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": auth_data["name"], "picture": auth_data["picture"], "is_admin": is_admin}}
        )
    else:
        user_data = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data["picture"],
            "is_admin": is_admin,
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
    
    # Build product data with dimensions
    product_data = product.model_dump()
    
    # Create dimensions object if any dimension is provided
    if product_data.get('length') or product_data.get('breadth') or product_data.get('height'):
        product_data['dimensions'] = {
            'length': product_data.pop('length', None),
            'breadth': product_data.pop('breadth', None),
            'height': product_data.pop('height', None),
            'unit': product_data.pop('dimension_unit', 'cm')
        }
    else:
        product_data.pop('length', None)
        product_data.pop('breadth', None)
        product_data.pop('height', None)
        product_data.pop('dimension_unit', None)
        product_data['dimensions'] = None
    
    product_obj = Product(**product_data)
    doc = product_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.products.insert_one(doc)
    return {"message": "Product created", "product_id": product_obj.product_id}

@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product: ProductCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    
    # Build update data with dimensions
    update_data = product.model_dump()
    
    # Create dimensions object if any dimension is provided
    if update_data.get('length') or update_data.get('breadth') or update_data.get('height'):
        update_data['dimensions'] = {
            'length': update_data.pop('length', None),
            'breadth': update_data.pop('breadth', None),
            'height': update_data.pop('height', None),
            'unit': update_data.pop('dimension_unit', 'cm')
        }
    else:
        update_data.pop('length', None)
        update_data.pop('breadth', None)
        update_data.pop('height', None)
        update_data.pop('dimension_unit', None)
    
    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": update_data}
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
async def get_banners(
    placement: Optional[str] = None, 
    category: Optional[str] = None, 
    device: Optional[str] = None,
    user_type: Optional[str] = None  # new or returning
):
    """Get active banners for public display with targeting"""
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    
    # Base query - only active status
    query = {"status": "active"}
    
    # Schedule filter - check if banner is within valid date range
    schedule_filter = {
        "$or": [
            {"start_date": None, "end_date": None},
            {"start_date": {"$exists": False}},
            {
                "$and": [
                    {"$or": [{"start_date": None}, {"start_date": {"$lte": now_iso}}]},
                    {"$or": [{"end_date": None}, {"end_date": {"$gte": now_iso}}]}
                ]
            }
        ]
    }
    
    # Device targeting
    device_filter = {"$or": [{"target_device": "all"}, {"target_device": {"$exists": False}}]}
    if device:
        device_filter["$or"].append({"target_device": device})
    
    # User type targeting
    audience_filter = {"$or": [{"target_audience": "all"}, {"target_audience": {"$exists": False}}]}
    if user_type:
        audience_filter["$or"].append({"target_audience": f"{user_type}_users"})
    
    # Placement filter
    if placement:
        query["placement"] = placement
    
    # Category filter for category-specific placements
    if category:
        query["$or"] = [{"category": category}, {"category": None}, {"category": {"$exists": False}}]
    
    # Combine all filters
    final_query = {
        "$and": [query, schedule_filter, device_filter, audience_filter]
    }
    
    banners = await db.banners.find(final_query, {"_id": 0}).sort("position", 1).to_list(100)
    
    # For backward compatibility, add 'image' field from 'image_desktop'
    for banner in banners:
        if not banner.get('image') and banner.get('image_desktop'):
            banner['image'] = banner['image_desktop']
    
    return banners

@api_router.get("/banners/all")
async def get_all_banners(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Get all banners including drafts (admin only)"""
    await require_admin(authorization, session_token)
    banners = await db.banners.find({}, {"_id": 0}).sort([("placement", 1), ("position", 1)]).to_list(500)
    return banners

@api_router.get("/banners/stats")
async def get_banner_stats(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Get banner analytics summary (admin only)"""
    await require_admin(authorization, session_token)
    
    pipeline = [
        {"$group": {
            "_id": "$placement",
            "total": {"$sum": 1},
            "active": {"$sum": {"$cond": [{"$eq": ["$status", "active"]}, 1, 0]}},
            "total_impressions": {"$sum": {"$ifNull": ["$impressions", 0]}},
            "total_clicks": {"$sum": {"$ifNull": ["$clicks", 0]}}
        }}
    ]
    
    stats = await db.banners.aggregate(pipeline).to_list(20)
    
    # Overall stats
    total_banners = await db.banners.count_documents({})
    active_banners = await db.banners.count_documents({"status": "active"})
    
    return {
        "total_banners": total_banners,
        "active_banners": active_banners,
        "by_placement": {s["_id"]: s for s in stats if s["_id"]}
    }

@api_router.post("/banners")
async def create_banner(banner: BannerCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    
    banner_data = banner.model_dump()
    
    # Parse dates if provided
    if banner_data.get("start_date"):
        banner_data["start_date"] = datetime.fromisoformat(banner_data["start_date"].replace('Z', '+00:00'))
    if banner_data.get("end_date"):
        banner_data["end_date"] = datetime.fromisoformat(banner_data["end_date"].replace('Z', '+00:00'))
    
    # Set status based on schedule
    if banner_data.get("start_date") and banner_data["start_date"] > datetime.now(timezone.utc):
        banner_data["status"] = "scheduled"
    
    banner_obj = Banner(**banner_data)
    doc = banner_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    if doc.get("start_date"):
        doc["start_date"] = doc["start_date"].isoformat()
    if doc.get("end_date"):
        doc["end_date"] = doc["end_date"].isoformat()
    
    await db.banners.insert_one(doc)
    return {"message": "Banner created successfully", "banner_id": banner_obj.banner_id}

@api_router.put("/banners/{banner_id}")
async def update_banner(banner_id: str, banner: BannerUpdate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Update an existing banner"""
    await require_admin(authorization, session_token)
    
    existing = await db.banners.find_one({"banner_id": banner_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    update_data = {k: v for k, v in banner.model_dump().items() if v is not None}
    
    # Parse dates if provided
    if update_data.get("start_date"):
        update_data["start_date"] = datetime.fromisoformat(update_data["start_date"].replace('Z', '+00:00')).isoformat()
    if update_data.get("end_date"):
        update_data["end_date"] = datetime.fromisoformat(update_data["end_date"].replace('Z', '+00:00')).isoformat()
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.banners.update_one({"banner_id": banner_id}, {"$set": update_data})
    return {"message": "Banner updated successfully"}

@api_router.patch("/banners/{banner_id}/status")
async def update_banner_status(banner_id: str, status: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Quick status update for banner"""
    await require_admin(authorization, session_token)
    
    if status not in ["draft", "active", "paused", "scheduled", "expired"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.banners.update_one(
        {"banner_id": banner_id}, 
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    return {"message": f"Banner status updated to {status}"}

@api_router.post("/banners/{banner_id}/track")
async def track_banner_interaction(banner_id: str, interaction_type: str = "impression"):
    """Track banner impressions and clicks"""
    if interaction_type not in ["impression", "click"]:
        raise HTTPException(status_code=400, detail="Invalid interaction type")
    
    field = "impressions" if interaction_type == "impression" else "clicks"
    await db.banners.update_one({"banner_id": banner_id}, {"$inc": {field: 1}})
    
    return {"success": True}

@api_router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    result = await db.banners.delete_one({"banner_id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"message": "Banner deleted successfully"}

@api_router.post("/banners/reorder")
async def reorder_banners(banner_orders: List[dict], authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Reorder banners by updating positions"""
    await require_admin(authorization, session_token)
    
    for item in banner_orders:
        await db.banners.update_one(
            {"banner_id": item["banner_id"]},
            {"$set": {"position": item["position"]}}
        )
    
    return {"message": "Banners reordered successfully"}

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

@api_router.get("/user/first-time-buyer")
async def check_first_time_buyer(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Check if the current user is a first-time buyer (no previous orders)"""
    user = await get_current_user(authorization, session_token)
    
    if not user:
        # For guests, always show the welcome offer
        return {
            "is_first_time": True,
            "welcome_coupon": "WELCOME10",
            "discount_percentage": 10,
            "message": "Welcome! Use code WELCOME10 for 10% off your first order!"
        }
    
    # Check if user has any completed orders
    order_count = await db.orders.count_documents({
        "user_id": user.user_id,
        "payment_status": "paid"
    })
    
    is_first_time = order_count == 0
    
    if is_first_time:
        return {
            "is_first_time": True,
            "welcome_coupon": "WELCOME10",
            "discount_percentage": 10,
            "message": "Welcome! Use code WELCOME10 for 10% off your first order!"
        }
    else:
        return {
            "is_first_time": False,
            "welcome_coupon": None,
            "discount_percentage": 0,
            "message": None
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

@api_router.get("/coupons")
async def get_coupons(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    coupons = await db.coupons.find({}, {"_id": 0}).to_list(100)
    return coupons

@api_router.get("/coupons/{coupon_id}")
async def get_coupon(coupon_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    coupon = await db.coupons.find_one({"coupon_id": coupon_id}, {"_id": 0})
    if not coupon:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return coupon

@api_router.put("/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, coupon_update: CouponCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    existing = await db.coupons.find_one({"coupon_id": coupon_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Coupon not found")
    
    update_data = coupon_update.model_dump()
    update_data["code"] = update_data["code"].upper()
    update_data["valid_from"] = update_data["valid_from"].isoformat()
    update_data["valid_to"] = update_data["valid_to"].isoformat()
    
    await db.coupons.update_one({"coupon_id": coupon_id}, {"$set": update_data})
    updated = await db.coupons.find_one({"coupon_id": coupon_id}, {"_id": 0})
    return updated

@api_router.delete("/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    await require_admin(authorization, session_token)
    result = await db.coupons.delete_one({"coupon_id": coupon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"message": "Coupon deleted successfully"}

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
    webhook_url = f"{os.environ['REACT_APP_BACKEND_URL']}/webhook/stripe"
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
    
    webhook_url = f"{os.environ['REACT_APP_BACKEND_URL']}/webhook/stripe"
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
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": status}}
    )
    
    # Send notification
    if order.get("shipping_address", {}).get("phone"):
        await send_order_notification(order_id, order["shipping_address"]["phone"], status)
    
    return {"message": "Order status updated"}

@api_router.post("/reviews")
async def create_review(review: ReviewCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    
    if review.rating < 1 or review.rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    
    existing_review = await db.reviews.find_one({"product_id": review.product_id, "user_id": user.user_id}, {"_id": 0})
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already reviewed this product")
    
    review_obj = Review(
        **review.model_dump(),
        user_id=user.user_id,
        user_name=user.name
    )
    doc = review_obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.reviews.insert_one(doc)
    
    reviews = await db.reviews.find({"product_id": review.product_id}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews) if reviews else 0
    review_count = len(reviews)
    
    await db.products.update_one(
        {"product_id": review.product_id},
        {"$set": {"avg_rating": avg_rating, "review_count": review_count}}
    )
    
    return review_obj

@api_router.get("/reviews/{product_id}")
async def get_product_reviews(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return reviews

@api_router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Login required")
    
    review = await db.reviews.find_one({"review_id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    
    if review["user_id"] != user.user_id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this review")
    
    await db.reviews.delete_one({"review_id": review_id})
    
    reviews = await db.reviews.find({"product_id": review["product_id"]}, {"_id": 0}).to_list(1000)
    avg_rating = sum(r["rating"] for r in reviews) / len(reviews) if reviews else 0
    review_count = len(reviews)
    
    await db.products.update_one(
        {"product_id": review["product_id"]},
        {"$set": {"avg_rating": avg_rating, "review_count": review_count}}
    )
    
    return {"message": "Review deleted"}

@api_router.get("/admin/products/export")
async def export_products(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Export all products to CSV"""
    await require_admin(authorization, session_token)
    
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    
    output = io.StringIO()
    if products:
        fieldnames = ["product_id", "name", "description", "price", "category", "stock", "featured", "badge"]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for product in products:
            row = {
                "product_id": product.get("product_id", ""),
                "name": product.get("name", ""),
                "description": product.get("description", ""),
                "price": product.get("price", 0),
                "category": product.get("category", ""),
                "stock": product.get("stock", 0),
                "featured": product.get("featured", False),
                "badge": product.get("badge", "")
            }
            writer.writerow(row)
    
    return JSONResponse(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=products_export.csv"}
    )

@api_router.post("/admin/products/bulk-update")
async def bulk_update_products(updates: List[Dict[str, Any]], authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Bulk update product stock and prices"""
    await require_admin(authorization, session_token)
    
    updated_count = 0
    for update in updates:
        product_id = update.get("product_id")
        if not product_id:
            continue
        
        update_data = {}
        if "stock" in update:
            update_data["stock"] = int(update["stock"])
        if "price" in update:
            update_data["price"] = float(update["price"])
        if "badge" in update:
            update_data["badge"] = update["badge"]
        
        if update_data:
            result = await db.products.update_one(
                {"product_id": product_id},
                {"$set": update_data}
            )
            if result.matched_count > 0:
                updated_count += 1
    
    return {"message": f"Updated {updated_count} products"}

@api_router.get("/admin/orders/export")
async def export_orders(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Export all orders to CSV"""
    await require_admin(authorization, session_token)
    
    orders = await db.orders.find({}, {"_id": 0}).to_list(10000)
    
    output = io.StringIO()
    if orders:
        fieldnames = ["order_id", "created_at", "total_amount", "status", "payment_status", "payment_method", "customer_name", "customer_phone"]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        
        for order in orders:
            row = {
                "order_id": order.get("order_id", ""),
                "created_at": order.get("created_at", ""),
                "total_amount": order.get("total_amount", 0),
                "status": order.get("status", ""),
                "payment_status": order.get("payment_status", ""),
                "payment_method": order.get("payment_method", ""),
                "customer_name": order.get("shipping_address", {}).get("full_name", ""),
                "customer_phone": order.get("shipping_address", {}).get("phone", "")
            }
            writer.writerow(row)
    
    return JSONResponse(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=orders_export.csv"}
    )

@api_router.get("/orders/{order_id}/invoice")
async def generate_invoice(order_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Generate PDF invoice for an order"""
    user = await get_current_user(authorization, session_token)
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if user and order.get("user_id") != user.user_id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#0F4C75'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    elements.append(Paragraph("Paridhaan Creations", title_style))
    elements.append(Paragraph("INVOICE", styles['Heading2']))
    elements.append(Spacer(1, 0.3*inch))
    
    invoice_data = [
        ["Invoice Number:", order_id],
        ["Order Date:", order.get("created_at", "")[:10]],
        ["Payment Status:", order.get("payment_status", "").upper()],
        ["Order Status:", order.get("status", "").upper()]
    ]
    
    invoice_table = Table(invoice_data, colWidths=[2*inch, 3*inch])
    invoice_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(invoice_table)
    elements.append(Spacer(1, 0.3*inch))
    
    elements.append(Paragraph("Bill To:", styles['Heading3']))
    addr = order.get("shipping_address", {})
    address_text = f"""
        {addr.get('full_name', '')}<br/>
        {addr.get('address_line1', '')}<br/>
        {addr.get('address_line2', '') + '<br/>' if addr.get('address_line2') else ''}
        {addr.get('city', '')}, {addr.get('state', '')} {addr.get('pincode', '')}<br/>
        Phone: {addr.get('phone', '')}
    """
    elements.append(Paragraph(address_text, styles['Normal']))
    elements.append(Spacer(1, 0.3*inch))
    
    items_data = [["Product", "Quantity", "Price", "Total"]]
    for item in order.get("items", []):
        items_data.append([
            item.get("product_name", ""),
            str(item.get("quantity", 0)),
            f"₹{item.get('price', 0):.2f}",
            f"₹{(item.get('price', 0) * item.get('quantity', 0)):.2f}"
        ])
    
    items_data.append(["", "", "Total:", f"₹{order.get('total_amount', 0):.2f}"])
    
    items_table = Table(items_data, colWidths=[3*inch, 1*inch, 1.5*inch, 1.5*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F4C75')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -2), 1, colors.grey),
        ('LINEABOVE', (2, -1), (-1, -1), 2, colors.HexColor('#0F4C75')),
        ('FONTNAME', (2, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 0.5*inch))
    
    footer_text = "Thank you for your business!<br/>Paridhaan Creations"
    elements.append(Paragraph(footer_text, ParagraphStyle('Footer', parent=styles['Normal'], alignment=TA_CENTER)))
    
    doc.build(elements)
    buffer.seek(0)
    
    return JSONResponse(
        content=buffer.getvalue().decode('latin-1'),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice_{order_id}.pdf"}
    )

@api_router.get("/products/{product_id}/recommendations")
async def get_product_recommendations(product_id: str):
    """Get product recommendations based on category and popularity"""
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    recommendations = []
    
    same_category = await db.products.find(
        {
            "category": product["category"],
            "product_id": {"$ne": product_id},
            "stock": {"$gt": 0}
        },
        {"_id": 0}
    ).limit(3).to_list(3)
    recommendations.extend(same_category)
    
    if len(recommendations) < 4:
        featured = await db.products.find(
            {
                "featured": True,
                "product_id": {"$ne": product_id},
                "stock": {"$gt": 0}
            },
            {"_id": 0}
        ).limit(4 - len(recommendations)).to_list(4 - len(recommendations))
        recommendations.extend(featured)
    
    return recommendations[:4]

@api_router.get("/admin/customer-insights")
async def get_customer_insights(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Get customer segmentation and insights"""
    await require_admin(authorization, session_token)
    
    orders = await db.orders.find({"payment_status": "paid"}, {"_id": 0}).to_list(10000)
    
    total_customers = len(set(o.get("user_id") or o.get("guest_email") for o in orders))
    
    customer_orders = {}
    for order in orders:
        customer_id = order.get("user_id") or order.get("guest_email", "guest")
        if customer_id not in customer_orders:
            customer_orders[customer_id] = {"orders": 0, "total_spent": 0}
        customer_orders[customer_id]["orders"] += 1
        customer_orders[customer_id]["total_spent"] += order.get("total_amount", 0)
    
    repeat_customers = sum(1 for c in customer_orders.values() if c["orders"] > 1)
    
    avg_order_value = sum(o.get("total_amount", 0) for o in orders) / len(orders) if orders else 0
    
    category_popularity = Counter()
    for order in orders:
        for item in order.get("items", []):
            product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
            if product:
                category_popularity[product.get("category", "unknown")] += item.get("quantity", 0)
    
    top_categories = dict(category_popularity.most_common(5))
    
    recent_orders_30days = len([o for o in orders if datetime.fromisoformat(o["created_at"].replace('Z', '+00:00')) > datetime.now(timezone.utc) - timedelta(days=30)])
    
    vip_customers = sorted(
        [{"customer_id": k, **v} for k, v in customer_orders.items()],
        key=lambda x: x["total_spent"],
        reverse=True
    )[:10]
    
    return {
        "total_customers": total_customers,
        "repeat_customers": repeat_customers,
        "repeat_rate": (repeat_customers / total_customers * 100) if total_customers > 0 else 0,
        "avg_order_value": avg_order_value,
        "top_categories": top_categories,
        "recent_orders_30days": recent_orders_30days,
        "vip_customers": vip_customers
    }

# ============ SUPPORT TICKET ENDPOINTS ============

@api_router.post("/support/tickets")
async def create_ticket(ticket_data: TicketCreate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Create a new support ticket"""
    user = await get_current_user(authorization, session_token)
    
    ticket = SupportTicket(
        user_id=user.user_id if user else None,
        guest_email=ticket_data.guest_email if not user else None,
        guest_name=ticket_data.guest_name if not user else None,
        subject=ticket_data.subject,
        category=ticket_data.category,
        order_id=ticket_data.order_id,
        messages=[TicketMessage(sender="customer", message=ticket_data.message)]
    )
    
    ticket_doc = ticket.model_dump()
    ticket_doc["created_at"] = ticket_doc["created_at"].isoformat()
    ticket_doc["updated_at"] = ticket_doc["updated_at"].isoformat()
    ticket_doc["messages"] = [{"sender": m["sender"], "message": m["message"], "timestamp": m["timestamp"].isoformat()} for m in ticket_doc["messages"]]
    
    await db.support_tickets.insert_one(ticket_doc)
    return {"ticket_id": ticket.ticket_id, "message": "Ticket created successfully"}

@api_router.get("/support/tickets")
async def get_my_tickets(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Get tickets for current user"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    tickets = await db.support_tickets.find({"user_id": user.user_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return tickets

@api_router.get("/support/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Get a specific ticket"""
    user = await get_current_user(authorization, session_token)
    
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check access - user can only see their own tickets, admin can see all
    if user:
        if not user.is_admin and ticket.get("user_id") != user.user_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return ticket

@api_router.post("/support/tickets/{ticket_id}/reply")
async def reply_to_ticket(ticket_id: str, response: TicketResponse, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Add a reply to a ticket"""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    ticket = await db.support_tickets.find_one({"ticket_id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Determine sender type
    sender = "admin" if user.is_admin else "customer"
    
    # Check access for non-admin
    if not user.is_admin and ticket.get("user_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    new_message = {
        "sender": sender,
        "message": response.message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    # Update status if admin replies
    new_status = "in_progress" if sender == "admin" and ticket.get("status") == "open" else ticket.get("status")
    
    await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {
            "$push": {"messages": new_message},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat(), "status": new_status}
        }
    )
    
    return {"message": "Reply added successfully"}

@api_router.put("/support/tickets/{ticket_id}/status")
async def update_ticket_status(ticket_id: str, status: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Update ticket status (admin only)"""
    await require_admin(authorization, session_token)
    
    if status not in ["open", "in_progress", "resolved", "closed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"message": f"Ticket status updated to {status}"}

@api_router.get("/admin/support/tickets")
async def get_all_tickets(status: Optional[str] = None, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Get all support tickets (admin only)"""
    await require_admin(authorization, session_token)
    
    query = {}
    if status:
        query["status"] = status
    
    tickets = await db.support_tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return tickets

@api_router.get("/admin/support/stats")
async def get_support_stats(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Get support ticket statistics (admin only)"""
    await require_admin(authorization, session_token)
    
    total = await db.support_tickets.count_documents({})
    open_tickets = await db.support_tickets.count_documents({"status": "open"})
    in_progress = await db.support_tickets.count_documents({"status": "in_progress"})
    resolved = await db.support_tickets.count_documents({"status": "resolved"})
    
    return {
        "total": total,
        "open": open_tickets,
        "in_progress": in_progress,
        "resolved": resolved,
        "closed": total - open_tickets - in_progress - resolved
    }

# ============ STOCK ALERTS ENDPOINTS ============

@api_router.get("/admin/stock-alerts")
async def get_stock_alerts(threshold: int = 5, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Get products with low stock (admin only)"""
    await require_admin(authorization, session_token)
    
    low_stock_products = await db.products.find(
        {"stock": {"$lte": threshold}},
        {"_id": 0}
    ).sort("stock", 1).to_list(50)
    
    out_of_stock = [p for p in low_stock_products if p["stock"] == 0]
    critical_stock = [p for p in low_stock_products if 0 < p["stock"] <= 2]
    low_stock = [p for p in low_stock_products if 2 < p["stock"] <= threshold]
    
    return {
        "out_of_stock": out_of_stock,
        "critical": critical_stock,
        "low": low_stock,
        "total_alerts": len(low_stock_products)
    }

@api_router.put("/admin/products/{product_id}/restock")
async def restock_product(product_id: str, quantity: int, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Add stock to a product (admin only)"""
    await require_admin(authorization, session_token)
    
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be positive")
    
    result = await db.products.update_one(
        {"product_id": product_id},
        {"$inc": {"stock": quantity}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0, "name": 1, "stock": 1})
    return {"message": f"Stock updated. New stock: {product['stock']}", "new_stock": product["stock"]}

# ============ WHATSAPP CONFIG ============

WHATSAPP_NUMBER = "919871819508"

@api_router.get("/config/whatsapp")
async def get_whatsapp_config():
    """Get WhatsApp configuration for frontend"""
    return {
        "number": WHATSAPP_NUMBER,
        "enabled": True
    }

# ============ SITE SETTINGS ENDPOINTS ============
@api_router.get("/settings")
async def get_site_settings():
    """Get site settings (public)"""
    settings = await db.site_settings.find_one({"setting_id": "site_settings"}, {"_id": 0})
    if not settings:
        # Return default settings if none exist
        default_settings = SiteSettings()
        return default_settings.model_dump()
    return settings

@api_router.put("/settings")
async def update_site_settings(
    settings: SiteSettingsUpdate, 
    authorization: Optional[str] = Header(None), 
    session_token: Optional[str] = Cookie(None)
):
    """Update site settings (admin only)"""
    await require_admin(authorization, session_token)
    
    update_data = {k: v for k, v in settings.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.site_settings.update_one(
        {"setting_id": "site_settings"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}

@api_router.post("/settings/upload-logo")
async def upload_logo(
    request: Request,
    file: UploadFile = File(...),
    logo_type: str = "header",  # header, footer, favicon
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Upload logo image (admin only)"""
    # Get session token from cookie if not in parameter
    if not session_token:
        session_token = request.cookies.get("session_token")
    
    # Verify admin access
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session - please login again")
    
    user = await db.users.find_one({"user_id": session_doc.get("user_id")}, {"_id": 0})
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate logo type
    if logo_type not in ["header", "footer", "favicon"]:
        raise HTTPException(status_code=400, detail="Invalid logo type. Use: header, footer, or favicon")
    
    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}")
    
    # Read and validate file size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'png'
    unique_filename = f"logo_{logo_type}_{uuid.uuid4().hex[:8]}.{ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Update site settings with new logo URL
    logo_url = f"/api/uploads/{unique_filename}"
    logo_field = f"{logo_type}_logo" if logo_type != "favicon" else "favicon"
    
    await db.site_settings.update_one(
        {"setting_id": "site_settings"},
        {"$set": {logo_field: logo_url, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {
        "success": True,
        "logo_type": logo_type,
        "url": logo_url
    }

@api_router.get("/sitemap.xml")
async def generate_sitemap():
    """Generate XML sitemap for SEO"""
    products = await db.products.find({"stock": {"$gt": 0}}, {"_id": 0, "product_id": 1, "created_at": 1}).to_list(1000)
    categories = await db.categories.find({}, {"_id": 0, "slug": 1}).to_list(100)
    
    base_url = os.environ['REACT_APP_BACKEND_URL'].replace('/api', '')
    
    sitemap_xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    sitemap_xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    sitemap_xml += f'''  <url>
    <loc>{base_url}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n'''
    
    sitemap_xml += f'''  <url>
    <loc>{base_url}/products</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>\n'''
    
    for category in categories:
        sitemap_xml += f'''  <url>
    <loc>{base_url}/products?category={category['slug']}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n'''
    
    for product in products:
        lastmod = product.get('created_at', datetime.now(timezone.utc).isoformat())[:10]
        sitemap_xml += f'''  <url>
    <loc>{base_url}/products/{product['product_id']}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n'''
    
    sitemap_xml += '</urlset>'
    
    return JSONResponse(content=sitemap_xml, media_type="application/xml")

# ============ FILE UPLOAD ENDPOINTS ============

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

@api_router.post("/upload/image")
async def upload_image(
    request: Request,
    file: UploadFile = File(...), 
    authorization: Optional[str] = Header(None), 
    session_token: Optional[str] = Cookie(None)
):
    """Upload an image file (admin only)"""
    # Get session token from cookie if not in parameter
    if not session_token:
        session_token = request.cookies.get("session_token")
    
    # Verify admin access
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check session in user_sessions collection
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session - please login again")
    
    # Check if user is admin
    user = await db.users.find_one({"user_id": session_doc.get("user_id")}, {"_id": 0})
    if not user or not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}")
    
    # Read file content
    content = await file.read()
    
    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Generate unique filename
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Return the URL that can be used to access the image
    image_url = f"/api/uploads/{unique_filename}"
    
    return {
        "success": True,
        "filename": unique_filename,
        "url": image_url,
        "size": len(content),
        "content_type": file.content_type
    }

@api_router.post("/upload/images")
async def upload_multiple_images(files: List[UploadFile] = File(...), authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Upload multiple image files (admin only)"""
    await require_admin(authorization, session_token)
    
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed per upload")
    
    uploaded = []
    errors = []
    
    for file in files:
        try:
            if file.content_type not in ALLOWED_IMAGE_TYPES:
                errors.append({"filename": file.filename, "error": "Invalid file type"})
                continue
            
            content = await file.read()
            
            if len(content) > MAX_FILE_SIZE:
                errors.append({"filename": file.filename, "error": "File too large"})
                continue
            
            ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
            unique_filename = f"{uuid.uuid4().hex}.{ext}"
            file_path = UPLOAD_DIR / unique_filename
            
            with open(file_path, "wb") as f:
                f.write(content)
            
            uploaded.append({
                "original_name": file.filename,
                "filename": unique_filename,
                "url": f"/api/uploads/{unique_filename}",
                "size": len(content)
            })
        except Exception as e:
            errors.append({"filename": file.filename, "error": str(e)})
    
    return {
        "success": len(uploaded) > 0,
        "uploaded": uploaded,
        "errors": errors,
        "total_uploaded": len(uploaded)
    }

@api_router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Serve uploaded files with caching headers"""
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine content type
    ext = filename.split('.')[-1].lower()
    content_types = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
        'gif': 'image/gif'
    }
    content_type = content_types.get(ext, 'application/octet-stream')
    
    # Add cache headers for better performance
    headers = {
        "Cache-Control": "public, max-age=86400",  # 24 hours cache
        "X-Content-Type-Options": "nosniff"
    }
    
    return FileResponse(file_path, media_type=content_type, headers=headers)

@api_router.delete("/upload/{filename}")
async def delete_uploaded_file(filename: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Delete an uploaded file (admin only)"""
    await require_admin(authorization, session_token)
    
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    os.remove(file_path)
    
    return {"success": True, "message": "File deleted successfully"}

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