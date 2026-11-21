"""
Buy Now → Checkout → Payment flow.

Per-chat state lives in `context.user_data['checkout']` (PTB persists this
per-user automatically). The state is a dict:

  {
    'state':        one of the STATE_* constants below,
    'product_id':   str,
    'product_name': str,      (cached for the review screen)
    'variants':     [...],    (cached: avoids a second API call)
    'variant_idx':  int|None,
    'size_idx':     int|None,
    'unit_price':   float,    (variant-aware)
    'max_qty':      int,      (stock available for chosen variant/size)
    'qty':          int,
    # shipping captured step by step
    'name':         str,
    'phone':        str,
    'email':        str|None,
    'address_line1':str,
    'city':         str,
    'state_sa':     str,      ('state' key clash avoided)
    'pincode':      str,
  }

Text inputs are routed by `on_checkout_text` based on the current state;
it runs in the catch-all group (added via a positive group id so
callback-less text doesn't collide with other handlers).
"""
from __future__ import annotations

import logging
import re
from typing import Optional

from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from keyboards.inline import (
    CB_BUY_CANCEL,
    CB_BUY_COLOR,
    CB_BUY_CONFIRM,
    CB_BUY_QTY,
    CB_BUY_QTY_CONTINUE,
    CB_BUY_SIZE,
    CB_BUY_SKIP_EMAIL,
    CB_CHECKOUT_START,
    color_pick_keyboard,
    email_optional_keyboard,
    main_menu,
    pay_link_keyboard,
    qty_keyboard,
    review_keyboard,
    size_pick_keyboard,
)
from services.product_format import extract_variant_info

logger = logging.getLogger(__name__)

# State machine
STATE_PICK_COLOR = "PICK_COLOR"
STATE_PICK_SIZE = "PICK_SIZE"
STATE_PICK_QTY = "PICK_QTY"
STATE_ASK_NAME = "ASK_NAME"
STATE_ASK_PHONE = "ASK_PHONE"
STATE_ASK_EMAIL = "ASK_EMAIL"
STATE_ASK_ADDRESS = "ASK_ADDRESS"
STATE_ASK_CITY = "ASK_CITY"
STATE_ASK_STATE = "ASK_STATE"
STATE_ASK_PINCODE = "ASK_PINCODE"
STATE_REVIEW = "REVIEW"

MAX_PER_ORDER = 10  # hard cap on quantity


# ---------- helpers ----------

def _api(context: ContextTypes.DEFAULT_TYPE):
    return context.application.bot_data["api"]


def _st(context: ContextTypes.DEFAULT_TYPE) -> dict:
    """Return the checkout state dict, creating it if missing."""
    return context.user_data.setdefault("checkout", {})


def _clear(context: ContextTypes.DEFAULT_TYPE) -> None:
    context.user_data.pop("checkout", None)


async def _send(update: Update, text: str, markup=None) -> None:
    await update.effective_chat.send_message(
        text=text, parse_mode=ParseMode.HTML, reply_markup=markup
    )


def _variant_price_and_stock(variant: dict, size_idx: Optional[int]) -> tuple[float, int]:
    sizes = variant.get("sizes") or []
    if size_idx is not None and 0 <= size_idx < len(sizes):
        s = sizes[size_idx]
        return float(s.get("price") or 0), int(s.get("stock") or 0)
    # No size chosen — use first size's data (if any) else zeros
    if sizes:
        s = sizes[0]
        return float(s.get("price") or 0), int(s.get("stock") or 0)
    return 0.0, 0


# ---------- entry: user tapped "Buy Now" ----------

async def cb_buy_now(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    _, _, pid = query.data.partition(f"{CB_CHECKOUT_START}:")
    if not pid:
        return

    api = _api(context)
    try:
        product = await api.get_product(pid)
    except Exception as e:
        logger.exception("get_product failed in buy_now")
        await _send(update, f"⚠️ Couldn't load product: {e}")
        return
    if not product:
        await _send(update, "Sorry, this product is no longer available.")
        return

    # Fresh state for this checkout
    _clear(context)
    st = _st(context)
    st["product_id"] = str(product.get("product_id") or product.get("id") or pid)
    st["product_name"] = product.get("name", "Product")
    st["variants"] = product.get("variants") or []
    st["qty"] = 1
    st["variant_idx"] = None
    st["size_idx"] = None

    # Branch: variants vs flat product
    if st["variants"]:
        st["state"] = STATE_PICK_COLOR
        await _send(
            update,
            f"🛒 <b>{st['product_name']}</b>\n\nPick a color:",
            markup=color_pick_keyboard(st["variants"]),
        )
    else:
        # No variants — jump straight to qty picker with top-level price/stock
        st["unit_price"] = float(product.get("price") or 0)
        st["max_qty"] = min(MAX_PER_ORDER, int(product.get("stock") or 0))
        if st["unit_price"] <= 0 or st["max_qty"] <= 0:
            _clear(context)
            await _send(update, "Sorry, this product isn't available for purchase right now.")
            return
        st["state"] = STATE_PICK_QTY
        await _render_qty(update, context)


# ---------- color picker ----------

async def cb_color(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    st = _st(context)
    if st.get("state") != STATE_PICK_COLOR:
        return
    _, _, idx_s = query.data.partition(f"{CB_BUY_COLOR}:")
    try:
        idx = int(idx_s)
    except ValueError:
        return
    variants = st.get("variants") or []
    if not (0 <= idx < len(variants)):
        return

    st["variant_idx"] = idx
    variant = variants[idx]
    sizes = variant.get("sizes") or []

    if sizes:
        st["state"] = STATE_PICK_SIZE
        await _send(
            update,
            f"🛒 <b>{st['product_name']}</b>\n"
            f"Color: <b>{variant.get('color_name')}</b>\n\nPick a size:",
            markup=size_pick_keyboard(sizes),
        )
    else:
        # Variant without sizes — use flat price/stock from variant/product
        st["size_idx"] = None
        unit_price, stock = _variant_price_and_stock(variant, None)
        if unit_price <= 0 or stock <= 0:
            await _send(update, "Sorry, that option is unavailable. Pick another color.")
            return
        st["unit_price"] = unit_price
        st["max_qty"] = min(MAX_PER_ORDER, stock)
        st["state"] = STATE_PICK_QTY
        await _render_qty(update, context)


# ---------- size picker ----------

async def cb_size(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    st = _st(context)
    if st.get("state") != STATE_PICK_SIZE:
        return
    _, _, idx_s = query.data.partition(f"{CB_BUY_SIZE}:")
    try:
        idx = int(idx_s)
    except ValueError:
        return

    variants = st.get("variants") or []
    v_idx = st.get("variant_idx")
    if v_idx is None or not (0 <= v_idx < len(variants)):
        return
    sizes = variants[v_idx].get("sizes") or []
    if not (0 <= idx < len(sizes)):
        return

    unit_price, stock = _variant_price_and_stock(variants[v_idx], idx)
    if stock <= 0:
        await query.answer("That size is out of stock — pick another", show_alert=True)
        return
    st["size_idx"] = idx
    st["unit_price"] = unit_price
    st["max_qty"] = min(MAX_PER_ORDER, stock)
    st["state"] = STATE_PICK_QTY
    await _render_qty(update, context)


# ---------- qty picker ----------

async def _render_qty(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    st = _st(context)
    qty = int(st.get("qty") or 1)
    unit_price = float(st.get("unit_price") or 0)
    max_qty = int(st.get("max_qty") or 1)
    total = unit_price * qty

    variants = st.get("variants") or []
    label_bits = []
    v_idx = st.get("variant_idx")
    if v_idx is not None and 0 <= v_idx < len(variants):
        label_bits.append(f"Color: {variants[v_idx].get('color_name')}")
    s_idx = st.get("size_idx")
    if s_idx is not None and v_idx is not None:
        sizes = variants[v_idx].get("sizes") or []
        if 0 <= s_idx < len(sizes):
            label_bits.append(f"Size: {sizes[s_idx].get('size')}")
    selection = " · ".join(label_bits)

    text = (
        f"🛒 <b>{st['product_name']}</b>\n"
        + (f"{selection}\n" if selection else "")
        + f"\nUnit price: ₹{unit_price:,.0f}\n"
        f"Quantity below · Available: {max_qty}\n\n"
        f"<b>Total: ₹{total:,.0f}</b>"
    )
    await _send(update, text, markup=qty_keyboard(qty, max_qty))


async def cb_qty(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    st = _st(context)
    if st.get("state") != STATE_PICK_QTY:
        return
    _, _, delta_s = query.data.partition(f"{CB_BUY_QTY}:")
    try:
        delta = int(delta_s)
    except ValueError:
        return
    max_qty = int(st.get("max_qty") or 1)
    qty = int(st.get("qty") or 1) + delta
    qty = max(1, min(max_qty, qty))
    st["qty"] = qty
    await _render_qty(update, context)


async def cb_qty_continue(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer()
    st = _st(context)
    if st.get("state") != STATE_PICK_QTY:
        return
    st["state"] = STATE_ASK_NAME
    await _send(update, "👤 Please type your <b>full name</b>:")


# ---------- shipping form (text steps) ----------

PHONE_RE = re.compile(r"^\+?\d[\d\s-]{8,13}\d$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PINCODE_RE = re.compile(r"^\d{6}$")


async def on_checkout_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Routes text input based on the current checkout state. No-op if the user
    is not in a text-input state of a checkout."""
    st = context.user_data.get("checkout") or {}
    state = st.get("state")
    text = (update.message.text or "").strip()

    text_states = {
        STATE_ASK_NAME, STATE_ASK_PHONE, STATE_ASK_EMAIL,
        STATE_ASK_ADDRESS, STATE_ASK_CITY, STATE_ASK_STATE, STATE_ASK_PINCODE,
    }
    if state not in text_states:
        return  # not in a text step; let other handlers decide

    if state == STATE_ASK_NAME:
        if len(text) < 2 or len(text) > 120:
            await _send(update, "⚠️ Please type a valid name (2–120 characters):")
            return
        st["name"] = text
        st["state"] = STATE_ASK_PHONE
        await _send(update, "📱 Please type your <b>10-digit mobile number</b>:")
        return

    if state == STATE_ASK_PHONE:
        digits = re.sub(r"\D", "", text)
        if not (10 <= len(digits) <= 15):
            await _send(update, "⚠️ That doesn't look right. Please type a valid phone number (10 digits):")
            return
        st["phone"] = digits
        st["state"] = STATE_ASK_EMAIL
        await _send(
            update,
            "✉️ Please type your <b>email</b> (or tap skip if you'd rather not):",
            markup=email_optional_keyboard(),
        )
        return

    if state == STATE_ASK_EMAIL:
        if EMAIL_RE.match(text):
            st["email"] = text
            st["state"] = STATE_ASK_ADDRESS
            await _send(update, "📍 Please type your <b>address</b> (house/building, street, area):")
        else:
            await _send(
                update,
                "⚠️ That email looks off. Please type a valid email, or tap skip:",
                markup=email_optional_keyboard(),
            )
        return

    if state == STATE_ASK_ADDRESS:
        if len(text) < 5 or len(text) > 500:
            await _send(update, "⚠️ Address is too short. Please type a complete address:")
            return
        st["address_line1"] = text
        st["state"] = STATE_ASK_CITY
        await _send(update, "🏙️ Please type your <b>city</b>:")
        return

    if state == STATE_ASK_CITY:
        if len(text) < 2 or len(text) > 120:
            await _send(update, "⚠️ Please type a valid city name:")
            return
        st["city"] = text
        st["state"] = STATE_ASK_STATE
        await _send(update, "🗺️ Please type your <b>state</b>:")
        return

    if state == STATE_ASK_STATE:
        if len(text) < 2 or len(text) > 120:
            await _send(update, "⚠️ Please type a valid state name:")
            return
        st["state_sa"] = text
        st["state"] = STATE_ASK_PINCODE
        await _send(update, "📮 Please type your <b>6-digit pincode</b>:")
        return

    if state == STATE_ASK_PINCODE:
        if not PINCODE_RE.match(text):
            await _send(update, "⚠️ Pincode must be exactly 6 digits. Please try again:")
            return
        st["pincode"] = text
        st["state"] = STATE_REVIEW
        await _render_review(update, context)
        return


async def cb_skip_email(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer("Email skipped")
    st = _st(context)
    if st.get("state") != STATE_ASK_EMAIL:
        return
    st["email"] = None
    st["state"] = STATE_ASK_ADDRESS
    await _send(update, "📍 Please type your <b>address</b> (house/building, street, area):")


# ---------- review + pay ----------

async def _render_review(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    st = _st(context)
    unit_price = float(st.get("unit_price") or 0)
    qty = int(st.get("qty") or 1)
    total = unit_price * qty

    variants = st.get("variants") or []
    sel_bits = []
    v_idx = st.get("variant_idx")
    if v_idx is not None and 0 <= v_idx < len(variants):
        sel_bits.append(f"<b>Color:</b> {variants[v_idx].get('color_name')}")
    s_idx = st.get("size_idx")
    if s_idx is not None and v_idx is not None:
        sizes = variants[v_idx].get("sizes") or []
        if 0 <= s_idx < len(sizes):
            sel_bits.append(f"<b>Size:</b> {sizes[s_idx].get('size')}")

    lines = [
        "📋 <b>Review your order</b>",
        "",
        f"🕉️ <b>{st.get('product_name')}</b>",
        *sel_bits,
        f"<b>Quantity:</b> {qty}",
        f"<b>Total:</b> ₹{total:,.0f}",
        "",
        "<b>Shipping to:</b>",
        f"{st.get('name')}",
        f"📱 {st.get('phone')}",
    ]
    if st.get("email"):
        lines.append(f"✉️ {st['email']}")
    lines += [
        f"📍 {st.get('address_line1')}",
        f"{st.get('city')}, {st.get('state_sa')} — {st.get('pincode')}",
        "",
        "Tap <b>Confirm &amp; Pay</b> to open the secure Razorpay payment page.",
    ]
    await _send(update, "\n".join(lines), markup=review_keyboard())


async def cb_confirm(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer("Creating payment link…")
    st = _st(context)
    if st.get("state") != STATE_REVIEW:
        return

    api = _api(context)
    user = update.effective_user
    chat = update.effective_chat
    try:
        result = await api.create_telegram_order(
            telegram_user_id=user.id,
            telegram_chat_id=chat.id,
            product_id=st["product_id"],
            quantity=int(st.get("qty") or 1),
            variant_color=_chosen_color(st),
            variant_size=_chosen_size(st),
            shipping={
                "name": st.get("name"),
                "phone": st.get("phone"),
                "email": st.get("email"),
                "address_line1": st.get("address_line1"),
                "city": st.get("city"),
                "state": st.get("state_sa"),
                "pincode": st.get("pincode"),
            },
        )
    except Exception as e:
        logger.exception("create_telegram_order failed")
        await _send(update, f"⚠️ Couldn't create your order: {e}\n\nPlease try again, or contact support.")
        return

    short_url = result.get("payment_link")
    order_id = result.get("order_id")
    total = result.get("total_amount") or 0

    text = (
        "🧾 <b>Order created — ready to pay</b>\n\n"
        f"<b>Order ID:</b> <code>{order_id}</code>\n"
        f"<b>Amount:</b> ₹{float(total):,.0f}\n\n"
        "Tap the button below to pay securely via Razorpay. "
        "You'll receive an instant confirmation here once the payment clears."
    )
    await _send(update, text, markup=pay_link_keyboard(short_url))
    _clear(context)


async def cb_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    await query.answer("Checkout cancelled")
    _clear(context)
    await _send(
        update,
        "Checkout cancelled. Nothing was charged.\n\nBack to the main menu:",
        markup=main_menu(),
    )


def _chosen_color(st: dict) -> Optional[str]:
    variants = st.get("variants") or []
    idx = st.get("variant_idx")
    if idx is None or not (0 <= idx < len(variants)):
        return None
    return variants[idx].get("color_name")


def _chosen_size(st: dict) -> Optional[str]:
    variants = st.get("variants") or []
    v_idx = st.get("variant_idx")
    s_idx = st.get("size_idx")
    if v_idx is None or s_idx is None:
        return None
    sizes = variants[v_idx].get("sizes") or []
    if 0 <= s_idx < len(sizes):
        return str(sizes[s_idx].get("size"))
    return None


# ---------- registration ----------

def register(app: Application) -> None:
    app.add_handler(CallbackQueryHandler(cb_buy_now, pattern=f"^{CB_CHECKOUT_START}:"))
    app.add_handler(CallbackQueryHandler(cb_color, pattern=f"^{CB_BUY_COLOR}:"))
    app.add_handler(CallbackQueryHandler(cb_size, pattern=f"^{CB_BUY_SIZE}:"))
    app.add_handler(CallbackQueryHandler(cb_qty, pattern=f"^{CB_BUY_QTY}:"))
    app.add_handler(CallbackQueryHandler(cb_qty_continue, pattern=f"^{CB_BUY_QTY_CONTINUE}$"))
    app.add_handler(CallbackQueryHandler(cb_skip_email, pattern=f"^{CB_BUY_SKIP_EMAIL}$"))
    app.add_handler(CallbackQueryHandler(cb_confirm, pattern=f"^{CB_BUY_CONFIRM}$"))
    app.add_handler(CallbackQueryHandler(cb_cancel, pattern=f"^{CB_BUY_CANCEL}$"))

    # Text input routing. Runs on any plain text; the handler no-ops when
    # the user is not in a checkout text-step, so it doesn't eat unrelated
    # messages. Keep group=0 so it shares the default with other text handlers.
    app.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, on_checkout_text),
        group=0,
    )
