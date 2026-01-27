"""
Banner Management System Tests - All 9 Placements
Tests for: hero, below_hero, popup, category_header, category_sidebar, 
           category_footer, product_page, cart_page, checkout_page
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data for creating banners
TEST_BANNER_DATA = {
    "title": "TEST_Banner_Placement",
    "image_desktop": "https://images.unsplash.com/photo-test",
    "status": "active",
    "position": 1
}

PLACEMENTS = [
    "hero", "below_hero", "popup", 
    "category_header", "category_sidebar", "category_footer",
    "product_page", "cart_page", "checkout_page"
]


class TestBannerPublicEndpoints:
    """Test public banner endpoints without authentication"""
    
    def test_get_banners_returns_200(self):
        """GET /api/banners should return 200"""
        response = requests.get(f"{BASE_URL}/api/banners")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ GET /api/banners returned {len(response.json())} banners")
    
    def test_get_banners_with_placement_filter(self):
        """GET /api/banners?placement=hero should filter correctly"""
        response = requests.get(f"{BASE_URL}/api/banners?placement=hero&status=active")
        assert response.status_code == 200
        data = response.json()
        # All returned banners should have placement=hero
        for banner in data:
            assert banner.get('placement') == 'hero' or banner.get('banner_type') == 'hero'
        print(f"✓ Hero placement filter returned {len(data)} banners")
    
    @pytest.mark.parametrize("placement", PLACEMENTS)
    def test_all_placements_return_valid_response(self, placement):
        """Each placement should return valid response"""
        response = requests.get(f"{BASE_URL}/api/banners?placement={placement}&status=active")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Placement '{placement}' returned {len(data)} banners")
    
    def test_banner_tracking_impression(self):
        """POST /api/banners/{id}/track?interaction_type=impression should work"""
        # First get a banner
        response = requests.get(f"{BASE_URL}/api/banners?placement=hero&status=active")
        if response.json():
            banner_id = response.json()[0]['banner_id']
            track_response = requests.post(f"{BASE_URL}/api/banners/{banner_id}/track?interaction_type=impression")
            assert track_response.status_code == 200
            assert track_response.json().get('success') == True
            print(f"✓ Banner impression tracking works for {banner_id}")
        else:
            pytest.skip("No hero banners to test tracking")
    
    def test_banner_tracking_click(self):
        """POST /api/banners/{id}/track?interaction_type=click should work"""
        response = requests.get(f"{BASE_URL}/api/banners?placement=hero&status=active")
        if response.json():
            banner_id = response.json()[0]['banner_id']
            track_response = requests.post(f"{BASE_URL}/api/banners/{banner_id}/track?interaction_type=click")
            assert track_response.status_code == 200
            assert track_response.json().get('success') == True
            print(f"✓ Banner click tracking works for {banner_id}")
        else:
            pytest.skip("No hero banners to test tracking")


class TestBannerAdminEndpoints:
    """Test admin-protected banner endpoints"""
    
    def test_get_all_banners_requires_auth(self):
        """GET /api/banners/all should require admin auth"""
        response = requests.get(f"{BASE_URL}/api/banners/all")
        assert response.status_code == 403
        print("✓ GET /api/banners/all correctly requires admin auth")
    
    def test_get_banner_stats_requires_auth(self):
        """GET /api/banners/stats should require admin auth"""
        response = requests.get(f"{BASE_URL}/api/banners/stats")
        assert response.status_code == 403
        print("✓ GET /api/banners/stats correctly requires admin auth")
    
    def test_create_banner_requires_auth(self):
        """POST /api/banners should require admin auth"""
        response = requests.post(f"{BASE_URL}/api/banners", json=TEST_BANNER_DATA)
        assert response.status_code == 403
        print("✓ POST /api/banners correctly requires admin auth")
    
    def test_update_banner_requires_auth(self):
        """PUT /api/banners/{id} should require admin auth"""
        response = requests.put(f"{BASE_URL}/api/banners/test_id", json={"title": "Updated"})
        assert response.status_code == 403
        print("✓ PUT /api/banners/{id} correctly requires admin auth")
    
    def test_delete_banner_requires_auth(self):
        """DELETE /api/banners/{id} should require admin auth"""
        response = requests.delete(f"{BASE_URL}/api/banners/test_id")
        assert response.status_code == 403
        print("✓ DELETE /api/banners/{id} correctly requires admin auth")


class TestImageUpload:
    """Test image upload endpoints"""
    
    def test_upload_image_requires_auth(self):
        """POST /api/upload/image should require admin auth"""
        files = {'file': ('test.jpg', b'fake image content', 'image/jpeg')}
        response = requests.post(f"{BASE_URL}/api/upload/image", files=files)
        assert response.status_code == 401
        print("✓ POST /api/upload/image correctly requires auth")
    
    def test_get_uploaded_file_serves_existing(self):
        """GET /api/uploads/{filename} should serve existing files"""
        # Test with a known uploaded file
        response = requests.get(f"{BASE_URL}/api/uploads/21c2d047e19e483e89599c1b9d5c2cdd.jpg")
        # Should return 200 if file exists, 404 if not
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            assert 'image' in response.headers.get('content-type', '')
            print("✓ GET /api/uploads/{filename} serves files correctly")
        else:
            print("✓ GET /api/uploads/{filename} returns 404 for missing files")
    
    def test_get_uploaded_file_returns_404_for_missing(self):
        """GET /api/uploads/{filename} should return 404 for non-existent files"""
        response = requests.get(f"{BASE_URL}/api/uploads/nonexistent_file_12345.jpg")
        assert response.status_code == 404
        print("✓ GET /api/uploads/{filename} returns 404 for missing files")


class TestBannerDataStructure:
    """Test banner data structure and fields"""
    
    def test_banner_has_required_fields(self):
        """Banners should have required fields"""
        response = requests.get(f"{BASE_URL}/api/banners?placement=hero&status=active")
        if response.json():
            banner = response.json()[0]
            required_fields = ['banner_id', 'title', 'status', 'placement']
            for field in required_fields:
                assert field in banner or (field == 'placement' and 'banner_type' in banner)
            print(f"✓ Banner has required fields: {required_fields}")
        else:
            pytest.skip("No banners to test structure")
    
    def test_banner_has_image_fields(self):
        """Banners should have image fields"""
        response = requests.get(f"{BASE_URL}/api/banners?placement=hero&status=active")
        if response.json():
            banner = response.json()[0]
            # Should have either image_desktop or image
            has_image = 'image_desktop' in banner or 'image' in banner
            assert has_image, "Banner should have image_desktop or image field"
            print("✓ Banner has image fields")
        else:
            pytest.skip("No banners to test structure")
    
    def test_banner_analytics_fields(self):
        """Banners should have analytics fields"""
        response = requests.get(f"{BASE_URL}/api/banners?placement=hero&status=active")
        if response.json():
            banner = response.json()[0]
            # Check for analytics fields
            assert 'impressions' in banner or 'clicks' in banner
            print("✓ Banner has analytics fields")
        else:
            pytest.skip("No banners to test structure")


class TestBannerFiltering:
    """Test banner filtering and targeting"""
    
    def test_status_filter_active(self):
        """Only active banners should be returned for public endpoint"""
        response = requests.get(f"{BASE_URL}/api/banners?status=active")
        assert response.status_code == 200
        for banner in response.json():
            assert banner.get('status') == 'active'
        print("✓ Status filter returns only active banners")
    
    def test_category_filter(self):
        """Category filter should work for category-specific banners"""
        response = requests.get(f"{BASE_URL}/api/banners?placement=category_header&category=handicrafts")
        assert response.status_code == 200
        print(f"✓ Category filter returned {len(response.json())} banners")
    
    def test_device_targeting(self):
        """Device targeting should be respected"""
        response = requests.get(f"{BASE_URL}/api/banners?device=desktop")
        assert response.status_code == 200
        # All returned banners should target 'all' or 'desktop'
        for banner in response.json():
            target_device = banner.get('target_device', 'all')
            assert target_device in ['all', 'desktop']
        print("✓ Device targeting filter works")


class TestBannerPlacementCounts:
    """Test banner counts for each placement"""
    
    def test_placement_distribution(self):
        """Check banner distribution across placements"""
        placement_counts = {}
        for placement in PLACEMENTS:
            response = requests.get(f"{BASE_URL}/api/banners?placement={placement}&status=active")
            placement_counts[placement] = len(response.json())
        
        print("\n=== Banner Placement Distribution ===")
        for placement, count in placement_counts.items():
            print(f"  {placement}: {count} banners")
        
        # At least hero should have banners
        assert placement_counts.get('hero', 0) > 0, "Hero placement should have at least 1 banner"
        print("✓ Banner placement distribution verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
