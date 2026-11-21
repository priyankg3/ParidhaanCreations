"""
Scheduled jobs for the Telegram channel.

Two jobs run in-process via python-telegram-bot's JobQueue:

1. `poll_immediate` — every 30 seconds, drains any mode="now"
   queue entries and posts each as a single rich card.

2. `daily_digest` — once a day at 19:00 IST (13:30 UTC), drains all
   mode="digest" queue entries and posts one album.

Both jobs:
  - Fetch via api_client (backend /internal/telegram/pending/{now,digest})
  - Post via services.notifier
  - Mark each queue entry posted via api_client.mark_posted(queue_id)

Failures are logged but don't crash the job; the queue entry stays
pending so the next run can retry. If a product was deleted after
being enqueued, the backend's /pending endpoint auto-marks it failed
so it won't be re-fetched.
"""
from __future__ import annotations

import logging
from datetime import time
from zoneinfo import ZoneInfo

from telegram.ext import Application, ContextTypes

from services.api_client import ApiClient
from services.notifier import post_digest, post_single_product

logger = logging.getLogger(__name__)


IST = ZoneInfo("Asia/Kolkata")
DIGEST_HOUR_IST = 19  # 7 PM IST
DIGEST_MINUTE_IST = 0
IMMEDIATE_POLL_INTERVAL_SEC = 30


async def _poll_immediate(context: ContextTypes.DEFAULT_TYPE) -> None:
    api: ApiClient = context.application.bot_data["api"]
    settings = context.application.bot_data["settings"]
    bot_username = context.application.bot_data.get("bot_username") or ""

    try:
        entries = await api.pending_now(limit=10)
    except Exception as e:
        logger.warning("pending_now fetch failed: %s", e)
        return

    if not entries:
        return

    logger.info("Immediate-post queue: %d entries", len(entries))
    for entry in entries:
        queue_id = entry["queue_id"]
        product = entry["product"]
        try:
            await post_single_product(
                bot=context.bot,
                channel_id=settings.channel_id,
                product=product,
                web_base_url=settings.web_base_url,
                bot_username=bot_username,
            )
            await api.mark_posted(queue_id)
        except Exception:
            logger.exception("Failed to post immediate product (queue_id=%s)", queue_id)
            # Leave pending — will retry next tick.


async def _daily_digest(context: ContextTypes.DEFAULT_TYPE) -> None:
    api: ApiClient = context.application.bot_data["api"]
    settings = context.application.bot_data["settings"]
    bot_username = context.application.bot_data.get("bot_username") or ""

    try:
        entries = await api.pending_digest(limit=50)
    except Exception as e:
        logger.warning("pending_digest fetch failed: %s", e)
        return

    if not entries:
        logger.info("Daily digest: no pending products, skipping post.")
        return

    products = [e["product"] for e in entries]
    posted_count = await post_digest(
        bot=context.bot,
        channel_id=settings.channel_id,
        products=products,
        bot_username=bot_username,
    )

    # Mark the first `posted_count` queue entries as posted. The rest
    # (if any — only happens when > 10 queued at once) roll into
    # tomorrow's digest naturally, so the album stays readable.
    for entry in entries[:posted_count]:
        try:
            await api.mark_posted(entry["queue_id"])
        except Exception:
            logger.exception("Failed to mark posted (queue_id=%s)", entry["queue_id"])


def register_jobs(app: Application) -> None:
    """Schedule the two channel-posting jobs on the Application's JobQueue."""
    if app.job_queue is None:
        logger.error(
            "JobQueue is not available — install python-telegram-bot[job-queue]. "
            "Channel posting disabled this run."
        )
        return

    # Immediate poll (every 30s). First run after a short grace so the
    # bot is fully registered with Telegram before firing.
    app.job_queue.run_repeating(
        _poll_immediate,
        interval=IMMEDIATE_POLL_INTERVAL_SEC,
        first=15,
        name="poll_immediate",
    )

    # Daily digest at 19:00 IST.
    app.job_queue.run_daily(
        _daily_digest,
        time=time(hour=DIGEST_HOUR_IST, minute=DIGEST_MINUTE_IST, tzinfo=IST),
        name="daily_digest",
    )

    logger.info(
        "Scheduled jobs: poll_immediate (every %ds), daily_digest (daily %02d:%02d IST)",
        IMMEDIATE_POLL_INTERVAL_SEC, DIGEST_HOUR_IST, DIGEST_MINUTE_IST,
    )
