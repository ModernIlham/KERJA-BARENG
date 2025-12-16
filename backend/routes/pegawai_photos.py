from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Dict
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from models import Pegawai
import os
import shutil
from pathlib import Path
from lib.image_processor import process_image_upload

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

UPLOAD_DIR = Path("/app/uploads/pegawai")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/{id}/upload-foto")
async def upload_pegawai_foto(
    id: str, 
    file: UploadFile = File(...), 
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    pegawai = await db.pegawai.find_one({"_id": ObjectId(id)})
    if not pegawai:
        raise HTTPException(status_code=404, detail="Pegawai not found")

    try:
        # Use centralized image processor
        # It handles TinyPNG compression and quota management
        result = await process_image_upload(file, "pegawai", db)
        
        # Determine URLs
        # If optimization was skipped or failed, it returns original path
        # Result format: { "original": "...", "thumbnail": "...", "optimized": "..." }
        
        main_url = f"/api/uploads/{result['optimized']}"
        thumb_url = f"/api/uploads/{result['thumbnail']}"
        
        # Update Pegawai Record
        await db.pegawai.update_one(
            {"_id": ObjectId(id)},
            {
                "$set": {
                    "foto_url": main_url,
                    "foto_thumbnail_url": thumb_url
                }
            }
        )
        
        return {
            "message": "Foto berhasil diupload",
            "url": main_url,
            "thumbnail": thumb_url
        }
        
    except Exception as e:
        print(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}/foto")
async def delete_pegawai_foto(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    pegawai = await db.pegawai.find_one({"_id": ObjectId(id)})
    if not pegawai: raise HTTPException(status_code=404)
    
    # Try to delete files
    if pegawai.get('foto_url'):
        try:
            # Extract path from URL: /api/uploads/pegawai/xyz.jpg -> /app/uploads/pegawai/xyz.jpg
            relative_path = pegawai['foto_url'].replace('/api/uploads/', '')
            full_path = Path("/app/uploads") / relative_path
            if full_path.exists():
                os.remove(full_path)
        except Exception as e:
            print(f"Error deleting file: {e}")

    if pegawai.get('foto_thumbnail_url'):
        try:
            relative_path = pegawai['foto_thumbnail_url'].replace('/api/uploads/', '')
            full_path = Path("/app/uploads") / relative_path
            if full_path.exists():
                os.remove(full_path)
        except Exception as e:
            pass
            
    await db.pegawai.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"foto_url": None, "foto_thumbnail_url": None}}
    )
    
    return {"message": "Foto dihapus"}
