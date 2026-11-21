"""
Cart handler — intentionally minimal.

This bot uses a direct "Buy Now" flow (see handlers/checkout.py), not a
persistent cart. The main menu still shows a "My Cart" button for
compatibility, but tapping it just steers the user toward Browse Catalog.

Kept as a tiny module so main_menu's CB_CART_VIEW callback has somewhere
to land without a "handler not found" error, and so that /cart as a
command does something friendly.
"""
from __future__ import annotations

import logging

from telegram import Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
)

from keyboards.inline import CB_CART_VIEW, main_menu

logger = logging.getLogger(__name__)

NO_CART_MSG = (
    "ℹ️ We use a direct <b>Buy Now</b> checkout instead of a saved cart — "
    "no leftover items, no abandoned-cart hassle. "
    "Just browse, tap <b>🛒 Buy Now</b> on anything you like, fill a quick form "
    "and pay securely. Tap <b>Browse Catalog</b> below to start.\n\n"
    "Your past orders live under <b>My Orders</b>."
)


async def cmd_cart(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        NO_CART_MSG, parse_mode="HTML", reply_markup=main_menu()
    )


async def cb_cart_view(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(
        NO_CART_MSG, parse_mode="HTML", reply_markup=main_menu()
    )


def register(app: Application) -> None:
    app.add_handler(CommandHandler("cart", cmd_cart))
    app.add_handler(CallbackQueryHandler(cb_cart_view, pattern=f"^{CB_CART_VIEW}$"))
