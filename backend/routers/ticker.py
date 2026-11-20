# Ticker Router - Manage scrolling ticker messages
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
import os

router = APIRouter(prefix="/ticker", tags=["Ticker"])

# Get database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "spiritual_bazaar")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

class TickerMessage(BaseModel):
    text: str
    icon: Optional[str] = "✨"
    is_active: bool = True
    order: Optional[int] = 0

@router.get("")
async def get_ticker_messages():
    """Get all active ticker messages"""
    messages = await db.ticker_messages.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(50)
    return messages

@router.get("/all")
async def get_all_ticker_messages():
    """Get all ticker messages (admin)"""
    messages = await db.ticker_messages.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    return messages

@router.post("")
async def create_ticker_message(message: TickerMessage):
    """Create a new ticker message"""
    message_data = {
        "message_id": f"ticker_{uuid.uuid4().hex[:12]}",
        "text": message.text,
        "icon": message.icon,
        "is_active": message.is_active,
        "order": message.order,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.ticker_messages.insert_one(message_data)
    return {"message": "Ticker message created", "message_id": message_data["message_id"]}

@router.put("/{message_id}")
async def update_ticker_message(message_id: str, message: TickerMessage):
    """Update a ticker message"""
    result = await db.ticker_messages.update_one(
        {"message_id": message_id},
        {"$set": {
            "text": message.text,
            "icon": message.icon,
            "is_active": message.is_active,
            "order": message.order,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Ticker message updated"}

@router.delete("/{message_id}")
async def delete_ticker_message(message_id: str):
    """Delete a ticker message"""
    result = await db.ticker_messages.delete_one({"message_id": message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Ticker message deleted"}
