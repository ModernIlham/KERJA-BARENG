from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Body
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from models import Persediaan, PersediaanCreate, TransaksiPersediaan, TransaksiPersediaanCreate
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime, timezone
import pandas as pd
import io
import math

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

def clean_currency(value):
    if value is None: return 0.0
    if isinstance(value, (int, float)):
        if math.isnan(value) or math.isinf(value): return 0.0
        return float(value)
    if isinstance(value, str):
        clean = value.replace('Rp', '').replace('.', '').replace(',', '').strip()
        if not clean: return 0.0
        try: return float(clean)
        except ValueError: return 0.0
    return 0.0

def clean_code_str(val):
    if val is None: return ""
    s = str(val).strip()
    if s.endswith(".0"): return s[:-2]
    return s

def sanitize_json(data):
    if isinstance(data, list):
        return [sanitize_json(item) for item in data]
    elif isinstance(data, dict):
        return {k: sanitize_json(v) for k, v in data.items()}
    elif isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, float) and (math.isnan(data) or math.isinf(data)):
        return None
    return data

async def get_golongan_uraian(kode_barang: str):
    if not kode_barang or len(kode_barang) < 1: return None
    prefix = kode_barang[0]
    ref = await db.referensi_kode.find_one({"kode": prefix, "level": 1}, {"_id": 0})
    return ref['uraian'] if ref else None

# GET - List Persediaan with pagination, filters
@router.get("/", response_model=Dict)
async def get_persediaan(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    filter_kode: Optional[str] = None,
    filter_nama: Optional[str] = None,
    filter_merk: Optional[str] = None,
    filter_kondisi: Optional[str] = None,
    filter_lokasi: Optional[str] = None,
    filter_nup: Optional[str] = None,
    filter_golongan: Optional[str] = None,
    filter_batch: Optional[str] = None,
    sort_by: Optional[str] = "nama_barang",
    sort_order: int = Query(1, ge=-1, le=1),
    current_user: str = Depends(get_current_user)
):
    query = {}
    
    if search:
        query["$or"] = [
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"kode_barang": {"$regex": search, "$options": "i"}},
            {"batch_number": {"$regex": search, "$options": "i"}}
        ]
    
    if filter_kode: query["kode_barang"] = {"$regex": filter_kode, "$options": "i"}
    if filter_nama: query["nama_barang"] = {"$regex": filter_nama, "$options": "i"}
    if filter_merk: query["merk"] = {"$regex": filter_merk, "$options": "i"}
    if filter_kondisi: query["kondisi"] = filter_kondisi
    if filter_lokasi: query["lokasi_fisik"] = {"$regex": filter_lokasi, "$options": "i"}
    if filter_nup: query["nup"] = {"$regex": filter_nup, "$options": "i"}
    if filter_golongan: query["golongan_barang"] = {"$regex": filter_golongan, "$options": "i"}
    if filter_batch: query["batch_number"] = {"$regex": filter_batch, "$options": "i"}
    
    total = await db.persediaan.count_documents(query)
    skip = (page - 1) * limit
    
    cursor = db.persediaan.find(query).sort(sort_by, sort_order).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    items = sanitize_json(items)
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0
    }

# GET - Single Persediaan
@router.get("/{id}")
async def get_persediaan_by_id(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid ID")
    item = await db.persediaan.find_one({"_id": ObjectId(id)})
    if not item: raise HTTPException(status_code=404, detail="Not found")
    return sanitize_json(item)

# POST - Create Persediaan
@router.post("/", response_model=Persediaan)
async def create_persediaan(persediaan_in: PersediaanCreate, current_user: str = Depends(get_current_user)):
    persediaan_in.kode_barang = clean_code_str(persediaan_in.kode_barang)
    persediaan_in.nup = clean_code_str(persediaan_in.nup)
    
    # Auto-generate NUP for manual entry
    if not persediaan_in.nup or persediaan_in.nup == "1":
        max_item = await db.persediaan.find_one(
            {"kode_barang": persediaan_in.kode_barang},
            sort=[("nup", -1)]
        )
        if max_item and max_item.get('nup'):
            try:
                last_nup = int(max_item['nup'].replace('(Sementara)', '').strip())
                persediaan_in.nup = f"{last_nup + 1} (Sementara)"
            except:
                persediaan_in.nup = "1 (Sementara)"
        else:
            persediaan_in.nup = "1 (Sementara)"
    
    # Auto golongan
    if not persediaan_in.golongan_barang:
        persediaan_in.golongan_barang = await get_golongan_uraian(persediaan_in.kode_barang)
    
    # Extract year from tgl_perolehan
    if persediaan_in.tgl_perolehan and not persediaan_in.tahun_anggaran:
        persediaan_in.tahun_anggaran = persediaan_in.tgl_perolehan[:4]
    
    new_data = persediaan_in.dict()
    new_data['source'] = 'manual'
    new_persediaan = Persediaan(**new_data)
    result = await db.persediaan.insert_one(new_persediaan.model_dump(by_alias=True, exclude=["id"]))
    return await db.persediaan.find_one({"_id": result.inserted_id})

# PUT - Update Persediaan
@router.put("/{id}", response_model=Persediaan)
async def update_persediaan(id: str, persediaan_update: PersediaanCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    if persediaan_update.kode_barang: persediaan_update.kode_barang = clean_code_str(persediaan_update.kode_barang)
    if persediaan_update.nup: persediaan_update.nup = clean_code_str(persediaan_update.nup)
    
    if persediaan_update.kode_barang and not persediaan_update.golongan_barang:
        persediaan_update.golongan_barang = await get_golongan_uraian(persediaan_update.kode_barang)
    
    if persediaan_update.tgl_perolehan:
        persediaan_update.tahun_anggaran = persediaan_update.tgl_perolehan[:4]
    
    update_data = persediaan_update.dict(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc)
    
    res = await db.persediaan.find_one_and_update(
        {"_id": ObjectId(id)}, 
        {"$set": update_data}, 
        return_document=True
    )
    if not res: raise HTTPException(status_code=404)
    return res

# PATCH - Update Status
@router.patch("/{id}/status")
async def update_persediaan_status(id: str, status_data: dict = Body(...), current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid ID")
    
    new_status = status_data.get("status_aset")
    if new_status not in ["Aktif", "Non Aktif", "Dipinjamkan"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
    
    update_data = {
        "status_aset": new_status,
        "updated_at": datetime.now(timezone.utc)
    }
    
    res = await db.persediaan.find_one_and_update(
        {"_id": ObjectId(id)}, 
        {"$set": update_data}, 
        return_document=True
    )
    
    if not res: raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Status updated", "status_aset": new_status}

# PATCH - Update Batas Kritis (Inline Edit)
@router.patch("/{id}/batas-kritis")
async def update_batas_kritis(id: str, data: dict = Body(...), current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid ID")
    
    batas_kritis = data.get("batas_kritis")
    if batas_kritis is None or not isinstance(batas_kritis, int):
        raise HTTPException(status_code=400, detail="Invalid batas_kritis value")
    
    update_data = {
        "batas_kritis": batas_kritis,
        "updated_at": datetime.now(timezone.utc)
    }
    
    res = await db.persediaan.find_one_and_update(
        {"_id": ObjectId(id)}, 
        {"$set": update_data}, 
        return_document=True
    )
    
    if not res: raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Batas kritis updated", "batas_kritis": batas_kritis}

# DELETE - Single
@router.delete("/{id}")
async def delete_persediaan(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    res = await db.persediaan.delete_one({"_id": ObjectId(id)})
    if res.deleted_count == 0: raise HTTPException(status_code=404)
    return {"message": "Deleted"}

# POST - Bulk Delete
class BulkDeleteRequest(BaseModel):
    ids: Optional[List[str]] = []
    select_all_mode: bool = False
    search: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None

@router.post("/bulk-delete")
async def bulk_delete_persediaan(request: BulkDeleteRequest, current_user: str = Depends(get_current_user)):
    if request.select_all_mode:
        query = {}
        if request.search:
            query["$or"] = [
                {"nama_barang": {"$regex": request.search, "$options": "i"}},
                {"kode_barang": {"$regex": request.search, "$options": "i"}}
            ]
        if request.filters:
            for key, value in request.filters.items():
                if value: query[key] = {"$regex": value, "$options": "i"}
        
        result = await db.persediaan.delete_many(query)
        return {"message": f"{result.deleted_count} items deleted"}
    else:
        if not request.ids:
            raise HTTPException(status_code=400, detail="No IDs provided")
        
        valid_ids = [ObjectId(id) for id in request.ids if ObjectId.is_valid(id)]
        if not valid_ids:
            raise HTTPException(status_code=400, detail="No valid IDs")
        
        result = await db.persediaan.delete_many({"_id": {"$in": valid_ids}})
        return {"message": f"{result.deleted_count} items deleted"}
