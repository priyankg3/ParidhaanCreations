"""
Channel notification helper.

Posts product announcements to the Telegram channel with a
"Buy in Bot" deep link that opens the bot at the product page.
"""
from __future__ import annotations

import logging
from typing import Optional

from telegram import Bot, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.constants import ParseMode

logger = logging.getLogger(__name__)


def _format_price(price: float, compare_at: Optional[float] = None) -> str:
    if compare_at and compare_at > price:
        discount = round(100 * (compare_at - price) / compare_at)
        return f"<b>₹{price:,.0f}</b> <s>₹{compare_at:,.0f}</s> ({discount}% off)"
    return f"<b>₹{price:,.0f}</b>"


def build_product_caption(product: dict, web_base_url: str) -> str:
    name = product.get("name", "New product")
    desc = product.get("description") or ""
    price = float(product.get("price") or 0)
    compare_at = product.get("compare_at_price")

    # Trim description to a sensible length for Telegram captions (1024 char cap)
    short_desc = desc.strip().split("\n")[0][:300]
    tail = "…" if len(desc) > 300 else ""

    lines = [f"🕉️  <b>{name}</b>", "", _format_price(price, compare_at)]
    if short_desc:
        lines += ["", short_desc + tail]

    slug = product.get("slug") or product.get("id") or ""
    if slug:
        lines += ["", f"🌐 {web_base_url}/product/{slug}"]
    return "\n".join(lines)


def build_buy_keyboard(bot_username: str, product_id: str) -> InlineKeyboardMarkup:
    """Deep-link into the bot at /start=buy_<product_id>"""
    deep_link = f"https://t.me/{bot_username}?start=buy_{product_id}"
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton("🛒 Buy in Bot", url=deep_link)]]
    )


async def post_product_to_channel(
    bot: Bot,
    channel_id: str,
    product: dict,
    web_base_url: str,
    bot_username: str,
) -> None:
    """Post a product announcement to the channel.

    Uses the first image as the main photo. If no image, sends a
    text message instead.
    """
    caption = build_product_caption(product, web_base_url)
    product_id = str(product.get("id") or product.get("_id") or "")
    keyboard = build_buy_keyboard(bot_username, product_id)

    images = product.get("images") or []
    try:
        if images:
            await bot.send_photo(
                chat_id=channel_id,
                photo=images[0],
                caption=caption,
                parse_mode=ParseMode.HTML,
                reply_markup=keyboard,
            )
        else:
            await bot.send_message(
                chat_id=channel_id,
                text=caption,
                parse_mode=ParseMode.HTML,
                reply_markup=keyboard,
                disable_web_page_preview=False,
            )
        logger.info("Posted product %s to channel %s", product_id, channel_id)
    except Exception:
        logger.exception("Failed to post product %s to channel", product_id)
        raise
