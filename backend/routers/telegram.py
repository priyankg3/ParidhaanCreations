"""
Telegram Router — service-to-service endpoints.

The admin product create/update flow calls these endpoints to
ask the Telegram bot to post an announcement to the channel.

Auth: a shared secret `INTERNAL_API_TOKEN` set on both the backend
and the telegram-bot Railway services. Verified via the
`X-Internal-Token` header.

The bot subscribes to new-product events by polling GET /api/internal/telegram/pending
every few seconds, OR by the backend making an outbound HTTP call to a
future bot webhook. For this scaffold we expose a pull-based queue
backed by MongoDB — simple, no coordination needed.
"""
from __future__ import annotations

import os
import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal/telegram", tags=["Telegram (internal)"])

db = None


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


class PendingProductPost(BaseModel):
    product_id: str


@router.get("/pending")
async def list_pending_posts(
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
    limit: int = 20,
):
    """
    Return products queued for channel posting.

    The bot polls this endpoint, posts each item to the channel,
    then calls POST /mark-posted/{id} to clear it.
    """
    _verify_internal_token(x_internal_token)

    pending = await db.telegram_post_queue.find(
        {"status": "pending"},
        {"_id": 0},
    ).sort("created_at", 1).to_list(limit)

    # Enrich with product data so the bot can render immediately
    enriched = []
    for entry in pending:
        product = await db.products.find_one({"id": entry["product_id"]}, {"_id": 0})
        if product:
            enriched.append({"queue_id": entry["queue_id"], "product": product})
    return enriched


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


@router.post("/enqueue")
async def enqueue_product_post(
    body: PendingProductPost,
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
):
    """
    Called by admin product-create flow (same service, authenticated the same way).
    Idempotent on (product_id, status=pending).
    """
    _verify_internal_token(x_internal_token)

    existing = await db.telegram_post_queue.find_one(
        {"product_id": body.product_id, "status": "pending"}
    )
    if existing:
        return {"ok": True, "queue_id": existing["queue_id"], "deduped": True}

    import uuid
    queue_id = str(uuid.uuid4())
    await db.telegram_post_queue.insert_one(
        {
            "queue_id": queue_id,
            "product_id": body.product_id,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
        }
    )
    return {"ok": True, "queue_id": queue_id, "deduped": False}
