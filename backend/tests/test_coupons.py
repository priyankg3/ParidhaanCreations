"""
Coupon Management API Tests for Paridhaan Creations E-commerce Platform
Tests: CRUD operations for coupons, coupon validation, and admin access control
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://paridhaan-crafts.preview.emergentagent.com')
ADMIN_TOKEN = "admin_session_1769177330151"

class TestCouponValidation:
    """Test coupon validation endpoint (public)"""
    
    def test_validate_percentage_coupon_save10(self):
        """Test SAVE10 coupon - 10% discount"""
        response = requests.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "SAVE10",
            "total_amount": 1000
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        assert data["discount"] == 100.0  # 10% of 1000
        assert data["final_amount"] == 900.0
        print(f"✓ SAVE10 coupon validation passed: discount={data['discount']}")
    
    def test_validate_flat_coupon_flat100(self):
        """Test FLAT100 coupon - ₹100 flat discount"""
        response = requests.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "FLAT100",
            "total_amount": 500
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        assert data["discount"] == 100.0  # Flat ₹100
        assert data["final_amount"] == 400.0
        print(f"✓ FLAT100 coupon validation passed: discount={data['discount']}")
    
    def test_validate_percentage_coupon_save20(self):
        """Test SAVE20 coupon - 20% discount"""
        response = requests.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "SAVE20",
            "total_amount": 2000
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        assert data["discount"] == 400.0  # 20% of 2000
        assert data["final_amount"] == 1600.0
        print(f"✓ SAVE20 coupon validation passed: discount={data['discount']}")
    
    def test_validate_invalid_coupon(self):
        """Test invalid coupon code returns 404"""
        response = requests.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "INVALIDCODE",
            "total_amount": 1000
        })
        assert response.status_code == 404
        data = response.json()
        assert "Invalid coupon code" in data.get("detail", "")
        print("✓ Invalid coupon correctly returns 404")
    
    def test_validate_coupon_case_insensitive(self):
        """Test coupon code is case insensitive"""
        response = requests.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "save10",  # lowercase
            "total_amount": 1000
        })
        assert response.status_code == 200
        data = response.json()
        assert data["valid"] == True
        print("✓ Coupon validation is case insensitive")


class TestCouponCRUD:
    """Test coupon CRUD operations (admin only)"""
    
    @pytest.fixture
    def admin_headers(self):
        return {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    def test_get_all_coupons_admin(self, admin_headers):
        """Admin can view all coupons"""
        response = requests.get(f"{BASE_URL}/api/coupons", headers=admin_headers)
        assert response.status_code == 200
        coupons = response.json()
        assert isinstance(coupons, list)
        assert len(coupons) >= 3  # At least SAVE10, FLAT100, SAVE20
        print(f"✓ Admin can view {len(coupons)} coupons")
    
    def test_get_coupons_unauthorized(self):
        """Non-admin cannot view coupons list"""
        response = requests.get(f"{BASE_URL}/api/coupons")
        assert response.status_code == 403
        print("✓ Unauthorized access to coupons list blocked")
    
    def test_create_percentage_coupon(self, admin_headers):
        """Admin can create a percentage discount coupon"""
        coupon_data = {
            "code": "TEST_PERCENT25",
            "discount_percentage": 25.0,
            "discount_amount": None,
            "valid_from": datetime.now().isoformat(),
            "valid_to": (datetime.now() + timedelta(days=30)).isoformat(),
            "active": True
        }
        response = requests.post(f"{BASE_URL}/api/coupons", json=coupon_data, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "TEST_PERCENT25"
        assert data["discount_percentage"] == 25.0
        assert data["active"] == True
        print(f"✓ Created percentage coupon: {data['code']}")
        
        # Cleanup - delete the test coupon
        requests.delete(f"{BASE_URL}/api/coupons/{data['coupon_id']}", headers=admin_headers)
    
    def test_create_flat_amount_coupon(self, admin_headers):
        """Admin can create a flat amount discount coupon"""
        coupon_data = {
            "code": "TEST_FLAT200",
            "discount_percentage": None,
            "discount_amount": 200.0,
            "valid_from": datetime.now().isoformat(),
            "valid_to": (datetime.now() + timedelta(days=30)).isoformat(),
            "active": True
        }
        response = requests.post(f"{BASE_URL}/api/coupons", json=coupon_data, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == "TEST_FLAT200"
        assert data["discount_amount"] == 200.0
        print(f"✓ Created flat amount coupon: {data['code']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/coupons/{data['coupon_id']}", headers=admin_headers)
    
    def test_create_coupon_unauthorized(self):
        """Non-admin cannot create coupons"""
        coupon_data = {
            "code": "UNAUTHORIZED",
            "discount_percentage": 10.0,
            "valid_from": datetime.now().isoformat(),
            "valid_to": (datetime.now() + timedelta(days=30)).isoformat(),
            "active": True
        }
        response = requests.post(f"{BASE_URL}/api/coupons", json=coupon_data)
        assert response.status_code == 403
        print("✓ Unauthorized coupon creation blocked")
    
    def test_update_coupon(self, admin_headers):
        """Admin can update an existing coupon"""
        # First create a test coupon
        coupon_data = {
            "code": "TEST_UPDATE",
            "discount_percentage": 15.0,
            "discount_amount": None,
            "valid_from": datetime.now().isoformat(),
            "valid_to": (datetime.now() + timedelta(days=30)).isoformat(),
            "active": True
        }
        create_response = requests.post(f"{BASE_URL}/api/coupons", json=coupon_data, headers=admin_headers)
        assert create_response.status_code == 200
        coupon_id = create_response.json()["coupon_id"]
        
        # Update the coupon
        update_data = {
            "code": "TEST_UPDATE",
            "discount_percentage": 20.0,  # Changed from 15% to 20%
            "discount_amount": None,
            "valid_from": datetime.now().isoformat(),
            "valid_to": (datetime.now() + timedelta(days=60)).isoformat(),  # Extended validity
            "active": True
        }
        update_response = requests.put(f"{BASE_URL}/api/coupons/{coupon_id}", json=update_data, headers=admin_headers)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["discount_percentage"] == 20.0
        print(f"✓ Updated coupon discount from 15% to 20%")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/coupons/{coupon_id}", headers=admin_headers)
    
    def test_toggle_coupon_status(self, admin_headers):
        """Admin can toggle coupon active/inactive status"""
        # Create a test coupon
        coupon_data = {
            "code": "TEST_TOGGLE",
            "discount_percentage": 10.0,
            "discount_amount": None,
            "valid_from": datetime.now().isoformat(),
            "valid_to": (datetime.now() + timedelta(days=30)).isoformat(),
            "active": True
        }
        create_response = requests.post(f"{BASE_URL}/api/coupons", json=coupon_data, headers=admin_headers)
        assert create_response.status_code == 200
        coupon_id = create_response.json()["coupon_id"]
        
        # Toggle to inactive
        toggle_data = {
            "code": "TEST_TOGGLE",
            "discount_percentage": 10.0,
            "discount_amount": None,
            "valid_from": datetime.now().isoformat(),
            "valid_to": (datetime.now() + timedelta(days=30)).isoformat(),
            "active": False  # Deactivate
        }
        toggle_response = requests.put(f"{BASE_URL}/api/coupons/{coupon_id}", json=toggle_data, headers=admin_headers)
        assert toggle_response.status_code == 200
        toggled = toggle_response.json()
        assert toggled["active"] == False
        print("✓ Coupon status toggled to inactive")
        
        # Verify inactive coupon cannot be validated
        validate_response = requests.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "TEST_TOGGLE",
            "total_amount": 1000
        })
        assert validate_response.status_code == 404  # Inactive coupon should not be found
        print("✓ Inactive coupon correctly rejected during validation")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/coupons/{coupon_id}", headers=admin_headers)
    
    def test_delete_coupon(self, admin_headers):
        """Admin can delete a coupon"""
        # Create a test coupon
        coupon_data = {
            "code": "TEST_DELETE",
            "discount_percentage": 5.0,
            "discount_amount": None,
            "valid_from": datetime.now().isoformat(),
            "valid_to": (datetime.now() + timedelta(days=30)).isoformat(),
            "active": True
        }
        create_response = requests.post(f"{BASE_URL}/api/coupons", json=coupon_data, headers=admin_headers)
        assert create_response.status_code == 200
        coupon_id = create_response.json()["coupon_id"]
        
        # Delete the coupon
        delete_response = requests.delete(f"{BASE_URL}/api/coupons/{coupon_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        print(f"✓ Coupon {coupon_id} deleted successfully")
        
        # Verify coupon is deleted
        get_response = requests.get(f"{BASE_URL}/api/coupons/{coupon_id}", headers=admin_headers)
        assert get_response.status_code == 404
        print("✓ Deleted coupon correctly returns 404")
    
    def test_delete_coupon_unauthorized(self):
        """Non-admin cannot delete coupons"""
        response = requests.delete(f"{BASE_URL}/api/coupons/some_coupon_id")
        assert response.status_code == 403
        print("✓ Unauthorized coupon deletion blocked")
    
    def test_get_single_coupon(self, admin_headers):
        """Admin can get a single coupon by ID"""
        # First get all coupons to get a valid ID
        list_response = requests.get(f"{BASE_URL}/api/coupons", headers=admin_headers)
        assert list_response.status_code == 200
        coupons = list_response.json()
        
        if coupons:
            coupon_id = coupons[0]["coupon_id"]
            response = requests.get(f"{BASE_URL}/api/coupons/{coupon_id}", headers=admin_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["coupon_id"] == coupon_id
            print(f"✓ Retrieved single coupon: {data['code']}")


class TestExpiredCoupon:
    """Test expired coupon handling"""
    
    @pytest.fixture
    def admin_headers(self):
        return {"Authorization": f"Bearer {ADMIN_TOKEN}"}
    
    def test_expired_coupon_validation(self, admin_headers):
        """Expired coupon should return error"""
        # Create an expired coupon
        coupon_data = {
            "code": "TEST_EXPIRED",
            "discount_percentage": 10.0,
            "discount_amount": None,
            "valid_from": (datetime.now() - timedelta(days=60)).isoformat(),
            "valid_to": (datetime.now() - timedelta(days=30)).isoformat(),  # Expired 30 days ago
            "active": True
        }
        create_response = requests.post(f"{BASE_URL}/api/coupons", json=coupon_data, headers=admin_headers)
        assert create_response.status_code == 200
        coupon_id = create_response.json()["coupon_id"]
        
        # Try to validate expired coupon
        validate_response = requests.post(f"{BASE_URL}/api/coupons/validate", json={
            "code": "TEST_EXPIRED",
            "total_amount": 1000
        })
        assert validate_response.status_code == 400
        data = validate_response.json()
        assert "expired" in data.get("detail", "").lower()
        print("✓ Expired coupon correctly rejected with 400 status")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/coupons/{coupon_id}", headers=admin_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
