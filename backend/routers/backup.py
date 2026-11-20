# Database Backup Router
from fastapi import APIRouter, HTTPException, Header, Cookie
from typing import Optional

router = APIRouter(prefix="/admin/backup", tags=["Backup"])

db = None
require_admin = None
create_backup_func = None
restore_backup_func = None
get_backup_history_func = None

def init_router(database, admin_checker, backup_funcs):
    global db, require_admin, create_backup_func, restore_backup_func, get_backup_history_func
    db = database
    require_admin = admin_checker
    create_backup_func = backup_funcs.get("create")
    restore_backup_func = backup_funcs.get("restore")
    get_backup_history_func = backup_funcs.get("history")

@router.post("")
async def create_database_backup(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Create a full database backup to Cloudinary (Admin only)"""
    await require_admin(authorization, session_token)
    
    if not create_backup_func:
        raise HTTPException(status_code=500, detail="Backup service not configured")
    
    result = await create_backup_func(db)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Backup failed"))
    
    return result

@router.post("/restore")
async def restore_database_backup(
    backup_url: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Restore database from Cloudinary backup (Admin only)"""
    await require_admin(authorization, session_token)
    
    if not restore_backup_func:
        raise HTTPException(status_code=500, detail="Restore service not configured")
    
    result = await restore_backup_func(db, backup_url)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Restore failed"))
    
    return result

@router.get("/history")
async def get_backup_list(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get list of all database backups (Admin only)"""
    await require_admin(authorization, session_token)
    
    if not get_backup_history_func:
        return []
    
    return get_backup_history_func()

@router.get("/status")
async def get_backup_status(
    authorization: Optional[str] = Header(None),
    session_token: Optional[str] = Cookie(None)
):
    """Get current database status and backup info (Admin only)"""
    await require_admin(authorization, session_token)
    
    # Count documents in each collection
    counts = {}
    for collection_name in ["products", "categories", "banners", "collections", "coupons", "orders", "users"]:
        try:
            counts[collection_name] = await db[collection_name].count_documents({})
        except Exception:
            counts[collection_name] = 0
    
    # Get latest backup info
    backups = get_backup_history_func() if get_backup_history_func else []
    latest_backup = backups[0] if backups else None
    
    return {
        "database_status": "connected",
        "collections": counts,
        "total_documents": sum(counts.values()),
        "latest_backup": latest_backup,
        "backup_count": len(backups)
    }
