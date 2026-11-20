"""
Iteration 18 Testing - 5 Bug Fixes:
1. Delete product API - /api/admin/products/{id}
2. Product badge ribbon position (frontend only)
3. Laddu Gopal Sizes section - no emoji
4. Dimensions display in product details
5. Product page new design

Tests backend APIs and verifies data structure
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminLogin:
    """Test admin login for authenticated endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session"""
        session = requests.Session()
        
        # Login as admin
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "priyankg3@gmail.com",
                "password": "Admin@123"
            }
        )
        
        if login_response.status_code != 200:
            pytest.skip("Admin login failed")
        
        return session
    
    def test_admin_login(self, admin_session):
        """Verify admin login works"""
        response = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        
        data = response.json()
        assert data["email"] == "priyankg3@gmail.com"
        assert data["is_admin"] == True
        print(f"✓ Admin login successful: {data['email']}")


class TestProductDetails:
    """Test product detail API returns correct structure"""
    
    def test_get_product_details(self):
        """Test GET /api/products/{id} returns product with all fields"""
        response = requests.get(f"{BASE_URL}/api/products/prod_e03624b01f05")
        assert response.status_code == 200
        
        data = response.json()
        
        # Core fields
        assert "product_id" in data
        assert "name" in data
        assert "price" in data
        assert "stock" in data
        
        # Color variants
        assert "variants" in data
        assert isinstance(data["variants"], list)
        
        if data["variants"]:
            variant = data["variants"][0]
            assert "color_name" in variant
            assert "color_code" in variant
            assert "stock" in variant
            print(f"✓ Product has {len(data['variants'])} color variants")
        
        print(f"✓ Product details retrieved: {data['name']}")
    
    def test_product_has_laddu_gopal_sizes(self):
        """Test product with Laddu Gopal sizes"""
        response = requests.get(f"{BASE_URL}/api/products/prod_e03624b01f05")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check laddu_gopal_sizes field
        if data.get("laddu_gopal_sizes"):
            assert isinstance(data["laddu_gopal_sizes"], list)
            print(f"✓ Laddu Gopal sizes: {data['laddu_gopal_sizes']}")
        else:
            print("○ Product has no Laddu Gopal sizes set")
    
    def test_product_dimensions_fields(self):
        """Test product has dimension-related fields"""
        response = requests.get(f"{BASE_URL}/api/products/prod_e03624b01f05")
        assert response.status_code == 200
        
        data = response.json()
        
        # Check for dimensions - either nested or flat
        has_dimensions = False
        
        # Check nested dimensions object
        if data.get("dimensions"):
            dims = data["dimensions"]
            if dims.get("length") or dims.get("breadth") or dims.get("height"):
                has_dimensions = True
                print(f"✓ Nested dimensions found: {dims}")
        
        # Check flat dimension fields
        if data.get("length") or data.get("breadth") or data.get("height"):
            has_dimensions = True
            print(f"✓ Flat dimensions found: L={data.get('length')}, B={data.get('breadth')}, H={data.get('height')}, unit={data.get('dimension_unit')}")
        
        if not has_dimensions:
            print("○ Product has no dimensions set (optional field)")


class TestDeleteProductAPI:
    """Test admin delete product endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session"""
        session = requests.Session()
        
        # Login as admin
        login_response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "priyankg3@gmail.com",
                "password": "Admin@123"
            }
        )
        
        if login_response.status_code != 200:
            pytest.skip("Admin login failed")
        
        return session
    
    def test_delete_endpoint_exists(self, admin_session):
        """Test DELETE /api/admin/products/{id} endpoint is accessible"""
        # Try deleting a non-existent product to verify endpoint exists
        response = admin_session.delete(f"{BASE_URL}/api/admin/products/non_existent_test_id")
        
        # Should return 404 (not found), not 405 (method not allowed) or 404 (endpoint not found)
        assert response.status_code == 404
        
        data = response.json()
        assert "not found" in data.get("detail", "").lower()
        print("✓ DELETE /api/admin/products/{id} endpoint exists and returns 404 for non-existent product")
    
    def test_delete_requires_admin(self):
        """Test delete requires admin authentication"""
        # Without login
        session = requests.Session()
        response = session.delete(f"{BASE_URL}/api/admin/products/test_id")
        
        # Should return 401 or 403 Unauthorized/Forbidden
        assert response.status_code in [401, 403]
        print("✓ DELETE requires admin authentication")
    
    def test_create_and_delete_product(self, admin_session):
        """Test full create → delete flow"""
        import uuid
        
        # Create a test product
        test_product = {
            "name": f"TEST_DeleteTest_{uuid.uuid4().hex[:8]}",
            "description": "Test product for delete verification",
            "price": 100.0,
            "category": "test",
            "images": ["https://via.placeholder.com/300"],
            "stock": 5
        }
        
        create_response = admin_session.post(
            f"{BASE_URL}/api/admin/products",
            json=test_product
        )
        assert create_response.status_code in [200, 201]  # Accept both
        
        created_data = create_response.json()
        product_id = created_data.get("product_id")
        assert product_id is not None
        print(f"✓ Created test product: {product_id}")
        
        # Delete the product
        delete_response = admin_session.delete(f"{BASE_URL}/api/admin/products/{product_id}")
        assert delete_response.status_code == 200
        
        delete_data = delete_response.json()
        assert "deleted" in delete_data.get("message", "").lower()
        print(f"✓ Deleted test product: {product_id}")
        
        # Verify it's gone
        verify_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert verify_response.status_code == 404
        print("✓ Verified product no longer exists")


class TestProductMRP:
    """Test product MRP and discount display"""
    
    def test_product_has_mrp_and_price(self):
        """Test product has both price and MRP for discount calculation"""
        response = requests.get(f"{BASE_URL}/api/products/prod_e03624b01f05")
        assert response.status_code == 200
        
        data = response.json()
        
        assert "price" in data
        print(f"✓ Product price: ₹{data['price']}")
        
        if data.get("mrp"):
            print(f"✓ Product MRP: ₹{data['mrp']}")
            if data["mrp"] > data["price"]:
                discount = round(((data["mrp"] - data["price"]) / data["mrp"]) * 100)
                print(f"✓ Discount: {discount}% OFF")
        else:
            print("○ Product has no MRP set")
        
        # Check variants for price/mrp
        if data.get("variants"):
            for i, variant in enumerate(data["variants"]):
                v_price = variant.get("price", data["price"])
                v_mrp = variant.get("mrp", data.get("mrp"))
                print(f"  Variant {i+1} ({variant['color_name']}): ₹{v_price}" + 
                      (f" (MRP: ₹{v_mrp})" if v_mrp else ""))


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
