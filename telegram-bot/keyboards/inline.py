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
CB_CHECKOUT_START = "chk:start"     # chk:start:<product_id>
CB_BUY_COLOR = "chk:color"          # chk:color:<color_index>
CB_BUY_SIZE = "chk:size"            # chk:size:<size_index>
CB_BUY_QTY = "chk:qty"              # chk:qty:<delta>    (delta = +1/-1/0)
CB_BUY_QTY_CONTINUE = "chk:qc"      # advance from qty picker to form
CB_BUY_CONFIRM = "chk:confirm"      # review → pay
CB_BUY_CANCEL = "chk:cancel"
CB_BUY_SKIP_EMAIL = "chk:skipmail"  # email is optional
CB_ORDERS_LIST = "ord:list"
CB_ORDER_VIEW = "ord:view"          # ord:view:<order_id>
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


def product_card_keyboard(
    product_id: str,
    in_stock: bool,
    website_url: str | None = None,
) -> InlineKeyboardMarkup:
    """Inline keyboard shown under each product card (photo message).

    When `website_url` is supplied, a second row adds a "Visit Website"
    button pointing to the storefront home — a persistent brand touchpoint
    on every card, independent of the per-product URL in the detail view.
    """
    if in_stock:
        action_row = [
            InlineKeyboardButton("🛒  Buy Now", callback_data=make_cb(CB_CHECKOUT_START, product_id)),
            InlineKeyboardButton("👁️  Details", callback_data=make_cb(CB_PRODUCT_VIEW, product_id)),
        ]
    else:
        action_row = [
            InlineKeyboardButton("❌  Out of stock", callback_data=CB_NOOP),
            InlineKeyboardButton("👁️  Details", callback_data=make_cb(CB_PRODUCT_VIEW, product_id)),
        ]
    rows = [action_row]
    if website_url:
        rows.append([InlineKeyboardButton("🌐  Visit Website", url=website_url)])
    return InlineKeyboardMarkup(rows)


def pagination_keyboard(
    slug: str,
    page: int,
    total: int,
    page_size: int = PAGE_SIZE,
    website_url: str | None = None,
) -> InlineKeyboardMarkup:
    """Navigation message shown AFTER a page of product cards.

    When `website_url` is supplied, a 'View on Website' link row is appended
    at the bottom so users can cross-check the category on paridhaancreations.xyz.
    """
    total_pages = max(1, (total + page_size - 1) // page_size)
    prev_page = page - 1
    next_page = page + 1

    nav_row = []
    if prev_page >= 0:
        nav_row.append(InlineKeyboardButton("⬅️  Prev", callback_data=make_cb(CB_CATEGORY_PAGE, slug, str(prev_page))))
    nav_row.append(InlineKeyboardButton(f"{page + 1} / {total_pages}", callback_data=CB_NOOP))
    if next_page < total_pages:
        nav_row.append(InlineKeyboardButton("Next  ➡️", callback_data=make_cb(CB_CATEGORY_PAGE, slug, str(next_page))))

    rows = [
        nav_row,
        [
            InlineKeyboardButton("📚  All Categories", callback_data=CB_CATALOG_BROWSE),
            InlineKeyboardButton("🏠  Home", callback_data=CB_MAIN_MENU),
        ],
    ]
    if website_url:
        rows.append([InlineKeyboardButton("🌐  View on Website", url=website_url)])
    return InlineKeyboardMarkup(rows)


def product_detail_keyboard(
    product_id: str,
    in_stock: bool = True,
    website_url: str | None = None,
) -> InlineKeyboardMarkup:
    rows = []
    if in_stock:
        rows.append([InlineKeyboardButton("🛒  Buy Now", callback_data=make_cb(CB_CHECKOUT_START, product_id))])
    if website_url:
        rows.append([InlineKeyboardButton("🌐  View on Website", url=website_url)])
    rows.append([
        InlineKeyboardButton("⬅️  Back", callback_data=CB_CATALOG_BROWSE),
        InlineKeyboardButton("🏠  Home", callback_data=CB_MAIN_MENU),
    ])
    return InlineKeyboardMarkup(rows)


# ---------- checkout flow keyboards ----------

def color_pick_keyboard(variants: list[dict]) -> InlineKeyboardMarkup:
    """Grid of color choices for the Buy Now flow."""
    rows, cur = [], []
    for idx, v in enumerate(variants[:12]):
        cn = v.get("color_name") or f"Option {idx + 1}"
        cur.append(InlineKeyboardButton(f"🎨 {cn}", callback_data=make_cb(CB_BUY_COLOR, str(idx))))
        if len(cur) == 2:
            rows.append(cur); cur = []
    if cur:
        rows.append(cur)
    rows.append([InlineKeyboardButton("❌ Cancel", callback_data=CB_BUY_CANCEL)])
    return InlineKeyboardMarkup(rows)


def size_pick_keyboard(sizes: list[dict]) -> InlineKeyboardMarkup:
    """Grid of sizes for the chosen color. Each shows size label + price."""
    rows, cur = [], []
    for idx, s in enumerate(sizes[:12]):
        lbl = str(s.get("size", f"Size {idx + 1}"))
        price = s.get("price")
        stock = int(s.get("stock") or 0)
        if stock <= 0:
            # Disabled-ish — tapping it still fires the callback, but the
            # handler checks stock and bounces the user back.
            text = f"{lbl} · ❌ Out"
        else:
            text = f"{lbl} · ₹{int(float(price or 0)):,}" if price else lbl
        cur.append(InlineKeyboardButton(text, callback_data=make_cb(CB_BUY_SIZE, str(idx))))
        if len(cur) == 2:
            rows.append(cur); cur = []
    if cur:
        rows.append(cur)
    rows.append([InlineKeyboardButton("❌ Cancel", callback_data=CB_BUY_CANCEL)])
    return InlineKeyboardMarkup(rows)


def qty_keyboard(qty: int, max_qty: int) -> InlineKeyboardMarkup:
    """−  qty  +   +  [Continue]  /  [Cancel]"""
    minus_enabled = qty > 1
    plus_enabled = qty < max_qty
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("➖", callback_data=make_cb(CB_BUY_QTY, "-1") if minus_enabled else CB_NOOP),
            InlineKeyboardButton(f"{qty}", callback_data=CB_NOOP),
            InlineKeyboardButton("➕", callback_data=make_cb(CB_BUY_QTY, "+1") if plus_enabled else CB_NOOP),
        ],
        [InlineKeyboardButton("✅ Continue to shipping", callback_data=CB_BUY_QTY_CONTINUE)],
        [InlineKeyboardButton("❌ Cancel", callback_data=CB_BUY_CANCEL)],
    ])


def email_optional_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("⏭️  Skip email", callback_data=CB_BUY_SKIP_EMAIL)],
        [InlineKeyboardButton("❌ Cancel", callback_data=CB_BUY_CANCEL)],
    ])


def review_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("✅ Confirm & Pay", callback_data=CB_BUY_CONFIRM)],
        [InlineKeyboardButton("❌ Cancel order", callback_data=CB_BUY_CANCEL)],
    ])


def pay_link_keyboard(short_url: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [InlineKeyboardButton("💳 Pay securely via Razorpay", url=short_url)],
        [InlineKeyboardButton("🏠 Home", callback_data=CB_MAIN_MENU)],
    ])


def orders_list_keyboard(orders: list[dict]) -> InlineKeyboardMarkup:
    rows = []
    for o in orders[:10]:
        oid = str(o.get("order_id", ""))
        if not oid:
            continue
        total = float(o.get("total_amount") or 0)
        status = str(o.get("status") or "pending")
        label = f"{oid[-10:]} · ₹{total:,.0f} · {status}"
        rows.append([InlineKeyboardButton(label, callback_data=make_cb(CB_ORDER_VIEW, oid))])
    rows.append([InlineKeyboardButton("🏠 Home", callback_data=CB_MAIN_MENU)])
    return InlineKeyboardMarkup(rows)
