# Routers package

# Import all routers
from .auth import router as auth_router
from .products import router as products_router
from .categories import router as categories_router
from .cart import router as cart_router
from .orders import router as orders_router
from .support import router as support_router
from .payments import router as payments_router
from .media import router as media_router
from .admin import router as admin_router
from .settings import router as settings_router
from .banners import router as banners_router
from .coupons import router as coupons_router
from .wishlist import router as wishlist_router
from .reviews import router as reviews_router
from .collections import router as collections_router
from .shipping import router as shipping_router
from .uploads import router as uploads_router
from .invoices import router as invoices_router
from .backup import router as backup_router

__all__ = [
    "auth_router",
    "products_router", 
    "categories_router",
    "cart_router",
    "orders_router",
    "support_router",
    "payments_router",
    "media_router",
    "admin_router",
    "settings_router",
    "banners_router",
    "coupons_router",
    "wishlist_router",
    "reviews_router",
    "collections_router",
    "shipping_router",
    "uploads_router",
    "invoices_router",
    "backup_router"
]
