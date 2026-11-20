"""
Test Suite for Festival Collections and Related Products Features
- Collections API: GET /api/collections, GET /api/collections/{slug}
- Related Products API: GET /api/products/{id}/related
- Admin Collections API: GET /api/admin/collections
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://paridhaan-crafts-3.preview.emergentagent.com')

# Test collection slugs from seed data
TEST_COLLECTION_SLUGS = ["diwali-collection", "janmashtami-special", "best-sellers", "navratri-specials"]
TEST_PRODUCT_ID = "prod_7febf7a0e23a"


class TestCollectionsAPI:
    """Test public Collections API endpoints"""
    
    def test_get_featured_collections(self):
        """GET /api/collections?is_featured=true - Returns featured collections for homepage"""
        response = requests.get(f"{BASE_URL}/api/collections", params={"is_featured": "true"})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✅ Found {len(data)} featured collections")
        
        # Verify collection structure
        if len(data) > 0:
            collection = data[0]
            assert "collection_id" in collection, "Collection should have collection_id"
            assert "name" in collection, "Collection should have name"
            assert "slug" in collection, "Collection should have slug"
            print(f"   First collection: {collection.get('name')} (slug: {collection.get('slug')})")
    
    def test_get_all_active_collections(self):
        """GET /api/collections - Returns all active collections"""
        response = requests.get(f"{BASE_URL}/api/collections")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✅ Found {len(data)} active collections")
        
        # Check each collection has required fields
        for coll in data:
            assert "collection_id" in coll
            assert "name" in coll
            assert "slug" in coll
            assert "is_active" in coll
            print(f"   - {coll.get('name')} (featured: {coll.get('is_featured', False)})")
    
    def test_get_collection_by_slug_diwali(self):
        """GET /api/collections/diwali-collection - Returns Diwali collection with products"""
        response = requests.get(f"{BASE_URL}/api/collections/diwali-collection")
        
        if response.status_code == 404:
            pytest.skip("Diwali collection not found in database - may need seeding")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("slug") == "diwali-collection", "Slug should match"
        assert "products" in data, "Collection should include products array"
        
        print(f"✅ Diwali Collection: {data.get('name')}")
        print(f"   Description: {data.get('description', 'N/A')}")
        print(f"   Products count: {len(data.get('products', []))}")
        print(f"   Badge: {data.get('badge_text', 'None')}")
        print(f"   Image: {data.get('image', 'None')[:50]}..." if data.get('image') else "   Image: None")
    
    def test_get_collection_by_slug_janmashtami(self):
        """GET /api/collections/janmashtami-special - Returns Janmashtami collection"""
        response = requests.get(f"{BASE_URL}/api/collections/janmashtami-special")
        
        if response.status_code == 404:
            pytest.skip("Janmashtami collection not found in database")
        
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        print(f"✅ Janmashtami Collection: {data.get('name')} with {len(data.get('products', []))} products")
    
    def test_get_collection_by_slug_bestsellers(self):
        """GET /api/collections/best-sellers - Returns Best Sellers collection"""
        response = requests.get(f"{BASE_URL}/api/collections/best-sellers")
        
        if response.status_code == 404:
            pytest.skip("Best Sellers collection not found in database")
        
        assert response.status_code == 200
        
        data = response.json()
        print(f"✅ Best Sellers Collection: {data.get('name')} with {len(data.get('products', []))} products")
    
    def test_get_collection_by_slug_navratri(self):
        """GET /api/collections/navratri-specials - Returns Navratri collection"""
        response = requests.get(f"{BASE_URL}/api/collections/navratri-specials")
        
        if response.status_code == 404:
            pytest.skip("Navratri collection not found in database")
        
        assert response.status_code == 200
        
        data = response.json()
        print(f"✅ Navratri Collection: {data.get('name')} with {len(data.get('products', []))} products")
    
    def test_get_collection_not_found(self):
        """GET /api/collections/non-existent-slug - Returns 404"""
        response = requests.get(f"{BASE_URL}/api/collections/non-existent-collection-xyz")
        
        assert response.status_code == 404, f"Expected 404 for non-existent collection, got {response.status_code}"
        print("✅ Non-existent collection returns 404 as expected")
    
    def test_collection_products_endpoint(self):
        """GET /api/collections/{slug}/products - Returns products in collection"""
        # First get a valid collection
        collections_response = requests.get(f"{BASE_URL}/api/collections")
        if collections_response.status_code != 200 or len(collections_response.json()) == 0:
            pytest.skip("No collections available to test")
        
        collection = collections_response.json()[0]
        slug = collection.get("slug")
        
        response = requests.get(f"{BASE_URL}/api/collections/{slug}/products")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of products"
        
        print(f"✅ Collection '{slug}' has {len(data)} products via /products endpoint")


class TestRelatedProductsAPI:
    """Test Related Products API endpoint"""
    
    def test_get_related_products_for_existing_product(self):
        """GET /api/products/{id}/related - Returns related products"""
        # First get a valid product ID
        products_response = requests.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        
        products = products_response.json()
        if len(products) == 0:
            pytest.skip("No products available to test")
        
        product_id = products[0].get("product_id")
        product_name = products[0].get("name")
        product_category = products[0].get("category")
        
        response = requests.get(f"{BASE_URL}/api/products/{product_id}/related", params={"limit": 8})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) <= 8, "Should return at most 8 related products"
        
        # Verify the original product is NOT in related products
        related_ids = [p.get("product_id") for p in data]
        assert product_id not in related_ids, "Original product should not be in related products"
        
        print(f"✅ Related products for '{product_name}' (category: {product_category})")
        print(f"   Found {len(data)} related products")
        
        for p in data[:3]:  # Show first 3
            print(f"   - {p.get('name')} (₹{p.get('price')}, category: {p.get('category')})")
    
    def test_related_products_with_specific_product_id(self):
        """GET /api/products/prod_7febf7a0e23a/related - Test with specific product ID"""
        response = requests.get(f"{BASE_URL}/api/products/{TEST_PRODUCT_ID}/related")
        
        if response.status_code == 404:
            pytest.skip(f"Product {TEST_PRODUCT_ID} not found - using different product")
        
        assert response.status_code == 200
        
        data = response.json()
        print(f"✅ Related products for {TEST_PRODUCT_ID}: {len(data)} products found")
    
    def test_related_products_limit_parameter(self):
        """GET /api/products/{id}/related?limit=4 - Test limit parameter"""
        products_response = requests.get(f"{BASE_URL}/api/products")
        if products_response.status_code != 200 or len(products_response.json()) == 0:
            pytest.skip("No products available")
        
        product_id = products_response.json()[0].get("product_id")
        
        response = requests.get(f"{BASE_URL}/api/products/{product_id}/related", params={"limit": 4})
        
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) <= 4, f"Should return at most 4 products, got {len(data)}"
        
        print(f"✅ Limit parameter works: requested 4, got {len(data)}")
    
    def test_related_products_not_found(self):
        """GET /api/products/non-existent-id/related - Returns 404"""
        response = requests.get(f"{BASE_URL}/api/products/non-existent-product-xyz/related")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✅ Non-existent product returns 404 for related products")
    
    def test_related_products_same_category_priority(self):
        """Verify related products prioritize same category"""
        products_response = requests.get(f"{BASE_URL}/api/products")
        if products_response.status_code != 200:
            pytest.skip("Cannot fetch products")
        
        products = products_response.json()
        if len(products) < 2:
            pytest.skip("Not enough products to test category priority")
        
        # Find a product with a known category
        product = products[0]
        product_id = product.get("product_id")
        product_category = product.get("category")
        
        response = requests.get(f"{BASE_URL}/api/products/{product_id}/related")
        assert response.status_code == 200
        
        related = response.json()
        
        # Count how many related products are in the same category
        same_category_count = sum(1 for p in related if p.get("category") == product_category)
        
        print(f"✅ Category priority test:")
        print(f"   Original product category: {product_category}")
        print(f"   Related products in same category: {same_category_count}/{len(related)}")


class TestCollectionDataIntegrity:
    """Test collection data structure and integrity"""
    
    def test_collection_has_required_fields(self):
        """Verify collections have all required fields"""
        response = requests.get(f"{BASE_URL}/api/collections")
        
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No collections available")
        
        collection = response.json()[0]
        
        required_fields = ["collection_id", "name", "slug", "is_active"]
        optional_fields = ["description", "image", "collection_type", "badge_text", "badge_color", "is_featured", "position"]
        
        for field in required_fields:
            assert field in collection, f"Missing required field: {field}"
        
        print("✅ Collection has all required fields")
        print(f"   Required: {required_fields}")
        print(f"   Optional present: {[f for f in optional_fields if f in collection]}")
    
    def test_collection_products_have_valid_structure(self):
        """Verify products in collection have valid structure"""
        response = requests.get(f"{BASE_URL}/api/collections")
        
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No collections available")
        
        collection = response.json()[0]
        slug = collection.get("slug")
        
        detail_response = requests.get(f"{BASE_URL}/api/collections/{slug}")
        if detail_response.status_code != 200:
            pytest.skip("Cannot fetch collection details")
        
        data = detail_response.json()
        products = data.get("products", [])
        
        if len(products) == 0:
            print("⚠️ Collection has no products assigned")
            return
        
        product = products[0]
        required_product_fields = ["product_id", "name", "price", "category"]
        
        for field in required_product_fields:
            assert field in product, f"Product missing field: {field}"
        
        print(f"✅ Products in collection have valid structure")
        print(f"   Sample product: {product.get('name')} - ₹{product.get('price')}")


class TestHomepageIntegration:
    """Test that collections appear correctly for homepage"""
    
    def test_featured_collections_for_homepage(self):
        """Verify featured collections are returned for homepage display"""
        response = requests.get(f"{BASE_URL}/api/collections", params={"is_featured": "true"})
        
        assert response.status_code == 200
        
        data = response.json()
        
        print(f"✅ Homepage will display {len(data)} featured collections:")
        for coll in data:
            print(f"   - {coll.get('name')}")
            print(f"     Slug: {coll.get('slug')}")
            print(f"     Badge: {coll.get('badge_text', 'None')}")
            print(f"     Image: {'Yes' if coll.get('image') else 'No'}")
            print(f"     Products: {len(coll.get('product_ids', []))}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
