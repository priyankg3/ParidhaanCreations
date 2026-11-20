"""
Test suite for Color Variants Feature
Tests: Product Variants API, Cart with selected_color, Admin Product Update
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestColorVariantsBackend:
    """Test color variants feature backend APIs"""
    
    # Test product with variants
    TEST_PRODUCT_ID = "prod_e03624b01f05"
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_get_product_returns_variants(self):
        """GET /api/products/{id} should return variants data"""
        response = self.session.get(f"{BASE_URL}/api/products/{self.TEST_PRODUCT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "variants" in data, "Response should contain 'variants' field"
        assert isinstance(data["variants"], list), "Variants should be a list"
        assert len(data["variants"]) >= 4, f"Expected at least 4 variants, got {len(data['variants'])}"
        
        # Verify variant structure
        for variant in data["variants"]:
            assert "color_name" in variant, "Variant should have 'color_name'"
            assert "color_code" in variant, "Variant should have 'color_code'"
            assert "stock" in variant, "Variant should have 'stock'"
            assert "price" in variant, "Variant should have 'price'"
            
        # Verify specific variants exist
        variant_names = [v["color_name"] for v in data["variants"]]
        assert "Red & Gold" in variant_names, "Should have 'Red & Gold' variant"
        assert "Blue Peacock" in variant_names, "Should have 'Blue Peacock' variant"
        print(f"✅ Product has {len(data['variants'])} color variants: {variant_names}")
    
    def test_variant_prices_are_correct(self):
        """Verify variant prices match expected values"""
        response = self.session.get(f"{BASE_URL}/api/products/{self.TEST_PRODUCT_ID}")
        assert response.status_code == 200
        
        data = response.json()
        variants_dict = {v["color_name"]: v for v in data["variants"]}
        
        # Check Red & Gold: price 170, stock 10
        assert "Red & Gold" in variants_dict
        assert variants_dict["Red & Gold"]["price"] == 170, "Red & Gold price should be 170"
        assert variants_dict["Red & Gold"]["stock"] == 10, "Red & Gold stock should be 10"
        
        # Check Blue Peacock: price 185, stock 12
        assert "Blue Peacock" in variants_dict
        assert variants_dict["Blue Peacock"]["price"] == 185, "Blue Peacock price should be 185"
        assert variants_dict["Blue Peacock"]["stock"] == 12, "Blue Peacock stock should be 12"
        
        print("✅ Variant prices and stock are correct")
    
    def test_products_list_includes_variants(self):
        """GET /api/products should include variants for products that have them"""
        response = self.session.get(f"{BASE_URL}/api/products")
        
        assert response.status_code == 200
        
        products = response.json()
        assert isinstance(products, list), "Should return list of products"
        
        # Find our test product
        test_product = next((p for p in products if p.get("product_id") == self.TEST_PRODUCT_ID), None)
        assert test_product is not None, f"Test product {self.TEST_PRODUCT_ID} should be in list"
        
        # Verify variants are included
        assert "variants" in test_product, "Product in list should have variants"
        assert len(test_product["variants"]) >= 4, "Should have at least 4 variants"
        
        print(f"✅ Products list includes variants for test product")


class TestAdminProductVariants:
    """Test admin product update with variants"""
    
    TEST_PRODUCT_ID = "prod_e03624b01f05"
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "priyankg3@gmail.com", "password": "Admin@123"}
        )
        
        if login_response.status_code == 200:
            # Session cookie should be set automatically
            self.authenticated = True
        else:
            self.authenticated = False
            pytest.skip("Admin login failed - skipping admin tests")
    
    def test_admin_can_get_products(self):
        """GET /api/admin/products should return products for admin"""
        if not self.authenticated:
            pytest.skip("Not authenticated")
        
        response = self.session.get(f"{BASE_URL}/api/admin/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        products = response.json()
        assert isinstance(products, list), "Should return list"
        print(f"✅ Admin can access products list ({len(products)} products)")
    
    def test_admin_update_product_with_variants(self):
        """PUT /api/admin/products/{id} should accept variants array"""
        if not self.authenticated:
            pytest.skip("Not authenticated")
        
        # First get the current product data
        get_response = self.session.get(f"{BASE_URL}/api/products/{self.TEST_PRODUCT_ID}")
        assert get_response.status_code == 200
        
        original_data = get_response.json()
        
        # Prepare update data with same variants (just verifying the endpoint works)
        update_data = {
            "name": original_data["name"],
            "description": original_data["description"],
            "price": original_data["price"],
            "category": original_data["category"],
            "stock": original_data["stock"],
            "images": original_data.get("images", []),
            "variants": original_data.get("variants", [])
        }
        
        # Test the PUT endpoint
        response = self.session.put(
            f"{BASE_URL}/api/admin/products/{self.TEST_PRODUCT_ID}",
            json=update_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✅ Admin can update product with variants")


class TestCartWithVariants:
    """Test cart functionality with selected color"""
    
    TEST_PRODUCT_ID = "prod_e03624b01f05"
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as test user
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "priyankg3@gmail.com", "password": "Admin@123"}
        )
        
        if login_response.status_code == 200:
            self.authenticated = True
        else:
            self.authenticated = False
    
    def test_add_to_cart_with_selected_color(self):
        """POST /api/cart/add should accept selected_color parameter"""
        if not self.authenticated:
            pytest.skip("Not authenticated")
        
        # Add product with selected color
        cart_data = {
            "product_id": self.TEST_PRODUCT_ID,
            "quantity": 1,
            "selected_color": "Blue Peacock"
        }
        
        response = self.session.post(f"{BASE_URL}/api/cart/add", json=cart_data)
        
        # Should succeed (200) or handle gracefully
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        print("✅ Can add to cart with selected_color parameter")


class TestCustomerInsights:
    """Test customer insights API returns proper data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "priyankg3@gmail.com", "password": "Admin@123"}
        )
        
        if login_response.status_code == 200:
            self.authenticated = True
        else:
            self.authenticated = False
    
    def test_insights_returns_object_not_array(self):
        """GET /api/admin/customer-insights should return an object with proper fields"""
        if not self.authenticated:
            pytest.skip("Not authenticated")
        
        response = self.session.get(f"{BASE_URL}/api/admin/customer-insights")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, dict), "Response should be an object, not array"
        
        # Check required fields
        required_fields = ["total_customers", "repeat_customers", "repeat_rate", "avg_order_value", "vip_customers"]
        for field in required_fields:
            assert field in data, f"Response should contain '{field}'"
        
        # Verify data types
        assert isinstance(data["total_customers"], (int, float)), "total_customers should be numeric"
        assert isinstance(data["repeat_rate"], (int, float)), "repeat_rate should be numeric"
        assert isinstance(data["vip_customers"], list), "vip_customers should be a list"
        
        print(f"✅ Customer insights returns proper object with total_customers={data['total_customers']}")
    
    def test_insights_has_non_zero_values(self):
        """Insights should show real data, not all zeros"""
        if not self.authenticated:
            pytest.skip("Not authenticated")
        
        response = self.session.get(f"{BASE_URL}/api/admin/customer-insights")
        assert response.status_code == 200
        
        data = response.json()
        
        # At least one metric should be non-zero
        metrics = [
            data.get("total_customers", 0),
            data.get("repeat_customers", 0),
            data.get("avg_order_value", 0)
        ]
        
        non_zero_count = sum(1 for m in metrics if m > 0)
        assert non_zero_count > 0, "At least one metric should be non-zero"
        
        print(f"✅ Insights has {non_zero_count} non-zero metrics")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
