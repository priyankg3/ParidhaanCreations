"""
Paridhaan Creations - E-Commerce Backend Server
Refactored modular architecture with FastAPI routers
"""
from fastapi import FastAPI, HTTPException, Header, Cookie, Response, Request
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from typing import Optional
from pydantic import BaseModel
import cloudinary
import cloudinary.uploader

# Import services
from shiprocket_service import ShiprocketService
from db_backup_service import create_backup, restore_backup, check_and_auto_restore, get_backup_history

# Import all routers
from routers import (
    auth_router, products_router, categories_router, cart_router,
    orders_router, support_router, payments_router, media_router,
    admin_router, settings_router, banners_router, coupons_router,
    wishlist_router, reviews_router, collections_router, shipping_router,
    uploads_router, invoices_router, backup_router, telegram_router
)

# Import router init functions
from routers import auth, products, categories, cart, orders, support
from routers import payments, media, admin, settings, coupons
from routers import wishlist, reviews, collections, shipping, uploads
from routers import invoices, backup, ticker, astro, ai_tools, seo
from routers import telegram as telegram_module
from routers import banners_v2 as banners  # New banner system

# ==================== SETUP ====================

ROOT_DIR = Path(__file__).parent
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

load_dotenv(ROOT_DIR / '.env')

# MongoDB setup
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Cloudinary setup
if os.environ.get('CLOUDINARY_URL'):
    cloudinary.config(cloudinary_url=os.environ['CLOUDINARY_URL'])
elif os.environ.get('CLOUDINARY_CLOUD_NAME'):
    cloudinary.config(
        cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
        api_key=os.environ.get('CLOUDINARY_API_KEY'),
        api_secret=os.environ.get('CLOUDINARY_API_SECRET')
    )

# Admin emails
ADMIN_EMAILS = os.environ.get('ADMIN_EMAILS', 'priyankg3@gmail.com').split(',')
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== HELPER FUNCTIONS ====================

class User(BaseModel):
    user_id: str
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    is_admin: bool = False
    avatar_url: Optional[str] = None

async def get_current_user(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Get current user from session token"""
    if not session_token:
        return None
    
    session = await db.sessions.find_one({"session_token": session_token})
    if not session:
        return None
    
    user_data = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_data:
        return None
    
    return User(**user_data)

async def require_admin(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Require admin user for protected routes"""
    user = await get_current_user(authorization, session_token)
    if not user or not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== EMAIL & NOTIFICATION FUNCTIONS ====================

async def send_order_email(order: dict, email_type: str = "confirmation", tracking_url: str = None):
    """Send order notification email (placeholder - implement with real email service)"""
    logger.info(f"Email notification: {email_type} for order {order.get('order_id')}")
    # TODO: Implement real email service (Resend, SendGrid, etc.)
    pass

async def send_order_notification(order_id: str, phone: str, status: str, tracking_url: str = None):
    """Send SMS notification (placeholder)"""
    logger.info(f"SMS notification: {status} for order {order_id} to {phone}")
    # TODO: Implement with Twilio if configured
    pass

# ==================== INITIALIZE ROUTERS ====================

def initialize_routers():
    """Initialize all routers with dependencies"""
    # Auth router
    auth.init_router(db, GOOGLE_CLIENT_ID, ADMIN_EMAILS)
    
    # Products router  
    products.init_router(db)
    
    # Categories router
    categories.init_router(db, require_admin)
    
    # Cart router
    cart.init_router(db, get_current_user)
    
    # Orders router
    orders.init_router(db, get_current_user)
    
    # Support router
    support.init_router(db, get_current_user)
    
    # Payments router
    payments.init_router(db, get_current_user)
    
    # Media router (Instagram, Background Music)
    media.init_router(db, require_admin)
    
    # Admin router
    admin.init_router(db, require_admin)
    
    # Settings router
    settings.init_router(db, require_admin, get_current_user)
    
    # Banners router
    banners.init_router(db, require_admin)
    
    # Coupons router
    coupons.init_router(db, require_admin, get_current_user)
    
    # Wishlist router
    wishlist.init_router(db, get_current_user)
    
    # Reviews router
    reviews.init_router(db, get_current_user)
    
    # Collections router
    collections.init_router(db, require_admin)
    
    # Shipping router
    shipping.init_router(db, require_admin, ShiprocketService, send_order_email, send_order_notification)
    
    # Uploads router
    uploads.init_router(db, require_admin, get_current_user, UPLOAD_DIR)
    
    # Invoices router
    invoices.init_router(db, require_admin, get_current_user, UPLOAD_DIR)
    
    # Backup router
    backup.init_router(db, require_admin, {
        "create": create_backup,
        "restore": restore_backup,
        "history": get_backup_history
    })
    
    # SEO router
    seo.init_router(db)

    # Telegram internal router (service-to-service with the Telegram bot worker)
    telegram_module.init_router(db)

# ==================== CREATE APP ====================

app = FastAPI(
    title="Paridhaan Creations API",
    description="E-commerce API for handicrafts, pooja articles, and traditional items",
    version="2.0.0"
)

# Initialize routers
initialize_routers()

# Include all routers with /api prefix
app.include_router(auth_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(categories_router, prefix="/api")
app.include_router(cart_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(support_router, prefix="/api")
app.include_router(payments_router, prefix="/api")
app.include_router(media_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(settings_router, prefix="/api")
app.include_router(banners_router, prefix="/api")
app.include_router(coupons_router, prefix="/api")
app.include_router(wishlist_router, prefix="/api")
app.include_router(reviews_router, prefix="/api")
app.include_router(collections_router, prefix="/api")
app.include_router(shipping_router, prefix="/api")
app.include_router(uploads_router, prefix="/api")
app.include_router(invoices_router, prefix="/api")
app.include_router(backup_router, prefix="/api")
app.include_router(ticker.router, prefix="/api")
app.include_router(astro.router, prefix="/api")
app.include_router(ai_tools.router, prefix="/api")
app.include_router(seo.router, prefix="/api")
app.include_router(telegram_router, prefix="/api")

# CORS middleware
# CORS lockdown — the backend REFUSES to boot when CORS_ORIGINS is unset,
# so a missing env var fails loudly instead of silently accepting '*'.
_cors_env = os.environ.get('CORS_ORIGINS', '').strip()
if not _cors_env:
    raise RuntimeError(
        "CORS_ORIGINS env var is required. Set it to a comma-separated list of "
        "allowed frontend origins (e.g. 'https://paridhaancreations.xyz,"
        "https://www.paridhaancreations.xyz,http://localhost:3000')."
    )
_allowed_origins = [o.strip() for o in _cors_env.split(',') if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== LIFECYCLE EVENTS ====================

@app.on_event("startup")
async def startup_event():
    """Auto-restore database from backup on server startup if database is empty"""
    logger.info("🚀 Server starting up...")
    try:
        result = await check_and_auto_restore(db)
        if result.get("action") == "restored":
            logger.info(f"✅ Auto-restore completed: {result.get('result', {}).get('total_restored', 0)} documents restored")
        elif result.get("action") == "skipped":
            logger.info(f"📦 Database already has data: {result.get('reason')}")
        else:
            logger.info(f"ℹ️ Auto-restore status: {result.get('action')}")
    except Exception as e:
        logger.warning(f"⚠️ Auto-restore check failed (non-critical): {e}")
    
    logger.info("✅ Server startup complete!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("🛑 Server shutting down...")
    client.close()

# ==================== HEALTH CHECK ====================

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Paridhaan Creations API",
        "version": "2.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Paridhaan Creations API - राधे राधे 🙏"}
