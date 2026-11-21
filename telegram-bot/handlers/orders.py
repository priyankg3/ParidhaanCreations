"""
/orders — list this Telegram user's past orders, open one for detail.

Orders are fetched from the backend's /api/internal/telegram/orders/list
endpoint, filtered to source=telegram + this telegram_user_id.
"""
from __future__ import annotations

import logging

from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
    ContextTypes,
)

from keyboards.inline import (
    CB_ORDER_VIEW,
    CB_ORDERS_LIST,
    main_menu,
    orders_list_keyboard,
)

logger = logging.getLogger(__name__)


def _api(context: ContextTypes.DEFAULT_TYPE):
    return context.application.bot_data["api"]


def _fmt_status(status: str, payment_status: str) -> str:
    emoji = {
        "pending": "⏳",
        "confirmed": "✅",
        "shipped": "🚚",
        "delivered": "📬",
        "cancelled": "❌",
    }.get((status or "").lower(), "•")
    pay = "✅ paid" if payment_status == "paid" else "⏳ awaiting payment"
    return f"{emoji} {status}  ·  {pay}"


async def _show_orders(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    api = _api(context)
    user = update.effective_user
    try:
        orders = await api.list_telegram_orders(user.id, limit=10)
    except Exception as e:
        logger.exception("list_telegram_orders failed")
        await _send(update, f"⚠️ Couldn't load your orders: {e}", markup=main_menu())
        return

    if not orders:
        await _send(
            update,
            "📦 <b>Your orders</b>\n\nYou haven't placed any orders through the bot yet. "
            "Tap <b>Browse Catalog</b> from the main menu to shop.",
            markup=main_menu(),
        )
        return

    await _send(
        update,
        f"📦 <b>Your orders</b>  ({len(orders)} most recent)\n\nTap an order to see details:",
        markup=orders_list_keyboard(orders),
    )


async def cmd_orders(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _show_orders(update, context)


async def cb_orders_list(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.callback_query.answer()
    await _show_orders(update, context)


async def cb_order_view(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    _, _, oid = query.data.partition(f"{CB_ORDER_VIEW}:")
    if not oid:
        return

    api = _api(context)
    try:
        order = await api.get_telegram_order(oid)
    except Exception as e:
        logger.exception("get_telegram_order failed")
        await _send(update, f"⚠️ {e}", markup=main_menu())
        return
    if not order:
        await _send(update, "Order not found.", markup=main_menu())
        return

    # Compose detail message
    status_line = _fmt_status(
        order.get("status", "pending"),
        order.get("payment_status", "pending"),
    )
    items = order.get("items") or []
    item_lines = []
    for it in items:
        name = (it.get("name") or "Item")[:80]
        qty = it.get("quantity", 1)
        vl = it.get("variant_label")
        suffix = f"  ({vl})" if vl else ""
        item_lines.append(f"• {qty} × {name}{suffix}")
    items_block = "\n".join(item_lines) if item_lines else "—"

    sa = order.get("shipping_address") or {}
    addr_lines = [
        sa.get("name", ""),
        f"📱 {sa.get('phone', '')}",
    ]
    if sa.get("email"):
        addr_lines.append(f"✉️ {sa['email']}")
    addr_lines += [
        f"📍 {sa.get('address_line1', '')}",
        f"{sa.get('city', '')}, {sa.get('state', '')} — {sa.get('pincode', '')}",
    ]

    # Payment link for still-pending orders
    pay_link = order.get("razorpay_payment_link_short_url")
    pay_hint = ""
    if order.get("payment_status") != "paid" and pay_link:
        pay_hint = f"\n\n💳 <a href=\"{pay_link}\">Complete payment here</a>"

    # Tracking link for shipped/delivered orders
    tracking_url = order.get("tracking_url") or order.get("awb_tracking_url")
    awb = order.get("awb_number") or order.get("shiprocket_awb")
    tracking_block = ""
    if tracking_url or awb:
        tracking_block = "\n\n📦 <b>Tracking</b>\n"
        if awb:
            tracking_block += f"AWB: <code>{awb}</code>\n"
        if tracking_url:
            tracking_block += f'<a href="{tracking_url}">Track shipment</a>'

    text = (
        f"🧾 <b>Order <code>{order.get('order_id')}</code></b>\n"
        f"{status_line}\n\n"
        f"{items_block}\n\n"
        f"<b>Total:</b> ₹{float(order.get('total_amount') or 0):,.0f}\n\n"
        f"<b>Shipping to</b>\n" + "\n".join(addr_lines)
        + pay_hint
        + tracking_block
    )
    await _send(update, text, markup=main_menu())


async def _send(update: Update, text: str, markup=None) -> None:
    await update.effective_chat.send_message(
        text=text, parse_mode=ParseMode.HTML, reply_markup=markup
    )


def register(app: Application) -> None:
    app.add_handler(CommandHandler("orders", cmd_orders))
    app.add_handler(CallbackQueryHandler(cb_orders_list, pattern=f"^{CB_ORDERS_LIST}$"))
    app.add_handler(CallbackQueryHandler(cb_order_view, pattern=f"^{CB_ORDER_VIEW}:"))
