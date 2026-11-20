"""
Test Payment Verification API - Razorpay Integration
Tests the fix for payment verification accepting JSON body instead of query params
"""
import pytest
import requests
import os

# BASE_URL should be the API base without trailing /api since we add it in endpoints
_raw_url = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
# Remove /api suffix if present since we add it in each endpoint
BASE_URL = _raw_url.replace('/api', '') if _raw_url.endswith('/api') else _raw_url

class TestPaymentVerificationAPI:
    """Tests for Razorpay payment verification endpoint"""
    
    def test_payment_verify_accepts_json_body(self):
        """Test that /api/payments/razorpay/verify accepts JSON body"""
        # This should return 400 with signature verification failed (expected)
        # because we're using test data, but it proves the endpoint accepts JSON
        response = requests.post(
            f"{BASE_URL}/api/payments/razorpay/verify",
            json={
                "razorpay_order_id": "test_order_123",
                "razorpay_payment_id": "test_payment_123",
                "razorpay_signature": "test_signature_123"
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 400 (signature verification failed) not 422 (validation error)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        # The error should be about signature verification, not missing fields
        assert "Signature Verification Failed" in data["detail"] or "verification failed" in data["detail"].lower()
        print(f"PASS: Payment verify endpoint accepts JSON body - {data['detail']}")
    
    def test_payment_verify_requires_all_fields(self):
        """Test that missing fields return validation error"""
        # Missing razorpay_signature
        response = requests.post(
            f"{BASE_URL}/api/payments/razorpay/verify",
            json={
                "razorpay_order_id": "test_order_123",
                "razorpay_payment_id": "test_payment_123"
            },
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for missing field, got {response.status_code}"
        print("PASS: Missing fields return 422 validation error")
    
    def test_payment_verify_empty_body_fails(self):
        """Test that empty body returns validation error"""
        response = requests.post(
            f"{BASE_URL}/api/payments/razorpay/verify",
            json={},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 422 for validation error
        assert response.status_code == 422, f"Expected 422 for empty body, got {response.status_code}"
        print("PASS: Empty body returns 422 validation error")


class TestRazorpayOrderCreation:
    """Tests for Razorpay order creation endpoint"""
    
    def test_create_razorpay_order_requires_order_id(self):
        """Test that creating Razorpay order requires valid order_id"""
        response = requests.post(
            f"{BASE_URL}/api/payments/razorpay/order",
            params={"order_id": "nonexistent_order_123"}
        )
        
        # Should return 404 for non-existent order
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: Non-existent order returns 404")


class TestOrdersAPI:
    """Tests for Orders API endpoints"""
    
    def test_get_orders_requires_auth(self):
        """Test that GET /api/orders requires authentication"""
        response = requests.get(f"{BASE_URL}/api/orders")
        
        # Should return 401 for unauthenticated request
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Orders endpoint requires authentication")
    
    def test_get_order_by_id_requires_auth(self):
        """Test that GET /api/orders/{order_id} requires authentication"""
        response = requests.get(f"{BASE_URL}/api/orders/test_order_123")
        
        # Should return 401 or 404
        assert response.status_code in [401, 404], f"Expected 401 or 404, got {response.status_code}"
        print(f"PASS: Order by ID endpoint returns {response.status_code}")


class TestProductsAPI:
    """Tests for Products API - basic health check"""
    
    def test_get_products(self):
        """Test that GET /api/products returns products list"""
        response = requests.get(f"{BASE_URL}/api/products")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of products"
        print(f"PASS: Products endpoint returns {len(data)} products")
    
    def test_get_categories(self):
        """Test that GET /api/categories returns categories list"""
        response = requests.get(f"{BASE_URL}/api/categories")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of categories"
        print(f"PASS: Categories endpoint returns {len(data)} categories")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
