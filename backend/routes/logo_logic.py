from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Dict
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from pathlib import Path
from lib.image_processor import process_image_upload

# We'll attach this to the existing settings router or creating a new one if needed.
# Since settings.py is already large, maybe keep logic there or import.
# For simplicity, let's implement the logic inside settings.py directly since it shares the router.

async def handle_logo_upload(file: UploadFile, db):
    # Process
    result = await process_image_upload(file, "instansi", db)
    
    # URLs
    main_url = f"/api/uploads/{result['optimized']}"
    
    # Update Settings
    await db.system_settings.update_one(
        {"key": "instansi"},
        {"$set": {"logo_url": main_url}},
        upsert=True
    )
    
    return {"message": "Logo uploaded", "url": main_url}
