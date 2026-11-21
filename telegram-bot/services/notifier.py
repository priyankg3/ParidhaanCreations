"""
Channel notification helpers.

Two shapes of post go to @ParidhaanCreations:

1. Immediate rich post — single product, one photo + full caption +
   "Buy in Bot" button. Used for mode="now".
2. Daily digest — up to 10 products as a Telegram media album
   (one notification, swipeable gallery) with a short summary caption,
   followed by a separate message carrying a "Browse new arrivals
   in bot" button.
"""
from __future__ import annotations

import logging
from typing import Optional

from telegram import (
    Bot,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    InputMediaPhoto,
)
from telegram.constants import ParseMode

logger = logging.getLogger(__name__)

# Telegram album cap
ALBUM_MAX = 10


def _format_price(price: float, compare_at: Optional[float] = None) -> str:
    if compare_at and compare_at > price:
        discount = round(100 * (compare_at - price) / compare_at)
        return f"<b>₹{price:,.0f}</b> <s>₹{compare_at:,.0f}</s> ({discount}% off)"
    return f"<b>₹{price:,.0f}</b>"


def build_single_caption(product: dict, web_base_url: str) -> str:
    """Caption for an individual rich channel post (mode='now')."""
    name = product.get("name", "New product")
    desc = (product.get("description") or "").strip()
    price = float(product.get("price") or 0)
    compare_at = product.get("compare_at_price")

    short_desc = desc.split("\n")[0][:300]
    tail = "…" if len(desc) > 300 else ""

    sizes = product.get("sizes") or []
    lg_size = product.get("laddu_gopal_size")
    size_display = lg_size or (", ".join(sizes) if sizes else "")
    colors = product.get("colors") or []

    lines = [f"🕉️  <b>{name}</b>", "", _format_price(price, compare_at)]
    if size_display:
        lines.append(f"📏 Size: {size_display}")
    if colors:
        lines.append(f"🎨 Color: {', '.join(colors)}")
    if short_desc:
        lines += ["", short_desc + tail]

    # Capped at Telegram's 1024-char photo caption.
    cap = "\n".join(lines)
    return cap[:1024]


def build_buy_keyboard(bot_username: str, product_id: str) -> InlineKeyboardMarkup:
    """Deep-link into the bot at /start=buy_<product_id>"""
    deep_link = f"https://t.me/{bot_username}?start=buy_{product_id}"
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton("🛒 Buy in Bot", url=deep_link)]]
    )


def build_browse_keyboard(bot_username: str) -> InlineKeyboardMarkup:
    """Generic 'open the bot catalog' deep link — used under digest posts."""
    link = f"https://t.me/{bot_username}?start=catalog"
    return InlineKeyboardMarkup(
        [[InlineKeyboardButton("🛍️  Browse new arrivals in Bot", url=link)]]
    )


def build_digest_caption(products: list[dict], total: int) -> str:
    """Summary caption for the daily album (shown under the first photo)."""
    today_str = "Today's new arrivals"
    shown = len(products)
    header = f"🆕  <b>{today_str}</b>"

    # Compact item list
    lines = [header, ""]
    for p in products:
        name = (p.get("name") or "Product")[:60]
        price = float(p.get("price") or 0)
        lines.append(f"• {name} — ₹{price:,.0f}")

    if total > shown:
        lines.append(f"\n…and {total - shown} more — browse all in the bot 👇")
    else:
        lines.append("\nTap any photo above to see it, or open the bot 👇")

    cap = "\n".join(lines)
    return cap[:1024]


# ---------- senders ----------

async def post_single_product(
    bot: Bot,
    channel_id: str,
    product: dict,
    web_base_url: str,
    bot_username: str,
) -> None:
    """Immediate-mode post: one rich photo message with Buy-in-Bot button."""
    caption = build_single_caption(product, web_base_url)
    product_id = str(product.get("product_id") or product.get("id") or "")
    keyboard = build_buy_keyboard(bot_username, product_id) if product_id else None

    images = product.get("images") or []
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
        )
    logger.info("Posted single product %s to channel %s", product_id, channel_id)


async def post_digest(
    bot: Bot,
    channel_id: str,
    products: list[dict],
    bot_username: str,
) -> int:
    """
    Post up to 10 products as a Telegram media album (one notification),
    followed by a 'Browse in Bot' button message.

    Returns the number of products actually posted (never more than 10).
    If more than 10 products are queued, caller should split across
    multiple post_digest() calls or post only the top 10 and let the
    'and N more' line in the caption do the rest.
    """
    if not products:
        return 0

    with_images = [p for p in products if (p.get("images") or [])]
    without_images = [p for p in products if not (p.get("images") or [])]

    total_asked = len(products)

    # One-product case: upgrade to the richer single-post format.
    if total_asked == 1:
        await post_single_product(
            bot=bot,
            channel_id=channel_id,
            product=products[0],
            web_base_url="",  # not used in single caption
            bot_username=bot_username,
        )
        return 1

    # Album path: need at least one image. Cap at ALBUM_MAX.
    album_candidates = with_images[:ALBUM_MAX]

    if album_candidates:
        caption = build_digest_caption(products, total_asked)
        media = []
        for idx, p in enumerate(album_candidates):
            img = p["images"][0]
            # Caption only on the first photo in an album.
            media.append(
                InputMediaPhoto(
                    media=img,
                    caption=caption if idx == 0 else None,
                    parse_mode=ParseMode.HTML if idx == 0 else None,
                )
            )
        await bot.send_media_group(chat_id=channel_id, media=media)

        # Follow-up message carrying the "Browse" inline button, since
        # media groups can't have inline keyboards.
        await bot.send_message(
            chat_id=channel_id,
            text="👇 Open the bot to browse everything",
            reply_markup=build_browse_keyboard(bot_username),
        )
        posted = len(album_candidates)
    else:
        # No images at all → fall back to a text digest with a button.
        caption = build_digest_caption(products[:ALBUM_MAX], total_asked)
        await bot.send_message(
            chat_id=channel_id,
            text=caption,
            parse_mode=ParseMode.HTML,
            reply_markup=build_browse_keyboard(bot_username),
        )
        posted = min(ALBUM_MAX, total_asked)

    logger.info(
        "Posted digest of %d/%d products to channel %s",
        posted, total_asked, channel_id,
    )
    return posted
