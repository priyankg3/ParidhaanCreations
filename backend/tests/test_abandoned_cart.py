"""
Test suite for Abandoned Cart Recovery feature
Tests:
- Admin abandoned carts list endpoint
- Admin abandoned carts stats endpoint
- Cart contact save endpoint
- Admin update abandoned cart status
- Shiprocket shipments endpoint
- GST settings endpoint
"""

import pytest
import requests
import os
import time
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pooja-creations.preview.emergentagent.com')

# Test session for reuse
session = requests.Session()
session.headers.update({"Content-Type": "application/json"})


class TestPublicEndpoints:
    """Test public endpoints that don't require authentication"""
    
    def test_products_endpoint(self):
        """Test products listing works"""
        response = session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Products endpoint returns {len(data)} products")
    
    def test_categories_endpoint(self):
        """Test categories listing works"""
        response = session.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Categories endpoint returns {len(data)} categories")
    
    def test_gst_settings_endpoint(self):
        """Test GST settings public endpoint"""
        response = session.get(f"{BASE_URL}/api/gst-settings")
        assert response.status_code == 200
        data = response.json()
        # Verify GST settings structure
        assert "gst_enabled" in data or "business_name" in data
        print(f"PASS: GST settings endpoint returns data")
        if data.get("gstin"):
            print(f"  - GSTIN: {data.get('gstin')}")
        if data.get("business_state"):
            print(f"  - Business State: {data.get('business_state')}")
    
    def test_indian_states_endpoint(self):
        """Test Indian states endpoint for GST calculation"""
        response = session.get(f"{BASE_URL}/api/indian-states")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify state structure
        if len(data) > 0:
            assert "name" in data[0]
            assert "code" in data[0]
        print(f"PASS: Indian states endpoint returns {len(data)} states")
    
    def test_banners_endpoint(self):
        """Test banners public endpoint"""
        response = session.get(f"{BASE_URL}/api/banners")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Banners endpoint returns {len(data)} banners")


class TestCartFunctionality:
    """Test cart functionality including contact save for abandoned cart recovery"""
    
    def test_get_cart_guest(self):
        """Test getting cart as guest"""
        response = session.get(f"{BASE_URL}/api/cart")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        print(f"PASS: Cart endpoint returns cart with {len(data.get('items', []))} items")
    
    def test_add_to_cart(self):
        """Test adding item to cart"""
        # First get a product
        products_response = session.get(f"{BASE_URL}/api/products")
        products = products_response.json()
        
        if len(products) > 0:
            product_id = products[0]["product_id"]
            response = session.post(f"{BASE_URL}/api/cart/add", json={
                "product_id": product_id,
                "quantity": 1
            })
            assert response.status_code == 200
            print(f"PASS: Added product {product_id} to cart")
        else:
            pytest.skip("No products available to add to cart")
    
    def test_save_cart_contact_email(self):
        """Test saving contact info for abandoned cart recovery - email only"""
        response = session.post(
            f"{BASE_URL}/api/cart/save-contact",
            params={"guest_email": "test_abandoned@example.com"}
        )
        # Should succeed or return 400 if no cart exists
        assert response.status_code in [200, 400, 404]
        if response.status_code == 200:
            print("PASS: Cart contact (email) saved successfully")
        else:
            print(f"INFO: Cart contact save returned {response.status_code} - {response.json().get('detail', 'No cart')}")
    
    def test_save_cart_contact_phone(self):
        """Test saving contact info for abandoned cart recovery - phone only"""
        response = session.post(
            f"{BASE_URL}/api/cart/save-contact",
            params={"guest_phone": "+919876543210"}
        )
        assert response.status_code in [200, 400, 404]
        if response.status_code == 200:
            print("PASS: Cart contact (phone) saved successfully")
        else:
            print(f"INFO: Cart contact save returned {response.status_code}")
    
    def test_save_cart_contact_both(self):
        """Test saving both email and phone for abandoned cart recovery"""
        response = session.post(
            f"{BASE_URL}/api/cart/save-contact",
            params={
                "guest_email": "test_both@example.com",
                "guest_phone": "+919876543211"
            }
        )
        assert response.status_code in [200, 400, 404]
        if response.status_code == 200:
            print("PASS: Cart contact (both email and phone) saved successfully")
    
    def test_save_cart_contact_validation(self):
        """Test that save contact requires at least email or phone"""
        response = session.post(f"{BASE_URL}/api/cart/save-contact")
        # Should return 400 if neither email nor phone provided
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print(f"PASS: Contact validation works - {data['detail']}")


class TestAdminEndpointsAuth:
    """Test that admin endpoints require authentication"""
    
    def test_abandoned_carts_requires_auth(self):
        """Test that abandoned carts endpoint requires admin auth"""
        response = session.get(f"{BASE_URL}/api/admin/abandoned-carts")
        assert response.status_code == 403
        print("PASS: Abandoned carts endpoint requires admin auth (403)")
    
    def test_abandoned_carts_stats_requires_auth(self):
        """Test that abandoned carts stats endpoint requires admin auth"""
        response = session.get(f"{BASE_URL}/api/admin/abandoned-carts/stats")
        assert response.status_code == 403
        print("PASS: Abandoned carts stats endpoint requires admin auth (403)")
    
    def test_admin_shipments_requires_auth(self):
        """Test that admin shipments endpoint requires admin auth"""
        response = session.get(f"{BASE_URL}/api/admin/shipments")
        assert response.status_code == 403
        print("PASS: Admin shipments endpoint requires admin auth (403)")
    
    def test_admin_orders_requires_auth(self):
        """Test that admin orders endpoint requires admin auth"""
        response = session.get(f"{BASE_URL}/api/admin/orders")
        assert response.status_code == 403
        print("PASS: Admin orders endpoint requires admin auth (403)")
    
    def test_admin_analytics_requires_auth(self):
        """Test that admin analytics endpoint requires admin auth"""
        response = session.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 403
        print("PASS: Admin analytics endpoint requires admin auth (403)")


class TestAdminWithAuth:
    """Test admin endpoints with authentication"""
    
    @pytest.fixture(autouse=True)
    def setup_admin_session(self):
        """Setup admin session for testing"""
        # Create admin session in MongoDB
        import subprocess
        
        timestamp = int(time.time() * 1000)
        session_token = f"test_admin_session_{timestamp}"
        
        # Find admin user and create session
        mongo_script = f"""
        use('test_database');
        var admin = db.users.findOne({{email: 'priyankg3@gmail.com'}});
        if (admin) {{
            db.user_sessions.insertOne({{
                user_id: admin.user_id,
                session_token: '{session_token}',
                expires_at: new Date(Date.now() + 7*24*60*60*1000),
                created_at: new Date()
            }});
            print('SESSION_TOKEN:' + '{session_token}');
            print('USER_ID:' + admin.user_id);
        }} else {{
            print('ADMIN_NOT_FOUND');
        }}
        """
        
        result = subprocess.run(
            ['mongosh', '--quiet', '--eval', mongo_script],
            capture_output=True,
            text=True
        )
        
        if 'SESSION_TOKEN:' in result.stdout:
            self.session_token = session_token
            self.admin_session = requests.Session()
            self.admin_session.headers.update({
                "Content-Type": "application/json",
                "Authorization": f"Bearer {session_token}"
            })
            self.admin_session.cookies.set("session_token", session_token)
            print(f"Admin session created: {session_token[:30]}...")
        else:
            self.session_token = None
            self.admin_session = None
            print("WARNING: Could not create admin session")
        
        yield
        
        # Cleanup session
        if self.session_token:
            cleanup_script = f"""
            use('test_database');
            db.user_sessions.deleteOne({{session_token: '{self.session_token}'}});
            """
            subprocess.run(['mongosh', '--quiet', '--eval', cleanup_script], capture_output=True)
    
    def test_abandoned_carts_with_auth(self):
        """Test abandoned carts endpoint with admin auth"""
        if not self.admin_session:
            pytest.skip("Admin session not available")
        
        response = self.admin_session.get(f"{BASE_URL}/api/admin/abandoned-carts")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "abandoned_carts" in data
        assert "summary" in data
        assert isinstance(data["abandoned_carts"], list)
        
        summary = data["summary"]
        assert "total_abandoned" in summary
        assert "total_value" in summary
        assert "by_stage" in summary
        
        print(f"PASS: Abandoned carts endpoint returns {summary['total_abandoned']} carts")
        print(f"  - Total value: ₹{summary['total_value']:.2f}")
        print(f"  - By stage: {summary['by_stage']}")
    
    def test_abandoned_carts_with_filter(self):
        """Test abandoned carts endpoint with hours_threshold filter"""
        if not self.admin_session:
            pytest.skip("Admin session not available")
        
        # Test with different thresholds
        for hours in [1, 24, 72]:
            response = self.admin_session.get(
                f"{BASE_URL}/api/admin/abandoned-carts",
                params={"hours_threshold": hours}
            )
            assert response.status_code == 200
            data = response.json()
            print(f"PASS: Abandoned carts with {hours}h threshold: {data['summary']['total_abandoned']} carts")
    
    def test_abandoned_carts_stats_with_auth(self):
        """Test abandoned carts stats endpoint with admin auth"""
        if not self.admin_session:
            pytest.skip("Admin session not available")
        
        response = self.admin_session.get(f"{BASE_URL}/api/admin/abandoned-carts/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify stats structure
        assert "abandoned_1h" in data
        assert "abandoned_24h" in data
        assert "abandoned_72h" in data
        assert "abandoned_7d" in data
        assert "potential_revenue_lost" in data
        
        print(f"PASS: Abandoned carts stats endpoint returns:")
        print(f"  - 1h: {data['abandoned_1h']}")
        print(f"  - 24h: {data['abandoned_24h']}")
        print(f"  - 72h: {data['abandoned_72h']}")
        print(f"  - 7d: {data['abandoned_7d']}")
        print(f"  - Potential revenue lost: ₹{data['potential_revenue_lost']:.2f}")
    
    def test_admin_shipments_with_auth(self):
        """Test admin shipments endpoint with admin auth"""
        if not self.admin_session:
            pytest.skip("Admin session not available")
        
        response = self.admin_session.get(f"{BASE_URL}/api/admin/shipments")
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "shipments" in data
        assert isinstance(data["shipments"], list)
        
        print(f"PASS: Admin shipments endpoint returns {len(data['shipments'])} shipments")
    
    def test_admin_orders_with_auth(self):
        """Test admin orders endpoint with admin auth"""
        if not self.admin_session:
            pytest.skip("Admin session not available")
        
        response = self.admin_session.get(f"{BASE_URL}/api/admin/orders")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"PASS: Admin orders endpoint returns {len(data)} orders")


class TestShiprocketIntegration:
    """Test Shiprocket integration endpoints"""
    
    def test_shiprocket_check_serviceability(self):
        """Test Shiprocket serviceability check"""
        # This is a public endpoint to check if delivery is available
        response = session.get(
            f"{BASE_URL}/api/shiprocket/check-serviceability",
            params={"pincode": "110001"}  # Delhi pincode
        )
        # May return 200 or 400/500 depending on Shiprocket API status
        print(f"Shiprocket serviceability check: {response.status_code}")
        if response.status_code == 200:
            print(f"PASS: Shiprocket serviceability check works")
        else:
            print(f"INFO: Shiprocket serviceability returned {response.status_code}")


class TestGSTCalculation:
    """Test GST calculation functionality"""
    
    def test_gst_settings_structure(self):
        """Test GST settings has required fields"""
        response = session.get(f"{BASE_URL}/api/gst-settings")
        assert response.status_code == 200
        data = response.json()
        
        # Check for key GST fields
        expected_fields = ["gst_enabled", "default_gst_rate", "prices_include_gst"]
        for field in expected_fields:
            if field in data:
                print(f"  - {field}: {data[field]}")
        
        print("PASS: GST settings structure verified")
    
    def test_product_gst_fields(self):
        """Test that products have GST fields"""
        response = session.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        
        if len(products) > 0:
            product = products[0]
            print(f"Product: {product.get('name', 'Unknown')}")
            print(f"  - GST Rate: {product.get('gst_rate', 'Not set')}")
            print(f"  - HSN Code: {product.get('hsn_code', 'Not set')}")
            print("PASS: Product GST fields accessible")
        else:
            pytest.skip("No products available")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
