"""
WhatsApp Business API Integration Service
Supports both WhatsApp Cloud API (Meta) and simple webhook-based notifications
"""

import os
import httpx
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any

# WhatsApp Cloud API Configuration
WHATSAPP_API_VERSION = "v18.0"
WHATSAPP_API_URL = f"https://graph.facebook.com/{WHATSAPP_API_VERSION}"
WHATSAPP_ACCESS_TOKEN = os.environ.get("WHATSAPP_ACCESS_TOKEN")
WHATSAPP_PHONE_NUMBER_ID = os.environ.get("WHATSAPP_PHONE_NUMBER_ID")
WHATSAPP_BUSINESS_ACCOUNT_ID = os.environ.get("WHATSAPP_BUSINESS_ACCOUNT_ID")

class WhatsAppService:
    """WhatsApp Business API Service for order notifications"""
    
    @staticmethod
    def is_configured() -> bool:
        """Check if WhatsApp API is configured"""
        return bool(WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID)
    
    @staticmethod
    def format_phone_number(phone: str) -> str:
        """Format phone number for WhatsApp API (must include country code)"""
        # Remove all non-digits
        phone = ''.join(filter(str.isdigit, phone))
        
        # Add India country code if not present
        if len(phone) == 10:
            phone = "91" + phone
        elif phone.startswith("0"):
            phone = "91" + phone[1:]
        
        return phone
    
    @staticmethod
    async def send_text_message(phone: str, message: str) -> Dict[str, Any]:
        """Send a simple text message via WhatsApp"""
        if not WhatsAppService.is_configured():
            logging.info(f"WhatsApp not configured. Message to {phone}: {message[:50]}...")
            return {"success": False, "reason": "not_configured"}
        
        phone = WhatsAppService.format_phone_number(phone)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages",
                    headers={
                        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "messaging_product": "whatsapp",
                        "recipient_type": "individual",
                        "to": phone,
                        "type": "text",
                        "text": {"body": message}
                    }
                )
                
                if response.status_code == 200:
                    return {"success": True, "response": response.json()}
                else:
                    logging.error(f"WhatsApp API error: {response.text}")
                    return {"success": False, "error": response.text}
                    
        except Exception as e:
            logging.error(f"WhatsApp send error: {str(e)}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    async def send_template_message(
        phone: str, 
        template_name: str, 
        language_code: str = "en",
        components: list = None
    ) -> Dict[str, Any]:
        """Send a pre-approved template message"""
        if not WhatsAppService.is_configured():
            logging.info(f"WhatsApp not configured. Template {template_name} to {phone}")
            return {"success": False, "reason": "not_configured"}
        
        phone = WhatsAppService.format_phone_number(phone)
        
        payload = {
            "messaging_product": "whatsapp",
            "to": phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code}
            }
        }
        
        if components:
            payload["template"]["components"] = components
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{WHATSAPP_API_URL}/{WHATSAPP_PHONE_NUMBER_ID}/messages",
                    headers={
                        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                
                if response.status_code == 200:
                    return {"success": True, "response": response.json()}
                else:
                    logging.error(f"WhatsApp template error: {response.text}")
                    return {"success": False, "error": response.text}
                    
        except Exception as e:
            logging.error(f"WhatsApp template error: {str(e)}")
            return {"success": False, "error": str(e)}


class OrderWhatsAppNotifications:
    """Pre-built order notification messages for WhatsApp"""
    
    @staticmethod
    def get_order_confirmation_message(order: Dict, tracking_url: str) -> str:
        """Generate order confirmation message"""
        order_id = order.get("order_id", "")
        total = order.get("total_amount", 0)
        items_count = len(order.get("items", []))
        
        # Get first 2 item names
        items = order.get("items", [])
        item_names = [item.get("product_name", "Item")[:25] for item in items[:2]]
        items_text = ", ".join(item_names)
        if len(items) > 2:
            items_text += f" +{len(items)-2} more"
        
        message = f"""🎉 *Order Confirmed!*

Thank you for shopping with *Paridhaan Creations*!

📦 *Order ID:* {order_id}
🛍️ *Items:* {items_text}
💰 *Total:* ₹{total:.2f}

Your order is being prepared with love and care.

📍 *Track your order:*
{tracking_url}

We'll notify you when it ships! 🚚"""
        
        return message
    
    @staticmethod
    def get_order_shipped_message(order: Dict, tracking_url: str, awb: str = None, courier: str = None) -> str:
        """Generate order shipped message"""
        order_id = order.get("order_id", "")
        
        message = f"""🚚 *Your Order is on its Way!*

Great news! Your order from *Paridhaan Creations* has been shipped!

📦 *Order ID:* {order_id}"""
        
        if courier:
            message += f"\n🏢 *Courier:* {courier}"
        
        if awb:
            message += f"\n📋 *AWB Number:* {awb}"
        
        message += f"""

📍 *Track your package:*
{tracking_url}

Your order will reach you soon! 🎁"""
        
        return message
    
    @staticmethod
    def get_out_for_delivery_message(order: Dict) -> str:
        """Generate out for delivery message"""
        order_id = order.get("order_id", "")
        
        message = f"""📍 *Out for Delivery!*

Exciting news! Your order #{order_id} is out for delivery today!

Please ensure someone is available to receive the package.

Thank you for choosing *Paridhaan Creations*! 🙏"""
        
        return message
    
    @staticmethod
    def get_order_delivered_message(order: Dict) -> str:
        """Generate order delivered message"""
        order_id = order.get("order_id", "")
        
        message = f"""✅ *Order Delivered!*

Your order #{order_id} has been delivered successfully!

We hope you love your purchase from *Paridhaan Creations*! 💝

If you have any questions or concerns, please don't hesitate to reach out.

Thank you for shopping with us! 🙏

Would you like to leave a review? Your feedback helps us serve you better!"""
        
        return message
    
    @staticmethod
    def get_payment_received_message(order: Dict, tracking_url: str) -> str:
        """Generate payment received message"""
        order_id = order.get("order_id", "")
        total = order.get("total_amount", 0)
        
        message = f"""💳 *Payment Received!*

Thank you! We've received your payment of *₹{total:.2f}* for order #{order_id}.

Your order is now confirmed and will be processed shortly.

📍 *Track your order:*
{tracking_url}

*Paridhaan Creations* 🙏"""
        
        return message


async def send_order_whatsapp_notification(
    order: Dict, 
    notification_type: str, 
    tracking_url: str = None,
    awb: str = None,
    courier: str = None
) -> Dict[str, Any]:
    """
    Send WhatsApp notification for order events
    
    notification_type: confirmation, shipped, out_for_delivery, delivered, payment_received
    """
    phone = order.get("shipping_address", {}).get("phone")
    if not phone:
        return {"success": False, "reason": "no_phone"}
    
    # Generate message based on type
    if notification_type == "confirmation":
        message = OrderWhatsAppNotifications.get_order_confirmation_message(order, tracking_url)
    elif notification_type == "shipped":
        message = OrderWhatsAppNotifications.get_order_shipped_message(order, tracking_url, awb, courier)
    elif notification_type == "out_for_delivery":
        message = OrderWhatsAppNotifications.get_out_for_delivery_message(order)
    elif notification_type == "delivered":
        message = OrderWhatsAppNotifications.get_order_delivered_message(order)
    elif notification_type == "payment_received":
        message = OrderWhatsAppNotifications.get_payment_received_message(order, tracking_url)
    else:
        return {"success": False, "reason": "unknown_type"}
    
    # Send message
    result = await WhatsAppService.send_text_message(phone, message)
    
    # Log the notification
    logging.info(f"📱 WhatsApp {notification_type}: Order {order.get('order_id')} -> {phone}")
    
    return result
