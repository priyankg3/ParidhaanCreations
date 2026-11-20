"""
Shim module providing `get_current_user` and `require_admin` as plain
async functions (not FastAPI dependencies).

The routers in this project are imported in two different styles:

1. Most routers accept helpers via `init_router(db, require_admin, ...)`
   — these use server.py's own `require_admin` from the request pipeline.

2. A few (notably `routers/banners_v2.py`) were ported from a different
   Emergent architecture and do `from auth import get_current_user, require_admin`
   at import time, then call them manually with `authorization` /
   `session_token` kwargs.

This module exists so (2) keeps compiling without rewriting those files.
It reads the session the same way server.py does, against the same db.
"""

import os
from typing import Optional, Dict, Any

from fastapi import HTTPException

from db import _ensure as _get_db

ADMIN_EMAILS = {
    e.strip().lower()
    for e in os.environ.get("ADMIN_EMAILS", "priyankg3@gmail.com").split(",")
    if e.strip()
}


async def get_current_user(
    authorization: Optional[str] = None,
    session_token: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Return the user document for a valid session cookie, or None."""
    if not session_token and authorization:
        # Allow `Authorization: Bearer <token>` as a fallback for API clients.
        if authorization.lower().startswith("bearer "):
            session_token = authorization.split(" ", 1)[1].strip()
    if not session_token:
        return None

    db = _get_db()
    session = await db.sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        return None
    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    return user


async def require_admin(
    authorization: Optional[str] = None,
    session_token: Optional[str] = None,
) -> Dict[str, Any]:
    """Raise 401/403 unless the caller has an admin session."""
    user = await get_current_user(authorization, session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    if not user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
