"""
Test suite for Banner Management System
Tests:
- GET /api/banners - Public endpoint returning active banners
- GET /api/banners?banner_type=header/footer/side - Filtering by type
- GET /api/banners/all - Admin only endpoint
- POST /api/upload/image - Admin only image upload
- POST /api/banners - Admin only banner creation
- GET /api/uploads/{filename} - Static file serving
- Banner scheduling - start_date/end_date filtering
"""
import pytest
import requests
import os
import io
from datetime import datetime, timedelta, timezone
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_SESSION_TOKEN = "admin_banner_test_1769189787640"

# ============ PUBLIC BANNER ENDPOINTS ============

class TestPublicBannerEndpoints:
    """Tests for public banner endpoints (no auth required)"""
    
    def test_get_banners_returns_active_banners(self):
        """GET /api/banners returns active banners"""
        response = requests.get(f"{BASE_URL}/api/banners")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of banners"
        
        # All returned banners should be active
        for banner in data:
            assert banner.get('active') == True, f"Banner {banner.get('banner_id')} should be active"
        
        print(f"PASS: GET /api/banners returns {len(data)} active banners")
    
    def test_get_banners_filter_by_header_type(self):
        """GET /api/banners?banner_type=header filters correctly"""
        response = requests.get(f"{BASE_URL}/api/banners?banner_type=header")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of banners"
        
        # All returned banners should be header type
        for banner in data:
            assert banner.get('banner_type') == 'header', f"Expected header type, got {banner.get('banner_type')}"
        
        print(f"PASS: GET /api/banners?banner_type=header returns {len(data)} header banners")
    
    def test_get_banners_filter_by_footer_type(self):
        """GET /api/banners?banner_type=footer filters correctly"""
        response = requests.get(f"{BASE_URL}/api/banners?banner_type=footer")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of banners"
        
        # All returned banners should be footer type
        for banner in data:
            assert banner.get('banner_type') == 'footer', f"Expected footer type, got {banner.get('banner_type')}"
        
        print(f"PASS: GET /api/banners?banner_type=footer returns {len(data)} footer banners")
    
    def test_get_banners_filter_by_side_type(self):
        """GET /api/banners?banner_type=side filters correctly"""
        response = requests.get(f"{BASE_URL}/api/banners?banner_type=side")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of banners"
        
        # All returned banners should be side type
        for banner in data:
            assert banner.get('banner_type') == 'side', f"Expected side type, got {banner.get('banner_type')}"
        
        print(f"PASS: GET /api/banners?banner_type=side returns {len(data)} side banners")
    
    def test_get_banners_filter_by_promotional_type(self):
        """GET /api/banners?banner_type=promotional filters correctly"""
        response = requests.get(f"{BASE_URL}/api/banners?banner_type=promotional")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of banners"
        
        # All returned banners should be promotional type
        for banner in data:
            assert banner.get('banner_type') == 'promotional', f"Expected promotional type, got {banner.get('banner_type')}"
        
        print(f"PASS: GET /api/banners?banner_type=promotional returns {len(data)} promotional banners")


# ============ ADMIN PROTECTED ENDPOINTS ============

class TestAdminProtectedEndpoints:
    """Tests for admin-only endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.headers = {
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}",
            "Content-Type": "application/json"
        }
        self.upload_headers = {
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"
        }
    
    def test_get_all_banners_requires_admin_auth(self):
        """GET /api/banners/all requires admin authentication"""
        # Without auth
        response = requests.get(f"{BASE_URL}/api/banners/all")
        assert response.status_code == 403, f"Expected 403 without auth, got {response.status_code}"
        print("PASS: GET /api/banners/all returns 403 without auth")
    
    def test_get_all_banners_with_admin_auth(self):
        """GET /api/banners/all works with admin authentication"""
        response = requests.get(f"{BASE_URL}/api/banners/all", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of banners"
        
        # Should include all banners (active and inactive)
        print(f"PASS: GET /api/banners/all returns {len(data)} total banners (admin)")
    
    def test_upload_image_requires_admin_auth(self):
        """POST /api/upload/image requires admin authentication"""
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {'file': ('test.jpg', img_bytes, 'image/jpeg')}
        response = requests.post(f"{BASE_URL}/api/upload/image", files=files)
        
        assert response.status_code == 403, f"Expected 403 without auth, got {response.status_code}"
        print("PASS: POST /api/upload/image returns 403 without auth")
    
    def test_upload_image_with_admin_auth(self):
        """POST /api/upload/image works with admin authentication"""
        img = Image.new('RGB', (100, 100), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {'file': ('test_banner.jpg', img_bytes, 'image/jpeg')}
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            files=files,
            headers=self.upload_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get('success') == True, "Expected success=True"
        assert 'url' in data, "Expected 'url' in response"
        assert 'filename' in data, "Expected 'filename' in response"
        assert data['url'].startswith('/api/uploads/'), f"URL should start with /api/uploads/"
        
        print(f"PASS: POST /api/upload/image works with admin auth, URL: {data['url']}")
        return data['url']
    
    def test_create_banner_requires_admin_auth(self):
        """POST /api/banners requires admin authentication"""
        banner_data = {
            "title": "Unauthorized Banner",
            "image": "https://via.placeholder.com/300x300",
            "position": 1,
            "active": True,
            "banner_type": "promotional"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/banners",
            json=banner_data,
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 403, f"Expected 403 without auth, got {response.status_code}"
        print("PASS: POST /api/banners returns 403 without auth")
    
    def test_create_banner_with_admin_auth(self):
        """POST /api/banners works with admin authentication"""
        banner_data = {
            "title": "TEST_Admin_Banner",
            "image": "https://via.placeholder.com/1920x600",
            "link": "/products",
            "position": 99,
            "active": True,
            "banner_type": "promotional",
            "category": None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/banners",
            json=banner_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get('title') == banner_data['title']
        assert data.get('image') == banner_data['image']
        assert 'banner_id' in data
        
        print(f"PASS: POST /api/banners works with admin auth, ID: {data['banner_id']}")
        
        # Cleanup - delete the test banner
        requests.delete(f"{BASE_URL}/api/banners/{data['banner_id']}", headers=self.headers)


# ============ STATIC FILE SERVING ============

class TestStaticFileServing:
    """Tests for static file serving endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.upload_headers = {
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"
        }
    
    def test_uploaded_file_accessible(self):
        """GET /api/uploads/{filename} serves uploaded files"""
        # First upload an image
        img = Image.new('RGB', (100, 100), color='purple')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {'file': ('accessible_test.jpg', img_bytes, 'image/jpeg')}
        upload_response = requests.post(
            f"{BASE_URL}/api/upload/image",
            files=files,
            headers=self.upload_headers
        )
        
        assert upload_response.status_code == 200
        data = upload_response.json()
        image_url = data['url']
        
        # Now try to access the uploaded image
        access_response = requests.get(f"{BASE_URL}{image_url}")
        assert access_response.status_code == 200, f"Expected 200, got {access_response.status_code}"
        assert 'image' in access_response.headers.get('content-type', ''), "Expected image content type"
        
        print(f"PASS: GET /api/uploads/{{filename}} serves file at {image_url}")
    
    def test_nonexistent_file_returns_404(self):
        """GET /api/uploads/{filename} returns 404 for nonexistent files"""
        response = requests.get(f"{BASE_URL}/api/uploads/nonexistent_file_12345.jpg")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("PASS: GET /api/uploads/{{filename}} returns 404 for nonexistent files")


# ============ BANNER SCHEDULING ============

class TestBannerScheduling:
    """Tests for banner scheduling feature (start_date/end_date)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.headers = {
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}",
            "Content-Type": "application/json"
        }
        self.created_banner_ids = []
    
    def teardown_method(self, method):
        """Cleanup created banners after each test"""
        for banner_id in self.created_banner_ids:
            requests.delete(f"{BASE_URL}/api/banners/{banner_id}", headers=self.headers)
        self.created_banner_ids = []
    
    def test_banner_with_future_start_date_not_in_public_api(self):
        """Banners with future start_date should not appear in public API"""
        # Create a banner with future start date
        future_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        
        banner_data = {
            "title": "TEST_Future_Banner",
            "image": "https://via.placeholder.com/1920x600",
            "link": "/products",
            "position": 100,
            "active": True,
            "banner_type": "promotional",
            "start_date": future_date,
            "end_date": None
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/banners",
            json=banner_data,
            headers=self.headers
        )
        
        assert create_response.status_code == 200, f"Failed to create banner: {create_response.text}"
        banner_id = create_response.json()['banner_id']
        self.created_banner_ids.append(banner_id)
        
        # Check public API - banner should NOT appear
        public_response = requests.get(f"{BASE_URL}/api/banners")
        assert public_response.status_code == 200
        public_banners = public_response.json()
        
        banner_ids_in_public = [b['banner_id'] for b in public_banners]
        assert banner_id not in banner_ids_in_public, "Future-scheduled banner should not appear in public API"
        
        print("PASS: Banner with future start_date does not appear in public API")
    
    def test_banner_with_past_end_date_not_in_public_api(self):
        """Banners with past end_date should not appear in public API"""
        # Create a banner with past end date
        past_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        
        banner_data = {
            "title": "TEST_Expired_Banner",
            "image": "https://via.placeholder.com/1920x600",
            "link": "/products",
            "position": 101,
            "active": True,
            "banner_type": "promotional",
            "start_date": None,
            "end_date": past_date
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/banners",
            json=banner_data,
            headers=self.headers
        )
        
        assert create_response.status_code == 200, f"Failed to create banner: {create_response.text}"
        banner_id = create_response.json()['banner_id']
        self.created_banner_ids.append(banner_id)
        
        # Check public API - banner should NOT appear
        public_response = requests.get(f"{BASE_URL}/api/banners")
        assert public_response.status_code == 200
        public_banners = public_response.json()
        
        banner_ids_in_public = [b['banner_id'] for b in public_banners]
        assert banner_id not in banner_ids_in_public, "Expired banner should not appear in public API"
        
        print("PASS: Banner with past end_date does not appear in public API")
    
    def test_banner_within_schedule_appears_in_public_api(self):
        """Banners within valid schedule should appear in public API"""
        # Create a banner with current valid schedule
        past_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        future_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        
        banner_data = {
            "title": "TEST_Active_Scheduled_Banner",
            "image": "https://via.placeholder.com/1920x600",
            "link": "/products",
            "position": 102,
            "active": True,
            "banner_type": "promotional",
            "start_date": past_date,
            "end_date": future_date
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/banners",
            json=banner_data,
            headers=self.headers
        )
        
        assert create_response.status_code == 200, f"Failed to create banner: {create_response.text}"
        banner_id = create_response.json()['banner_id']
        self.created_banner_ids.append(banner_id)
        
        # Check public API - banner SHOULD appear
        public_response = requests.get(f"{BASE_URL}/api/banners")
        assert public_response.status_code == 200
        public_banners = public_response.json()
        
        banner_ids_in_public = [b['banner_id'] for b in public_banners]
        assert banner_id in banner_ids_in_public, "Active scheduled banner should appear in public API"
        
        print("PASS: Banner within valid schedule appears in public API")
    
    def test_banner_without_schedule_appears_in_public_api(self):
        """Banners without schedule (null dates) should appear in public API"""
        banner_data = {
            "title": "TEST_No_Schedule_Banner",
            "image": "https://via.placeholder.com/1920x600",
            "link": "/products",
            "position": 103,
            "active": True,
            "banner_type": "promotional",
            "start_date": None,
            "end_date": None
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/banners",
            json=banner_data,
            headers=self.headers
        )
        
        assert create_response.status_code == 200, f"Failed to create banner: {create_response.text}"
        banner_id = create_response.json()['banner_id']
        self.created_banner_ids.append(banner_id)
        
        # Check public API - banner SHOULD appear
        public_response = requests.get(f"{BASE_URL}/api/banners")
        assert public_response.status_code == 200
        public_banners = public_response.json()
        
        banner_ids_in_public = [b['banner_id'] for b in public_banners]
        assert banner_id in banner_ids_in_public, "Banner without schedule should appear in public API"
        
        print("PASS: Banner without schedule appears in public API")
    
    def test_scheduled_banners_visible_in_admin_all_endpoint(self):
        """All banners (including scheduled) should be visible in admin /api/banners/all"""
        # Create a future-scheduled banner
        future_date = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        
        banner_data = {
            "title": "TEST_Admin_Scheduled_Banner",
            "image": "https://via.placeholder.com/1920x600",
            "link": "/products",
            "position": 104,
            "active": True,
            "banner_type": "promotional",
            "start_date": future_date,
            "end_date": None
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/banners",
            json=banner_data,
            headers=self.headers
        )
        
        assert create_response.status_code == 200
        banner_id = create_response.json()['banner_id']
        self.created_banner_ids.append(banner_id)
        
        # Check admin API - banner SHOULD appear
        admin_response = requests.get(f"{BASE_URL}/api/banners/all", headers=self.headers)
        assert admin_response.status_code == 200
        admin_banners = admin_response.json()
        
        banner_ids_in_admin = [b['banner_id'] for b in admin_banners]
        assert banner_id in banner_ids_in_admin, "Scheduled banner should appear in admin /api/banners/all"
        
        print("PASS: Scheduled banners visible in admin /api/banners/all endpoint")


# ============ BANNER TYPE FILTERING WITH SCHEDULING ============

class TestBannerTypeFilteringWithScheduling:
    """Tests for banner type filtering combined with scheduling"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.headers = {
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}",
            "Content-Type": "application/json"
        }
        self.created_banner_ids = []
    
    def teardown_method(self, method):
        """Cleanup created banners after each test"""
        for banner_id in self.created_banner_ids:
            requests.delete(f"{BASE_URL}/api/banners/{banner_id}", headers=self.headers)
        self.created_banner_ids = []
    
    def test_type_filter_respects_scheduling(self):
        """Type filter should also respect scheduling rules"""
        # Create a future-scheduled header banner
        future_date = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        
        banner_data = {
            "title": "TEST_Future_Header_Banner",
            "image": "https://via.placeholder.com/1200x250",
            "link": "/products",
            "position": 105,
            "active": True,
            "banner_type": "header",
            "start_date": future_date,
            "end_date": None
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/banners",
            json=banner_data,
            headers=self.headers
        )
        
        assert create_response.status_code == 200
        banner_id = create_response.json()['banner_id']
        self.created_banner_ids.append(banner_id)
        
        # Check filtered API - future banner should NOT appear
        filtered_response = requests.get(f"{BASE_URL}/api/banners?banner_type=header")
        assert filtered_response.status_code == 200
        filtered_banners = filtered_response.json()
        
        banner_ids_in_filtered = [b['banner_id'] for b in filtered_banners]
        assert banner_id not in banner_ids_in_filtered, "Future-scheduled banner should not appear in filtered results"
        
        print("PASS: Type filter respects scheduling rules")


# ============ CLEANUP ============

class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_banners(self):
        """Remove test banners created during testing"""
        headers = {
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # Get all banners via admin endpoint
        response = requests.get(f"{BASE_URL}/api/banners/all", headers=headers)
        if response.status_code != 200:
            print("SKIP: Could not get banners for cleanup")
            return
        
        banners = response.json()
        
        # Delete test banners
        deleted_count = 0
        for banner in banners:
            if banner.get('title', '').startswith('TEST_'):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/banners/{banner['banner_id']}",
                    headers=headers
                )
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"PASS: Cleaned up {deleted_count} test banners")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
