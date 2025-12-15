from fastapi import APIRouter, HTTPException, Depends, Body
from models import SystemSettings
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- Config Endpoints ---

@router.get("/config")
async def get_system_config(current_user: str = Depends(get_current_user)):
    config = await db.system_settings.find_one({"key": "general"})
    if not config:
        # Create default
        new_config = SystemSettings(key="general")
        await db.system_settings.insert_one(new_config.dict())
        return new_config.dict()
    
    # Check if month changed, reset counter if needed (lazy reset)
    current_month_str = datetime.now(timezone.utc).strftime("%Y-%m")
    if config.get("current_month") != current_month_str:
        await db.system_settings.update_one(
            {"key": "general"},
            {"$set": {"current_month": current_month_str, "current_month_count": 0}}
        )
        config["current_month"] = current_month_str
        config["current_month_count"] = 0
        
    if "_id" in config: config["_id"] = str(config["_id"])
    return config

@router.put("/config")
async def update_system_config(data: dict = Body(...), current_user: str = Depends(get_current_user)):
    limit = data.get("monthly_upload_limit")
    if limit is None or limit < 0:
        raise HTTPException(status_code=400, detail="Invalid limit")
    
    await db.system_settings.update_one(
        {"key": "general"},
        {"$set": {"monthly_upload_limit": limit}},
        upsert=True
    )
    return {"message": "Configuration updated", "limit": limit}
