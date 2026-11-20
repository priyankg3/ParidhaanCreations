"""
Cloudinary Image Storage Service for Paridhaan Creations
- Permanent cloud storage for all images
- Images accessible forever via Cloudinary CDN
- Automatic optimization and compression
- URLs never change, no dependency on Emergent
"""

import os
import time
import logging
import cloudinary
import cloudinary.uploader
import cloudinary.utils
from typing import Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Cloudinary
def init_cloudinary():
    """Initialize Cloudinary with credentials from environment"""
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    api_secret = os.environ.get("CLOUDINARY_API_SECRET")
    
    if not all([cloud_name, api_key, api_secret]):
        logger.warning("Cloudinary credentials not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env")
        return False
    
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True
    )
    
    logger.info(f"Cloudinary initialized with cloud: {cloud_name}")
    return True

# Check if Cloudinary is configured
def is_cloudinary_configured() -> bool:
    """Check if Cloudinary credentials are set"""
    return all([
        os.environ.get("CLOUDINARY_CLOUD_NAME"),
        os.environ.get("CLOUDINARY_API_KEY"),
        os.environ.get("CLOUDINARY_API_SECRET")
    ])

# Generate signed upload parameters
def generate_upload_signature(folder: str = "paridhaan", resource_type: str = "image") -> Dict[str, Any]:
    """Generate signature for frontend direct upload to Cloudinary"""
    
    if not is_cloudinary_configured():
        raise ValueError("Cloudinary not configured")
    
    timestamp = int(time.time())
    
    params = {
        "timestamp": timestamp,
        "folder": folder,
    }
    
    signature = cloudinary.utils.api_sign_request(
        params,
        os.environ.get("CLOUDINARY_API_SECRET")
    )
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.environ.get("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.environ.get("CLOUDINARY_API_KEY"),
        "folder": folder,
        "resource_type": resource_type
    }

# Direct backend upload (for server-side uploads)
async def upload_to_cloudinary(
    file_data: bytes,
    filename: str,
    folder: str = "paridhaan/products",
    resource_type: str = "image"
) -> Dict[str, Any]:
    """
    Upload image directly from backend to Cloudinary.
    Returns permanent Cloudinary URL.
    """
    
    if not is_cloudinary_configured():
        logger.error("Cloudinary not configured!")
        raise ValueError("Cloudinary credentials not set. Please configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET")
    
    try:
        # Generate public_id from filename
        import uuid
        public_id = f"{folder}/{uuid.uuid4().hex[:12]}"
        
        # Upload to Cloudinary
        result = cloudinary.uploader.upload(
            file_data,
            public_id=public_id,
            folder=None,  # Already included in public_id
            resource_type=resource_type,
            overwrite=True,
            # Optimization settings
            quality="auto",
            fetch_format="auto",
            # Transformation for web optimization
            transformation=[
                {"width": 1200, "height": 1200, "crop": "limit"},
                {"quality": "auto:good"},
                {"fetch_format": "auto"}
            ]
        )
        
        logger.info(f"Cloudinary upload success: {result.get('public_id')} - {result.get('secure_url')}")
        
        return {
            "success": True,
            "url": result.get("secure_url"),  # HTTPS URL that never changes
            "public_id": result.get("public_id"),
            "format": result.get("format"),
            "width": result.get("width"),
            "height": result.get("height"),
            "bytes": result.get("bytes"),
            "resource_type": result.get("resource_type"),
            "created_at": result.get("created_at")
        }
        
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {str(e)}")
        raise

# Delete image from Cloudinary
async def delete_from_cloudinary(public_id: str) -> bool:
    """Delete image from Cloudinary"""
    
    if not is_cloudinary_configured():
        return False
    
    try:
        result = cloudinary.uploader.destroy(public_id, invalidate=True)
        return result.get("result") == "ok"
    except Exception as e:
        logger.error(f"Cloudinary delete failed: {str(e)}")
        return False

# Get optimized URL with transformations
def get_optimized_url(public_id: str, width: int = None, height: int = None) -> str:
    """Get optimized Cloudinary URL with transformations"""
    
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    
    transformations = "q_auto,f_auto"
    if width:
        transformations += f",w_{width}"
    if height:
        transformations += f",h_{height}"
    
    return f"https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}"

# Initialize on module load
init_cloudinary()
