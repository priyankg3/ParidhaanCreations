"""
Database Backup Service for Paridhaan Creations
- Backs up MongoDB data to Cloudinary (JSON format)
- Auto-restores on server startup
- Ensures product data persists across forks
- No more data loss!
"""

import os
import json
import logging
import cloudinary
import cloudinary.uploader
import cloudinary.api
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Collections to backup (critical business data)
BACKUP_COLLECTIONS = [
    "products",
    "categories", 
    "banners",
    "collections",
    "coupons",
    "site_settings",
    "gst_settings"
]

# Cloudinary folder for backups
BACKUP_FOLDER = "paridhaan/db_backups"
BACKUP_PUBLIC_ID = f"{BACKUP_FOLDER}/latest_backup"


async def create_backup(db) -> Dict[str, Any]:
    """
    Create a full backup of critical collections and upload to Cloudinary.
    Returns backup metadata.
    """
    try:
        backup_data = {
            "backup_timestamp": datetime.now(timezone.utc).isoformat(),
            "backup_version": "1.0",
            "collections": {}
        }
        
        # Export each collection
        for collection_name in BACKUP_COLLECTIONS:
            try:
                collection = db[collection_name]
                documents = await collection.find({}, {"_id": 0}).to_list(10000)
                backup_data["collections"][collection_name] = documents
                logger.info(f"Backed up {len(documents)} documents from {collection_name}")
            except Exception as e:
                logger.warning(f"Could not backup {collection_name}: {e}")
                backup_data["collections"][collection_name] = []
        
        # Convert to JSON
        json_data = json.dumps(backup_data, indent=2, default=str)
        
        # Upload to Cloudinary as raw file
        result = cloudinary.uploader.upload(
            json_data.encode('utf-8'),
            public_id=BACKUP_PUBLIC_ID,
            resource_type="raw",
            overwrite=True,
            format="json",
            invalidate=True
        )
        
        logger.info(f"✅ Database backup uploaded to Cloudinary: {result.get('secure_url')}")
        
        # Also create a timestamped backup for history
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        history_public_id = f"{BACKUP_FOLDER}/backup_{timestamp}"
        cloudinary.uploader.upload(
            json_data.encode('utf-8'),
            public_id=history_public_id,
            resource_type="raw",
            format="json"
        )
        
        return {
            "success": True,
            "backup_url": result.get("secure_url"),
            "backup_id": result.get("public_id"),
            "timestamp": backup_data["backup_timestamp"],
            "collections_backed_up": list(backup_data["collections"].keys()),
            "total_documents": sum(len(docs) for docs in backup_data["collections"].values())
        }
        
    except Exception as e:
        logger.error(f"❌ Backup failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


async def restore_backup(db, backup_url: Optional[str] = None) -> Dict[str, Any]:
    """
    Restore database from Cloudinary backup.
    If no URL provided, restores from latest backup.
    """
    try:
        import httpx
        
        # Get backup URL
        if not backup_url:
            # Try to get the latest backup URL from Cloudinary
            try:
                # Try with .json extension first
                resource = cloudinary.api.resource(
                    f"{BACKUP_PUBLIC_ID}.json",
                    resource_type="raw"
                )
                backup_url = resource.get("secure_url")
            except Exception as e1:
                try:
                    # Try without extension
                    resource = cloudinary.api.resource(
                        BACKUP_PUBLIC_ID,
                        resource_type="raw"
                    )
                    backup_url = resource.get("secure_url")
                except Exception as e2:
                    logger.warning(f"No existing backup found: {e2}")
                    return {
                        "success": False,
                        "error": "No backup found to restore",
                        "message": "This might be a fresh installation. Add products via Admin Dashboard."
                    }
        
        logger.info(f"Restoring from: {backup_url}")
        
        # Download backup JSON
        async with httpx.AsyncClient() as client:
            response = await client.get(backup_url, timeout=30.0)
            response.raise_for_status()
            backup_data = response.json()
        
        restored_counts = {}
        
        # Restore each collection
        for collection_name, documents in backup_data.get("collections", {}).items():
            if not documents:
                restored_counts[collection_name] = 0
                continue
                
            try:
                collection = db[collection_name]
                
                # Clear existing data (to avoid duplicates)
                await collection.delete_many({})
                
                # Insert backed up documents
                if documents:
                    await collection.insert_many(documents)
                
                restored_counts[collection_name] = len(documents)
                logger.info(f"✅ Restored {len(documents)} documents to {collection_name}")
                
            except Exception as e:
                logger.error(f"Failed to restore {collection_name}: {e}")
                restored_counts[collection_name] = f"Error: {str(e)}"
        
        return {
            "success": True,
            "backup_timestamp": backup_data.get("backup_timestamp"),
            "restored_collections": restored_counts,
            "total_restored": sum(v for v in restored_counts.values() if isinstance(v, int))
        }
        
    except Exception as e:
        logger.error(f"❌ Restore failed: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }


async def check_and_auto_restore(db) -> Dict[str, Any]:
    """
    Check if database is empty and auto-restore from backup if available.
    Called on server startup.
    """
    try:
        # Check if products collection is empty
        products_count = await db.products.count_documents({})
        
        if products_count > 0:
            logger.info(f"Database has {products_count} products. Skipping auto-restore.")
            return {
                "action": "skipped",
                "reason": f"Database already has {products_count} products"
            }
        
        logger.info("Database is empty. Attempting auto-restore from backup...")
        
        # Try to restore
        result = await restore_backup(db)
        
        if result.get("success"):
            logger.info(f"✅ Auto-restore successful! Restored {result.get('total_restored')} documents.")
        else:
            logger.info(f"No backup to restore: {result.get('error')}")
        
        return {
            "action": "restored" if result.get("success") else "no_backup",
            "result": result
        }
        
    except Exception as e:
        logger.error(f"Auto-restore check failed: {e}")
        return {
            "action": "error",
            "error": str(e)
        }


def get_backup_history() -> List[Dict[str, Any]]:
    """Get list of all backups from Cloudinary"""
    try:
        result = cloudinary.api.resources(
            type="upload",
            resource_type="raw",
            prefix=BACKUP_FOLDER,
            max_results=20
        )
        
        backups = []
        for resource in result.get("resources", []):
            backups.append({
                "public_id": resource.get("public_id"),
                "url": resource.get("secure_url"),
                "created_at": resource.get("created_at"),
                "bytes": resource.get("bytes")
            })
        
        return sorted(backups, key=lambda x: x.get("created_at", ""), reverse=True)
        
    except Exception as e:
        logger.error(f"Failed to get backup history: {e}")
        return []
