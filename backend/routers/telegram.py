"""
Telegram Router — service-to-service endpoints.

The admin product-create flow enqueues products here; the Telegram
bot worker polls these endpoints to post to the @ParidhaanCreations
channel.

Auth: a shared secret `INTERNAL_API_TOKEN` set on both the backend
and the telegram-bot Railway services. Verified via the
`X-Internal-Token` header.

Posting modes
-------------
- "now"    → bot's immediate-poller picks up within ~30s and posts
             a single rich product card
- "digest" → bot's daily scheduler picks up at 19:00 IST and batches
             all digest items into one album post
- "skip"   → never enqueued

Queue entry schema (db.telegram_post_queue)
  queue_id    str   (uuid)
  product_id  str
  mode        str   "now" | "digest"
  status      str   "pending" | "posted" | "failed"
  created_at  datetime
  posted_at   datetime (optional)
"""
from __future__ import annotations

import logging
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

import razorpay
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal/telegram", tags=["Telegram (internal)"])

db = None

Mode = Literal["now", "digest", "skip"]


def init_router(database) -> None:
    global db
    db = database


def _verify_internal_token(token: Optional[str]) -> None:
    expected = os.environ.get("INTERNAL_API_TOKEN")
    if not expected:
        logger.error("INTERNAL_API_TOKEN not configured on backend")
        raise HTTPException(status_code=500, detail="Internal auth not configured")
    if not token or token != expected:
        raise HTTPException(status_code=401, detail="Invalid internal token")


class EnqueueRequest(BaseModel):
    product_id: str
    mode: Mode = "digest"


@router.post("/enqueue")
async def enqueue_product_post(
    body: EnqueueRequest,
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
):
    """
    Idempotent on (product_id, status=pending). 'skip' is a no-op
    (returns queued=False).
    """
    _verify_internal_token(x_internal_token)

    if body.mode == "skip":
        return {"ok": True, "queued": False, "reason": "skip mode"}

    existing = await db.telegram_post_queue.find_one(
        {"product_id": body.product_id, "status": "pending"}
    )
    if existing:
        # If an existing pending entry is less urgent, upgrade it to "now".
        if body.mode == "now" and existing.get("mode") != "now":
            await db.telegram_post_queue.update_one(
                {"queue_id": existing["queue_id"]}, {"$set": {"mode": "now"}}
            )
            return {"ok": True, "queued": True, "queue_id": existing["queue_id"], "upgraded": True}
        return {"ok": True, "queued": True, "queue_id": existing["queue_id"], "deduped": True}

    queue_id = str(uuid.uuid4())
    await db.telegram_post_queue.insert_one(
        {
            "queue_id": queue_id,
            "product_id": body.product_id,
            "mode": body.mode,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
        }
    )
    return {"ok": True, "queued": True, "queue_id": queue_id}


async def _list_pending(mode: Optional[Mode], limit: int) -> list[dict]:
    query: dict = {"status": "pending"}
    if mode:
        query["mode"] = mode
    pending = await db.telegram_post_queue.find(query, {"_id": 0}).sort("created_at", 1).to_list(limit)

    # Enrich with product data so the bot can render immediately.
    enriched = []
    for entry in pending:
        product = await db.products.find_one({"product_id": entry["product_id"]}, {"_id": 0})
        if product:
            enriched.append({
                "queue_id": entry["queue_id"],
                "mode": entry.get("mode", "digest"),
                "product": product,
            })
        else:
            # Product was deleted after being enqueued — mark failed to clear.
            await db.telegram_post_queue.update_one(
                {"queue_id": entry["queue_id"]},
                {"$set": {"status": "failed", "posted_at": datetime.now(timezone.utc)}},
            )
    return enriched


@router.get("/pending/now")
async def list_pending_now(
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
    limit: int = 10,
):
    """Immediate-post queue (bot polls every ~30s)."""
    _verify_internal_token(x_internal_token)
    return await _list_pending("now", limit)


@router.get("/pending/digest")
async def list_pending_digest(
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
    limit: int = 50,
):
    """Digest queue (bot drains daily at 19:00 IST)."""
    _verify_internal_token(x_internal_token)
    return await _list_pending("digest", limit)


@router.post("/mark-posted/{queue_id}")
async def mark_posted(
    queue_id: str,
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
):
    _verify_internal_token(x_internal_token)
    result = await db.telegram_post_queue.update_one(
        {"queue_id": queue_id},
        {"$set": {"status": "posted", "posted_at": datetime.now(timezone.utc)}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Queue entry not found")
    return {"ok": True}


# ============================================================================
# Orders / commerce — called by the Telegram bot during checkout
# ============================================================================
#
# The bot collects product + variant + quantity + shipping details from the
# user, then POSTs here. We:
#   1. Validate the product + variant selection against DB
#   2. Compute totals (variant/size price, GST, shipping)
#   3. Create an order document shaped like website orders (so Shiprocket,
#      admin panel, invoice generation all "just work")
#   4. Create a Razorpay Payment Link (shareable URL that opens Razorpay's
#      hosted checkout — perfect for chat-bot flow)
#   5. Return the order_id + payment_link URL so the bot can send a "Pay"
#      button to the user
#
# Orders from this flow carry:
#   - source: "telegram"
#   - telegram_user_id: <int>         (lets /orders list by telegram user)
#   - telegram_chat_id: <int>         (used by the webhook to send
#                                      confirmation message back)
#


class TelegramShipping(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field(min_length=10, max_length=15)
    email: Optional[str] = Field(default=None, max_length=200)
    address_line1: str = Field(min_length=1, max_length=500)
    city: str = Field(min_length=1, max_length=120)
    state: str = Field(min_length=1, max_length=120)
    pincode: str = Field(min_length=6, max_length=6)

    @field_validator("phone")
    @classmethod
    def _phone_digits(cls, v: str) -> str:
        v = re.sub(r"\D", "", v)
        if len(v) < 10 or len(v) > 15:
            raise ValueError("phone must be 10–15 digits")
        return v

    @field_validator("pincode")
    @classmethod
    def _pincode_digits(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 6:
            raise ValueError("pincode must be exactly 6 digits")
        return v

    @field_validator("email")
    @classmethod
    def _email_shape(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("email looks invalid")
        return v


class TelegramOrderCreate(BaseModel):
    telegram_user_id: int
    telegram_chat_id: int
    product_id: str
    quantity: int = Field(ge=1, le=99)
    variant_color: Optional[str] = None   # e.g. "Peach"
    variant_size: Optional[str] = None    # e.g. "6"
    shipping: TelegramShipping


def _find_variant_price_and_stock(
    product: dict,
    color: Optional[str],
    size: Optional[str],
) -> tuple[float, int]:
    """
    Returns (unit_price, available_stock) for a given variant selection.
    Falls back to product top-level price/stock when the product has no
    variants or no selection was made.
    """
    variants = product.get("variants") or []
    if not variants:
        return (
            float(product.get("price") or 0),
            int(product.get("stock") or 0),
        )

    if color:
        matching = [v for v in variants if v.get("color_name") == color]
        if matching:
            v = matching[0]
            sizes = v.get("sizes") or []
            if size and sizes:
                for s in sizes:
                    if str(s.get("size")) == str(size):
                        return (
                            float(s.get("price") or product.get("price") or 0),
                            int(s.get("stock") or 0),
                        )
            # color picked but no size match → first size's data
            if sizes:
                s = sizes[0]
                return (
                    float(s.get("price") or product.get("price") or 0),
                    int(s.get("stock") or 0),
                )
            return (
                float(product.get("price") or 0),
                int(product.get("stock") or 0),
            )

    # No color picked — use product base
    return (
        float(product.get("price") or 0),
        int(product.get("stock") or 0),
    )


def _get_razorpay_client() -> razorpay.Client:
    key_id = os.environ.get("RAZORPAY_KEY_ID")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    return razorpay.Client(auth=(key_id, key_secret))


@router.post("/orders/create")
async def create_telegram_order(
    body: TelegramOrderCreate,
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
):
    """
    Create an order from the Telegram checkout flow and return a Razorpay
    Payment Link the bot can send to the user.
    """
    _verify_internal_token(x_internal_token)

    product = await db.products.find_one({"product_id": body.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    unit_price, available = _find_variant_price_and_stock(
        product, body.variant_color, body.variant_size
    )
    if unit_price <= 0:
        raise HTTPException(status_code=400, detail="Product has no price configured")
    if available < body.quantity:
        raise HTTPException(
            status_code=409,
            detail=f"Only {available} unit(s) available in stock" if available > 0 else "Out of stock",
        )

    subtotal = unit_price * body.quantity
    # Simple flat shipping. The website calculates it differently (weight/zone
    # based via Shiprocket serviceability). Keeping it simple for MVP.
    shipping_cost = 0.0
    total_amount = subtotal + shipping_cost

    order_id = f"order_{uuid.uuid4().hex[:12]}"
    variant_label = " · ".join(filter(None, [
        f"Color: {body.variant_color}" if body.variant_color else None,
        f"Size: {body.variant_size}" if body.variant_size else None,
    ]))

    item = {
        "product_id": body.product_id,
        "name": product.get("name"),
        "price": unit_price,
        "quantity": body.quantity,
        "image": (product.get("images") or [None])[0],
        "selected_color": body.variant_color,
        "selected_size": body.variant_size,
        "variant_label": variant_label or None,
    }

    now = datetime.now(timezone.utc).isoformat()
    order = {
        "order_id": order_id,
        "source": "telegram",
        "telegram_user_id": body.telegram_user_id,
        "telegram_chat_id": body.telegram_chat_id,
        "user_id": None,  # not linked to a website user account
        "items": [item],
        "shipping_address": {
            "name": body.shipping.name,
            "phone": body.shipping.phone,
            "email": body.shipping.email,
            "address_line1": body.shipping.address_line1,
            "address_line2": None,
            "city": body.shipping.city,
            "state": body.shipping.state,
            "pincode": body.shipping.pincode,
            "country": "India",
        },
        "subtotal": subtotal,
        "discount": 0,
        "shipping_cost": shipping_cost,
        "total_amount": total_amount,
        "payment_method": "razorpay",
        "payment_status": "pending",
        "status": "pending",
        "created_at": now,
        "updated_at": now,
    }
    await db.orders.insert_one(order)

    # Create a Razorpay Payment Link (shareable, opens Razorpay hosted
    # checkout). The webhook will mark the order paid on event
    # `payment_link.paid` and notify the user in Telegram.
    client = _get_razorpay_client()
    try:
        pl = client.payment_link.create({
            "amount": int(round(total_amount * 100)),  # paise
            "currency": "INR",
            "accept_partial": False,
            "reference_id": order_id,
            "description": f"Paridhaan Creations — {product.get('name', 'Order')[:80]}",
            "customer": {
                "name": body.shipping.name,
                "contact": body.shipping.phone,
                **({"email": body.shipping.email} if body.shipping.email else {}),
            },
            "notify": {"sms": True, "email": bool(body.shipping.email)},
            "reminder_enable": True,
            "notes": {
                "order_id": order_id,
                "source": "telegram",
                "telegram_user_id": str(body.telegram_user_id),
            },
        })
    except Exception as e:
        logger.exception("Razorpay payment_link.create failed: %s", e)
        # Leave the order as pending; the user can retry via another flow.
        raise HTTPException(status_code=502, detail="Could not create payment link")

    # Store the link id for webhook correlation and the short_url for return.
    await db.orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "razorpay_payment_link_id": pl.get("id"),
            "razorpay_payment_link_short_url": pl.get("short_url"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    return {
        "ok": True,
        "order_id": order_id,
        "total_amount": total_amount,
        "payment_link": pl.get("short_url"),
    }


@router.get("/orders/list")
async def list_telegram_orders(
    telegram_user_id: int,
    limit: int = 20,
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
):
    """
    Return the most recent orders placed by this Telegram user.
    Used by the bot's /orders command.
    """
    _verify_internal_token(x_internal_token)
    orders = await db.orders.find(
        {"telegram_user_id": telegram_user_id, "source": "telegram"},
        {"_id": 0},
    ).sort("created_at", -1).to_list(limit)
    return orders


@router.get("/orders/{order_id}")
async def get_telegram_order(
    order_id: str,
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
):
    """Fetch a single order (bot shows this when the user taps an order)."""
    _verify_internal_token(x_internal_token)
    order = await db.orders.find_one(
        {"order_id": order_id, "source": "telegram"}, {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
