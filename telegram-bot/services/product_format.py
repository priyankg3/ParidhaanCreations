"""
Product formatting helpers.

The backend stores color/size variants as a nested structure:

  product.variants = [
    {
      "color_name": "Peach",
      "color_code": "#...",
      "sizes": [
        {"size": "6", "price": 285, "stock": 2},
        {"size": "4", "price": 225, "stock": 0}
      ]
    },
    ...
  ]

Older/simpler products may instead carry flat `colors[]` / `sizes[]`
arrays with a `laddu_gopal_size` scalar. These helpers handle both
shapes and return display-ready strings. If a product has no variant
data at all, the helpers return empty strings so the caller can
simply skip the corresponding line.
"""
from __future__ import annotations

from typing import Optional


def extract_variant_info(product: dict) -> tuple[list[str], list[str], dict[str, list[float]], dict[str, list[int]]]:
    """
    Parse `product.variants` into display-friendly collections.

    Returns (color_names, size_labels, size_prices, size_stocks):
      - color_names: unique color_name values, insertion order
      - size_labels: unique size strings across all variants, insertion order
      - size_prices: {size_label: [prices_seen_across_variants]}
      - size_stocks: {size_label: [stocks_seen_across_variants]}
    """
    variants = product.get("variants") or []
    color_names: list[str] = []
    size_labels: list[str] = []
    size_prices: dict[str, list[float]] = {}
    size_stocks: dict[str, list[int]] = {}

    for v in variants:
        if not isinstance(v, dict):
            continue
        cn = v.get("color_name")
        if cn and cn not in color_names:
            color_names.append(cn)
        for s in (v.get("sizes") or []):
            if not isinstance(s, dict):
                continue
            lbl = str(s.get("size") or "").strip()
            if not lbl:
                continue
            if lbl not in size_labels:
                size_labels.append(lbl)
            price = s.get("price")
            if price is not None:
                try:
                    size_prices.setdefault(lbl, []).append(float(price))
                except (TypeError, ValueError):
                    pass
            stock = s.get("stock")
            if stock is not None:
                try:
                    size_stocks.setdefault(lbl, []).append(int(stock))
                except (TypeError, ValueError):
                    pass

    return color_names, size_labels, size_prices, size_stocks


def format_color_line(product: dict, max_inline: int = 8) -> str:
    """Build the color display string. Prefer variants[], fall back to colors[]."""
    color_names, _, _, _ = extract_variant_info(product)

    if not color_names:
        legacy = product.get("colors") or []
        color_names = [c for c in legacy if c]

    if not color_names:
        return ""
    if len(color_names) <= max_inline:
        return ", ".join(color_names)
    shown = ", ".join(color_names[:max_inline])
    return f"{shown}, +{len(color_names) - max_inline} more"


def format_size_line(product: dict, show_prices: Optional[bool] = None) -> str:
    """
    Build the size display string. Prefer variants[], fall back to
    `laddu_gopal_size` / `sizes[]`.

    When show_prices is None, prices are included only if they actually
    vary across sizes (otherwise the ", " list stays clean).
    """
    _, size_labels, size_prices, _ = extract_variant_info(product)

    if not size_labels:
        # Legacy fallbacks
        lg = product.get("laddu_gopal_size")
        if lg:
            return str(lg)
        legacy = product.get("sizes") or []
        if legacy:
            return ", ".join(str(s) for s in legacy if s)
        return ""

    # Decide whether to annotate each size with its price.
    if show_prices is None:
        min_prices = {
            s: min(size_prices[s]) for s in size_labels if size_prices.get(s)
        }
        show_prices = len(set(min_prices.values())) > 1

    parts = []
    for s in size_labels:
        prices = size_prices.get(s)
        if show_prices and prices:
            parts.append(f"{s} (₹{int(min(prices)):,})")
        else:
            parts.append(s)
    return ", ".join(parts)


def compute_price_range(product: dict) -> tuple[float, float]:
    """
    Return (min_price, max_price) across all variant sizes.
    Falls back to (product.price, product.price) when no variants.
    """
    _, _, size_prices, _ = extract_variant_info(product)
    all_prices: list[float] = []
    for prices in size_prices.values():
        all_prices.extend(prices)

    if not all_prices:
        try:
            base = float(product.get("price") or 0)
        except (TypeError, ValueError):
            base = 0.0
        return (base, base)
    return (min(all_prices), max(all_prices))


def has_any_variant_stock(product: dict) -> Optional[bool]:
    """
    Is any variant-size in stock?
    Returns True / False when variants exist with stock info; None when
    the product has no variant stock info (caller should fall back to
    top-level product.stock).
    """
    _, _, _, size_stocks = extract_variant_info(product)
    if not size_stocks:
        return None
    for stocks in size_stocks.values():
        if any(s > 0 for s in stocks):
            return True
    return False
