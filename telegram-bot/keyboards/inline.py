"""
Reusable inline keyboards and callback data helpers.

Callback data convention: "<domain>:<action>:<arg>"
  e.g. "cat:open:pooja-articles", "prod:view:abc123", "cart:add:abc123"

Keep callback data under 64 bytes (Telegram limit).
"""
from __future__ import annotations

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

# ---------- callback data ----------

CB_CATEGORY_OPEN = "cat:open"
CB_PRODUCT_VIEW = "prod:view"
CB_CART_ADD = "cart:add"
CB_CART_VIEW = "cart:view"
CB_CART_REMOVE = "cart:remove"
CB_CHECKOUT_START = "chk:start"
CB_ORDERS_LIST = "ord:list"
CB_ORDER_VIEW = "ord:view"
CB_MAIN_MENU = "nav:home"
CB_CATALOG_BROWSE = "nav:catalog"


def make_cb(prefix: str, arg: str = "") -> str:
    data = f"{prefix}:{arg}" if arg else prefix
    if len(data.encode("utf-8")) > 64:
        # Fall back to a hash-based ref if the arg is too long.
        # (Rare — product IDs are UUIDs or short slugs.)
        raise ValueError(f"callback data too long: {data!r}")
    return data


# ---------- builders ----------

def main_menu() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("🛍️  Browse Catalog", callback_data=CB_CATALOG_BROWSE)],
            [
                InlineKeyboardButton("🛒  My Cart", callback_data=CB_CART_VIEW),
                InlineKeyboardButton("📦  My Orders", callback_data=CB_ORDERS_LIST),
            ],
            [InlineKeyboardButton("💬  Help", url="https://paridhaancreations.xyz/support")],
        ]
    )


def categories_keyboard(categories: list[dict]) -> InlineKeyboardMarkup:
    rows = []
    for cat in categories[:20]:  # cap to avoid oversized keyboard
        label = cat.get("name") or cat.get("slug", "?")
        slug = cat.get("slug") or cat.get("id") or ""
        if not slug:
            continue
        rows.append([InlineKeyboardButton(f"📂 {label}", callback_data=make_cb(CB_CATEGORY_OPEN, slug))])
    rows.append([InlineKeyboardButton("⬅️  Back", callback_data=CB_MAIN_MENU)])
    return InlineKeyboardMarkup(rows)


def products_keyboard(products: list[dict], category_slug: str | None = None) -> InlineKeyboardMarkup:
    rows = []
    for p in products[:10]:
        pid = str(p.get("id") or p.get("_id") or "")
        name = p.get("name", "Product")[:40]
        price = p.get("price")
        price_str = f" — ₹{price:,.0f}" if price else ""
        if pid:
            rows.append(
                [InlineKeyboardButton(f"{name}{price_str}", callback_data=make_cb(CB_PRODUCT_VIEW, pid))]
            )
    back_target = make_cb(CB_CATALOG_BROWSE) if not category_slug else CB_CATALOG_BROWSE
    rows.append([InlineKeyboardButton("⬅️  Back to Categories", callback_data=back_target)])
    return InlineKeyboardMarkup(rows)


def product_detail_keyboard(product_id: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("🛒  Add to Cart", callback_data=make_cb(CB_CART_ADD, product_id))],
            [
                InlineKeyboardButton("⬅️  Back", callback_data=CB_CATALOG_BROWSE),
                InlineKeyboardButton("🏠  Home", callback_data=CB_MAIN_MENU),
            ],
        ]
    )
