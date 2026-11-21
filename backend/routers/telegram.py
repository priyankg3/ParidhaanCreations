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
import uuid
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

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
