"""
Reusable inline keyboards and callback data helpers.

Callback data convention: "<domain>:<action>:<arg>[:<arg2>]"
  e.g. "cat:open:pooja:0", "prod:view:prod_abc123", "cart:add:prod_abc123"

Keep callback data under 64 bytes (Telegram limit).
"""
from __future__ import annotations

from telegram import InlineKeyboardButton, InlineKeyboardMarkup

# ---------- callback data prefixes ----------

CB_CATEGORY_OPEN = "cat:open"        # cat:open:<slug>:<page>
CB_CATEGORY_PAGE = "cat:page"        # cat:page:<slug>:<page>  (alias for navigation)
CB_PRODUCT_VIEW = "prod:view"        # prod:view:<product_id>
CB_CART_ADD = "cart:add"             # cart:add:<product_id>
CB_CART_VIEW = "cart:view"
CB_CART_REMOVE = "cart:remove"
CB_CHECKOUT_START = "chk:start"
CB_ORDERS_LIST = "ord:list"
CB_ORDER_VIEW = "ord:view"
CB_MAIN_MENU = "nav:home"
CB_CATALOG_BROWSE = "nav:catalog"
CB_NOOP = "nav:noop"                 # for disabled buttons (e.g. page indicator)

# Pagination: products per page in catalog listing
PAGE_SIZE = 5


def make_cb(prefix: str, *args: str) -> str:
    parts = [prefix] + [str(a) for a in args if a != ""]
    data = ":".join(parts)
    if len(data.encode("utf-8")) > 64:
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
    for cat in categories[:20]:
        label = cat.get("name") or cat.get("slug", "?")
        slug = cat.get("slug") or cat.get("category_id") or ""
        if not slug:
            continue
        rows.append([
            InlineKeyboardButton(f"📂 {label}", callback_data=make_cb(CB_CATEGORY_OPEN, slug, "0"))
        ])
    rows.append([InlineKeyboardButton("⬅️  Back", callback_data=CB_MAIN_MENU)])
    return InlineKeyboardMarkup(rows)


def product_card_keyboard(product_id: str, in_stock: bool) -> InlineKeyboardMarkup:
    """Inline keyboard shown under each product card (photo message)."""
    if in_stock:
        row = [
            InlineKeyboardButton("🛒  Add to Cart", callback_data=make_cb(CB_CART_ADD, product_id)),
            InlineKeyboardButton("👁️  Details", callback_data=make_cb(CB_PRODUCT_VIEW, product_id)),
        ]
    else:
        row = [
            InlineKeyboardButton("❌  Out of stock", callback_data=CB_NOOP),
            InlineKeyboardButton("👁️  Details", callback_data=make_cb(CB_PRODUCT_VIEW, product_id)),
        ]
    return InlineKeyboardMarkup([row])


def pagination_keyboard(
    slug: str,
    page: int,
    total: int,
    page_size: int = PAGE_SIZE,
) -> InlineKeyboardMarkup:
    """Navigation message shown AFTER a page of product cards."""
    total_pages = max(1, (total + page_size - 1) // page_size)
    prev_page = page - 1
    next_page = page + 1

    nav_row = []
    if prev_page >= 0:
        nav_row.append(InlineKeyboardButton("⬅️  Prev", callback_data=make_cb(CB_CATEGORY_PAGE, slug, str(prev_page))))
    nav_row.append(InlineKeyboardButton(f"{page + 1} / {total_pages}", callback_data=CB_NOOP))
    if next_page < total_pages:
        nav_row.append(InlineKeyboardButton("Next  ➡️", callback_data=make_cb(CB_CATEGORY_PAGE, slug, str(next_page))))

    return InlineKeyboardMarkup([
        nav_row,
        [
            InlineKeyboardButton("📚  All Categories", callback_data=CB_CATALOG_BROWSE),
            InlineKeyboardButton("🏠  Home", callback_data=CB_MAIN_MENU),
        ],
    ])


def product_detail_keyboard(product_id: str, in_stock: bool = True) -> InlineKeyboardMarkup:
    rows = []
    if in_stock:
        rows.append([InlineKeyboardButton("🛒  Add to Cart", callback_data=make_cb(CB_CART_ADD, product_id))])
    rows.append([
        InlineKeyboardButton("⬅️  Back", callback_data=CB_CATALOG_BROWSE),
        InlineKeyboardButton("🏠  Home", callback_data=CB_MAIN_MENU),
    ])
    return InlineKeyboardMarkup(rows)
