# Admin Router - Dashboard, Analytics, Management
from fastapi import APIRouter, HTTPException, Header, Cookie
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

router = APIRouter(prefix="/admin", tags=["Admin"])

db = None
require_admin = None

def init_router(database, admin_checker):
    global db, require_admin
    db = database
    require_admin = admin_checker

# ============ ANALYTICS ============

@router.get("/analytics")
async def get_analytics(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get dashboard analytics"""
    await require_admin(authorization, session_token)
    
    # Get counts
    total_orders = await db.orders.count_documents({})
    total_products = await db.products.count_documents({})
    total_users = await db.users.count_documents({})
    
    # Revenue calculation
    orders = await db.orders.find({"payment_status": "paid"}).to_list(1000)
    total_revenue = sum(order.get("total_amount", 0) for order in orders)
    
    # Recent orders
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    # Low stock products
    low_stock = await db.products.find({"stock": {"$lte": 5}}, {"_id": 0}).to_list(20)
    
    return {
        "total_orders": total_orders,
        "total_products": total_products,
        "total_users": total_users,
        "total_revenue": total_revenue,
        "recent_orders": recent_orders,
        "low_stock_products": low_stock
    }

@router.get("/customer-insights")
async def get_customer_insights(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get customer insights"""
    await require_admin(authorization, session_token)
    
    users = await db.users.find({}, {"_id": 0}).to_list(1000)
    all_orders = await db.orders.find({}, {"_id": 0}).to_list(10000)
    
    # Calculate insights
    total_customers = len(users)
    
    # Group orders by user
    orders_by_user = {}
    category_counts = {}
    total_paid_amount = 0
    paid_order_count = 0
    recent_30_days = 0
    
    from datetime import timedelta
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    
    for order in all_orders:
        user_id = order.get("user_id")
        if user_id:
            orders_by_user.setdefault(user_id, []).append(order)
        
        # Count paid orders for avg
        if order.get("payment_status") == "paid":
            total_paid_amount += order.get("total_amount", 0)
            paid_order_count += 1
        
        # Count categories from order items
        for item in order.get("items", []):
            cat = item.get("category", "other")
            category_counts[cat] = category_counts.get(cat, 0) + 1
        
        # Recent orders
        order_date = order.get("created_at", "")
        if isinstance(order_date, str) and order_date:
            try:
                from dateutil.parser import parse
                if parse(order_date).replace(tzinfo=timezone.utc) > thirty_days_ago:
                    recent_30_days += 1
            except Exception:
                pass
    
    # Repeat customers (2+ orders)
    repeat_customers = sum(1 for orders in orders_by_user.values() if len(orders) >= 2)
    repeat_rate = (repeat_customers / total_customers * 100) if total_customers > 0 else 0
    avg_order_value = (total_paid_amount / paid_order_count) if paid_order_count > 0 else 0
    
    # VIP customers (top spenders)
    vip_list = []
    for user in users:
        user_orders = orders_by_user.get(user.get("user_id"), [])
        total_spent = sum(o.get("total_amount", 0) for o in user_orders if o.get("payment_status") == "paid")
        if total_spent > 0:
            vip_list.append({
                "name": user.get("name", "Unknown"),
                "email": user.get("email", ""),
                "total_orders": len(user_orders),
                "total_spent": total_spent
            })
    vip_list.sort(key=lambda x: x["total_spent"], reverse=True)
    
    # Sort categories by count
    top_categories = dict(sorted(category_counts.items(), key=lambda x: x[1], reverse=True)[:10])
    
    return {
        "total_customers": total_customers,
        "repeat_customers": repeat_customers,
        "repeat_rate": repeat_rate,
        "avg_order_value": avg_order_value,
        "top_categories": top_categories,
        "vip_customers": vip_list[:10],
        "recent_orders_30days": recent_30_days
    }

# ============ PRODUCTS ============

@router.get("/products")
async def get_admin_products(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get all products for admin"""
    await require_admin(authorization, session_token)
    products = await db.products.find({}, {"_id": 0}).to_list(500)
    return products

@router.post("/products")
async def create_product(
    product: dict,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create new product.

    Also enqueues the product for Telegram channel posting. Mode comes from
    the optional `channel_post_mode` field on the product payload:
      "now"    → bot posts immediately (within ~30s)
      "digest" → bot batches into the 19:00 IST daily digest  (DEFAULT)
      "skip"   → no channel post
    """
    await require_admin(authorization, session_token)

    product_data = {
        "product_id": f"prod_{uuid.uuid4().hex[:12]}",
        **product,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    # Pop the channel_post_mode off so it doesn't bloat the product doc.
    channel_mode = product_data.pop("channel_post_mode", "digest")
    if channel_mode not in ("now", "digest", "skip"):
        channel_mode = "digest"

    await db.products.insert_one(product_data)

    # Enqueue for Telegram channel. Never let this fail the product create.
    if channel_mode != "skip":
        try:
            import uuid as _uuid
            await db.telegram_post_queue.insert_one({
                "queue_id": str(_uuid.uuid4()),
                "product_id": product_data["product_id"],
                "mode": channel_mode,
                "status": "pending",
                "created_at": datetime.now(timezone.utc),
            })
        except Exception as e:
            logging.getLogger(__name__).warning(
                "Failed to enqueue product %s for Telegram: %s",
                product_data["product_id"], e,
            )

    return {
        "message": "Product created",
        "product_id": product_data["product_id"],
        "channel_post_mode": channel_mode,
    }

@router.put("/products/{product_id}")
async def update_product(
    product_id: str,
    product: dict,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update product"""
    await require_admin(authorization, session_token)
    
    product["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.products.update_one(
        {"product_id": product_id},
        {"$set": product}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product updated"}

@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Delete product"""
    await require_admin(authorization, session_token)
    
    result = await db.products.delete_one({"product_id": product_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted"}

# ============ COLLECTIONS ============

@router.get("/collections")
async def get_admin_collections(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get all collections for admin"""
    await require_admin(authorization, session_token)
    
    collections = await db.collections.find({}, {"_id": 0}).sort([("position", 1), ("created_at", -1)]).to_list(200)
    
    for coll in collections:
        coll["product_count"] = len(coll.get("product_ids", []))
    
    return collections

# ============ BANNERS ============

@router.get("/banners")
async def get_admin_banners(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get all banners for admin"""
    await require_admin(authorization, session_token)
    
    banners = await db.banners.find({}, {"_id": 0}).sort("position", 1).to_list(100)
    return banners

# ============ ORDERS ============

@router.get("/orders")
async def get_admin_orders(
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get all orders for admin"""
    await require_admin(authorization, session_token)
    
    query = {}
    if status:
        query["status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return orders

@router.put("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update order status manually from admin panel.

    When the admin uses this to mark a Telegram-sourced order as shipped,
    delivered, or cancelled, we also push a status update into that user's
    Telegram chat (same statuses the Shiprocket webhook hook handles), so
    manual overrides stay in sync with the user's notifications.
    """
    await require_admin(authorization, session_token)

    valid_statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    # Capture previous state so we only notify on real transitions.
    prev_order = await db.orders.find_one({"order_id": order_id}, {"_id": 0})
    if not prev_order:
        raise HTTPException(status_code=404, detail="Order not found")

    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    # Notify the Telegram user on the useful transitions. Fails soft.
    if prev_order.get("source") == "telegram" and status != prev_order.get("status"):
        try:
            from routers.shipping import _notify_telegram_shipment
            shipment = await db.shipments.find_one({"order_id": order_id}, {"_id": 0}) or {}
            # Use the shipment's tracking info when available.
            await _notify_telegram_shipment(
                {**prev_order, "status": status},
                status=status,
                tracking_url=shipment.get("tracking_url"),
                awb=shipment.get("awb_number"),
                courier_name=shipment.get("courier_name"),
            )
        except Exception as e:
            logging.getLogger(__name__).warning(
                "Telegram notify failed on manual status update for order %s: %s",
                order_id, e,
            )

    return {"message": f"Order status updated to {status}"}

# ============ SUPPORT TICKETS ============

@router.get("/support/tickets")
async def get_admin_tickets(
    status: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get all support tickets"""
    await require_admin(authorization, session_token)
    
    query = {}
    if status:
        query["status"] = status
    
    tickets = await db.support_tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return tickets

@router.put("/support/tickets/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: str,
    status: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Update ticket status"""
    await require_admin(authorization, session_token)
    
    result = await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"message": "Ticket status updated"}

@router.post("/support/tickets/{ticket_id}/reply")
async def admin_reply_ticket(
    ticket_id: str,
    message: str,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Admin reply to ticket"""
    await require_admin(authorization, session_token)
    
    reply = {
        "sender": "admin",
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.support_tickets.update_one(
        {"ticket_id": ticket_id},
        {
            "$push": {"messages": reply},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return {"message": "Reply added"}

# ============ ABANDONED CARTS ============

@router.get("/abandoned-carts")
async def get_abandoned_carts(
    hours_threshold: int = 24,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get abandoned carts"""
    await require_admin(authorization, session_token)
    
    threshold = datetime.now(timezone.utc) - timedelta(hours=hours_threshold)
    
    carts = await db.cart.find({
        "updated_at": {"$lt": threshold.isoformat()},
        "items": {"$exists": True, "$ne": []}
    }, {"_id": 0}).to_list(200)
    
    # Enrich with user data
    for cart in carts:
        if cart.get("user_id"):
            user = await db.users.find_one({"user_id": cart["user_id"]}, {"_id": 0})
            cart["user"] = user
    
    return {"abandoned_carts": carts}

@router.get("/abandoned-carts/stats")
async def get_abandoned_cart_stats(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get abandoned cart statistics"""
    await require_admin(authorization, session_token)
    
    all_carts = await db.cart.find({"items": {"$exists": True, "$ne": []}}).to_list(1000)
    
    total_value = 0
    for cart in all_carts:
        for item in cart.get("items", []):
            product = await db.products.find_one({"product_id": item["product_id"]})
            if product:
                total_value += product.get("price", 0) * item.get("quantity", 1)
    
    return {
        "total_abandoned": len(all_carts),
        "total_value": total_value,
        "recovered": await db.cart.count_documents({"recovered": True})
    }
