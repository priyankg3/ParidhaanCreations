"""
Checkout handler (stub).

Full implementation flow (next PR):
  1. User taps "Checkout" from cart
  2. Bot collects/confirms shipping address (reuse address stored on platform user)
  3. Bot calls POST /api/orders to create a draft order
  4. Bot calls POST /api/payments/razorpay/create to get Razorpay order_id
  5. Bot generates a Razorpay payment link (razorpay.PaymentLink.create)
     with notify + callback_url pointing back to a bot webhook endpoint
  6. On payment success webhook, bot sends "Order confirmed" message
     and triggers Shiprocket flow via existing backend code
"""
from __future__ import annotations

import logging

from telegram import Update
from telegram.ext import Application, CallbackQueryHandler, ContextTypes

from keyboards.inline import CB_CHECKOUT_START, main_menu

logger = logging.getLogger(__name__)


async def cb_checkout_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer("Checkout coming soon", show_alert=False)
    await query.edit_message_text(
        "💳  <b>Checkout — coming soon</b>\n\n"
        "Razorpay payment links inside Telegram are shipping next. "
        "For now, visit https://paridhaancreations.xyz to complete your order.",
        parse_mode="HTML",
        reply_markup=main_menu(),
    )


def register(app: Application) -> None:
    app.add_handler(CallbackQueryHandler(cb_checkout_start, pattern=f"^{CB_CHECKOUT_START}"))
