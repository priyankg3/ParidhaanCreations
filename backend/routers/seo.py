"""
SEO Router - Dynamic Sitemap, robots.txt, and SEO metadata
"""
from fastapi import APIRouter, Response
from datetime import datetime, timezone

router = APIRouter(tags=["SEO"])
_db = None

def init_router(db):
    global _db
    _db = db

BASE_URL = "https://paridhaancreations.xyz"

@router.get("/sitemap.xml", response_class=Response)
async def sitemap_xml():
    """Generate dynamic XML sitemap with all indexable pages"""
    urls = []
    
    # Static pages
    static_pages = [
        {"loc": "/", "priority": "1.0", "changefreq": "daily"},
        {"loc": "/products", "priority": "0.9", "changefreq": "daily"},
        {"loc": "/astro", "priority": "0.8", "changefreq": "daily"},
        {"loc": "/terms", "priority": "0.3", "changefreq": "monthly"},
        {"loc": "/support", "priority": "0.4", "changefreq": "monthly"},
        {"loc": "/refund-policy", "priority": "0.3", "changefreq": "monthly"},
        {"loc": "/shipping-policy", "priority": "0.3", "changefreq": "monthly"},
    ]
    
    for page in static_pages:
        urls.append(f"""  <url>
    <loc>{BASE_URL}{page['loc']}</loc>
    <lastmod>{datetime.now(timezone.utc).strftime('%Y-%m-%d')}</lastmod>
    <changefreq>{page['changefreq']}</changefreq>
    <priority>{page['priority']}</priority>
  </url>""")
    
    # Category pages
    if _db is not None:
        categories = await _db.categories.find(
            {"parent_id": None}, 
            {"_id": 0, "slug": 1, "name": 1}
        ).to_list(100)
        
        for cat in categories:
            if cat.get("slug"):
                urls.append(f"""  <url>
    <loc>{BASE_URL}/products?category={cat['slug']}</loc>
    <lastmod>{datetime.now(timezone.utc).strftime('%Y-%m-%d')}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>""")
        
        # Subcategory pages
        subcategories = await _db.categories.find(
            {"parent_id": {"$ne": None}},
            {"_id": 0, "slug": 1, "parent_id": 1}
        ).to_list(200)
        
        parent_map = {}
        for cat in categories:
            parent_cats = await _db.categories.find(
                {"parent_id": None},
                {"_id": 0, "category_id": 1, "slug": 1}
            ).to_list(100)
            for pc in parent_cats:
                parent_map[pc["category_id"]] = pc["slug"]
        
        for sub in subcategories:
            parent_slug = parent_map.get(sub.get("parent_id"), "")
            if sub.get("slug") and parent_slug:
                urls.append(f"""  <url>
    <loc>{BASE_URL}/products?category={parent_slug}&amp;subcategory={sub['slug']}</loc>
    <lastmod>{datetime.now(timezone.utc).strftime('%Y-%m-%d')}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>""")
        
        # Product pages
        products = await _db.products.find(
            {"is_active": {"$ne": False}},
            {"_id": 0, "product_id": 1, "updated_at": 1, "name": 1}
        ).to_list(5000)
        
        for product in products:
            updated = product.get("updated_at", datetime.now(timezone.utc))
            if isinstance(updated, str):
                lastmod = updated[:10]
            elif isinstance(updated, datetime):
                lastmod = updated.strftime('%Y-%m-%d')
            else:
                lastmod = datetime.now(timezone.utc).strftime('%Y-%m-%d')
            
            urls.append(f"""  <url>
    <loc>{BASE_URL}/products/{product['product_id']}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>""")
        
        # Collection pages
        colls = await _db.collections.find(
            {"is_active": {"$ne": False}},
            {"_id": 0, "slug": 1}
        ).to_list(100)
        
        for coll in colls:
            if coll.get("slug"):
                urls.append(f"""  <url>
    <loc>{BASE_URL}/collection/{coll['slug']}</loc>
    <lastmod>{datetime.now(timezone.utc).strftime('%Y-%m-%d')}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>""")
    
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
{chr(10).join(urls)}
</urlset>"""
    
    return Response(content=xml, media_type="application/xml")


@router.get("/seo/products-meta")
async def get_products_meta():
    """Get product count and categories for SEO"""
    if _db is None:
        return {"total_products": 0, "categories": []}
    
    total = await _db.products.count_documents({"is_active": {"$ne": False}})
    categories = await _db.categories.find(
        {"parent_id": None},
        {"_id": 0, "name": 1, "slug": 1}
    ).to_list(50)
    
    return {
        "total_products": total,
        "categories": categories
    }
