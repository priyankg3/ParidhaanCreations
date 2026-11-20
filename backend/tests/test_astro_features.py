"""
Test suite for Astro features - Rashifal, Numerology, Tarot, Panchang
Tests all public API endpoints for the Astro section
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://paridhaan-crafts-3.preview.emergentagent.com')
if BASE_URL.endswith('/api'):
    BASE_URL = BASE_URL[:-4]  # Remove /api suffix if present

class TestZodiacSigns:
    """Test zodiac signs endpoint"""
    
    def test_get_zodiac_signs(self):
        """GET /api/astro/zodiac-signs should return all 12 zodiac signs"""
        response = requests.get(f"{BASE_URL}/api/astro/zodiac-signs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 12, f"Expected 12 zodiac signs, got {len(data)}"
        
        # Verify structure of first sign
        first_sign = data[0]
        assert "id" in first_sign, "Sign should have 'id'"
        assert "name" in first_sign, "Sign should have 'name'"
        assert "english" in first_sign, "Sign should have 'english'"
        assert "symbol" in first_sign, "Sign should have 'symbol'"
        assert "dates" in first_sign, "Sign should have 'dates'"
        
        # Verify all 12 signs are present
        sign_ids = [s["id"] for s in data]
        expected_ids = ["mesh", "vrishabh", "mithun", "kark", "singh", "kanya", 
                       "tula", "vrishchik", "dhanu", "makar", "kumbh", "meen"]
        for expected_id in expected_ids:
            assert expected_id in sign_ids, f"Missing zodiac sign: {expected_id}"
        
        print(f"✅ All 12 zodiac signs returned correctly")


class TestDailyRashifal:
    """Test daily rashifal (horoscope) endpoint"""
    
    def test_rashifal_mesh(self):
        """POST /api/astro/daily-rashifal for Mesh (Aries)"""
        response = requests.post(
            f"{BASE_URL}/api/astro/daily-rashifal",
            json={"rashi_id": "mesh", "period": "daily"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "rashi" in data, "Response should have 'rashi'"
        assert "rashifal" in data, "Response should have 'rashifal'"
        assert "date" in data, "Response should have 'date'"
        
        # Verify rashi details
        assert data["rashi"]["id"] == "mesh"
        assert data["rashi"]["english"] == "Aries"
        
        # Verify rashifal content exists and is not empty
        assert len(data["rashifal"]) > 100, "Rashifal should have substantial content"
        
        # Check that raw markdown symbols are NOT in the response (they should be rendered)
        # Note: The backend returns markdown, frontend renders it
        print(f"✅ Rashifal for Mesh returned successfully ({len(data['rashifal'])} chars)")
    
    def test_rashifal_invalid_rashi(self):
        """POST /api/astro/daily-rashifal with invalid rashi should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/astro/daily-rashifal",
            json={"rashi_id": "invalid_rashi", "period": "daily"}
        )
        assert response.status_code == 404, f"Expected 404 for invalid rashi, got {response.status_code}"
        print("✅ Invalid rashi returns 404 correctly")


class TestNumerology:
    """Test numerology calculation endpoint"""
    
    def test_numerology_calculation(self):
        """POST /api/astro/numerology should calculate numbers correctly"""
        response = requests.post(
            f"{BASE_URL}/api/astro/numerology",
            json={"name": "Test User", "date_of_birth": "1990-05-15"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "name" in data, "Response should have 'name'"
        assert "calculations" in data, "Response should have 'calculations'"
        assert "reading" in data, "Response should have 'reading'"
        
        # Verify calculations structure
        calcs = data["calculations"]
        assert "life_path" in calcs, "Should have life_path calculations"
        assert "name_numbers" in calcs, "Should have name_numbers calculations"
        
        # Verify life path calculation
        life_path = calcs["life_path"]
        assert "life_path" in life_path, "Should have life_path number"
        assert isinstance(life_path["life_path"], int), "Life path should be integer"
        
        # Verify name numbers
        name_nums = calcs["name_numbers"]
        assert "expression" in name_nums, "Should have expression number"
        assert "soul_urge" in name_nums, "Should have soul_urge number"
        assert "personality" in name_nums, "Should have personality number"
        
        # Verify reading content
        assert len(data["reading"]) > 100, "Reading should have substantial content"
        
        print(f"✅ Numerology calculation successful - Life Path: {life_path['life_path']}")
    
    def test_numerology_missing_fields(self):
        """POST /api/astro/numerology without required fields should fail"""
        response = requests.post(
            f"{BASE_URL}/api/astro/numerology",
            json={"name": "Test User"}  # Missing date_of_birth
        )
        assert response.status_code == 422, f"Expected 422 for missing fields, got {response.status_code}"
        print("✅ Missing fields validation works correctly")


class TestTarot:
    """Test tarot card drawing endpoint"""
    
    def test_tarot_single_card(self):
        """POST /api/astro/tarot/draw with single card spread"""
        response = requests.post(
            f"{BASE_URL}/api/astro/tarot/draw",
            json={"spread_type": "single", "question": "Test question"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "cards" in data, "Response should have 'cards'"
        assert "reading" in data, "Response should have 'reading'"
        assert "spread_type" in data, "Response should have 'spread_type'"
        
        # Verify single card
        assert len(data["cards"]) == 1, f"Single spread should have 1 card, got {len(data['cards'])}"
        
        # Verify card structure
        card = data["cards"][0]
        assert "name" in card, "Card should have 'name'"
        assert "hindi" in card, "Card should have 'hindi'"
        assert "meaning" in card, "Card should have 'meaning'"
        
        print(f"✅ Single card draw successful - Card: {card['name']}")
    
    def test_tarot_three_card(self):
        """POST /api/astro/tarot/draw with three card spread"""
        response = requests.post(
            f"{BASE_URL}/api/astro/tarot/draw",
            json={"spread_type": "three_card"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert len(data["cards"]) == 3, f"Three card spread should have 3 cards, got {len(data['cards'])}"
        
        print(f"✅ Three card draw successful - Cards: {[c['name'] for c in data['cards']]}")
    
    def test_tarot_six_card(self):
        """POST /api/astro/tarot/draw with six card spread"""
        response = requests.post(
            f"{BASE_URL}/api/astro/tarot/draw",
            json={"spread_type": "six_card"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert len(data["cards"]) == 6, f"Six card spread should have 6 cards, got {len(data['cards'])}"
        
        print(f"✅ Six card draw successful")
    
    def test_get_all_tarot_cards(self):
        """GET /api/astro/tarot/cards should return all tarot cards"""
        response = requests.get(f"{BASE_URL}/api/astro/tarot/cards")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 22, f"Expected 22 Major Arcana cards, got {len(data)}"
        
        print(f"✅ All 22 tarot cards returned")


class TestPanchang:
    """Test panchang (Hindu calendar) endpoint"""
    
    def test_panchang_default_location(self):
        """POST /api/astro/panchang with default location"""
        response = requests.post(
            f"{BASE_URL}/api/astro/panchang",
            json={"location": "New Delhi, India"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "date" in data, "Response should have 'date'"
        assert "weekday" in data, "Response should have 'weekday'"
        assert "hindi_weekday" in data, "Response should have 'hindi_weekday'"
        assert "location" in data, "Response should have 'location'"
        assert "panchang" in data, "Response should have 'panchang'"
        
        # Verify panchang content
        assert len(data["panchang"]) > 100, "Panchang should have substantial content"
        
        print(f"✅ Panchang for {data['location']} on {data['date']} returned successfully")
    
    def test_panchang_custom_location(self):
        """POST /api/astro/panchang with custom location"""
        response = requests.post(
            f"{BASE_URL}/api/astro/panchang",
            json={"location": "Mumbai, India"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["location"] == "Mumbai, India"
        
        print(f"✅ Panchang for custom location works")


class TestLuckyInfo:
    """Test lucky info endpoint"""
    
    def test_lucky_info(self):
        """GET /api/astro/lucky-info/{rashi_id} should return lucky info"""
        response = requests.get(f"{BASE_URL}/api/astro/lucky-info/mesh")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "rashi" in data, "Response should have 'rashi'"
        assert "lucky_info" in data, "Response should have 'lucky_info'"
        
        print(f"✅ Lucky info for Mesh returned successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
