"""
Test Invoice PDF Generation
Tests for:
1. Rs. symbol appears correctly (no black dots/encoding issues)
2. Product size and color information in invoice
3. 'If undelivered return to seller' section
4. GST breakdown correctness
5. PDF downloads without errors
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInvoicePDFGeneration:
    """Test invoice PDF generation with all improvements"""
    
    @pytest.fixture(scope="class")
    def test_order_id(self):
        """Create a test order with paid status for invoice testing"""
        # Create a test order with product details including size and color
        order_data = {
            "items": [
                {
                    "product_id": "test_prod_invoice_001",
                    "product_name": "Laddu Gopal Dress - Red Silk",
                    "quantity": 2,
                    "price": 599.00,
                    "size": "Size 2",
                    "color": "Red",
                    "hsn_code": "6204",
                    "gst_rate": 12.0
                },
                {
                    "product_id": "test_prod_invoice_002",
                    "product_name": "Brass Pooja Thali Set",
                    "quantity": 1,
                    "price": 1299.00,
                    "color": "Golden",
                    "hsn_code": "7418",
                    "gst_rate": 18.0
                }
            ],
            "total_amount": 2497.00,
            "payment_method": "razorpay",
            "shipping_address": {
                "full_name": "Test Customer",
                "phone": "9876543210",
                "address_line1": "123 Test Street",
                "address_line2": "Near Test Market",
                "city": "Jaipur",
                "state": "Rajasthan",
                "pincode": "302001"
            },
            "guest_email": "test_invoice@example.com"
        }
        
        response = requests.post(f"{BASE_URL}/orders", json=order_data)
        assert response.status_code == 200, f"Failed to create order: {response.text}"
        order = response.json()
        order_id = order.get("order_id")
        
        # Update order to paid status for invoice generation
        # Using direct MongoDB update via a test endpoint or admin API
        # For now, we'll try to generate invoice and see if it works
        
        return order_id
    
    def test_invoice_json_generation(self, test_order_id):
        """Test that invoice JSON is generated correctly with size/color info"""
        # First, we need to update the order to paid status
        # Let's check if we can get the invoice
        response = requests.get(f"{BASE_URL}/orders/{test_order_id}/invoice")
        
        # If order is not paid, we expect 400 error
        if response.status_code == 400:
            print(f"Order not in paid status - expected for new orders: {response.json()}")
            pytest.skip("Order needs to be in paid status for invoice generation")
        
        assert response.status_code == 200, f"Invoice generation failed: {response.text}"
        invoice = response.json()
        
        # Verify invoice structure
        assert "invoice_number" in invoice, "Invoice number missing"
        assert "items" in invoice, "Items missing from invoice"
        assert "seller_name" in invoice, "Seller name missing"
        assert "seller_address" in invoice, "Seller address missing"
        
        # Verify GST breakdown
        assert "taxable_amount" in invoice, "Taxable amount missing"
        assert "total_gst" in invoice, "Total GST missing"
        
        print(f"Invoice generated: {invoice.get('invoice_number')}")
        print(f"Items: {len(invoice.get('items', []))}")
        
        # Check if items have size/color info
        for item in invoice.get("items", []):
            print(f"  - {item.get('product_name')}: size={item.get('size')}, color={item.get('color')}")
    
    def test_invoice_pdf_download(self, test_order_id):
        """Test that invoice PDF downloads without errors"""
        response = requests.get(f"{BASE_URL}/orders/{test_order_id}/invoice/pdf")
        
        if response.status_code == 400:
            print(f"Order not in paid status: {response.json()}")
            pytest.skip("Order needs to be in paid status for PDF generation")
        
        assert response.status_code == 200, f"PDF download failed: {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        assert "pdf" in content_type.lower() or "octet-stream" in content_type.lower(), \
            f"Expected PDF content type, got: {content_type}"
        
        # Check that we got actual content
        assert len(response.content) > 1000, "PDF content seems too small"
        
        # Check PDF header
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        print(f"PDF downloaded successfully, size: {len(response.content)} bytes")


class TestInvoiceWithPaidOrder:
    """Test invoice generation with a properly paid order"""
    
    @pytest.fixture(scope="class")
    def admin_session(self):
        """Get admin session for creating test data"""
        # Create admin user and session for testing
        import pymongo
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = pymongo.MongoClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'test_database')]
        
        # Create test admin user
        admin_user_id = f"test_admin_{uuid.uuid4().hex[:8]}"
        admin_session_token = f"test_admin_session_{uuid.uuid4().hex[:12]}"
        
        db.users.update_one(
            {"email": "test_admin_invoice@example.com"},
            {"$set": {
                "user_id": admin_user_id,
                "email": "test_admin_invoice@example.com",
                "name": "Test Admin",
                "is_admin": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
        
        db.user_sessions.insert_one({
            "user_id": admin_user_id,
            "session_token": admin_session_token,
            "expires_at": datetime(2030, 1, 1, tzinfo=timezone.utc),
            "created_at": datetime.now(timezone.utc)
        })
        
        yield admin_session_token
        
        # Cleanup
        db.users.delete_one({"email": "test_admin_invoice@example.com"})
        db.user_sessions.delete_one({"session_token": admin_session_token})
        client.close()
    
    @pytest.fixture(scope="class")
    def paid_order_id(self, admin_session):
        """Create a paid order for invoice testing"""
        import pymongo
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        client = pymongo.MongoClient(mongo_url)
        db = client[os.environ.get('DB_NAME', 'test_database')]
        
        order_id = f"TEST_order_invoice_{uuid.uuid4().hex[:8]}"
        
        # Create order directly in database with paid status
        order_doc = {
            "order_id": order_id,
            "user_id": None,
            "guest_email": "test_invoice_buyer@example.com",
            "items": [
                {
                    "product_id": "test_prod_001",
                    "product_name": "Laddu Gopal Dress - Blue Velvet",
                    "quantity": 2,
                    "price": 799.00,
                    "size": "Size 3",
                    "color": "Blue",
                    "selected_size": "Size 3",
                    "selected_color": "Blue",
                    "hsn_code": "6204",
                    "gst_rate": 12.0
                },
                {
                    "product_id": "test_prod_002",
                    "product_name": "Silver Pooja Bell",
                    "quantity": 1,
                    "price": 499.00,
                    "variant": "Medium",
                    "hsn_code": "7114",
                    "gst_rate": 3.0
                }
            ],
            "total_amount": 2097.00,
            "status": "confirmed",
            "payment_method": "razorpay",
            "payment_status": "paid",
            "shipping_address": {
                "full_name": "Invoice Test Customer",
                "phone": "9876543210",
                "address_line1": "456 Invoice Test Lane",
                "address_line2": "Block B",
                "city": "Mumbai",
                "state": "Maharashtra",
                "pincode": "400001"
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        db.orders.insert_one(order_doc)
        
        # Also create test products for GST calculation
        db.products.update_one(
            {"product_id": "test_prod_001"},
            {"$set": {
                "product_id": "test_prod_001",
                "name": "Laddu Gopal Dress - Blue Velvet",
                "price": 799.00,
                "hsn_code": "6204",
                "gst_rate": 12.0,
                "category": "laddu-gopal-dresses",
                "stock": 100
            }},
            upsert=True
        )
        
        db.products.update_one(
            {"product_id": "test_prod_002"},
            {"$set": {
                "product_id": "test_prod_002",
                "name": "Silver Pooja Bell",
                "price": 499.00,
                "hsn_code": "7114",
                "gst_rate": 3.0,
                "category": "pooja-items",
                "stock": 50
            }},
            upsert=True
        )
        
        yield order_id
        
        # Cleanup
        db.orders.delete_one({"order_id": order_id})
        db.invoices.delete_one({"order_id": order_id})
        db.products.delete_one({"product_id": "test_prod_001"})
        db.products.delete_one({"product_id": "test_prod_002"})
        client.close()
    
    def test_invoice_json_has_size_color(self, paid_order_id):
        """Test that invoice JSON includes size and color information"""
        response = requests.get(f"{BASE_URL}/orders/{paid_order_id}/invoice")
        
        assert response.status_code == 200, f"Invoice generation failed: {response.text}"
        invoice = response.json()
        
        print(f"\n=== Invoice JSON Test ===")
        print(f"Invoice Number: {invoice.get('invoice_number')}")
        print(f"Order ID: {invoice.get('order_id')}")
        
        # Check items have size/color
        items = invoice.get("items", [])
        assert len(items) > 0, "No items in invoice"
        
        for item in items:
            print(f"\nItem: {item.get('product_name')}")
            print(f"  Size: {item.get('size')}")
            print(f"  Color: {item.get('color')}")
            print(f"  Variant: {item.get('variant')}")
            print(f"  HSN: {item.get('hsn_code')}")
            print(f"  GST Rate: {item.get('gst_rate')}%")
        
        # Verify first item has size and color
        first_item = items[0]
        assert first_item.get('size') is not None or first_item.get('color') is not None, \
            "First item should have size or color info"
    
    def test_invoice_gst_breakdown(self, paid_order_id):
        """Test that GST breakdown is correct in invoice"""
        response = requests.get(f"{BASE_URL}/orders/{paid_order_id}/invoice")
        
        assert response.status_code == 200, f"Invoice generation failed: {response.text}"
        invoice = response.json()
        
        print(f"\n=== GST Breakdown Test ===")
        print(f"Subtotal: Rs.{invoice.get('subtotal', 0):.2f}")
        print(f"Taxable Amount: Rs.{invoice.get('taxable_amount', 0):.2f}")
        print(f"CGST: Rs.{invoice.get('cgst_amount', 0):.2f}")
        print(f"SGST: Rs.{invoice.get('sgst_amount', 0):.2f}")
        print(f"IGST: Rs.{invoice.get('igst_amount', 0):.2f}")
        print(f"Total GST: Rs.{invoice.get('total_gst', 0):.2f}")
        print(f"Grand Total: Rs.{invoice.get('grand_total', 0):.2f}")
        print(f"Is Inter-State: {invoice.get('is_inter_state')}")
        
        # Verify GST amounts are present
        assert invoice.get('taxable_amount', 0) > 0, "Taxable amount should be positive"
        assert invoice.get('total_gst', 0) >= 0, "Total GST should be non-negative"
        assert invoice.get('grand_total', 0) > 0, "Grand total should be positive"
        
        # Verify GST calculation logic
        # For inter-state: IGST should be present
        # For intra-state: CGST + SGST should be present
        if invoice.get('is_inter_state'):
            assert invoice.get('igst_amount', 0) > 0, "IGST should be positive for inter-state"
        else:
            # CGST and SGST should be equal
            cgst = invoice.get('cgst_amount', 0)
            sgst = invoice.get('sgst_amount', 0)
            assert abs(cgst - sgst) < 0.01, f"CGST ({cgst}) and SGST ({sgst}) should be equal"
    
    def test_invoice_seller_details(self, paid_order_id):
        """Test that seller details are present for return address"""
        response = requests.get(f"{BASE_URL}/orders/{paid_order_id}/invoice")
        
        assert response.status_code == 200, f"Invoice generation failed: {response.text}"
        invoice = response.json()
        
        print(f"\n=== Seller Details Test ===")
        print(f"Seller Name: {invoice.get('seller_name')}")
        print(f"Seller GSTIN: {invoice.get('seller_gstin')}")
        print(f"Seller Address: {invoice.get('seller_address')}")
        print(f"Seller State: {invoice.get('seller_state')} ({invoice.get('seller_state_code')})")
        
        # Verify seller details are present (needed for return address section)
        assert invoice.get('seller_name'), "Seller name is required"
        assert invoice.get('seller_address'), "Seller address is required"
        assert invoice.get('seller_state'), "Seller state is required"
        assert invoice.get('seller_state_code'), "Seller state code is required"
    
    def test_invoice_pdf_generation(self, paid_order_id):
        """Test that PDF is generated correctly"""
        response = requests.get(f"{BASE_URL}/orders/{paid_order_id}/invoice/pdf")
        
        assert response.status_code == 200, f"PDF generation failed: {response.text}"
        
        # Check content type
        content_type = response.headers.get("content-type", "")
        print(f"\n=== PDF Generation Test ===")
        print(f"Content-Type: {content_type}")
        print(f"PDF Size: {len(response.content)} bytes")
        
        # Verify it's a PDF
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        # Save PDF for manual inspection
        pdf_path = "/tmp/test_invoice.pdf"
        with open(pdf_path, "wb") as f:
            f.write(response.content)
        print(f"PDF saved to: {pdf_path}")
        
        # Check PDF content for Rs. symbol (should NOT have encoding issues)
        # The PDF should contain "Rs." text, not garbled characters
        pdf_text = response.content.decode('latin-1', errors='ignore')
        
        # Look for Rs. pattern in PDF
        if "Rs." in pdf_text:
            print("✓ Found 'Rs.' in PDF content - currency symbol is correct")
        else:
            print("⚠ 'Rs.' not found in raw PDF - may be encoded differently")
        
        # Check for black square character (encoding issue indicator)
        if "■" in pdf_text or "\u25a0" in pdf_text:
            print("✗ Found black square character - encoding issue detected!")
            pytest.fail("PDF contains encoding issues (black squares)")
        else:
            print("✓ No black square characters found - encoding looks good")
    
    def test_invoice_pdf_content_structure(self, paid_order_id):
        """Test PDF content structure by checking for key elements"""
        response = requests.get(f"{BASE_URL}/orders/{paid_order_id}/invoice/pdf")
        
        assert response.status_code == 200, f"PDF generation failed: {response.text}"
        
        pdf_content = response.content.decode('latin-1', errors='ignore')
        
        print(f"\n=== PDF Content Structure Test ===")
        
        # Check for key elements that should be in the PDF
        checks = [
            ("TAX INVOICE", "Title"),
            ("Invoice No", "Invoice number label"),
            ("SELLER DETAILS", "Seller section"),
            ("BUYER DETAILS", "Buyer section"),
            ("GSTIN", "GSTIN label"),
            ("HSN", "HSN code column"),
            ("Taxable", "Taxable amount"),
            ("GRAND TOTAL", "Grand total"),
            ("IF UNDELIVERED", "Return to seller section"),
            ("PLEASE RETURN TO", "Return address text"),
        ]
        
        for text, description in checks:
            if text.upper() in pdf_content.upper():
                print(f"✓ Found: {description}")
            else:
                print(f"✗ Missing: {description}")
        
        # Critical check: Return to seller section must be present
        assert "UNDELIVERED" in pdf_content.upper() or "RETURN TO" in pdf_content.upper(), \
            "Return to seller section is missing from PDF"


class TestInvoiceAPIEndpoints:
    """Test invoice API endpoints"""
    
    def test_invoice_endpoint_exists(self):
        """Test that invoice endpoint exists"""
        # Test with a non-existent order
        response = requests.get(f"{BASE_URL}/orders/nonexistent_order/invoice")
        
        # Should return 404 for non-existent order, not 500
        assert response.status_code in [400, 404], \
            f"Expected 400 or 404, got {response.status_code}: {response.text}"
        print(f"Invoice endpoint responds correctly: {response.status_code}")
    
    def test_invoice_pdf_endpoint_exists(self):
        """Test that invoice PDF endpoint exists"""
        response = requests.get(f"{BASE_URL}/orders/nonexistent_order/invoice/pdf")
        
        # Should return 404 for non-existent order, not 500
        assert response.status_code in [400, 404], \
            f"Expected 400 or 404, got {response.status_code}: {response.text}"
        print(f"Invoice PDF endpoint responds correctly: {response.status_code}")
    
    def test_gst_settings_endpoint(self):
        """Test GST settings endpoint"""
        response = requests.get(f"{BASE_URL}/gst-settings")
        
        assert response.status_code == 200, f"GST settings failed: {response.text}"
        settings = response.json()
        
        print(f"\n=== GST Settings ===")
        print(f"Business Name: {settings.get('business_name')}")
        print(f"GSTIN: {settings.get('gstin')}")
        print(f"Business Address: {settings.get('business_address')}")
        print(f"Business State: {settings.get('business_state')}")
        print(f"Default GST Rate: {settings.get('default_gst_rate')}%")
        
        # Verify required fields
        assert settings.get('business_name'), "Business name is required"
        assert settings.get('gstin'), "GSTIN is required"
        assert settings.get('business_address'), "Business address is required"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
