# Shiprocket Shipping Router
from fastapi import APIRouter, HTTPException, Header, Cookie, Request, BackgroundTasks
from typing import Optional
from datetime import datetime, timezone
import uuid
import os
import logging

# Telegram helpers for sending shipment-status updates into the user's chat.
# Lazy-imported to keep server boot resilient if the file is missing.
try:
    from telegram_notify import send_telegram_message, inline_url_button
except Exception:  # pragma: no cover
    send_telegram_message = None
    inline_url_button = None

router = APIRouter(prefix="/shiprocket", tags=["Shipping"])

db = None
require_admin = None
ShiprocketService = None
send_order_email = None
send_order_notification = None

def init_router(database, admin_checker, shiprocket_service, email_func=None, sms_func=None):
    global db, require_admin, ShiprocketService, send_order_email, send_order_notification
    db = database
    require_admin = admin_checker
    ShiprocketService = shiprocket_service
    send_order_email = email_func
    send_order_notification = sms_func


# ===================== Telegram shipment-status helpers =====================

# Statuses we actively push to the user's Telegram chat. "in_transit" fires
# on every Shiprocket scan — too noisy — so we skip it.
_TELEGRAM_NOTIFY_STATUSES = {
    "shipped",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "rto_initiated",
    "rto_delivered",
}


def _format_telegram_status_message(
    status: str,
    order: dict,
    awb: Optional[str],
    courier_name: Optional[str],
) -> str:
    """Compose a per-status HTML message for the user's Telegram chat."""
    order_id = order.get("order_id") or ""
    items = order.get("items") or []
    first = (items[0].get("name") if items else "your order") or "your order"
    item_label = first if len(items) == 1 else f"{first} and {len(items) - 1} more"
    courier_line = f"\n<b>Courier:</b> {courier_name}" if courier_name else ""
    awb_line = f"\n<b>AWB:</b> <code>{awb}</code>" if awb else ""

    if status == "shipped":
        return (
            "📦 <b>Your order has shipped!</b>\n\n"
            f"<b>Order:</b> <code>{order_id}</code>\n"
            f"{item_label}"
            f"{courier_line}{awb_line}\n\n"
            "Tap below to track your shipment live."
        )
    if status == "out_for_delivery":
        return (
            "🚚 <b>Out for delivery today!</b>\n\n"
            f"<b>Order:</b> <code>{order_id}</code>\n"
            "Please keep your phone handy — the delivery agent may call."
        )
    if status == "delivered":
        return (
            "📬 <b>Delivered — thank you! 🙏</b>\n\n"
            f"<b>Order:</b> <code>{order_id}</code>\n"
            "We hope you love it. If anything isn't right, reply here and we'll "
            "sort it out. Jai Shri Krishna 🙏"
        )
    if status == "cancelled":
        return (
            "❌ <b>Shipment cancelled</b>\n\n"
            f"<b>Order:</b> <code>{order_id}</code>\n"
            "If this is unexpected, please reach out and we'll help you right away."
        )
    if status in ("rto_initiated", "rto_delivered"):
        headline = "↩️ Return initiated" if status == "rto_initiated" else "↩️ Return delivered"
        return (
            f"<b>{headline}</b>\n\n"
            f"<b>Order:</b> <code>{order_id}</code>\n"
            "Your refund will be processed once we receive the parcel."
        )
    # Shouldn't reach here given _TELEGRAM_NOTIFY_STATUSES, but be safe.
    return f"<b>Order update</b>\n<b>Order:</b> <code>{order_id}</code>\nStatus: {status}"


async def _notify_telegram_shipment(order: dict, status: str, tracking_url: Optional[str] = None,
                                     awb: Optional[str] = None, courier_name: Optional[str] = None) -> None:
    """
    Send a status-update message into the Telegram chat of the user who placed
    the order. Fails soft — we never let a notification problem break the caller.
    Only acts on Telegram-sourced orders; website orders are left untouched.
    """
    if not send_telegram_message:
        return
    if (order or {}).get("source") != "telegram":
        return
    chat_id = (order or {}).get("telegram_chat_id")
    if not chat_id:
        return
    if status not in _TELEGRAM_NOTIFY_STATUSES:
        return

    try:
        text = _format_telegram_status_message(status, order, awb, courier_name)
        reply_markup = None
        if tracking_url and inline_url_button:
            reply_markup = inline_url_button("📍 Track shipment", tracking_url)
        await send_telegram_message(chat_id=chat_id, text=text, reply_markup=reply_markup)
    except Exception as e:
        logging.warning("Telegram shipment notification failed (order %s): %s",
                        (order or {}).get("order_id"), e)

@router.get("/pickup-locations")
async def get_pickup_locations(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get all pickup locations (admin)"""
    await require_admin(authorization, session_token)
    
    try:
        locations = await ShiprocketService.get_pickup_locations()
        return {"success": True, "locations": locations}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/couriers")
async def get_available_couriers(
    delivery_pincode: str,
    weight: float = 0.5,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get available courier services with rates"""
    pickup_pincode = "301411"  # Tijara, Rajasthan
    
    try:
        couriers = await ShiprocketService.get_available_couriers(
            pickup_pincode=pickup_pincode,
            delivery_pincode=delivery_pincode,
            weight=weight,
            cod=0
        )
        
        formatted_couriers = []
        for c in couriers[:10]:
            formatted_couriers.append({
                "courier_id": c.get("courier_company_id"),
                "courier_name": c.get("courier_name"),
                "rate": c.get("rate"),
                "etd": c.get("etd"),
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

@router.post("/create-shipment/{order_id}")
async def create_shipment(
    order_id: str,
    background_tasks: BackgroundTasks,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create shipment in Shiprocket (admin)"""
    await require_admin(authorization, session_token)
    
    order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    existing_shipment = await db.shipments.find_one({"order_id": order_id}, {"_id": 0})
    if existing_shipment and existing_shipment.get("shiprocket_order_id"):
        return {
            "success": True,
            "message": "Shipment already exists",
            "shipment": existing_shipment
        }
    
    try:
        sr_response = await ShiprocketService.create_shiprocket_order(order)
        
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
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.shipments.insert_one(shipment)
        
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {"status": "processing", "shiprocket_order_id": sr_response.get("order_id")}}
        )
        
        return {
            "success": True,
            "message": "Shipment created successfully",
            "shipment": {k: v for k, v in shipment.items() if k != "_id"},
            "shiprocket_response": sr_response
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/assign-courier/{order_id}")
async def assign_courier(
    order_id: str,
    courier_id: int,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Assign courier and generate AWB (admin)"""
    await require_admin(authorization, session_token)
    
    shipment = await db.shipments.find_one({"order_id": order_id}, {"_id": 0})
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    if not shipment.get("shiprocket_shipment_id"):
        raise HTTPException(status_code=400, detail="Shiprocket shipment ID not found")
    
    try:
        awb_response = await ShiprocketService.assign_awb(
            shipment_id=shipment["shiprocket_shipment_id"],
            courier_id=courier_id
        )
        
        awb_data = awb_response.get("response", {}).get("data", {})
        
        label_response = await ShiprocketService.generate_label(shipment["shiprocket_shipment_id"])
        
        site_url = os.environ.get("SITE_URL", "https://paridhaancreations.xyz")
        tracking_url = f"{site_url}/track/{order_id}"
        
        update_data = {
            "courier_id": courier_id,
            "courier_name": awb_data.get("courier_name", ""),
            "awb_number": awb_data.get("awb_code", ""),
            "shipping_rate": awb_data.get("freight_charge", 0),
            "status": "shipped",
            "label_url": label_response.get("label_url", ""),
            "tracking_url": f"https://shiprocket.co/tracking/{awb_data.get('awb_code', '')}",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.shipments.update_one(
            {"order_id": order_id},
            {
                "$set": update_data,
                "$push": {
                    "tracking_history": {
                        "status": f"Courier assigned: {awb_data.get('courier_name', '')}",
                        "awb": awb_data.get("awb_code", ""),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "location": "Tijara, Rajasthan"
                    }
                }
            }
        )
        
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {"status": "shipped"}}
        )
        
        # Send notifications
        order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
        if order and send_order_email:
            await send_order_email(order, "shipped", tracking_url)
        if order and send_order_notification and order.get("shipping_address", {}).get("phone"):
            await send_order_notification(order_id, order["shipping_address"]["phone"], "shipped", tracking_url)
        # Telegram push for Telegram-sourced orders (no-op for website orders)
        if order:
            await _notify_telegram_shipment(
                order,
                status="shipped",
                tracking_url=update_data.get("tracking_url"),
                awb=awb_data.get("awb_code"),
                courier_name=awb_data.get("courier_name"),
            )
        
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

@router.get("/track/{order_id}")
async def track_shipment(order_id: str):
    """Track shipment by order ID (public)"""
    shipment = await db.shipments.find_one({"order_id": order_id}, {"_id": 0})
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
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
        except Exception:
            pass
    
    return result

@router.get("/track-awb/{awb_number}")
async def track_by_awb(awb_number: str):
    """Track shipment by AWB (public)"""
    try:
        tracking = await ShiprocketService.track_shipment(awb_number)
        return {"success": True, "tracking": tracking}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def shiprocket_webhook(request: Request):
    """Webhook for Shiprocket status updates"""
    try:
        body = await request.json()
        
        awb_number = body.get("awb")
        status = body.get("current_status")
        status_id = body.get("current_status_id")
        location = body.get("scans", [{}])[-1].get("location", "") if body.get("scans") else ""
        
        if not awb_number:
            return {"status": "ignored", "message": "No AWB number"}
        
        shipment = await db.shipments.find_one({"awb_number": awb_number})
        if not shipment:
            return {"status": "ignored", "message": "Shipment not found"}
        
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
        prev_status = shipment.get("status")
        status_changed = new_status != prev_status

        await db.shipments.update_one(
            {"awb_number": awb_number},
            {
                "$set": {
                    "status": new_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
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

        # Telegram push — only when the status actually changed, so a
        # courier's repeat webhook fire for the same status doesn't spam
        # the user's chat.
        if status_changed:
            order = await db.orders.find_one(
                {"order_id": shipment["order_id"]}, {"_id": 0}
            )
            if order:
                await _notify_telegram_shipment(
                    order,
                    status=new_status,
                    tracking_url=shipment.get("tracking_url"),
                    awb=shipment.get("awb_number"),
                    courier_name=shipment.get("courier_name"),
                )

        return {"status": "success", "message": "Webhook processed"}
    except Exception as e:
        logging.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@router.post("/cancel/{order_id}")
async def cancel_shipment(
    order_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Cancel shipment (admin)"""
    await require_admin(authorization, session_token)
    
    shipment = await db.shipments.find_one({"order_id": order_id}, {"_id": 0})
    if not shipment:
        raise HTTPException(status_code=404, detail="Shipment not found")
    
    if not shipment.get("shiprocket_order_id"):
        raise HTTPException(status_code=400, detail="No Shiprocket order to cancel")
    
    try:
        await ShiprocketService.cancel_order(shipment["shiprocket_order_id"])
        
        await db.shipments.update_one(
            {"order_id": order_id},
            {
                "$set": {
                    "status": "cancelled",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {
                    "tracking_history": {
                        "status": "Order cancelled",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }
                }
            }
        )
        
        await db.orders.update_one(
            {"order_id": order_id},
            {"$set": {"status": "cancelled"}}
        )
        
        return {"success": True, "message": "Order cancelled successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/shipments")
async def get_all_shipments(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None),
    limit: int = 50,
    skip: int = 0
):
    """Get all shipments (admin)"""
    await require_admin(authorization, session_token)
    
    shipments = await db.shipments.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.shipments.count_documents({})
    
    return {"shipments": shipments, "total": total}
