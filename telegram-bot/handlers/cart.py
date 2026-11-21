"""
Cart handlers (stubs).

Full implementation needs a Telegram↔platform user link (OTP flow)
so we can call the authenticated /api/cart endpoints. That ships
in the next PR.
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

from keyboards.inline import CB_CART_ADD, CB_CART_REMOVE, CB_CART_VIEW, main_menu

logger = logging.getLogger(__name__)

STUB_MSG = (
    "🛒  <b>Cart — coming soon</b>\n\n"
    "Secure login (email OTP) is shipping in the next bot update. "
    "For now, tap 🌐 on any product to check out on the website."
)


async def cb_cart_view(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer("Cart feature coming soon")
    await query.edit_message_text(STUB_MSG, parse_mode="HTML", reply_markup=main_menu())


async def cb_cart_add(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer("Login needed — coming in next update", show_alert=True)


async def cb_cart_remove(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer("Login needed — coming in next update", show_alert=True)


async def cmd_cart(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        STUB_MSG, parse_mode="HTML", reply_markup=main_menu()
    )


def register(app: Application) -> None:
    app.add_handler(CommandHandler("cart", cmd_cart))
    app.add_handler(CallbackQueryHandler(cb_cart_view, pattern=f"^{CB_CART_VIEW}$"))
    app.add_handler(CallbackQueryHandler(cb_cart_add, pattern=f"^{CB_CART_ADD}:"))
    app.add_handler(CallbackQueryHandler(cb_cart_remove, pattern=f"^{CB_CART_REMOVE}:"))
