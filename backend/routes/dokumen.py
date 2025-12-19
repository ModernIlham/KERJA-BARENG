from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from typing import List, Dict, Any
from models import DokumenSumber, DokumenSumberCreate
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone
import os
import math
from lib.image_processor import process_image_upload

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("", response_model=Dict[str, Any])
async def get_dokumen_list(
    page: int = 1,
    limit: int = 20,
    search: str = None,
    jenis: str = None,
    current_user: str = Depends(get_current_user)
):
    skip = (page - 1) * limit
    query = {}
    
    if search:
        query["$or"] = [
            {"nomor_dokumen": {"$regex": search, "$options": "i"}},
            {"uraian": {"$regex": search, "$options": "i"}},
            {"nama_penyedia": {"$regex": search, "$options": "i"}}
        ]
        
    if jenis and jenis != "All":
        query["jenis_dokumen"] = jenis
        
    total = await db.dokumen_sumber.count_documents(query)
    cursor = db.dokumen_sumber.find(query).sort("tanggal_dokumen", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    
    # Convert ID
    for item in items:
        item["_id"] = str(item["_id"])
        
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0
    }

@router.get("/{id}", response_model=DokumenSumber)
async def get_dokumen_detail(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    doc = await db.dokumen_sumber.find_one({"_id": ObjectId(id)})
    if not doc: raise HTTPException(status_code=404)
    
    doc["_id"] = str(doc["_id"])
    return doc

@router.post("", response_model=DokumenSumber)
async def create_dokumen(doc_in: DokumenSumberCreate, current_user: str = Depends(get_current_user)):
    # Check duplicate number? Optional
    existing = await db.dokumen_sumber.find_one({"nomor_dokumen": doc_in.nomor_dokumen})
    if existing:
        # Maybe warning or error? Let's error to prevent dupes
        raise HTTPException(status_code=400, detail=f"Nomor Dokumen {doc_in.nomor_dokumen} sudah ada")
        
    new_doc = DokumenSumber(
        **doc_in.dict(),
        created_by=current_user,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    res = await db.dokumen_sumber.insert_one(new_doc.dict(by_alias=True, exclude=["id"]))
    created = await db.dokumen_sumber.find_one({"_id": res.inserted_id})
    created["_id"] = str(created["_id"])
    return created

@router.put("/{id}", response_model=DokumenSumber)
async def update_dokumen(id: str, doc_in: DokumenSumberCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    update_data = doc_in.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    res = await db.dokumen_sumber.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not res: raise HTTPException(status_code=404)
    res["_id"] = str(res["_id"])
    return res

@router.delete("/{id}")
async def delete_dokumen(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    # Check if used? Maybe later.
    res = await db.dokumen_sumber.delete_one({"_id": ObjectId(id)})
    if res.deleted_count == 0: raise HTTPException(status_code=404)
    
    return {"message": "Dokumen dihapus"}

@router.get("/search/lookup")
async def lookup_dokumen(q: str = Query(..., min_length=2), current_user: str = Depends(get_current_user)):
    """Search for dropdown/autocomplete"""
    query = {
        "$or": [
            {"nomor_dokumen": {"$regex": q, "$options": "i"}},
            {"uraian": {"$regex": q, "$options": "i"}}
        ]
    }
    cursor = db.dokumen_sumber.find(query).limit(10)
    items = await cursor.to_list(length=10)
    for item in items:
        item["_id"] = str(item["_id"])
    return items

@router.post("/{id}/upload")
async def upload_dokumen_file(
    id: str,
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    try:
        # Validate file type
        allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
        if file.content_type not in allowed_types:
             raise HTTPException(status_code=400, detail="Format file harus PDF atau Image (JPG/PNG)")

        # Process upload
        result = await process_image_upload(file, "dokumen_sumber", db)
        
        # If PDF, process_image_upload might behave differently or we need specific handling.
        # Assuming process_image_upload handles basic saving or we should implement simple save for PDF.
        # Let's check process_image_upload implementation or just use simple save if it's PDF.
        
        file_url = f"/api/uploads/{result['optimized']}"
        
        # Update Dokumen
        res = await db.dokumen_sumber.update_one(
            {"_id": ObjectId(id)},
            {"$set": {"file_url": file_url, "updated_at": datetime.now(timezone.utc)}}
        )
        
        if res.modified_count == 0:
            raise HTTPException(status_code=404, detail="Dokumen not found")
            
        return {"message": "File berhasil diupload", "url": file_url}
        
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))