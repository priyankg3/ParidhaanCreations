"""
Orders handler (stub).

Future flow:
  - /orders  → list recent orders for linked platform user
  - View order → show items, status, Shiprocket tracking URL
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

from keyboards.inline import CB_ORDER_VIEW, CB_ORDERS_LIST, main_menu

logger = logging.getLogger(__name__)

STUB = (
    "📦  <b>My Orders — coming soon</b>\n\n"
    "Order lookup via Telegram ships with the login update. "
    "For now, you can see your orders at "
    "<a href='https://paridhaancreations.xyz/account/orders'>your account page</a>."
)


async def cb_orders_list(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    await query.edit_message_text(STUB, parse_mode="HTML", reply_markup=main_menu())


async def cb_order_view(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer("Login needed — coming soon", show_alert=True)


async def cmd_orders(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.effective_message.reply_text(
        STUB, parse_mode="HTML", reply_markup=main_menu()
    )


def register(app: Application) -> None:
    app.add_handler(CommandHandler("orders", cmd_orders))
    app.add_handler(CallbackQueryHandler(cb_orders_list, pattern=f"^{CB_ORDERS_LIST}$"))
    app.add_handler(CallbackQueryHandler(cb_order_view, pattern=f"^{CB_ORDER_VIEW}:"))
