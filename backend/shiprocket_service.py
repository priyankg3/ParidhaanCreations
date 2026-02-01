"""
Shiprocket Integration Service
Handles all shipping operations with Shiprocket API
"""

import os
import httpx
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

# Shiprocket API Configuration
SHIPROCKET_EMAIL = os.environ.get("SHIPROCKET_EMAIL")
SHIPROCKET_PASSWORD = os.environ.get("SHIPROCKET_PASSWORD")
SHIPROCKET_API_URL = os.environ.get("SHIPROCKET_API_URL", "https://apiv2.shiprocket.in/v1/external")

class ShiprocketAuth:
    """Handles Shiprocket API authentication with token caching"""
    
    _token: Optional[str] = None
    _token_expiry: Optional[datetime] = None
    
    @classmethod
    async def get_token(cls) -> str:
        """Get valid Shiprocket token, refreshing if necessary"""
        # Check if token is valid
        if cls._token and cls._token_expiry and datetime.now(timezone.utc) < cls._token_expiry:
            return cls._token
        
        # Get new token
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SHIPROCKET_API_URL}/auth/login",
                json={
                    "email": SHIPROCKET_EMAIL,
                    "password": SHIPROCKET_PASSWORD
                }
            )
            
            if response.status_code != 200:
                raise Exception(f"Shiprocket authentication failed: {response.text}")
            
            data = response.json()
            cls._token = data.get("token")
            # Token valid for 10 days, refresh after 9 days
            cls._token_expiry = datetime.now(timezone.utc) + timedelta(days=9)
            
            return cls._token
    
    @classmethod
    async def get_headers(cls) -> dict:
        """Get headers with valid authorization token"""
        token = await cls.get_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }


class ShiprocketService:
    """Main Shiprocket service for order and shipment management"""
    
    @staticmethod
    async def create_shiprocket_order(order: Dict[str, Any], pickup_location: str = "Primary") -> Dict[str, Any]:
        """
        Create order in Shiprocket
        Returns: shiprocket_order_id, shipment_id
        """
        headers = await ShiprocketAuth.get_headers()
        
        # Calculate total weight from items
        total_weight = sum(
            item.get("weight", 0.5) * item.get("quantity", 1) 
            for item in order.get("items", [])
        )
        total_weight = max(0.5, total_weight)  # Minimum 500g
        
        # Prepare order items for Shiprocket
        order_items = []
        for item in order.get("items", []):
            order_items.append({
                "name": item.get("product_name", "Product"),
                "sku": item.get("product_id", "SKU001"),
                "units": item.get("quantity", 1),
                "selling_price": item.get("price", 0),
                "discount": 0,
                "tax": 0,
                "hsn": item.get("hsn_code", "")
            })
        
        # Get shipping address
        shipping = order.get("shipping_address", {})
        
        payload = {
            "order_id": order.get("order_id"),
            "order_date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
            "pickup_location": pickup_location,
            "channel_id": "",
            "comment": f"Order from Paridhaan Creations - {order.get('order_id')}",
            "billing_customer_name": shipping.get("full_name", ""),
            "billing_last_name": "",
            "billing_address": shipping.get("address_line1", ""),
            "billing_address_2": shipping.get("address_line2", ""),
            "billing_city": shipping.get("city", ""),
            "billing_pincode": shipping.get("pincode", ""),
            "billing_state": shipping.get("state", ""),
            "billing_country": "India",
            "billing_email": order.get("guest_email", ""),
            "billing_phone": shipping.get("phone", ""),
            "shipping_is_billing": True,
            "shipping_customer_name": shipping.get("full_name", ""),
            "shipping_last_name": "",
            "shipping_address": shipping.get("address_line1", ""),
            "shipping_address_2": shipping.get("address_line2", ""),
            "shipping_city": shipping.get("city", ""),
            "shipping_pincode": shipping.get("pincode", ""),
            "shipping_state": shipping.get("state", ""),
            "shipping_country": "India",
            "shipping_email": order.get("guest_email", ""),
            "shipping_phone": shipping.get("phone", ""),
            "order_items": order_items,
            "payment_method": "Prepaid",
            "shipping_charges": 0,
            "giftwrap_charges": 0,
            "transaction_charges": 0,
            "total_discount": order.get("discount_amount", 0),
            "sub_total": order.get("total_amount", 0),
            "length": 15,
            "breadth": 12,
            "height": 8,
            "weight": total_weight
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SHIPROCKET_API_URL}/orders/create/adhoc",
                json=payload,
                headers=headers
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to create Shiprocket order: {response.text}")
            
            return response.json()
    
    @staticmethod
    async def get_available_couriers(
        pickup_pincode: str,
        delivery_pincode: str,
        weight: float,
        cod: int = 0
    ) -> List[Dict[str, Any]]:
        """Get available courier services with rates"""
        headers = await ShiprocketAuth.get_headers()
        
        params = {
            "pickup_postcode": pickup_pincode,
            "delivery_postcode": delivery_pincode,
            "weight": weight,
            "cod": cod
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SHIPROCKET_API_URL}/courier/serviceability/",
                params=params,
                headers=headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to get couriers: {response.text}")
            
            data = response.json()
            couriers = data.get("data", {}).get("available_courier_companies", [])
            
            # Sort by rate (cheapest first)
            return sorted(couriers, key=lambda x: x.get("rate", float('inf')))
    
    @staticmethod
    async def assign_awb(shipment_id: int, courier_id: int) -> Dict[str, Any]:
        """Assign courier and generate AWB number"""
        headers = await ShiprocketAuth.get_headers()
        
        payload = {
            "shipment_id": shipment_id,
            "courier_id": courier_id
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SHIPROCKET_API_URL}/courier/assign/awb",
                json=payload,
                headers=headers
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to assign AWB: {response.text}")
            
            return response.json()
    
    @staticmethod
    async def generate_label(shipment_id: int) -> Dict[str, Any]:
        """Generate shipping label PDF"""
        headers = await ShiprocketAuth.get_headers()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SHIPROCKET_API_URL}/courier/generate/label",
                json={"shipment_id": [shipment_id]},
                headers=headers
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to generate label: {response.text}")
            
            return response.json()
    
    @staticmethod
    async def generate_manifest(shipment_id: int) -> Dict[str, Any]:
        """Generate manifest PDF"""
        headers = await ShiprocketAuth.get_headers()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SHIPROCKET_API_URL}/manifests/generate",
                json={"shipment_id": [shipment_id]},
                headers=headers
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to generate manifest: {response.text}")
            
            return response.json()
    
    @staticmethod
    async def schedule_pickup(shipment_id: int) -> Dict[str, Any]:
        """Schedule pickup for shipment"""
        headers = await ShiprocketAuth.get_headers()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SHIPROCKET_API_URL}/courier/generate/pickup",
                json={"shipment_id": [shipment_id]},
                headers=headers
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to schedule pickup: {response.text}")
            
            return response.json()
    
    @staticmethod
    async def track_shipment(awb_number: str) -> Dict[str, Any]:
        """Track shipment by AWB number"""
        headers = await ShiprocketAuth.get_headers()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SHIPROCKET_API_URL}/courier/track/awb/{awb_number}",
                headers=headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to track shipment: {response.text}")
            
            return response.json()
    
    @staticmethod
    async def track_by_order_id(order_id: str) -> Dict[str, Any]:
        """Track shipment by order ID"""
        headers = await ShiprocketAuth.get_headers()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SHIPROCKET_API_URL}/courier/track",
                params={"order_id": order_id},
                headers=headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to track shipment: {response.text}")
            
            return response.json()
    
    @staticmethod
    async def cancel_order(shiprocket_order_id: int) -> Dict[str, Any]:
        """Cancel order in Shiprocket"""
        headers = await ShiprocketAuth.get_headers()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{SHIPROCKET_API_URL}/orders/cancel",
                json={"ids": [shiprocket_order_id]},
                headers=headers
            )
            
            if response.status_code not in [200, 201]:
                raise Exception(f"Failed to cancel order: {response.text}")
            
            return response.json()
    
    @staticmethod
    async def get_pickup_locations() -> List[Dict[str, Any]]:
        """Get all pickup locations"""
        headers = await ShiprocketAuth.get_headers()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SHIPROCKET_API_URL}/settings/company/pickup",
                headers=headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to get pickup locations: {response.text}")
            
            data = response.json()
            return data.get("data", {}).get("shipping_address", [])
    
    @staticmethod
    async def get_channels() -> List[Dict[str, Any]]:
        """Get all sales channels"""
        headers = await ShiprocketAuth.get_headers()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{SHIPROCKET_API_URL}/channels",
                headers=headers
            )
            
            if response.status_code != 200:
                raise Exception(f"Failed to get channels: {response.text}")
            
            return response.json().get("data", [])


# Shipment status mapping
SHIPROCKET_STATUS_MAP = {
    1: "pickup_pending",
    2: "pickup_scheduled", 
    3: "pickup_generated",
    4: "pickup_queued",
    5: "manifest_generated",
    6: "shipped",
    7: "in_transit",
    8: "out_for_delivery",
    9: "delivered",
    10: "cancelled",
    11: "rto_initiated",
    12: "rto_delivered",
    13: "lost",
    14: "damaged"
}

def get_status_label(status_code: int) -> str:
    """Get human-readable status label"""
    return SHIPROCKET_STATUS_MAP.get(status_code, "unknown")
