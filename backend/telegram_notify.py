"""
Send messages from the backend directly to Telegram users via the Bot API.

Used by the Razorpay payment webhook to post order-confirmation messages
into the Telegram chat without going through the bot worker.

Requires `TELEGRAM_BOT_TOKEN` env var on the backend (same token the
telegram-bot worker uses — set it on the backend Railway service too).

Fails soft: if the token is missing or Telegram rejects the request,
we log and swallow so the webhook response to Razorpay stays 200 OK.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

TELEGRAM_API_BASE = "https://api.telegram.org"


async def send_telegram_message(
    chat_id: int | str,
    text: str,
    *,
    parse_mode: str = "HTML",
    reply_markup: Optional[dict] = None,
    disable_web_page_preview: bool = True,
) -> bool:
    """
    POST a message to a Telegram chat. Returns True on success, False on
    any failure (never raises).
    """
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN not set on backend; skipping send")
        return False

    url = f"{TELEGRAM_API_BASE}/bot{token}/sendMessage"
    payload: dict = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": disable_web_page_preview,
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
        if resp.status_code != 200:
            logger.warning(
                "Telegram sendMessage non-200: %s %s", resp.status_code, resp.text[:300]
            )
            return False
        data = resp.json()
        if not data.get("ok"):
            logger.warning("Telegram sendMessage not ok: %s", data)
            return False
        return True
    except Exception as e:
        logger.exception("send_telegram_message failed: %s", e)
        return False


def inline_url_button(label: str, url: str) -> dict:
    """Helper to build a single-button inline keyboard."""
    return {"inline_keyboard": [[{"text": label, "url": url}]]}
