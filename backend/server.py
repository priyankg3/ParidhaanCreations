from fastapi import FastAPI, APIRouter, HTTPException, Cookie, Response, Request, Header, UploadFile, File, BackgroundTasks
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
from PIL import Image as PILImage

# Import Shiprocket service
from shiprocket_service import ShiprocketService, ShiprocketAuth, get_status_label

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

async def send_order_notification(order_id: str, phone: str, status: str, tracking_url: str = None):
    """Send SMS notification for order updates"""
    if not twilio_client or not os.environ.get('TWILIO_PHONE_NUMBER'):
        logging.info(f"Twilio not configured. Skipping SMS for order {order_id}")
        return
    
    try:
        messages = {
            "confirmed": f"Your order #{order_id} has been confirmed! We'll notify you when it ships.",
            "shipped": f"Great news! Your order #{order_id} has been shipped and is on its way. Track here: {tracking_url}" if tracking_url else f"Great news! Your order #{order_id} has been shipped and is on its way.",
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

def generate_order_email_html(order: dict, email_type: str = "confirmation", tracking_url: str = None) -> str:
    """Generate beautiful HTML email for order notifications"""
    
    # Get site URL from environment or use default
    site_url = os.environ.get("SITE_URL", "https://paridhaancreations.xyz")
    
    # Common styles
    styles = """
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .order-box { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .order-id { font-size: 14px; color: #6c757d; margin-bottom: 5px; }
        .order-status { display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; }
        .status-confirmed { background: #d4edda; color: #155724; }
        .status-shipped { background: #cce5ff; color: #004085; }
        .status-delivered { background: #d4edda; color: #155724; }
        .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .items-table th { background: #f8f9fa; padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; }
        .items-table td { padding: 12px; border-bottom: 1px solid #dee2e6; }
        .total-row { font-weight: bold; font-size: 18px; }
        .tracking-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 8px; text-align: center; margin: 25px 0; }
        .tracking-box h3 { margin: 0 0 15px; }
        .track-btn { display: inline-block; background: white; color: #667eea; padding: 14px 28px; text-decoration: none; border-radius: 25px; font-weight: 600; margin-top: 10px; }
        .track-btn:hover { background: #f8f9fa; }
        .address-box { background: #fff; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; }
        .footer { background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e9ecef; }
        .footer p { margin: 5px 0; color: #6c757d; font-size: 14px; }
        .social-links a { display: inline-block; margin: 0 10px; color: #8B4513; text-decoration: none; }
    """
    
    # Order items HTML
    items_html = ""
    for item in order.get("items", []):
        items_html += f"""
            <tr>
                <td>{item.get('product_name', 'Product')}</td>
                <td style="text-align: center;">{item.get('quantity', 1)}</td>
                <td style="text-align: right;">₹{item.get('price', 0):.2f}</td>
            </tr>
        """
    
    # Email type specific content
    if email_type == "confirmation":
        header_title = "Order Confirmed! 🎉"
        header_subtitle = "Thank you for shopping with Paridhaan Creations"
        status_class = "status-confirmed"
        status_text = "CONFIRMED"
        main_message = "We've received your order and are preparing it with care. You'll receive another email once your order ships."
    elif email_type == "shipped":
        header_title = "Your Order is on its Way! 🚚"
        header_subtitle = "Exciting news - your package has been shipped"
        status_class = "status-shipped"
        status_text = "SHIPPED"
        main_message = "Your order has been handed over to our courier partner and is on its way to you."
    elif email_type == "delivered":
        header_title = "Order Delivered! ✨"
        header_subtitle = "Your package has arrived"
        status_class = "status-delivered"
        status_text = "DELIVERED"
        main_message = "We hope you love your purchase! If you have any questions, feel free to reach out."
    else:
        header_title = "Order Update"
        header_subtitle = "Here's the latest on your order"
        status_class = "status-confirmed"
        status_text = order.get("status", "").upper()
        main_message = "Here's an update on your order status."
    
    # Tracking section (only show if tracking URL exists)
    tracking_section = ""
    if tracking_url:
        tracking_section = f"""
            <div class="tracking-box">
                <h3>📦 Track Your Package</h3>
                <p>Follow your order's journey in real-time</p>
                <a href="{tracking_url}" class="track-btn">Track Order →</a>
            </div>
        """
    
    # Shipping address
    shipping = order.get("shipping_address", {})
    address_html = f"""
        <strong>{shipping.get('full_name', '')}</strong><br>
        {shipping.get('address_line1', '')}<br>
        {shipping.get('address_line2', '') + '<br>' if shipping.get('address_line2') else ''}
        {shipping.get('city', '')}, {shipping.get('state', '')} - {shipping.get('pincode', '')}<br>
        Phone: {shipping.get('phone', '')}
    """
    
    # Complete HTML
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{header_title}</title>
        <style>{styles}</style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>{header_title}</h1>
                <p>{header_subtitle}</p>
            </div>
            
            <div class="content">
                <div class="order-box">
                    <div class="order-id">Order ID: {order.get('order_id', '')}</div>
                    <span class="order-status {status_class}">{status_text}</span>
                    <p style="margin-top: 15px; color: #495057;">{main_message}</p>
                </div>
                
                {tracking_section}
                
                <h3 style="margin-bottom: 15px;">Order Details</h3>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th style="text-align: center;">Qty</th>
                            <th style="text-align: right;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                        <tr class="total-row">
                            <td colspan="2">Total Amount</td>
                            <td style="text-align: right;">₹{order.get('total_amount', 0):.2f}</td>
                        </tr>
                    </tbody>
                </table>
                
                <h3 style="margin-bottom: 15px;">Shipping Address</h3>
                <div class="address-box">
                    {address_html}
                </div>
            </div>
            
            <div class="footer">
                <p><strong>Paridhaan Creations</strong></p>
                <p>Traditional Handicrafts & Pooja Articles</p>
                <p style="margin-top: 15px;">
                    <a href="{site_url}" style="color: #8B4513;">Visit Store</a> | 
                    <a href="{site_url}/support" style="color: #8B4513;">Contact Support</a>
                </p>
                <p style="font-size: 12px; color: #adb5bd; margin-top: 20px;">
                    This email was sent regarding your order at Paridhaan Creations.
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return html

async def send_order_email(order: dict, email_type: str = "confirmation", tracking_url: str = None):
    """Send order notification email"""
    email = order.get("guest_email") or order.get("user_email")
    if not email:
        logging.info(f"No email found for order {order.get('order_id')}. Skipping email.")
        return
    
    # Generate HTML email
    html_content = generate_order_email_html(order, email_type, tracking_url)
    
    # Subject lines
    subjects = {
        "confirmation": f"Order Confirmed! #{order.get('order_id')} - Paridhaan Creations",
        "shipped": f"Your Order is on its Way! #{order.get('order_id')} - Paridhaan Creations",
        "delivered": f"Order Delivered! #{order.get('order_id')} - Paridhaan Creations"
    }
    subject = subjects.get(email_type, f"Order Update #{order.get('order_id')}")
    
    # TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    # For now, log the email
    logging.info(f"📧 ORDER EMAIL: To={email}, Type={email_type}, Subject={subject}")
    logging.info(f"   Tracking URL: {tracking_url}")
    
    # Store email record in database for reference
    email_record = {
        "email_id": f"email_{uuid.uuid4().hex[:12]}",
        "order_id": order.get("order_id"),
        "to_email": email,
        "subject": subject,
        "email_type": email_type,
        "tracking_url": tracking_url,
        "sent_at": datetime.now(timezone.utc),
        "status": "logged"  # Change to "sent" when actual email service is integrated
    }
    await db.email_logs.insert_one(email_record)
    
    return True

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
    badge: Optional[str] = None  # new, hot, trending, limited, featured, bestseller, sale
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
    # Laddu Gopal specific
    laddu_gopal_sizes: Optional[List[str]] = None  # Sizes this dress fits: ["0", "1", "2"] etc.
    # GST fields
    gst_rate: Optional[float] = None  # GST rate in percentage (5, 12, 18, 28)
    hsn_code: Optional[str] = None  # HSN/SAC code for GST
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    category: str
    images: List[str]
    stock: int
    featured: bool = False
    badge: Optional[str] = None  # new, hot, trending, limited, featured, bestseller, sale
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
    # Laddu Gopal specific
    laddu_gopal_sizes: Optional[List[str]] = None  # Sizes this dress fits: ["0", "1", "2"] etc.
    # GST fields
    gst_rate: Optional[float] = None  # GST rate in percentage (5, 12, 18, 28)
    hsn_code: Optional[str] = None  # HSN/SAC code for GST

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    name: str
    slug: str
    description: str
    image: str
    # GST fields for category-level defaults
    gst_rate: Optional[float] = None  # Default GST rate for this category
    hsn_code: Optional[str] = None  # Default HSN code for this category
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: str
    image: str
    gst_rate: Optional[float] = None
    hsn_code: Optional[str] = None

class CartItem(BaseModel):
    product_id: str
    quantity: int

class Cart(BaseModel):
    model_config = ConfigDict(extra="ignore")
    cart_id: str = Field(default_factory=lambda: f"cart_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    items: List[CartItem]
    # For abandoned cart recovery
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    cart_value: float = 0  # Total cart value for quick reference
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float
    # GST details per item
    hsn_code: Optional[str] = None
    gst_rate: Optional[float] = None
    taxable_amount: Optional[float] = None
    cgst: Optional[float] = None
    sgst: Optional[float] = None
    igst: Optional[float] = None

class GSTDetails(BaseModel):
    is_inter_state: bool = False  # True = IGST, False = CGST+SGST
    taxable_amount: float = 0
    cgst_rate: float = 0
    cgst_amount: float = 0
    sgst_rate: float = 0
    sgst_amount: float = 0
    igst_rate: float = 0
    igst_amount: float = 0
    total_gst: float = 0

class ShippingAddress(BaseModel):
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    pincode: str
    gstin: Optional[str] = None  # Customer GSTIN for B2B

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
    # GST & Invoice fields
    gst_details: Optional[GSTDetails] = None
    invoice_number: Optional[str] = None
    invoice_generated_at: Optional[datetime] = None
    invoice_pdf_path: Optional[str] = None
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
    title: Optional[str] = None  # Title is now optional
    
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
    title: Optional[str] = None  # Title is now optional
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

# GST Settings Model
class GSTSettings(BaseModel):
    """Business GST configuration"""
    model_config = ConfigDict(extra="ignore")
    setting_id: str = "gst_settings"  # Single document
    # Business Details
    business_name: str = "Paridhaan Creations"
    gstin: str = "08BFVPG3792N1ZH"
    pan: Optional[str] = None
    business_address: str = "Terra City 1, Tijara, 301411"
    business_state: str = "Rajasthan"
    business_state_code: str = "08"
    business_email: Optional[str] = None
    business_phone: Optional[str] = None
    # GST Configuration
    default_gst_rate: float = 18.0  # Default GST rate
    gst_enabled: bool = True
    prices_include_gst: bool = True  # True = MRP style (inclusive)
    # Invoice Settings
    invoice_prefix: str = "PC"  # Invoice prefix like PC-2024-0001
    invoice_footer_text: Optional[str] = "Thank you for shopping with Paridhaan Creations!"
    terms_and_conditions: Optional[str] = None
    # Bank Details for Invoice
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    # Digital Signature
    signature_image: Optional[str] = None
    authorized_signatory: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GSTSettingsUpdate(BaseModel):
    business_name: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    business_address: Optional[str] = None
    business_state: Optional[str] = None
    business_state_code: Optional[str] = None
    business_email: Optional[str] = None
    business_phone: Optional[str] = None
    default_gst_rate: Optional[float] = None
    gst_enabled: Optional[bool] = None
    prices_include_gst: Optional[bool] = None
    invoice_prefix: Optional[str] = None
    invoice_footer_text: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    bank_branch: Optional[str] = None
    signature_image: Optional[str] = None
    authorized_signatory: Optional[str] = None

# Invoice Model
class Invoice(BaseModel):
    model_config = ConfigDict(extra="ignore")
    invoice_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    invoice_number: str  # Formatted like PC-2024-0001
    order_id: str
    # Seller Details
    seller_name: str
    seller_gstin: str
    seller_address: str
    seller_state: str
    seller_state_code: str
    # Buyer Details
    buyer_name: str
    buyer_address: str
    buyer_state: str
    buyer_gstin: Optional[str] = None
    buyer_phone: Optional[str] = None
    buyer_email: Optional[str] = None
    # Invoice Items
    items: List[Dict[str, Any]]  # Product details with GST breakdown
    # Amounts
    subtotal: float
    discount: float = 0
    taxable_amount: float
    cgst_amount: float = 0
    sgst_amount: float = 0
    igst_amount: float = 0
    total_gst: float
    grand_total: float
    amount_in_words: str
    # Status
    is_inter_state: bool = False
    pdf_path: Optional[str] = None
    qr_code_data: Optional[str] = None
    emailed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    review_id: str = Field(default_factory=lambda: f"review_{uuid.uuid4().hex[:12]}")
    product_id: str
    user_id: str
    user_name: str
    rating: int
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Shiprocket Shipment Model
class Shipment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    shipment_id: str = Field(default_factory=lambda: f"ship_{uuid.uuid4().hex[:12]}")
    order_id: str
    shiprocket_order_id: Optional[int] = None
    shiprocket_shipment_id: Optional[int] = None
    courier_id: Optional[int] = None
    courier_name: Optional[str] = None
    awb_number: Optional[str] = None
    shipping_rate: Optional[float] = None
    status: str = "pending"  # pending, processing, shipped, in_transit, delivered, cancelled, rto
    label_url: Optional[str] = None
    manifest_url: Optional[str] = None
    tracking_url: Optional[str] = None
    estimated_delivery: Optional[str] = None
    tracking_history: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
async def get_products(
    category: Optional[str] = None, 
    search: Optional[str] = None, 
    featured: Optional[bool] = None,
    laddu_gopal_size: Optional[str] = None  # Filter by Laddu Gopal size
):
    query = {}
    if category:
        query["category"] = category
    if search:
        query["name"] = {"$regex": search, "$options": "i"}
    if featured is not None:
        query["featured"] = featured
    if laddu_gopal_size:
        # Filter products that fit this Laddu Gopal size
        query["laddu_gopal_sizes"] = laddu_gopal_size
    
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
            
            # Send order confirmation email with tracking link
            order = await db.orders.find_one({"order_id": transaction["order_id"]}, {"_id": 0})
            if order:
                site_url = os.environ.get("SITE_URL", "https://paridhaancreations.xyz")
                tracking_url = f"{site_url}/track/{transaction['order_id']}"
                await send_order_email(order, "confirmation", tracking_url)
        
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
    
    # Get site URL for tracking link
    site_url = os.environ.get("SITE_URL", "https://paridhaancreations.xyz")
    tracking_url = f"{site_url}/track/{order_id}"
    
    # Send SMS notification
    if order.get("shipping_address", {}).get("phone"):
        await send_order_notification(order_id, order["shipping_address"]["phone"], status, tracking_url)
    
    # Send email notification with tracking link
    email_type_map = {
        "confirmed": "confirmation",
        "processing": "confirmation",
        "shipped": "shipped",
        "delivered": "delivered"
    }
    if status in email_type_map:
        await send_order_email(order, email_type_map[status], tracking_url)
    
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

# ============ ABANDONED CART RECOVERY ENDPOINTS ============

class AbandonedCartUpdate(BaseModel):
    guest_email: Optional[str] = None
    guest_phone: Optional[str] = None
    recovery_status: Optional[str] = None  # pending, contacted, recovered, lost
    notes: Optional[str] = None

@api_router.get("/admin/abandoned-carts")
async def get_abandoned_carts(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
    hours_threshold: int = 1,  # Default: carts older than 1 hour
    limit: int = 50
):
    """Get abandoned carts (carts with items that haven't converted to orders)"""
    await require_admin(authorization, session_token)
    
    # Calculate the threshold time
    threshold_time = datetime.now(timezone.utc) - timedelta(hours=hours_threshold)
    
    # Find carts that:
    # 1. Have items
    # 2. Were last updated before threshold
    # 3. Don't have a corresponding paid order
    
    pipeline = [
        {
            "$match": {
                "items": {"$exists": True, "$ne": []},
                "updated_at": {"$lt": threshold_time}
            }
        },
        {
            "$lookup": {
                "from": "orders",
                "let": {"cart_user": "$user_id", "cart_session": "$session_id"},
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$or": [
                                        {"$eq": ["$user_id", "$$cart_user"]},
                                        {"$eq": ["$session_id", "$$cart_session"]}
                                    ]},
                                    {"$eq": ["$payment_status", "paid"]}
                                ]
                            }
                        }
                    }
                ],
                "as": "completed_orders"
            }
        },
        {
            "$match": {
                "completed_orders": {"$size": 0}
            }
        },
        {
            "$sort": {"updated_at": -1}
        },
        {
            "$limit": limit
        },
        {
            "$project": {
                "_id": 0,
                "completed_orders": 0
            }
        }
    ]
    
    abandoned_carts = await db.cart.aggregate(pipeline).to_list(limit)
    
    # Enrich cart data with product details and calculate total
    enriched_carts = []
    for cart in abandoned_carts:
        cart_total = 0
        enriched_items = []
        
        for item in cart.get("items", []):
            product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
            if product:
                item_total = product.get("price", 0) * item.get("quantity", 1)
                cart_total += item_total
                enriched_items.append({
                    "product_id": item["product_id"],
                    "product_name": product.get("name", "Unknown"),
                    "product_image": product.get("images", ["/placeholder.jpg"])[0] if product.get("images") else "/placeholder.jpg",
                    "price": product.get("price", 0),
                    "quantity": item.get("quantity", 1),
                    "item_total": item_total
                })
        
        # Get user email if logged in user
        user_email = None
        user_name = None
        if cart.get("user_id"):
            user = await db.users.find_one({"user_id": cart["user_id"]}, {"_id": 0})
            if user:
                user_email = user.get("email")
                user_name = user.get("name")
        
        # Calculate time since abandoned
        updated_at = cart.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        
        # Ensure updated_at is timezone-aware
        if updated_at and updated_at.tzinfo is None:
            updated_at = updated_at.replace(tzinfo=timezone.utc)
        
        hours_abandoned = (datetime.now(timezone.utc) - updated_at).total_seconds() / 3600 if updated_at else 0
        
        # Determine abandonment stage
        if hours_abandoned < 1:
            stage = "fresh"
            stage_label = "< 1 hour"
        elif hours_abandoned < 24:
            stage = "warm"
            stage_label = f"{int(hours_abandoned)} hours"
        elif hours_abandoned < 72:
            stage = "cooling"
            stage_label = f"{int(hours_abandoned / 24)} days"
        else:
            stage = "cold"
            stage_label = f"{int(hours_abandoned / 24)}+ days"
        
        enriched_carts.append({
            "cart_id": cart.get("cart_id"),
            "user_id": cart.get("user_id"),
            "session_id": cart.get("session_id"),
            "user_email": user_email or cart.get("guest_email"),
            "user_name": user_name,
            "guest_phone": cart.get("guest_phone"),
            "items": enriched_items,
            "items_count": len(enriched_items),
            "cart_total": cart_total,
            "created_at": cart.get("created_at"),
            "updated_at": cart.get("updated_at"),
            "hours_abandoned": round(hours_abandoned, 1),
            "stage": stage,
            "stage_label": stage_label,
            "recovery_status": cart.get("recovery_status", "pending"),
            "notes": cart.get("notes")
        })
    
    # Get summary stats
    total_abandoned = len(enriched_carts)
    total_value = sum(c["cart_total"] for c in enriched_carts)
    
    # Count by stage
    stage_counts = {
        "fresh": len([c for c in enriched_carts if c["stage"] == "fresh"]),
        "warm": len([c for c in enriched_carts if c["stage"] == "warm"]),
        "cooling": len([c for c in enriched_carts if c["stage"] == "cooling"]),
        "cold": len([c for c in enriched_carts if c["stage"] == "cold"])
    }
    
    return {
        "abandoned_carts": enriched_carts,
        "summary": {
            "total_abandoned": total_abandoned,
            "total_value": total_value,
            "avg_cart_value": total_value / total_abandoned if total_abandoned > 0 else 0,
            "by_stage": stage_counts
        }
    }

@api_router.get("/admin/abandoned-carts/stats")
async def get_abandoned_cart_stats(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get abandoned cart statistics for dashboard"""
    await require_admin(authorization, session_token)
    
    # Get counts for different time periods
    now = datetime.now(timezone.utc)
    
    async def count_abandoned(hours):
        threshold = now - timedelta(hours=hours)
        pipeline = [
            {
                "$match": {
                    "items": {"$exists": True, "$ne": []},
                    "updated_at": {"$lt": threshold}
                }
            },
            {
                "$lookup": {
                    "from": "orders",
                    "let": {"cart_user": "$user_id", "cart_session": "$session_id"},
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        {"$or": [
                                            {"$eq": ["$user_id", "$$cart_user"]},
                                            {"$eq": ["$session_id", "$$cart_session"]}
                                        ]},
                                        {"$eq": ["$payment_status", "paid"]}
                                    ]
                                }
                            }
                        }
                    ],
                    "as": "completed_orders"
                }
            },
            {
                "$match": {
                    "completed_orders": {"$size": 0}
                }
            },
            {
                "$count": "total"
            }
        ]
        result = await db.cart.aggregate(pipeline).to_list(1)
        return result[0]["total"] if result else 0
    
    # Get stats for different periods
    abandoned_1h = await count_abandoned(1)
    abandoned_24h = await count_abandoned(24)
    abandoned_72h = await count_abandoned(72)
    abandoned_7d = await count_abandoned(168)
    
    # Calculate potential revenue lost (from 24h+ abandoned)
    pipeline = [
        {
            "$match": {
                "items": {"$exists": True, "$ne": []},
                "updated_at": {"$lt": now - timedelta(hours=24)}
            }
        },
        {
            "$lookup": {
                "from": "orders",
                "let": {"cart_user": "$user_id", "cart_session": "$session_id"},
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$and": [
                                    {"$or": [
                                        {"$eq": ["$user_id", "$$cart_user"]},
                                        {"$eq": ["$session_id", "$$cart_session"]}
                                    ]},
                                    {"$eq": ["$payment_status", "paid"]}
                                ]
                            }
                        }
                    }
                ],
                "as": "completed_orders"
            }
        },
        {
            "$match": {
                "completed_orders": {"$size": 0}
            }
        }
    ]
    
    abandoned_carts = await db.cart.aggregate(pipeline).to_list(1000)
    
    # Calculate total potential revenue
    potential_revenue = 0
    for cart in abandoned_carts:
        for item in cart.get("items", []):
            product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0, "price": 1})
            if product:
                potential_revenue += product.get("price", 0) * item.get("quantity", 1)
    
    return {
        "abandoned_1h": abandoned_1h,
        "abandoned_24h": abandoned_24h,
        "abandoned_72h": abandoned_72h,
        "abandoned_7d": abandoned_7d,
        "potential_revenue_lost": potential_revenue,
        "recovery_tip": "Contact customers within 24 hours for best recovery rates!"
    }

@api_router.put("/admin/abandoned-carts/{cart_id}")
async def update_abandoned_cart(
    cart_id: str,
    update: AbandonedCartUpdate,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update abandoned cart with recovery notes/status"""
    await require_admin(authorization, session_token)
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    update_data["recovery_updated_at"] = datetime.now(timezone.utc)
    
    result = await db.cart.update_one(
        {"cart_id": cart_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    return {"message": "Cart updated successfully", "cart_id": cart_id}

@api_router.post("/cart/save-contact")
async def save_cart_contact(
    guest_email: Optional[str] = None,
    guest_phone: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
    guest_session: Optional[str] = Cookie(None)
):
    """Save guest contact info for abandoned cart recovery"""
    user = await get_current_user(authorization, session_token)
    identifier = {"user_id": user.user_id} if user else {"session_id": guest_session}
    
    if not guest_email and not guest_phone:
        raise HTTPException(status_code=400, detail="Please provide email or phone")
    
    update_data = {}
    if guest_email:
        update_data["guest_email"] = guest_email
    if guest_phone:
        update_data["guest_phone"] = guest_phone
    
    result = await db.cart.update_one(
        identifier,
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    return {"message": "Contact info saved", "email": guest_email, "phone": guest_phone}

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
    """Generate XML sitemap for SEO - Enhanced for better crawling"""
    products = await db.products.find({"stock": {"$gt": 0}}, {"_id": 0, "product_id": 1, "name": 1, "created_at": 1, "updated_at": 1}).to_list(1000)
    categories = await db.categories.find({}, {"_id": 0, "slug": 1, "name": 1}).to_list(100)
    
    base_url = os.environ['REACT_APP_BACKEND_URL'].replace('/api', '')
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    sitemap_xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    sitemap_xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
    
    # Homepage - highest priority
    sitemap_xml += f'''  <url>
    <loc>{base_url}/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>\n'''
    
    # Products listing page
    sitemap_xml += f'''  <url>
    <loc>{base_url}/products</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>\n'''
    
    # Category pages
    for category in categories:
        sitemap_xml += f'''  <url>
    <loc>{base_url}/products?category={category['slug']}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n'''
    
    # Individual product pages
    for product in products:
        updated = product.get('updated_at', product.get('created_at', ''))
        if updated:
            lastmod = str(updated)[:10]
        else:
            lastmod = today
        sitemap_xml += f'''  <url>
    <loc>{base_url}/products/{product['product_id']}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n'''
    
    # Static pages
    static_pages = [
        ('cart', '0.5', 'monthly'),
        ('checkout', '0.4', 'monthly'),
        ('support', '0.3', 'monthly'),
        ('terms', '0.2', 'yearly')
    ]
    for page, priority, freq in static_pages:
        sitemap_xml += f'''  <url>
    <loc>{base_url}/{page}</loc>
    <changefreq>{freq}</changefreq>
    <priority>{priority}</priority>
  </url>\n'''
    
    sitemap_xml += '</urlset>'
    
    return Response(content=sitemap_xml, media_type="application/xml")

# ============ FILE UPLOAD ENDPOINTS ============

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB upload limit (will be compressed)
TARGET_MAX_SIZE = 200 * 1024  # Target 200KB after compression for web performance

def compress_image(content: bytes, max_width: int = 1200, max_height: int = 800, quality: int = 70) -> tuple:
    """Compress image for web performance - returns (compressed_content, new_ext)"""
    try:
        img = PILImage.open(io.BytesIO(content))
        
        # Convert to RGB if necessary (for PNG with transparency, etc.)
        if img.mode in ('RGBA', 'P'):
            # Create white background for transparency
            background = PILImage.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[3])
            else:
                background.paste(img)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if larger than max dimensions (maintain aspect ratio)
        original_size = img.size
        if img.width > max_width or img.height > max_height:
            img.thumbnail((max_width, max_height), PILImage.Resampling.LANCZOS)
            logging.info(f"Resized image from {original_size} to {img.size}")
        
        # Save as WebP for best compression (or JPEG as fallback)
        output = io.BytesIO()
        
        # Try WebP first (best compression)
        try:
            img.save(output, format='WEBP', quality=quality, optimize=True)
            new_ext = 'webp'
        except Exception:
            # Fallback to JPEG
            output = io.BytesIO()
            img.save(output, format='JPEG', quality=quality, optimize=True)
            new_ext = 'jpg'
        
        compressed = output.getvalue()
        
        # If still too large, reduce quality further
        if len(compressed) > TARGET_MAX_SIZE and quality > 40:
            return compress_image(content, max_width, max_height, quality - 15)
        
        logging.info(f"Compressed image: {len(content)} bytes -> {len(compressed)} bytes ({(1-len(compressed)/len(content))*100:.1f}% reduction)")
        return compressed, new_ext
        
    except Exception as e:
        logging.error(f"Image compression failed: {e}")
        # Return original content if compression fails
        return content, None

@api_router.post("/upload/image")
async def upload_image(
    request: Request,
    file: UploadFile = File(...), 
    authorization: Optional[str] = Header(None), 
    session_token: Optional[str] = Cookie(None)
):
    """Upload an image file with automatic compression (admin only)"""
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
    original_size = len(content)
    
    # Validate file size
    if original_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB")
    
    # Compress image for web performance
    compressed_content, new_ext = compress_image(content)
    
    # Generate unique filename with potentially new extension
    if new_ext:
        unique_filename = f"{uuid.uuid4().hex}.{new_ext}"
    else:
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        unique_filename = f"{uuid.uuid4().hex}.{ext}"
        compressed_content = content  # Use original if compression failed
    
    file_path = UPLOAD_DIR / unique_filename
    
    # Save compressed file
    with open(file_path, "wb") as f:
        f.write(compressed_content)
    
    # Return the URL that can be used to access the image
    image_url = f"/api/uploads/{unique_filename}"
    
    return {
        "success": True,
        "filename": unique_filename,
        "url": image_url,
        "original_size": original_size,
        "compressed_size": len(compressed_content),
        "compression_ratio": f"{(1-len(compressed_content)/original_size)*100:.1f}%",
        "content_type": f"image/{new_ext}" if new_ext else file.content_type
    }

@api_router.post("/upload/images")
async def upload_multiple_images(files: List[UploadFile] = File(...), authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Upload multiple image files with compression (admin only)"""
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
            original_size = len(content)
            
            if original_size > MAX_FILE_SIZE:
                errors.append({"filename": file.filename, "error": "File too large"})
                continue
            
            # Compress image
            compressed_content, new_ext = compress_image(content)
            
            if new_ext:
                unique_filename = f"{uuid.uuid4().hex}.{new_ext}"
            else:
                ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
                unique_filename = f"{uuid.uuid4().hex}.{ext}"
                compressed_content = content
            
            file_path = UPLOAD_DIR / unique_filename
            
            with open(file_path, "wb") as f:
                f.write(compressed_content)
            
            uploaded.append({
                "original_name": file.filename,
                "filename": unique_filename,
                "url": f"/api/uploads/{unique_filename}",
                "original_size": original_size,
                "compressed_size": len(compressed_content)
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

# ==================== GST & INVOICE APIs ====================

# Indian states with codes for GST
INDIAN_STATES = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
    "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
    "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh",
    "24": "Gujarat", "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra",
    "28": "Andhra Pradesh (Old)", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep",
    "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar",
    "36": "Telangana", "37": "Andhra Pradesh"
}

def get_state_code(state_name: str) -> str:
    """Get state code from state name"""
    state_lower = state_name.lower().strip()
    for code, name in INDIAN_STATES.items():
        if name.lower() == state_lower or state_lower in name.lower():
            return code
    return "08"  # Default to Rajasthan

def number_to_words(num: float) -> str:
    """Convert number to words in Indian format"""
    ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
            'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
    tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    
    def words(n):
        if n < 20:
            return ones[n]
        elif n < 100:
            return tens[n // 10] + ('' if n % 10 == 0 else ' ' + ones[n % 10])
        elif n < 1000:
            return ones[n // 100] + ' Hundred' + ('' if n % 100 == 0 else ' and ' + words(n % 100))
        elif n < 100000:
            return words(n // 1000) + ' Thousand' + ('' if n % 1000 == 0 else ' ' + words(n % 1000))
        elif n < 10000000:
            return words(n // 100000) + ' Lakh' + ('' if n % 100000 == 0 else ' ' + words(n % 100000))
        else:
            return words(n // 10000000) + ' Crore' + ('' if n % 10000000 == 0 else ' ' + words(n % 10000000))
    
    rupees = int(num)
    paise = round((num - rupees) * 100)
    
    result = 'Rupees ' + words(rupees)
    if paise > 0:
        result += ' and ' + words(paise) + ' Paise'
    result += ' Only'
    return result

async def generate_invoice_number() -> str:
    """Generate unique invoice number like PC-2024-0001"""
    gst_settings = await db.gst_settings.find_one({"setting_id": "gst_settings"}, {"_id": 0})
    prefix = gst_settings.get("invoice_prefix", "PC") if gst_settings else "PC"
    year = datetime.now().year
    
    # Get last invoice number for this year
    last_invoice = await db.invoices.find_one(
        {"invoice_number": {"$regex": f"^{prefix}-{year}-"}},
        sort=[("created_at", -1)]
    )
    
    if last_invoice:
        last_num = int(last_invoice["invoice_number"].split("-")[-1])
        new_num = last_num + 1
    else:
        new_num = 1
    
    return f"{prefix}-{year}-{new_num:04d}"

async def calculate_gst(items: List[Dict], customer_state: str, gst_settings: Dict) -> Dict:
    """Calculate GST breakdown for order items"""
    business_state_code = gst_settings.get("business_state_code", "08")
    customer_state_code = get_state_code(customer_state)
    is_inter_state = business_state_code != customer_state_code
    
    total_taxable = 0
    total_cgst = 0
    total_sgst = 0
    total_igst = 0
    item_details = []
    
    for item in items:
        # Get product GST rate
        product = await db.products.find_one({"product_id": item["product_id"]}, {"_id": 0})
        if not product:
            continue
            
        # Priority: Product GST > Category GST > Default GST
        gst_rate = product.get("gst_rate")
        hsn_code = product.get("hsn_code", "")
        
        if gst_rate is None:
            category = await db.categories.find_one({"slug": product["category"]}, {"_id": 0})
            if category:
                gst_rate = category.get("gst_rate")
                if not hsn_code:
                    hsn_code = category.get("hsn_code", "")
        
        if gst_rate is None:
            gst_rate = gst_settings.get("default_gst_rate", 18.0)
        
        # Calculate taxable amount (price is inclusive of GST)
        item_total = item["price"] * item["quantity"]
        if gst_settings.get("prices_include_gst", True):
            taxable_amount = item_total / (1 + gst_rate / 100)
        else:
            taxable_amount = item_total
        
        # Calculate GST
        if is_inter_state:
            igst = taxable_amount * gst_rate / 100
            cgst = 0
            sgst = 0
        else:
            cgst = taxable_amount * (gst_rate / 2) / 100
            sgst = taxable_amount * (gst_rate / 2) / 100
            igst = 0
        
        total_taxable += taxable_amount
        total_cgst += cgst
        total_sgst += sgst
        total_igst += igst
        
        item_details.append({
            "product_id": item["product_id"],
            "product_name": item.get("product_name", product["name"]),
            "hsn_code": hsn_code,
            "quantity": item["quantity"],
            "unit_price": item["price"],
            "taxable_amount": round(taxable_amount, 2),
            "gst_rate": gst_rate,
            "cgst": round(cgst, 2),
            "sgst": round(sgst, 2),
            "igst": round(igst, 2),
            "total": round(item_total, 2)
        })
    
    return {
        "is_inter_state": is_inter_state,
        "items": item_details,
        "taxable_amount": round(total_taxable, 2),
        "cgst_amount": round(total_cgst, 2),
        "sgst_amount": round(total_sgst, 2),
        "igst_amount": round(total_igst, 2),
        "total_gst": round(total_cgst + total_sgst + total_igst, 2)
    }

# GST Settings APIs
@api_router.get("/gst-settings")
async def get_gst_settings():
    """Get GST settings (public - for checkout display)"""
    settings = await db.gst_settings.find_one({"setting_id": "gst_settings"}, {"_id": 0})
    if not settings:
        # Return default settings
        settings = {
            "setting_id": "gst_settings",
            "business_name": "Paridhaan Creations",
            "gstin": "08BFVPG3792N1ZH",
            "business_address": "Terra City 1, Tijara, 301411",
            "business_state": "Rajasthan",
            "business_state_code": "08",
            "default_gst_rate": 18.0,
            "gst_enabled": True,
            "prices_include_gst": True
        }
        await db.gst_settings.insert_one(settings)
    return settings

@api_router.put("/admin/gst-settings")
async def update_gst_settings(updates: GSTSettingsUpdate, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Update GST settings (admin only)"""
    await require_admin(authorization, session_token)
    
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.gst_settings.update_one(
        {"setting_id": "gst_settings"},
        {"$set": update_dict},
        upsert=True
    )
    
    settings = await db.gst_settings.find_one({"setting_id": "gst_settings"}, {"_id": 0})
    return settings

@api_router.get("/indian-states")
async def get_indian_states():
    """Get list of Indian states with codes"""
    return [{"code": code, "name": name} for code, name in INDIAN_STATES.items()]

# Invoice Generation API
@api_router.get("/orders/{order_id}/invoice")
async def get_or_generate_invoice(order_id: str, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Get or generate invoice for an order"""
    # Check if invoice already exists
    existing_invoice = await db.invoices.find_one({"order_id": order_id}, {"_id": 0})
    if existing_invoice:
        return existing_invoice
    
    # Get order
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Only generate invoice for paid/confirmed orders
    if order["payment_status"] not in ["paid", "completed"] and order["status"] not in ["confirmed", "processing", "shipped", "delivered"]:
        raise HTTPException(status_code=400, detail="Invoice can only be generated for confirmed/paid orders")
    
    # Get GST settings
    gst_settings = await db.gst_settings.find_one({"setting_id": "gst_settings"}, {"_id": 0})
    if not gst_settings:
        gst_settings = {
            "business_name": "Paridhaan Creations",
            "gstin": "08BFVPG3792N1ZH",
            "business_address": "Terra City 1, Tijara, 301411",
            "business_state": "Rajasthan",
            "business_state_code": "08",
            "default_gst_rate": 18.0,
            "prices_include_gst": True,
            "invoice_prefix": "PC"
        }
    
    # Calculate GST
    customer_state = order["shipping_address"]["state"]
    gst_calc = await calculate_gst(order["items"], customer_state, gst_settings)
    
    # Generate invoice number
    invoice_number = await generate_invoice_number()
    
    # Calculate totals
    subtotal = sum(item["price"] * item["quantity"] for item in order["items"])
    discount = order.get("discount_amount", 0)
    taxable_amount = gst_calc["taxable_amount"]
    grand_total = order["total_amount"]
    
    # Create invoice
    invoice = {
        "invoice_id": f"inv_{uuid.uuid4().hex[:12]}",
        "invoice_number": invoice_number,
        "order_id": order_id,
        # Seller Details
        "seller_name": gst_settings.get("business_name", "Paridhaan Creations"),
        "seller_gstin": gst_settings.get("gstin", ""),
        "seller_address": gst_settings.get("business_address", ""),
        "seller_state": gst_settings.get("business_state", "Rajasthan"),
        "seller_state_code": gst_settings.get("business_state_code", "08"),
        "seller_phone": gst_settings.get("business_phone", ""),
        "seller_email": gst_settings.get("business_email", ""),
        # Buyer Details
        "buyer_name": order["shipping_address"]["full_name"],
        "buyer_address": f"{order['shipping_address']['address_line1']}, {order['shipping_address'].get('address_line2', '')} {order['shipping_address']['city']}, {order['shipping_address']['state']} - {order['shipping_address']['pincode']}".replace(", ,", ","),
        "buyer_state": customer_state,
        "buyer_state_code": get_state_code(customer_state),
        "buyer_gstin": order["shipping_address"].get("gstin"),
        "buyer_phone": order["shipping_address"]["phone"],
        "buyer_email": order.get("guest_email"),
        # Invoice Items with GST
        "items": gst_calc["items"],
        # Amounts
        "subtotal": round(subtotal, 2),
        "discount": round(discount, 2),
        "taxable_amount": round(taxable_amount, 2),
        "cgst_amount": gst_calc["cgst_amount"],
        "sgst_amount": gst_calc["sgst_amount"],
        "igst_amount": gst_calc["igst_amount"],
        "total_gst": gst_calc["total_gst"],
        "grand_total": round(grand_total, 2),
        "amount_in_words": number_to_words(grand_total),
        # Status
        "is_inter_state": gst_calc["is_inter_state"],
        "payment_method": order["payment_method"],
        "payment_status": order["payment_status"],
        # Bank Details
        "bank_name": gst_settings.get("bank_name"),
        "bank_account_number": gst_settings.get("bank_account_number"),
        "bank_ifsc": gst_settings.get("bank_ifsc"),
        # Footer
        "invoice_footer_text": gst_settings.get("invoice_footer_text", "Thank you for shopping with us!"),
        "terms_and_conditions": gst_settings.get("terms_and_conditions"),
        "authorized_signatory": gst_settings.get("authorized_signatory"),
        # Timestamps
        "invoice_date": datetime.now(timezone.utc).isoformat(),
        "order_date": order["created_at"].isoformat() if isinstance(order["created_at"], datetime) else order["created_at"],
        "created_at": datetime.now(timezone.utc)
    }
    
    # Generate QR code data (for UPI/verification)
    qr_data = f"Invoice: {invoice_number}|Amount: {grand_total}|GSTIN: {gst_settings.get('gstin', '')}"
    invoice["qr_code_data"] = qr_data
    
    # Save invoice
    await db.invoices.insert_one(invoice)
    
    # Update order with invoice number
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "invoice_number": invoice_number,
            "invoice_generated_at": datetime.now(timezone.utc),
            "gst_details": {
                "is_inter_state": gst_calc["is_inter_state"],
                "taxable_amount": taxable_amount,
                "cgst_amount": gst_calc["cgst_amount"],
                "sgst_amount": gst_calc["sgst_amount"],
                "igst_amount": gst_calc["igst_amount"],
                "total_gst": gst_calc["total_gst"]
            }
        }}
    )
    
    # Remove _id before returning
    invoice.pop("_id", None)
    return invoice

@api_router.get("/orders/{order_id}/invoice/pdf")
async def generate_invoice_pdf(order_id: str):
    """Generate and download invoice PDF"""
    # Get invoice
    invoice = await db.invoices.find_one({"order_id": order_id}, {"_id": 0})
    if not invoice:
        # Try to generate invoice first
        invoice = await get_or_generate_invoice(order_id, None, None)
    
    # Generate PDF
    pdf_filename = f"invoice_{invoice['invoice_number'].replace('-', '_')}.pdf"
    pdf_path = UPLOAD_DIR / pdf_filename
    
    # Create PDF
    doc = SimpleDocTemplate(str(pdf_path), pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=30)
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=20, alignment=TA_CENTER, spaceAfter=20, textColor=colors.HexColor('#8B4513'))
    header_style = ParagraphStyle('Header', parent=styles['Normal'], fontSize=10, alignment=TA_CENTER, textColor=colors.grey)
    normal_style = ParagraphStyle('Normal', parent=styles['Normal'], fontSize=9)
    bold_style = ParagraphStyle('Bold', parent=styles['Normal'], fontSize=9, fontName='Helvetica-Bold')
    right_style = ParagraphStyle('Right', parent=styles['Normal'], fontSize=9, alignment=TA_RIGHT)
    
    # Header - Tax Invoice
    elements.append(Paragraph("TAX INVOICE", title_style))
    elements.append(Spacer(1, 10))
    
    # Invoice details row
    invoice_info = [
        [Paragraph(f"<b>Invoice No:</b> {invoice['invoice_number']}", normal_style),
         Paragraph(f"<b>Invoice Date:</b> {invoice['invoice_date'][:10]}", right_style)],
        [Paragraph(f"<b>Order ID:</b> {invoice['order_id']}", normal_style),
         Paragraph(f"<b>Order Date:</b> {invoice['order_date'][:10]}", right_style)]
    ]
    invoice_table = Table(invoice_info, colWidths=[280, 250])
    invoice_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(invoice_table)
    elements.append(Spacer(1, 15))
    
    # Seller and Buyer Details
    seller_buyer_data = [
        [Paragraph("<b>SELLER DETAILS</b>", bold_style), Paragraph("<b>BUYER DETAILS</b>", bold_style)],
        [Paragraph(f"<b>{invoice['seller_name']}</b>", normal_style), 
         Paragraph(f"<b>{invoice['buyer_name']}</b>", normal_style)],
        [Paragraph(f"GSTIN: {invoice['seller_gstin']}", normal_style),
         Paragraph(f"GSTIN: {invoice.get('buyer_gstin') or 'N/A'}", normal_style)],
        [Paragraph(f"{invoice['seller_address']}", normal_style),
         Paragraph(f"{invoice['buyer_address']}", normal_style)],
        [Paragraph(f"State: {invoice['seller_state']} ({invoice['seller_state_code']})", normal_style),
         Paragraph(f"State: {invoice['buyer_state']} ({invoice['buyer_state_code']})", normal_style)],
        [Paragraph(f"Phone: {invoice.get('seller_phone') or ''}", normal_style),
         Paragraph(f"Phone: {invoice.get('buyer_phone') or ''}", normal_style)],
    ]
    
    seller_buyer_table = Table(seller_buyer_data, colWidths=[265, 265])
    seller_buyer_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f5f5f5')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(seller_buyer_table)
    elements.append(Spacer(1, 15))
    
    # Items table header
    is_inter_state = invoice.get("is_inter_state", False)
    if is_inter_state:
        items_header = ['S.No', 'Item Description', 'HSN', 'Qty', 'Rate', 'Taxable', 'IGST%', 'IGST', 'Total']
        col_widths = [30, 130, 50, 35, 50, 55, 40, 45, 55]
    else:
        items_header = ['S.No', 'Item Description', 'HSN', 'Qty', 'Rate', 'Taxable', 'CGST%', 'CGST', 'SGST', 'Total']
        col_widths = [25, 115, 45, 30, 45, 50, 35, 40, 40, 50]
    
    items_data = [items_header]
    
    for idx, item in enumerate(invoice['items'], 1):
        if is_inter_state:
            row = [
                str(idx),
                item['product_name'][:30],
                item.get('hsn_code', ''),
                str(item['quantity']),
                f"₹{item['unit_price']:.2f}",
                f"₹{item['taxable_amount']:.2f}",
                f"{item['gst_rate']}%",
                f"₹{item['igst']:.2f}",
                f"₹{item['total']:.2f}"
            ]
        else:
            row = [
                str(idx),
                item['product_name'][:25],
                item.get('hsn_code', ''),
                str(item['quantity']),
                f"₹{item['unit_price']:.2f}",
                f"₹{item['taxable_amount']:.2f}",
                f"{item['gst_rate']/2}%",
                f"₹{item['cgst']:.2f}",
                f"₹{item['sgst']:.2f}",
                f"₹{item['total']:.2f}"
            ]
        items_data.append(row)
    
    items_table = Table(items_data, colWidths=col_widths)
    items_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 1, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#8B4513')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 15))
    
    # Summary table
    summary_data = [
        ['Subtotal:', f"₹{invoice['subtotal']:.2f}"],
    ]
    if invoice.get('discount', 0) > 0:
        summary_data.append(['Discount:', f"-₹{invoice['discount']:.2f}"])
    summary_data.append(['Taxable Amount:', f"₹{invoice['taxable_amount']:.2f}"])
    
    if is_inter_state:
        summary_data.append([f"IGST:", f"₹{invoice['igst_amount']:.2f}"])
    else:
        summary_data.append([f"CGST:", f"₹{invoice['cgst_amount']:.2f}"])
        summary_data.append([f"SGST:", f"₹{invoice['sgst_amount']:.2f}"])
    
    summary_data.append(['Total GST:', f"₹{invoice['total_gst']:.2f}"])
    summary_data.append(['', ''])
    summary_data.append([Paragraph('<b>GRAND TOTAL:</b>', bold_style), Paragraph(f"<b>₹{invoice['grand_total']:.2f}</b>", bold_style)])
    
    summary_table = Table(summary_data, colWidths=[380, 150])
    summary_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('LINEABOVE', (0, -1), (-1, -1), 1, colors.black),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(summary_table)
    elements.append(Spacer(1, 10))
    
    # Amount in words
    elements.append(Paragraph(f"<b>Amount in Words:</b> {invoice['amount_in_words']}", normal_style))
    elements.append(Spacer(1, 20))
    
    # Bank Details & Signature
    if invoice.get('bank_name'):
        bank_data = [
            [Paragraph("<b>Bank Details:</b>", bold_style), '', Paragraph("<b>For Paridhaan Creations</b>", bold_style)],
            [f"Bank: {invoice.get('bank_name', '')}", '', ''],
            [f"A/C No: {invoice.get('bank_account_number', '')}", '', ''],
            [f"IFSC: {invoice.get('bank_ifsc', '')}", '', ''],
            ['', '', Paragraph("<b>Authorized Signatory</b>", normal_style)],
        ]
    else:
        bank_data = [
            ['', '', Paragraph("<b>For Paridhaan Creations</b>", bold_style)],
            ['', '', ''],
            ['', '', ''],
            ['', '', Paragraph("<b>Authorized Signatory</b>", normal_style)],
        ]
    
    bank_table = Table(bank_data, colWidths=[200, 130, 200])
    bank_table.setStyle(TableStyle([
        ('ALIGN', (2, 0), (2, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(bank_table)
    elements.append(Spacer(1, 20))
    
    # Footer
    if invoice.get('invoice_footer_text'):
        elements.append(Paragraph(f"<i>{invoice['invoice_footer_text']}</i>", header_style))
    
    elements.append(Paragraph("This is a computer generated invoice and does not require a physical signature.", header_style))
    
    # Build PDF
    doc.build(elements)
    
    # Update invoice with PDF path
    await db.invoices.update_one(
        {"order_id": order_id},
        {"$set": {"pdf_path": f"/api/uploads/{pdf_filename}"}}
    )
    
    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=pdf_filename,
        headers={"Content-Disposition": f"attachment; filename={pdf_filename}"}
    )

@api_router.get("/admin/invoices")
async def list_invoices(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None), limit: int = 50, skip: int = 0):
    """List all invoices (admin only)"""
    await require_admin(authorization, session_token)
    
    invoices = await db.invoices.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.invoices.count_documents({})
    
    return {"invoices": invoices, "total": total}

# Update product GST
@api_router.put("/admin/products/{product_id}/gst")
async def update_product_gst(product_id: str, gst_rate: Optional[float] = None, hsn_code: Optional[str] = None, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Update product GST rate and HSN code (admin only)"""
    await require_admin(authorization, session_token)
    
    update_dict = {}
    if gst_rate is not None:
        update_dict["gst_rate"] = gst_rate
    if hsn_code is not None:
        update_dict["hsn_code"] = hsn_code
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product = await db.products.find_one({"product_id": product_id}, {"_id": 0})
    return product

# Update category GST
@api_router.put("/admin/categories/{category_id}/gst")
async def update_category_gst(category_id: str, gst_rate: Optional[float] = None, hsn_code: Optional[str] = None, authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Update category default GST rate and HSN code (admin only)"""
    await require_admin(authorization, session_token)
    
    update_dict = {}
    if gst_rate is not None:
        update_dict["gst_rate"] = gst_rate
    if hsn_code is not None:
        update_dict["hsn_code"] = hsn_code
    
    if not update_dict:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    result = await db.categories.update_one(
        {"category_id": category_id},
        {"$set": update_dict}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category = await db.categories.find_one({"category_id": category_id}, {"_id": 0})
    return category

# ==================== SHIPROCKET SHIPPING APIs ====================

@api_router.get("/shiprocket/pickup-locations")
async def get_shiprocket_pickup_locations(authorization: Optional[str] = Header(None), session_token: Optional[str] = Cookie(None)):
    """Get all pickup locations from Shiprocket (admin only)"""
    await require_admin(authorization, session_token)
    
    try:
        locations = await ShiprocketService.get_pickup_locations()
        return {"success": True, "locations": locations}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/shiprocket/couriers")
async def get_available_couriers(
    delivery_pincode: str,
    weight: float = 0.5,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get available courier services with rates"""
    # Default pickup pincode from business address (Tijara, Rajasthan)
    pickup_pincode = "301411"
    
    try:
        couriers = await ShiprocketService.get_available_couriers(
            pickup_pincode=pickup_pincode,
            delivery_pincode=delivery_pincode,
            weight=weight,
            cod=0  # Prepaid only
        )
        
        # Format courier data
        formatted_couriers = []
        for c in couriers[:10]:  # Top 10 couriers
            formatted_couriers.append({
                "courier_id": c.get("courier_company_id"),
                "courier_name": c.get("courier_name"),
                "rate": c.get("rate"),
                "etd": c.get("etd"),  # Estimated Time of Delivery
                "rating": c.get("rating"),
                "min_weight": c.get("min_weight"),
                "charge_weight": c.get("charge_weight")
            })
        
        return {
            "success": True,
            "couriers": formatted_couriers,
            "pickup_pincode": pickup_pincode,
            "delivery_pincode": delivery_pincode
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/shiprocket/create-shipment/{order_id}")
async def create_shiprocket_shipment(
    order_id: str,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create shipment in Shiprocket for an order (admin only)"""
    await require_admin(authorization, session_token)
    
    # Get order
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if shipment already exists
    existing_shipment = await db.shipments.find_one({"order_id": order_id}, {"_id": 0})
    if existing_shipment and existing_shipment.get("shiprocket_order_id"):
        return {
            "success": True,
            "message": "Shipment already exists",
            "shipment": existing_shipment
        }
    
    try:
        # Create order in Shiprocket
        sr_response = await ShiprocketService.create_shiprocket_order(order)
        
        # Create shipment record
        shipment = {
            "shipment_id": f"ship_{uuid.uuid4().hex[:12]}",
            "order_id": order_id,
            "shiprocket_order_id": sr_response.get("order_id"),
            "shiprocket_shipment_id": sr_response.get("shipment_id"),
            "status": "processing",
            "tracking_history": [{
                "status": "Order created in Shiprocket",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "location": "Tijara, Rajasthan"
            }],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.shipments.insert_one(shipment)
        
        # Update order status
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {"status": "processing", "shiprocket_order_id": sr_response.get("order_id")}}
        )
        
        shipment.pop("_id", None)
        return {
            "success": True,
            "message": "Shipment created successfully",
            "shipment": shipment,
            "shiprocket_response": sr_response
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/shiprocket/assign-courier/{order_id}")
async def assign_courier_to_shipment(
    order_id: str,
    courier_id: int,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Assign courier and generate AWB for a shipment (admin only)"""
    await require_admin(authorization, session_token)
    
    # Get shipment
    shipment = await db.shipments.find_one({"order_id": order_id}, {"_id": 0})
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found. Create shipment first.")
    
    if not shipment.get("shiprocket_shipment_id"):
        raise HTTPException(status_code=400, detail="Shiprocket shipment ID not found")
    
    try:
        # Assign courier and get AWB
        awb_response = await ShiprocketService.assign_awb(
            shipment_id=shipment["shiprocket_shipment_id"],
            courier_id=courier_id
        )
        
        awb_data = awb_response.get("response", {}).get("data", {})
        
        # Generate label
        label_response = await ShiprocketService.generate_label(shipment["shiprocket_shipment_id"])
        
        # Site URL for tracking
        site_url = os.environ.get("SITE_URL", "https://paridhaancreations.xyz")
        tracking_url = f"{site_url}/track/{order_id}"
        
        # Update shipment record
        update_data = {
            "courier_id": courier_id,
            "courier_name": awb_data.get("courier_name", ""),
            "awb_number": awb_data.get("awb_code", ""),
            "shipping_rate": awb_data.get("freight_charge", 0),
            "status": "shipped",
            "label_url": label_response.get("label_url", ""),
            "tracking_url": f"https://shiprocket.co/tracking/{awb_data.get('awb_code', '')}",
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Add tracking history
        update_data["$push"] = {
            "tracking_history": {
                "status": f"Courier assigned: {awb_data.get('courier_name', '')}",
                "awb": awb_data.get("awb_code", ""),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "location": "Tijara, Rajasthan"
            }
        }
        
        await db.shipments.update_one(
            {"order_id": order_id},
            {"$set": {k: v for k, v in update_data.items() if k != "$push"}, "$push": update_data.get("$push", {})}
        )
        
        # Update order status
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {"status": "shipped"}}
        )
        
        # Send "shipped" email with tracking link
        order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
        if order:
            await send_order_email(order, "shipped", tracking_url)
            
            # Also send SMS if phone available
            if order.get("shipping_address", {}).get("phone"):
                await send_order_notification(order_id, order["shipping_address"]["phone"], "shipped", tracking_url)
        
        return {
            "success": True,
            "message": "Courier assigned successfully",
            "awb_number": awb_data.get("awb_code"),
            "courier_name": awb_data.get("courier_name"),
            "label_url": label_response.get("label_url"),
            "tracking_url": tracking_url
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.get("/shiprocket/track/{order_id}")
async def track_shipment(order_id: str):
    """Track shipment by order ID (public - for customers)"""
    # Get shipment
    shipment = await db.shipments.find_one({"order_id": order_id}, {"_id": 0})
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    # Get order for customer details
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    
    result = {
        "order_id": order_id,
        "status": shipment.get("status", "pending"),
        "courier_name": shipment.get("courier_name"),
        "awb_number": shipment.get("awb_number"),
        "tracking_url": shipment.get("tracking_url"),
        "label_url": shipment.get("label_url"),
        "estimated_delivery": shipment.get("estimated_delivery"),
        "tracking_history": shipment.get("tracking_history", []),
        "created_at": shipment.get("created_at")
    }
    
    # If AWB exists, try to get live tracking from Shiprocket
    if shipment.get("awb_number"):
        try:
            live_tracking = await ShiprocketService.track_shipment(shipment["awb_number"])
            tracking_data = live_tracking.get("tracking_data", {})
            
            result["live_tracking"] = {
                "current_status": tracking_data.get("shipment_status_id"),
                "current_status_text": tracking_data.get("shipment_status"),
                "current_location": tracking_data.get("current_location"),
                "delivered_date": tracking_data.get("delivered_date"),
                "activities": tracking_data.get("shipment_track_activities", [])
            }
        except:
            pass  # If live tracking fails, return stored data
    
    return result

@api_router.get("/shiprocket/track-awb/{awb_number}")
async def track_by_awb(awb_number: str):
    """Track shipment by AWB number (public)"""
    try:
        tracking = await ShiprocketService.track_shipment(awb_number)
        return {"success": True, "tracking": tracking}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.post("/shiprocket/webhook")
async def shiprocket_webhook(request: Request):
    """Webhook endpoint for Shiprocket status updates"""
    try:
        body = await request.json()
        
        awb_number = body.get("awb")
        status = body.get("current_status")
        status_id = body.get("current_status_id")
        location = body.get("scans", [{}])[-1].get("location", "") if body.get("scans") else ""
        
        if not awb_number:
            return {"status": "ignored", "message": "No AWB number"}
        
        # Find shipment by AWB
        shipment = await db.shipments.find_one({"awb_number": awb_number})
        if not shipment:
            return {"status": "ignored", "message": "Shipment not found"}
        
        # Map Shiprocket status to our status
        status_map = {
            6: "shipped",
            7: "in_transit",
            8: "out_for_delivery",
            9: "delivered",
            10: "cancelled",
            11: "rto_initiated",
            12: "rto_delivered"
        }
        
        new_status = status_map.get(status_id, shipment.get("status"))
        
        # Update shipment
        await db.shipments.update_one(
            {"awb_number": awb_number},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc)
                },
                "$push": {
                    "tracking_history": {
                        "status": status,
                        "status_id": status_id,
                        "location": location,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                }
            }
        )
        
        # Update order status
        order_status_map = {
            "delivered": "delivered",
            "cancelled": "cancelled",
            "rto_initiated": "return_initiated",
            "rto_delivered": "returned"
        }
        
        if new_status in order_status_map:
            await db.orders.update_one(
                {"order_id": shipment["order_id"]},
                {"$set": {"status": order_status_map[new_status]}}
            )
        
        return {"status": "success", "message": "Webhook processed"}
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@api_router.get("/admin/shipments")
async def get_all_shipments(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
    limit: int = 50,
    skip: int = 0
):
    """Get all shipments (admin only)"""
    await require_admin(authorization, session_token)
    
    shipments = await db.shipments.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.shipments.count_documents({})
    
    return {"shipments": shipments, "total": total}

@api_router.post("/shiprocket/cancel/{order_id}")
async def cancel_shiprocket_order(
    order_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Cancel shipment in Shiprocket (admin only)"""
    await require_admin(authorization, session_token)
    
    shipment = await db.shipments.find_one({"order_id": order_id}, {"_id": 0})
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    if not shipment.get("shiprocket_order_id"):
        raise HTTPException(status_code=400, detail="No Shiprocket order to cancel")
    
    try:
        cancel_response = await ShiprocketService.cancel_order(shipment["shiprocket_order_id"])
        
        # Update shipment status
        await db.shipments.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": "cancelled",
                    "updated_at": datetime.now(timezone.utc)
                },
                "$push": {
                    "tracking_history": {
                        "status": "Order cancelled",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                }
            }
        )
        
        # Update order status
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {"status": "cancelled"}}
        )
        
        return {"success": True, "message": "Order cancelled successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ============ WHATSAPP AI CHATBOT ENDPOINTS ============
# DISABLED - Enable when business grows and AI chatbot is needed
# from whatsapp_chatbot import WhatsAppAIChatbot, format_products_list
# from whatsapp_service import WhatsAppService
# whatsapp_chatbot = WhatsAppAIChatbot(db=db)

WHATSAPP_WEBHOOK_VERIFY_TOKEN = os.environ.get("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "paridhaan_verify_token")

# Note: WhatsApp AI Chatbot endpoints are disabled. 
# Basic WhatsApp click-to-chat is still available on frontend.
# To enable AI chatbot later, uncomment the imports above and endpoints below.

# ===== WHATSAPP AI ENDPOINTS (DISABLED) =====
# These endpoints are commented out. Enable when business grows.
# 
# @api_router.get("/webhook/whatsapp")
# @api_router.post("/webhook/whatsapp") 
# @api_router.post("/whatsapp/send")
# @api_router.get("/whatsapp/conversations")
# @api_router.get("/whatsapp/messages/{phone}")
# @api_router.get("/whatsapp/stats")
#
# Full code saved in: whatsapp_chatbot.py.disabled
# ===== END WHATSAPP AI ENDPOINTS =====

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