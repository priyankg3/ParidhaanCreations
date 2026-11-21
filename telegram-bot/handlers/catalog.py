"""
Catalog browsing: categories, paginated photo-card listings, product detail.

Pagination: `cat:open:<slug>:<page>` renders page N (0-indexed) of
category `<slug>` as a sequence of photo cards followed by a nav message.
`cat:page:<slug>:<page>` is an alias used by the Prev/Next buttons.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Optional

from telegram import Update
from telegram.constants import ParseMode
from telegram.error import BadRequest, TelegramError
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
)

from keyboards.inline import (
    CB_CATALOG_BROWSE,
    CB_CATEGORY_OPEN,
    CB_CATEGORY_PAGE,
    CB_NOOP,
    CB_PRODUCT_VIEW,
    PAGE_SIZE,
    categories_keyboard,
    pagination_keyboard,
    product_card_keyboard,
    product_detail_keyboard,
)

logger = logging.getLogger(__name__)


def _api(context: ContextTypes.DEFAULT_TYPE):
    return context.application.bot_data["api"]


# ---------- categories ----------

async def show_categories(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    api = _api(context)
    try:
        categories = await api.list_categories()
    except Exception as e:
        logger.exception("list_categories failed")
        await _send_or_edit(update, f"⚠️  Couldn't load categories: {e}")
        return

    if not categories:
        await _send_or_edit(update, "No categories available yet.")
        return

    text = "📚  <b>Browse by category</b>\n\nPick one to see products:"
    await _send_or_edit(update, text, markup=categories_keyboard(categories))


async def cb_catalog(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.callback_query.answer()
    await show_categories(update, context)


async def cmd_catalog(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await show_categories(update, context)


# ---------- category → paginated photo-card listing ----------

def _parse_cat_cb(data: str) -> tuple[str, int]:
    """Returns (slug, page_index). Accepts both 'cat:open:...' and 'cat:page:...'."""
    parts = data.split(":")
    # cat:open:<slug>[:<page>]   or   cat:page:<slug>:<page>
    if len(parts) < 3:
        return "", 0
    slug = parts[2]
    page = 0
    if len(parts) >= 4:
        try:
            page = int(parts[3])
        except ValueError:
            page = 0
    return slug, max(0, page)


async def cb_category_open(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    slug, page = _parse_cat_cb(query.data)
    if not slug:
        await query.edit_message_text("Invalid category.")
        return
    await _render_category_page(update, context, slug, page, is_navigation=False)


async def cb_category_page(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    slug, page = _parse_cat_cb(query.data)
    if not slug:
        return
    await _render_category_page(update, context, slug, page, is_navigation=True)


async def _render_category_page(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    slug: str,
    page: int,
    is_navigation: bool,
) -> None:
    """Fetch and render one page of product photo cards for a category."""
    api = _api(context)
    settings = context.application.bot_data["settings"]
    skip = page * PAGE_SIZE

    # Deep-link to the website's product listing filtered by this category,
    # so users can cross-check the full category on paridhaancreations.xyz.
    category_url = f"{settings.web_base_url}/products?category={slug}"

    # Fetch page_size + 1 to detect if there's a next page without a count query.
    # Backend has no count endpoint, so we approximate: if we got fewer items
    # than page_size, there's no next page.
    try:
        products = await api.list_products(category=slug, limit=PAGE_SIZE, skip=skip)
    except Exception as e:
        logger.exception("list_products failed")
        await _send_or_edit(update, f"⚠️  {e}")
        return

    chat_id = update.effective_chat.id

    if not products and page == 0:
        await context.bot.send_message(
            chat_id=chat_id,
            text=f"No products in <b>{slug}</b> yet. Check back soon!",
            parse_mode=ParseMode.HTML,
            reply_markup=pagination_keyboard(slug, 0, 0, website_url=category_url),
        )
        return

    if not products and page > 0:
        # User clicked "Next" past the end — recover by sending page 0.
        await _render_category_page(update, context, slug, 0, is_navigation=True)
        return

    # Send a small header for the first page only (keeps the chat uncluttered
    # on Prev/Next navigation).
    if page == 0 and not is_navigation:
        await context.bot.send_message(
            chat_id=chat_id,
            text=f"🛍️  <b>{slug}</b>",
            parse_mode=ParseMode.HTML,
        )

    # Send one photo card per product.
    for p in products:
        await _send_product_card(context, chat_id, p)
        # Gentle throttle — Telegram's per-chat limit is ~1 msg/sec.
        await asyncio.sleep(0.15)

    # Approximate total: for the nav keyboard. We know at least (skip+len).
    # If len == PAGE_SIZE, assume there's more; else this is the last page.
    approx_total = skip + len(products) + (1 if len(products) == PAGE_SIZE else 0)
    await context.bot.send_message(
        chat_id=chat_id,
        text=f"Showing {skip + 1}–{skip + len(products)} · <b>{slug}</b>",
        parse_mode=ParseMode.HTML,
        reply_markup=pagination_keyboard(slug, page, approx_total, website_url=category_url),
    )


async def _send_product_card(
    context: ContextTypes.DEFAULT_TYPE,
    chat_id: int,
    product: dict,
) -> None:
    """Send a single product as a photo message with caption + buttons."""
    settings = context.application.bot_data["settings"]

    name = product.get("name", "Product")
    price = float(product.get("price") or 0)
    compare_at = product.get("compare_at_price")
    stock = int(product.get("stock") or 0)
    in_stock = stock > 0

    # Price line with optional discount
    price_line = f"💰 <b>₹{price:,.0f}</b>"
    if compare_at and compare_at > price:
        discount = round(100 * (compare_at - price) / compare_at)
        price_line += f"   <s>₹{compare_at:,.0f}</s>  ({discount}% off)"

    # Size: prefer explicit laddu_gopal_size for that product family,
    # otherwise join the sizes array.
    sizes = product.get("sizes") or []
    lg_size = product.get("laddu_gopal_size")
    size_display = lg_size or (", ".join(sizes) if sizes else "")

    # Colors
    colors = product.get("colors") or []
    color_display = ", ".join(colors) if colors else ""

    # Build caption (Telegram photo caption cap: 1024 chars)
    lines = [f"🕉️  <b>{name}</b>", "", price_line]
    if size_display:
        lines.append(f"📏 Size: {size_display}")
    if color_display:
        lines.append(f"🎨 Color: {color_display}")
    lines.append("✅ In stock" if in_stock else "❌ Out of stock")

    caption = "\n".join(lines)
    if len(caption) > 1024:
        caption = caption[:1020] + "…"

    pid = str(product.get("product_id") or product.get("id") or "")
    # Homepage link on every card — persistent brand touchpoint. Per-product
    # URL still lives in the Details view only, as the user asked.
    markup = product_card_keyboard(pid, in_stock, website_url=settings.web_base_url)

    images = product.get("images") or []
    try:
        if images:
            await context.bot.send_photo(
                chat_id=chat_id,
                photo=images[0],
                caption=caption,
                parse_mode=ParseMode.HTML,
                reply_markup=markup,
            )
        else:
            await context.bot.send_message(
                chat_id=chat_id,
                text=caption,
                parse_mode=ParseMode.HTML,
                reply_markup=markup,
            )
    except BadRequest as e:
        # Image URL unreachable / malformed — fall back to text.
        logger.warning("send_photo failed for %s: %s; falling back to text", pid, e)
        await context.bot.send_message(
            chat_id=chat_id,
            text=caption,
            parse_mode=ParseMode.HTML,
            reply_markup=markup,
        )


# ---------- product detail ----------

async def view_product_by_id(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    product_id: str,
) -> None:
    api = _api(context)
    settings = context.application.bot_data["settings"]

    try:
        product = await api.get_product(product_id)
    except Exception as e:
        logger.exception("get_product failed")
        await _send_or_edit(update, f"⚠️  {e}")
        return

    if not product:
        await _send_or_edit(update, "Product not found or no longer available.")
        return

    name = product.get("name", "Product")
    desc = (product.get("description") or "").strip()
    price = float(product.get("price") or 0)
    compare_at = product.get("compare_at_price")
    stock = int(product.get("stock") or 0)
    in_stock = stock > 0

    # Price line — prominent, matches the catalog card style (💰 + bold).
    price_line = f"💰 <b>₹{price:,.0f}</b>"
    if compare_at and compare_at > price:
        discount = round(100 * (compare_at - price) / compare_at)
        price_line += f"   <s>₹{compare_at:,.0f}</s>   <b>({discount}% off)</b>"

    # Size variants — prefer `laddu_gopal_size`, otherwise join sizes[]
    sizes = product.get("sizes") or []
    lg_size = product.get("laddu_gopal_size")
    size_display = lg_size or (", ".join(sizes) if sizes else "")

    # Color variants
    colors = product.get("colors") or []
    color_display = ", ".join(colors) if colors else ""

    stock_line = "✅ In stock" if in_stock else "❌ Out of stock"

    pid = str(product.get("product_id") or product.get("id") or product_id)
    # Website URL for cross-checking this particular product on the site
    website_url = f"{settings.web_base_url}/products/{pid}" if pid else None

    # Keep the description tight so the full card is scannable at a glance.
    # Users can tap "View on Website" if they want the whole write-up.
    desc_cap = 220
    desc_short = desc[:desc_cap] + ("…" if len(desc) > desc_cap else "")

    lines = [
        f"🕉️  <b>{name}</b>",
        "",
        price_line,
        stock_line,
    ]
    if size_display:
        lines.append(f"📏 <b>Size:</b> {size_display}")
    if color_display:
        lines.append(f"🎨 <b>Color:</b> {color_display}")
    if desc_short:
        lines += ["", desc_short]

    text = "\n".join(lines)

    images = product.get("images") or []
    markup = product_detail_keyboard(pid, in_stock, website_url=website_url)

    chat = update.effective_chat
    if images:
        try:
            await context.bot.send_photo(
                chat_id=chat.id,
                photo=images[0],
                caption=text[:1024],
                parse_mode=ParseMode.HTML,
                reply_markup=markup,
            )
            return
        except BadRequest:
            pass  # fall through to text
    await context.bot.send_message(
        chat_id=chat.id,
        text=text,
        parse_mode=ParseMode.HTML,
        reply_markup=markup,
        disable_web_page_preview=True,
    )


async def cb_product_view(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    _, _, pid = query.data.partition("prod:view:")
    if not pid:
        return
    await view_product_by_id(update, context, pid)


async def cb_noop(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Swallow taps on indicator buttons like '1 / 3' silently."""
    await update.callback_query.answer()


# ---------- helpers ----------

async def _send_or_edit(update: Update, text: str, *, markup=None) -> None:
    if update.callback_query:
        try:
            await update.callback_query.edit_message_text(
                text, parse_mode=ParseMode.HTML, reply_markup=markup
            )
            return
        except BadRequest:
            pass  # original was a photo message etc. — send new
    await update.effective_chat.send_message(
        text=text, parse_mode=ParseMode.HTML, reply_markup=markup
    )


def register(app: Application) -> None:
    app.add_handler(CommandHandler("catalog", cmd_catalog))
    app.add_handler(CallbackQueryHandler(cb_catalog, pattern=f"^{CB_CATALOG_BROWSE}$"))
    app.add_handler(CallbackQueryHandler(cb_category_open, pattern=f"^{CB_CATEGORY_OPEN}:"))
    app.add_handler(CallbackQueryHandler(cb_category_page, pattern=f"^{CB_CATEGORY_PAGE}:"))
    app.add_handler(CallbackQueryHandler(cb_product_view, pattern=f"^{CB_PRODUCT_VIEW}:"))
    app.add_handler(CallbackQueryHandler(cb_noop, pattern=f"^{CB_NOOP}$"))
