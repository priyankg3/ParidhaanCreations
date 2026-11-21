"""
Catalog browsing: categories, product listings, product detail.

Wired to the real FastAPI backend via api_client.
"""
from __future__ import annotations

import logging
from typing import Optional

from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
)

from keyboards.inline import (
    CB_CATALOG_BROWSE,
    CB_CATEGORY_OPEN,
    CB_PRODUCT_VIEW,
    categories_keyboard,
    product_detail_keyboard,
    products_keyboard,
)
from services.api_client import ApiClient, ApiError

logger = logging.getLogger(__name__)


def _api(context: ContextTypes.DEFAULT_TYPE) -> ApiClient:
    return context.application.bot_data["api"]


# ---------- browse categories ----------

async def show_categories(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    api = _api(context)
    try:
        categories = await api.list_categories()
    except ApiError as e:
        await _send_or_edit(update, f"⚠️  Couldn't load categories: {e.message}")
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


# ---------- category → products ----------

async def cb_category_open(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()

    # callback_data: "cat:open:<slug>"
    _, _, slug = query.data.partition("cat:open:")
    if not slug:
        await query.edit_message_text("Invalid category.")
        return

    api = _api(context)
    try:
        products = await api.list_products(category=slug, limit=10)
    except ApiError as e:
        await query.edit_message_text(f"⚠️  {e.message}")
        return

    if not products:
        await query.edit_message_text(
            f"No products in <b>{slug}</b> yet. Check back soon!",
            parse_mode=ParseMode.HTML,
            reply_markup=products_keyboard([], category_slug=slug),
        )
        return

    await query.edit_message_text(
        f"<b>{slug}</b> — {len(products)} product(s)\n\nTap one for details:",
        parse_mode=ParseMode.HTML,
        reply_markup=products_keyboard(products, category_slug=slug),
    )


# ---------- product detail ----------

async def view_product_by_id(
    update: Update,
    context: ContextTypes.DEFAULT_TYPE,
    product_id: str,
) -> None:
    api = _api(context)
    try:
        product = await api.get_product(product_id)
    except ApiError as e:
        await _send_or_edit(update, f"⚠️  {e.message}")
        return

    if not product:
        await _send_or_edit(update, "Product not found or no longer available.")
        return

    name = product.get("name", "Product")
    desc = (product.get("description") or "").strip()
    price = float(product.get("price") or 0)
    compare_at = product.get("compare_at_price")
    stock = int(product.get("stock") or 0)

    price_line = f"<b>₹{price:,.0f}</b>"
    if compare_at and compare_at > price:
        discount = round(100 * (compare_at - price) / compare_at)
        price_line = f"<b>₹{price:,.0f}</b> <s>₹{compare_at:,.0f}</s> ({discount}% off)"

    stock_line = "✅  In stock" if stock > 0 else "❌  Out of stock"

    text = (
        f"🕉️  <b>{name}</b>\n\n"
        f"{price_line}\n"
        f"{stock_line}\n\n"
        f"{desc[:600]}{'…' if len(desc) > 600 else ''}"
    )

    pid = str(product.get("product_id") or product.get("id") or product_id)
    images = product.get("images") or []
    markup = product_detail_keyboard(pid)

    # When invoked from a callback, we can't easily edit a text msg to a photo;
    # just reply with a new message.
    chat = update.effective_chat
    if images:
        await context.bot.send_photo(
            chat_id=chat.id,
            photo=images[0],
            caption=text,
            parse_mode=ParseMode.HTML,
            reply_markup=markup,
        )
    else:
        await context.bot.send_message(
            chat_id=chat.id, text=text, parse_mode=ParseMode.HTML, reply_markup=markup
        )


async def cb_product_view(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    _, _, pid = query.data.partition("prod:view:")
    if not pid:
        return
    await view_product_by_id(update, context, pid)


# ---------- helpers ----------

async def _send_or_edit(
    update: Update,
    text: str,
    *,
    markup=None,
) -> None:
    if update.callback_query:
        await update.callback_query.edit_message_text(
            text, parse_mode=ParseMode.HTML, reply_markup=markup
        )
    else:
        await update.effective_message.reply_text(
            text, parse_mode=ParseMode.HTML, reply_markup=markup
        )


def register(app: Application) -> None:
    app.add_handler(CommandHandler("catalog", cmd_catalog))
    app.add_handler(CallbackQueryHandler(cb_catalog, pattern=f"^{CB_CATALOG_BROWSE}$"))
    app.add_handler(CallbackQueryHandler(cb_category_open, pattern=f"^{CB_CATEGORY_OPEN}:"))
    app.add_handler(CallbackQueryHandler(cb_product_view, pattern=f"^{CB_PRODUCT_VIEW}:"))
