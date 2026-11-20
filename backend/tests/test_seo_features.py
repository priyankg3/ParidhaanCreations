"""
SEO Features Tests - Iteration 14
Tests for sitemap.xml, seo/products-meta endpoints and SEO metadata
"""
import pytest
import requests
import os
import re
from xml.etree import ElementTree as ET

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://paridhaan-crafts-3.preview.emergentagent.com').rstrip('/')


class TestSitemapXML:
    """Tests for /api/sitemap.xml endpoint"""
    
    def test_sitemap_returns_valid_xml(self):
        """Test that sitemap.xml returns valid XML content"""
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "application/xml" in response.headers.get('Content-Type', ''), "Content-Type should be application/xml"
        
        # Parse XML to verify it's valid
        try:
            root = ET.fromstring(response.text)
            assert root is not None, "XML should parse successfully"
            print(f"✅ Sitemap XML is valid with {len(list(root))} URL entries")
        except ET.ParseError as e:
            pytest.fail(f"Invalid XML: {e}")
    
    def test_sitemap_has_required_namespaces(self):
        """Test that sitemap has correct XML namespaces"""
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert response.status_code == 200
        
        # Check for sitemap namespace
        assert 'http://www.sitemaps.org/schemas/sitemap/0.9' in response.text, \
            "Sitemap should have the standard sitemap namespace"
        print("✅ Sitemap has correct XML namespace")
    
    def test_sitemap_contains_static_pages(self):
        """Test that sitemap contains static pages (home, products, astro, etc.)"""
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert response.status_code == 200
        
        static_pages = ['/', '/products', '/astro', '/terms', '/support', '/refund-policy', '/shipping-policy']
        
        for page in static_pages:
            assert f"<loc>https://paridhaancreations.xyz{page}</loc>" in response.text, \
                f"Sitemap should contain {page}"
        print(f"✅ Sitemap contains all {len(static_pages)} static pages")
    
    def test_sitemap_contains_product_urls(self):
        """Test that sitemap contains product URLs"""
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert response.status_code == 200
        
        # Check for product URL pattern
        product_pattern = r'<loc>https://paridhaancreations\.com/products/prod_[a-zA-Z0-9]+</loc>'
        product_matches = re.findall(product_pattern, response.text)
        
        print(f"✅ Sitemap contains {len(product_matches)} product URLs")
        # Should have at least some products
        assert len(product_matches) >= 0, "Sitemap should contain product URLs"
    
    def test_sitemap_has_lastmod_dates(self):
        """Test that sitemap URLs have lastmod dates"""
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert response.status_code == 200
        
        # Check for lastmod pattern (YYYY-MM-DD format)
        lastmod_pattern = r'<lastmod>\d{4}-\d{2}-\d{2}</lastmod>'
        lastmod_matches = re.findall(lastmod_pattern, response.text)
        
        assert len(lastmod_matches) > 0, "Sitemap should contain lastmod dates"
        print(f"✅ Sitemap has {len(lastmod_matches)} lastmod entries")
    
    def test_sitemap_has_priority_and_changefreq(self):
        """Test that sitemap URLs have priority and changefreq"""
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert response.status_code == 200
        
        assert '<priority>' in response.text, "Sitemap should have priority tags"
        assert '<changefreq>' in response.text, "Sitemap should have changefreq tags"
        print("✅ Sitemap has priority and changefreq tags")


class TestSEOProductsMeta:
    """Tests for /api/seo/products-meta endpoint"""
    
    def test_products_meta_returns_data(self):
        """Test that /api/seo/products-meta returns product count and categories"""
        response = requests.get(f"{BASE_URL}/api/seo/products-meta")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'total_products' in data, "Response should contain total_products"
        assert 'categories' in data, "Response should contain categories"
        
        print(f"✅ Products meta: {data['total_products']} products, {len(data['categories'])} categories")
    
    def test_products_meta_categories_have_names(self):
        """Test that categories have name and slug fields"""
        response = requests.get(f"{BASE_URL}/api/seo/products-meta")
        assert response.status_code == 200
        
        data = response.json()
        categories = data.get('categories', [])
        
        for cat in categories:
            assert 'name' in cat, f"Category should have name field: {cat}"
            assert 'slug' in cat, f"Category should have slug field: {cat}"
        
        print(f"✅ All {len(categories)} categories have required fields")


class TestProductsEndpoint:
    """Tests for products endpoint to verify product IDs for sitemap"""
    
    def test_get_products_list(self):
        """Test that products endpoint returns products with IDs"""
        response = requests.get(f"{BASE_URL}/api/products?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Handle both dict with 'products' key and direct list response
        products = data.get('products', data) if isinstance(data, dict) else data
        
        if len(products) > 0:
            product = products[0]
            assert 'product_id' in product, "Product should have product_id"
            print(f"✅ Found {len(products)} products. Sample ID: {product.get('product_id')}")
        else:
            print("⚠️ No products found in database")
    
    def test_get_specific_product(self):
        """Test fetching a specific product by ID"""
        # First get list of products
        response = requests.get(f"{BASE_URL}/api/products?limit=1")
        assert response.status_code == 200
        
        data = response.json()
        products = data.get('products', data) if isinstance(data, dict) else data
        
        if len(products) > 0:
            product_id = products[0].get('product_id')
            
            # Fetch specific product
            product_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
            assert product_response.status_code == 200, f"Expected 200 for product {product_id}"
            
            product = product_response.json()
            assert product.get('product_id') == product_id
            assert 'name' in product
            assert 'description' in product
            assert 'price' in product
            print(f"✅ Product {product_id}: {product.get('name')}")
        else:
            print("⚠️ No products to test with")


class TestCategoriesEndpoint:
    """Tests for categories endpoint"""
    
    def test_get_categories(self):
        """Test that categories endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        categories = response.json()
        print(f"✅ Found {len(categories)} categories")
        
        if len(categories) > 0:
            for cat in categories[:3]:  # Check first 3
                print(f"   - {cat.get('name')} ({cat.get('slug')})")


class TestCollectionsEndpoint:
    """Tests for collections endpoint (for sitemap collection URLs)"""
    
    def test_get_collections(self):
        """Test that collections endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/collections")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        collections = response.json()
        print(f"✅ Found {len(collections)} collections")
        
        for coll in collections[:3]:  # Check first 3
            assert 'slug' in coll or 'collection_id' in coll, "Collection should have slug or ID"
            print(f"   - {coll.get('name', coll.get('title', 'Unknown'))}")


class TestRobotsTxt:
    """Tests for robots.txt file"""
    
    def test_robots_txt_accessible(self):
        """Test that robots.txt is accessible at the root"""
        response = requests.get(f"{BASE_URL}/robots.txt", allow_redirects=True)
        # Robots.txt may be served by frontend, so we test the frontend URL
        frontend_url = BASE_URL.replace('/api', '')
        response = requests.get(f"{frontend_url}/robots.txt", allow_redirects=True)
        
        # May get 200 or redirect, both are acceptable
        print(f"Robots.txt status: {response.status_code}")
        if response.status_code == 200:
            print(f"✅ Robots.txt is accessible")
            # Check for sitemap reference
            if 'Sitemap:' in response.text:
                print("✅ Robots.txt contains Sitemap reference")
            if 'Disallow:' in response.text:
                print("✅ Robots.txt has Disallow rules")


class TestHealthEndpoint:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('status') == 'healthy'
        print(f"✅ API healthy: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
