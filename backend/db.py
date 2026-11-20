"""
Lazy MongoDB connection helper used by the few routers that were ported
from a different Emergent architecture and call `from db import get_database`
instead of accepting the db through `init_router(...)`.

Keeping this a thin shim means we don't have to rewrite those routers.
Import-time side effects are avoided: the client is only created on the
first call to get_database(), which runs after server.py's load_dotenv().
"""

import os
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


def _ensure() -> AsyncIOMotorDatabase:
    global _client, _db
    if _db is not None:
        return _db
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "paridhaan_db")
    if not mongo_url:
        raise RuntimeError(
            "MONGO_URL env var is not set. The backend cannot reach MongoDB."
        )
    _client = AsyncIOMotorClient(mongo_url)
    _db = _client[db_name]
    return _db


async def get_database() -> AsyncIOMotorDatabase:
    return _ensure()
