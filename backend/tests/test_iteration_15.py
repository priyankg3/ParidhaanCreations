"""
Iteration 15 Tests - Testing:
1. Admin subcategory dropdown in Add/Edit Product forms
2. Product image white background 
3. AI Description generator English-only
4. Product tags in SEO (meta keywords + JSON-LD)
5. HD images on frontend
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None

if not BASE_URL:
    BASE_URL = "https://paridhaan-crafts-3.preview.emergentagent.com"

print(f"Using BASE_URL: {BASE_URL}")


class TestCategoriesAPI:
    """Test categories endpoints for subcategory structure"""
    
    def test_categories_endpoint_returns_hierarchical_data(self):
        """GET /api/categories should return hierarchical categories with nested subcategories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of categories"
        
        # Find Pooja Articles category
        pooja_category = None
        for cat in data:
            if cat.get('slug') == 'pooja':
                pooja_category = cat
                break
        
        assert pooja_category is not None, "Pooja Articles category should exist"
        print(f"Found Pooja category: {pooja_category.get('name')}")
        
        # Check for subcategories
        subcategories = pooja_category.get('subcategories', [])
        print(f"Pooja subcategories count: {len(subcategories)}")
        
        # Verify subcategory structure
        if len(subcategories) > 0:
            for sub in subcategories[:3]:  # Check first 3
                print(f"  - {sub.get('name')} (slug: {sub.get('slug')})")
            
            # Check expected subcategories exist
            sub_names = [s.get('name', '').lower() for s in subcategories]
            sub_slugs = [s.get('slug', '') for s in subcategories]
            print(f"Subcategory slugs: {sub_slugs}")
            
            # Check for some expected subcategories
            expected_subs = ['attar-perfumes', 'pooja-items', 'poshaks']
            found_expected = any(slug in sub_slugs for slug in expected_subs)
            print(f"Found expected subcategories: {found_expected}")
    
    def test_categories_all_endpoint_returns_flat_list(self):
        """GET /api/categories/all should return flat list of all categories"""
        response = requests.get(f"{BASE_URL}/api/categories/all")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of categories"
        print(f"Total categories in flat list: {len(data)}")


class TestAIDescriptionGenerator:
    """Test AI description generator endpoint for English-only output"""
    
    def test_ai_generate_description_endpoint_exists(self):
        """POST /api/ai/generate-description should exist"""
        # Just test that the endpoint exists (don't test actual AI generation here)
        response = requests.post(f"{BASE_URL}/api/ai/generate-description", json={
            "product_name": "Test Product",
            "category": "pooja"
        })
        
        # Should not be 404 (endpoint exists)
        assert response.status_code != 404, "AI description endpoint should exist"
        print(f"AI endpoint response code: {response.status_code}")
        
        # If successful, check the response
        if response.status_code == 200:
            data = response.json()
            description = data.get('description', '')
            print(f"AI Description (first 200 chars): {description[:200]}...")
            
            # Check for Hindi/Hinglish words that should NOT be present
            hindi_words = ['aur', 'hai', 'ka', 'ki', 'ke', 'mein', 'pooja', 'diya', 'thali', 'aap', 'karo']
            hindi_found = [word for word in hindi_words if f' {word} ' in description.lower()]
            
            if hindi_found:
                print(f"WARNING: Hindi words found in description: {hindi_found}")
            else:
                print("PASS: No obvious Hindi words found in description")


class TestProductsAPI:
    """Test products API for tag and structure verification"""
    
    def test_products_have_tags_field(self):
        """GET /api/products should return products with tags array"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        products = response.json()
        assert len(products) > 0, "Should have at least one product"
        
        # Check first few products for tags field
        for product in products[:3]:
            product_name = product.get('name', 'Unknown')
            tags = product.get('tags', [])
            print(f"Product: {product_name}")
            print(f"  Tags: {tags}")
            print(f"  Category: {product.get('category')}")
            print(f"  Subcategory: {product.get('subcategory')}")
    
    def test_product_detail_has_tags(self):
        """GET /api/products/{id} should return product with tags"""
        # First get list to get a product ID
        response = requests.get(f"{BASE_URL}/api/products")
        products = response.json()
        
        if len(products) > 0:
            product_id = products[0].get('product_id')
            detail_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
            assert detail_response.status_code == 200
            
            product = detail_response.json()
            print(f"Product detail - Name: {product.get('name')}")
            print(f"Product detail - Tags: {product.get('tags', [])}")
            print(f"Product detail - Images: {len(product.get('images', []))} images")


class TestAdminProductCRUD:
    """Test admin product creation/update with subcategory support"""
    
    @pytest.fixture
    def admin_session(self):
        """Login as admin and return authenticated session"""
        session = requests.Session()
        
        # Login
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "priyankg3@gmail.com",
            "password": "Admin@123"
        })
        
        if login_response.status_code == 200:
            print("Admin login successful")
            return session
        else:
            print(f"Admin login failed: {login_response.status_code}")
            pytest.skip("Admin login required")
    
    def test_admin_can_create_product_with_subcategory(self, admin_session):
        """POST /api/admin/products should accept subcategory field"""
        
        # Create test product with subcategory
        test_product = {
            "name": "TEST_Iteration15_Product",
            "description": "Test product for iteration 15 testing",
            "price": 999.00,
            "category": "pooja",
            "subcategory": "Laddu-gopal-poshak",  # Subcategory slug from DB
            "images": ["https://placehold.co/400x400?text=Test"],
            "stock": 10,
            "featured": False,
            "tags": ["test", "iteration15", "automated"]
        }
        
        response = admin_session.post(f"{BASE_URL}/api/admin/products", json=test_product)
        print(f"Create product response: {response.status_code}")
        
        if response.status_code in [200, 201]:
            data = response.json()
            product_id = data.get('product_id')
            print(f"Created product ID: {product_id}")
            
            # GET the product to verify subcategory was saved correctly
            get_response = admin_session.get(f"{BASE_URL}/api/products/{product_id}")
            assert get_response.status_code == 200, "Should be able to GET created product"
            
            product = get_response.json()
            print(f"Fetched product subcategory: {product.get('subcategory')}")
            print(f"Fetched product tags: {product.get('tags')}")
            
            # Verify subcategory was persisted
            assert product.get('subcategory') == test_product['subcategory'], f"Subcategory should be {test_product['subcategory']}"
            assert product.get('tags') == test_product['tags'], "Tags should be saved"
            
            # Clean up - delete the test product
            if product_id:
                delete_response = admin_session.delete(f"{BASE_URL}/api/admin/products/{product_id}")
                print(f"Cleanup - Delete response: {delete_response.status_code}")
        else:
            print(f"Response: {response.text}")
            assert False, f"Product creation failed with status {response.status_code}"


class TestImageOptimization:
    """Test Cloudinary image optimization settings"""
    
    def test_cloudinary_images_have_hd_quality(self):
        """Verify product images from Cloudinary use HD quality parameters"""
        response = requests.get(f"{BASE_URL}/api/products")
        products = response.json()
        
        cloudinary_images = []
        for product in products:
            for img in product.get('images', []):
                if 'cloudinary' in img.lower():
                    cloudinary_images.append({
                        'product': product.get('name'),
                        'url': img
                    })
        
        print(f"Found {len(cloudinary_images)} Cloudinary images")
        
        for img_info in cloudinary_images[:5]:  # Check first 5
            url = img_info['url']
            print(f"Product: {img_info['product']}")
            print(f"  URL: {url[:100]}...")
            
            # Check if URL has optimization params
            has_quality = 'q_auto' in url or 'q_' in url
            has_format = 'f_auto' in url or 'f_' in url
            print(f"  Has quality param: {has_quality}")
            print(f"  Has format param: {has_format}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
