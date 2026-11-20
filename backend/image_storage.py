"""
Persistent Image Storage Service for Paridhaan Creations
- Stores images directly in MongoDB (GridFS-like approach)
- Images survive forks and deployments
- Automatic compression for web performance
"""

import os
import uuid
import base64
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple
from io import BytesIO

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Try to import PIL for compression
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logger.warning("PIL not available. Images will be stored without compression.")

# Maximum image size (2MB after compression)
MAX_IMAGE_SIZE = 2 * 1024 * 1024
# Target quality for compression
TARGET_QUALITY = 85
# Maximum dimensions
MAX_DIMENSION = 1200


def compress_image_for_storage(image_data: bytes, filename: str = "") -> Tuple[bytes, str, str]:
    """
    Compress image for efficient storage in MongoDB.
    Returns: (compressed_data, mime_type, extension)
    """
    if not PIL_AVAILABLE:
        # Guess mime type from filename
        ext = filename.split('.')[-1].lower() if '.' in filename else 'jpg'
        mime_type = f"image/{ext}" if ext in ['jpg', 'jpeg', 'png', 'gif', 'webp'] else "image/jpeg"
        return image_data, mime_type, ext
    
    try:
        img = Image.open(BytesIO(image_data))
        
        # Convert RGBA to RGB for JPEG
        if img.mode in ('RGBA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if too large
        if img.width > MAX_DIMENSION or img.height > MAX_DIMENSION:
            ratio = min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height)
            new_size = (int(img.width * ratio), int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        
        # Compress to WebP (best compression)
        output = BytesIO()
        img.save(output, format='WEBP', quality=TARGET_QUALITY, optimize=True)
        compressed = output.getvalue()
        
        # If still too large, reduce quality further
        quality = TARGET_QUALITY
        while len(compressed) > MAX_IMAGE_SIZE and quality > 30:
            quality -= 10
            output = BytesIO()
            img.save(output, format='WEBP', quality=quality, optimize=True)
            compressed = output.getvalue()
        
        logger.info(f"Image compressed: {len(image_data)} -> {len(compressed)} bytes ({(1-len(compressed)/len(image_data))*100:.1f}% reduction)")
        
        return compressed, "image/webp", "webp"
        
    except Exception as e:
        logger.error(f"Compression failed: {e}. Using original image.")
        ext = filename.split('.')[-1].lower() if '.' in filename else 'jpg'
        mime_type = f"image/{ext}" if ext in ['jpg', 'jpeg', 'png', 'gif', 'webp'] else "image/jpeg"
        return image_data, mime_type, ext


async def store_image_in_db(db, image_data: bytes, filename: str, category: str = "product") -> dict:
    """
    Store image in MongoDB and return image info with permanent URL.
    
    Args:
        db: MongoDB database connection
        image_data: Raw image bytes
        filename: Original filename
        category: Type of image (product, banner, logo, etc.)
    
    Returns:
        dict with image_id, url, and metadata
    """
    # Compress image
    compressed_data, mime_type, ext = compress_image_for_storage(image_data, filename)
    
    # Generate unique ID
    image_id = f"img_{uuid.uuid4().hex[:16]}"
    
    # Convert to base64 for storage
    base64_data = base64.b64encode(compressed_data).decode('utf-8')
    
    # Store in database
    image_doc = {
        "image_id": image_id,
        "filename": f"{image_id}.{ext}",
        "original_filename": filename,
        "mime_type": mime_type,
        "category": category,
        "data": base64_data,
        "size_bytes": len(compressed_data),
        "original_size_bytes": len(image_data),
        "created_at": datetime.now(timezone.utc),
        "is_active": True
    }
    
    await db.images.insert_one(image_doc)
    
    logger.info(f"Image stored: {image_id} ({category}) - {len(compressed_data)} bytes")
    
    return {
        "image_id": image_id,
        "url": f"/api/images/{image_id}",
        "filename": image_doc["filename"],
        "mime_type": mime_type,
        "size_bytes": len(compressed_data),
        "original_size_bytes": len(image_data),
        "compression_ratio": f"{(1-len(compressed_data)/len(image_data))*100:.1f}%"
    }


async def get_image_from_db(db, image_id: str) -> Optional[dict]:
    """
    Retrieve image from MongoDB.
    
    Returns:
        dict with data (bytes), mime_type, filename or None if not found
    """
    image_doc = await db.images.find_one(
        {"image_id": image_id, "is_active": True},
        {"_id": 0, "data": 1, "mime_type": 1, "filename": 1}
    )
    
    if not image_doc:
        return None
    
    # Decode base64 data
    image_data = base64.b64decode(image_doc["data"])
    
    return {
        "data": image_data,
        "mime_type": image_doc["mime_type"],
        "filename": image_doc["filename"]
    }


async def delete_image_from_db(db, image_id: str) -> bool:
    """
    Soft delete image from MongoDB.
    """
    result = await db.images.update_one(
        {"image_id": image_id},
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc)}}
    )
    return result.modified_count > 0


async def get_image_stats(db) -> dict:
    """
    Get statistics about stored images.
    """
    pipeline = [
        {"$match": {"is_active": True}},
        {"$group": {
            "_id": "$category",
            "count": {"$sum": 1},
            "total_size": {"$sum": "$size_bytes"}
        }}
    ]
    
    stats = await db.images.aggregate(pipeline).to_list(100)
    
    total_count = sum(s["count"] for s in stats)
    total_size = sum(s["total_size"] for s in stats)
    
    return {
        "total_images": total_count,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "by_category": {s["_id"]: {"count": s["count"], "size_mb": round(s["total_size"] / (1024 * 1024), 2)} for s in stats}
    }
