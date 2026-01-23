#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timezone, timedelta
import uuid

class ECommerceAPITester:
    def __init__(self, base_url="https://pooja-treasures-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_user_id = None
        self.test_product_id = None
        self.test_order_id = None

    def log_result(self, test_name, success, response_data=None, error_msg=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {error_msg}")
            self.failed_tests.append({
                "test": test_name,
                "error": error_msg,
                "response": response_data
            })

    def make_request(self, method, endpoint, data=None, headers=None, auth_token=None):
        """Make HTTP request with proper error handling"""
        url = f"{self.api_url}/{endpoint}"
        request_headers = {'Content-Type': 'application/json'}
        
        if headers:
            request_headers.update(headers)
            
        if auth_token:
            request_headers['Authorization'] = f'Bearer {auth_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=request_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=request_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=request_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=request_headers, timeout=10)
            
            return response
        except requests.exceptions.Timeout:
            print(f"⚠️  Timeout for {method} {endpoint}")
            return None
        except requests.exceptions.RequestException as e:
            print(f"⚠️  Request error for {method} {endpoint}: {str(e)}")
            return None
        except Exception as e:
            print(f"⚠️  Unexpected error for {method} {endpoint}: {str(e)}")
            return None

    def test_basic_endpoints(self):
        """Test basic public endpoints"""
        print("\n🔍 Testing Basic Public Endpoints...")
        
        # Test products endpoint
        response = self.make_request('GET', 'products')
        if response and response.status_code == 200:
            products = response.json()
            self.log_result("GET /products", True)
            if products and len(products) > 0:
                self.test_product_id = products[0].get('product_id')
                self.log_result("Products data available", True)
            else:
                self.log_result("Products data available", False, error_msg="No products found")
        else:
            self.log_result("GET /products", False, error_msg=f"Status: {response.status_code if response else 'No response'}")

        # Test categories endpoint
        response = self.make_request('GET', 'categories')
        if response and response.status_code == 200:
            self.log_result("GET /categories", True)
        else:
            self.log_result("GET /categories", False, error_msg=f"Status: {response.status_code if response else 'No response'}")

        # Test banners endpoint
        response = self.make_request('GET', 'banners')
        if response and response.status_code == 200:
            self.log_result("GET /banners", True)
        else:
            self.log_result("GET /banners", False, error_msg=f"Status: {response.status_code if response else 'No response'}")

        # Test individual product
        if self.test_product_id:
            response = self.make_request('GET', f'products/{self.test_product_id}')
            if response and response.status_code == 200:
                self.log_result("GET /products/{id}", True)
            else:
                self.log_result("GET /products/{id}", False, error_msg=f"Status: {response.status_code if response else 'No response'}")

    def test_cart_operations(self):
        """Test cart operations (guest and authenticated)"""
        print("\n🛒 Testing Cart Operations...")
        
        # Test guest cart - get empty cart
        response = self.make_request('GET', 'cart')
        if response and response.status_code == 200:
            self.log_result("GET /cart (guest)", True)
        else:
            self.log_result("GET /cart (guest)", False, error_msg=f"Status: {response.status_code if response else 'No response'}")

        # Test add to cart (guest)
        if self.test_product_id:
            cart_data = {"product_id": self.test_product_id, "quantity": 1}
            response = self.make_request('POST', 'cart/add', data=cart_data)
            if response and response.status_code == 200:
                self.log_result("POST /cart/add (guest)", True)
            else:
                self.log_result("POST /cart/add (guest)", False, error_msg=f"Status: {response.status_code if response else 'No response'}")

    def test_coupon_validation(self):
        """Test coupon validation"""
        print("\n🎫 Testing Coupon Validation...")
        
        # Test invalid coupon
        coupon_data = {"code": "INVALID123", "total_amount": 1000}
        response = self.make_request('POST', 'coupons/validate', data=coupon_data)
        if response and response.status_code == 404:
            self.log_result("POST /coupons/validate (invalid)", True)
        else:
            self.log_result("POST /coupons/validate (invalid)", False, error_msg=f"Expected 404, got: {response.status_code if response else 'No response'}")

    def test_order_creation(self):
        """Test order creation"""
        print("\n📦 Testing Order Creation...")
        
        if not self.test_product_id:
            self.log_result("Order creation test", False, error_msg="No test product available")
            return

        # Create test order
        order_data = {
            "items": [{
                "product_id": self.test_product_id,
                "product_name": "Test Product",
                "quantity": 1,
                "price": 100.0
            }],
            "total_amount": 100.0,
            "payment_method": "razorpay",
            "shipping_address": {
                "full_name": "Test User",
                "phone": "9876543210",
                "address_line1": "123 Test Street",
                "city": "Test City",
                "state": "Test State",
                "pincode": "123456"
            },
            "guest_email": "test@example.com"
        }
        
        response = self.make_request('POST', 'orders', data=order_data)
        if response and response.status_code == 200:
            order_result = response.json()
            self.test_order_id = order_result.get('order_id')
            self.log_result("POST /orders (guest)", True)
        else:
            self.log_result("POST /orders (guest)", False, error_msg=f"Status: {response.status_code if response else 'No response'}")

    def test_payment_endpoints(self):
        """Test payment integration endpoints"""
        print("\n💳 Testing Payment Endpoints...")
        
        if not self.test_order_id:
            self.log_result("Payment tests", False, error_msg="No test order available")
            return

        # Test Razorpay order creation
        response = self.make_request('POST', f'payments/razorpay/order?order_id={self.test_order_id}')
        if response and response.status_code == 200:
            self.log_result("POST /payments/razorpay/order", True)
        else:
            self.log_result("POST /payments/razorpay/order", False, error_msg=f"Status: {response.status_code if response else 'No response'}")

        # Test Stripe session creation
        origin_url = self.base_url
        response = self.make_request('POST', f'payments/stripe/session?order_id={self.test_order_id}&origin_url={origin_url}')
        if response and response.status_code == 200:
            self.log_result("POST /payments/stripe/session", True)
        else:
            self.log_result("POST /payments/stripe/session", False, error_msg=f"Status: {response.status_code if response else 'No response'}")

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Authentication Endpoints...")
        
        # Test /auth/me without token (should fail)
        response = self.make_request('GET', 'auth/me')
        if response and response.status_code == 401:
            self.log_result("GET /auth/me (no token)", True)
        else:
            self.log_result("GET /auth/me (no token)", False, error_msg=f"Expected 401, got: {response.status_code if response else 'No response'}")

    def test_protected_endpoints(self):
        """Test endpoints that require authentication"""
        print("\n🔒 Testing Protected Endpoints...")
        
        # Test wishlist without auth
        response = self.make_request('GET', 'wishlist')
        if response and response.status_code == 401:
            self.log_result("GET /wishlist (no auth)", True)
        else:
            self.log_result("GET /wishlist (no auth)", False, error_msg=f"Expected 401, got: {response.status_code if response else 'No response'}")

        # Test orders without auth
        response = self.make_request('GET', 'orders')
        if response and response.status_code == 401:
            self.log_result("GET /orders (no auth)", True)
        else:
            self.log_result("GET /orders (no auth)", False, error_msg=f"Expected 401, got: {response.status_code if response else 'No response'}")

    def test_admin_endpoints(self):
        """Test admin endpoints without proper auth"""
        print("\n👑 Testing Admin Endpoints (No Auth)...")
        
        # Test admin analytics without auth
        response = self.make_request('GET', 'admin/analytics')
        if response and response.status_code == 403:
            self.log_result("GET /admin/analytics (no auth)", True)
        else:
            self.log_result("GET /admin/analytics (no auth)", False, error_msg=f"Expected 403, got: {response.status_code if response else 'No response'}")

        # Test admin orders without auth
        response = self.make_request('GET', 'admin/orders')
        if response and response.status_code == 403:
            self.log_result("GET /admin/orders (no auth)", True)
        else:
            self.log_result("GET /admin/orders (no auth)", False, error_msg=f"Expected 403, got: {response.status_code if response else 'No response'}")

    def run_all_tests(self):
        """Run comprehensive API tests"""
        print("🚀 Starting E-Commerce API Testing...")
        print(f"Testing against: {self.api_url}")
        
        # Run all test suites
        self.test_basic_endpoints()
        self.test_cart_operations()
        self.test_coupon_validation()
        self.test_order_creation()
        self.test_payment_endpoints()
        self.test_auth_endpoints()
        self.test_protected_endpoints()
        self.test_admin_endpoints()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['error']}")
        
        return len(self.failed_tests) == 0

def main():
    tester = ECommerceAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())