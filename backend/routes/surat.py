from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Body, Query
from typing import List, Optional
from datetime import datetime, timezone
from models import MongoBaseModel
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
import shutil
from bson import ObjectId
from pydantic import BaseModel, Field

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- Models ---
class Surat(MongoBaseModel):
    nomor_surat: str
    tanggal_surat: str # YYYY-MM-DD
    jenis_surat: str # Masuk, Keluar, SK, BA
    perihal: str
    file_path: Optional[str] = None
    related_ref: Optional[str] = None # Transaction ID or Nota Dinas
    uploaded_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SuratCreate(BaseModel):
    nomor_surat: str
    tanggal_surat: str
    jenis_surat: str
    perihal: str
    related_ref: Optional[str] = None

# --- Endpoints ---

@router.get("/", response_model=List[Surat])
async def get_surat_list(
    limit: int = 50, 
    search: Optional[str] = None, 
    jenis: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"nomor_surat": {"$regex": search, "$options": "i"}},
            {"perihal": {"$regex": search, "$options": "i"}}
        ]
    if jenis:
        query["jenis_surat"] = jenis
        
    cursor = db.surat.find(query).sort("created_at", -1).limit(limit)
    return await cursor.to_list(length=limit)

@router.post("/", response_model=Surat)
async def create_surat(
    surat_in: SuratCreate,
    current_user: str = Depends(get_current_user)
):
    # Check duplicate
    existing = await db.surat.find_one({"nomor_surat": surat_in.nomor_surat})
    if existing:
        raise HTTPException(status_code=400, detail="Nomor surat sudah ada")
        
    new_surat = Surat(**surat_in.dict(), uploaded_by=current_user)
    res = await db.surat.insert_one(new_surat.model_dump(by_alias=True, exclude=["id"]))
    return await db.surat.find_one({"_id": res.inserted_id})

@router.post("/{id}/upload")
async def upload_surat_file(
    id: str,
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    # Save file
    upload_dir = "/app/uploads/surat"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Safe filename
    safe_name = f"{id}_{file.filename.replace(' ', '_')}"
    file_path = os.path.join(upload_dir, safe_name)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Update DB
    # We store relative path or full? Let's store relative for serving
    relative_path = f"/uploads/surat/{safe_name}"
    
    await db.surat.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"file_path": relative_path}}
    )
    
    return {"message": "File uploaded", "path": relative_path}

@router.delete("/{id}")
async def delete_surat(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    res = await db.surat.delete_one({"_id": ObjectId(id)})
    if res.deleted_count == 0: raise HTTPException(status_code=404)
    return {"message": "Deleted"}
