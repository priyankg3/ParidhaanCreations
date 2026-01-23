"""
Test suite for Banner Image Upload functionality
Tests the /api/upload/image endpoint and banner CRUD operations
"""
import pytest
import requests
import os
import io
from PIL import Image

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_SESSION_TOKEN = "admin_banner_session_1769188223552"

class TestBannerImageUpload:
    """Tests for banner image upload endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.headers = {
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}",
            "Cookie": f"session_token={ADMIN_SESSION_TOKEN}"
        }
    
    def test_upload_image_requires_auth(self):
        """Test that upload endpoint requires admin authentication"""
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {'file': ('test.jpg', img_bytes, 'image/jpeg')}
        response = requests.post(f"{BASE_URL}/api/upload/image", files=files)
        
        # Should return 403 without auth
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Upload endpoint requires admin authentication")
    
    def test_upload_image_with_admin_auth(self):
        """Test successful image upload with admin authentication"""
        # Create a simple test image
        img = Image.new('RGB', (100, 100), color='blue')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {'file': ('test_banner.jpg', img_bytes, 'image/jpeg')}
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get('success') == True, "Expected success=True"
        assert 'url' in data, "Expected 'url' in response"
        assert 'filename' in data, "Expected 'filename' in response"
        assert data['url'].startswith('/api/uploads/'), f"URL should start with /api/uploads/, got {data['url']}"
        
        print(f"PASS: Image uploaded successfully, URL: {data['url']}")
        return data['url']
    
    def test_upload_image_png_format(self):
        """Test PNG image upload"""
        img = Image.new('RGBA', (200, 200), color='green')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        files = {'file': ('test_banner.png', img_bytes, 'image/png')}
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get('success') == True
        assert data.get('content_type') == 'image/png'
        print("PASS: PNG image upload works")
    
    def test_upload_image_webp_format(self):
        """Test WebP image upload"""
        img = Image.new('RGB', (150, 150), color='yellow')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='WEBP')
        img_bytes.seek(0)
        
        files = {'file': ('test_banner.webp', img_bytes, 'image/webp')}
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get('success') == True
        print("PASS: WebP image upload works")
    
    def test_upload_invalid_file_type(self):
        """Test that invalid file types are rejected"""
        # Create a text file
        files = {'file': ('test.txt', b'This is not an image', 'text/plain')}
        response = requests.post(
            f"{BASE_URL}/api/upload/image",
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("PASS: Invalid file type rejected")
    
    def test_uploaded_image_accessible(self):
        """Test that uploaded image can be accessed"""
        # First upload an image
        img = Image.new('RGB', (100, 100), color='purple')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {'file': ('accessible_test.jpg', img_bytes, 'image/jpeg')}
        upload_response = requests.post(
            f"{BASE_URL}/api/upload/image",
            files=files,
            headers=self.headers
        )
        
        assert upload_response.status_code == 200
        data = upload_response.json()
        image_url = data['url']
        
        # Now try to access the uploaded image
        access_response = requests.get(f"{BASE_URL}{image_url}")
        assert access_response.status_code == 200, f"Expected 200, got {access_response.status_code}"
        assert 'image' in access_response.headers.get('content-type', ''), "Expected image content type"
        print(f"PASS: Uploaded image accessible at {image_url}")


class TestBannerCRUD:
    """Tests for banner CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.headers = {
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}",
            "Content-Type": "application/json"
        }
    
    def test_get_banners_public(self):
        """Test that banners endpoint is publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/banners")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of banners"
        print(f"PASS: Get banners returns {len(data)} banners")
    
    def test_create_banner_with_url(self):
        """Test creating a banner with image URL"""
        banner_data = {
            "title": "TEST_Banner_URL_Upload",
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
        assert data.get('banner_type') == 'promotional'
        assert 'banner_id' in data
        
        print(f"PASS: Banner created with URL, ID: {data['banner_id']}")
        return data['banner_id']
    
    def test_create_banner_with_uploaded_image(self):
        """Test creating a banner with uploaded image path"""
        # First upload an image
        img = Image.new('RGB', (1920, 600), color='orange')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        
        files = {'file': ('banner_test.jpg', img_bytes, 'image/jpeg')}
        upload_response = requests.post(
            f"{BASE_URL}/api/upload/image",
            files=files,
            headers={"Authorization": f"Bearer {ADMIN_SESSION_TOKEN}"}
        )
        
        assert upload_response.status_code == 200
        uploaded_url = upload_response.json()['url']
        
        # Now create banner with uploaded image
        banner_data = {
            "title": "TEST_Banner_Uploaded_Image",
            "image": uploaded_url,
            "link": "/products?category=handicrafts",
            "position": 98,
            "active": True,
            "banner_type": "header",
            "category": "handicrafts"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/banners",
            json=banner_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert data.get('image') == uploaded_url
        assert data.get('banner_type') == 'header'
        assert data.get('category') == 'handicrafts'
        
        print(f"PASS: Banner created with uploaded image, ID: {data['banner_id']}")
        return data['banner_id']
    
    def test_create_banner_all_types(self):
        """Test creating banners of all types with correct size recommendations"""
        banner_types = [
            {"type": "promotional", "expected_size": "1920x600", "placement": "Home Header"},
            {"type": "header", "expected_size": "1200x250", "placement": "Category Top"},
            {"type": "side", "expected_size": "300x600", "placement": "Sidebar"},
            {"type": "footer", "expected_size": "1200x100", "placement": "Footer Strip"}
        ]
        
        created_ids = []
        for bt in banner_types:
            banner_data = {
                "title": f"TEST_Banner_{bt['type']}",
                "image": f"https://via.placeholder.com/{bt['expected_size'].replace('x', 'x')}",
                "link": "/products",
                "position": 100,
                "active": True,
                "banner_type": bt['type'],
                "category": None
            }
            
            response = requests.post(
                f"{BASE_URL}/api/banners",
                json=banner_data,
                headers=self.headers
            )
            
            assert response.status_code == 200, f"Failed to create {bt['type']} banner: {response.text}"
            data = response.json()
            assert data.get('banner_type') == bt['type']
            created_ids.append(data['banner_id'])
            print(f"PASS: Created {bt['type']} banner ({bt['placement']} - {bt['expected_size']})")
        
        return created_ids
    
    def test_delete_banner(self):
        """Test deleting a banner"""
        # First create a banner to delete
        banner_data = {
            "title": "TEST_Banner_To_Delete",
            "image": "https://via.placeholder.com/300x300",
            "position": 999,
            "active": True,
            "banner_type": "promotional"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/banners",
            json=banner_data,
            headers=self.headers
        )
        
        assert create_response.status_code == 200
        banner_id = create_response.json()['banner_id']
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/banners/{banner_id}",
            headers=self.headers
        )
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        print(f"PASS: Banner {banner_id} deleted successfully")
    
    def test_create_banner_requires_auth(self):
        """Test that creating banner requires admin auth"""
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
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Banner creation requires admin authentication")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_banners(self):
        """Remove test banners created during testing"""
        headers = {
            "Authorization": f"Bearer {ADMIN_SESSION_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # Get all banners
        response = requests.get(f"{BASE_URL}/api/banners")
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
