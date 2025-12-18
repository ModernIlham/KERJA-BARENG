from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from models import Pegawai, PegawaiCreate
from auth import get_current_user
from models import Pegawai, PegawaiCreate, MutasiPegawai, RiwayatKarir
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone
import os
import math

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("/pejabat")
async def get_pejabat_list(
    role: str = Query("PPK", description="Role to filter (e.g., PPK)"),
    current_user: str = Depends(get_current_user)
):
    # Filter pegawai where jabatan_melekat contains the role (case insensitive)
    query = {"jabatan_melekat": {"$regex": role, "$options": "i"}}
    cursor = db.pegawai.find(query).sort("nama_lengkap", 1)
    items = await cursor.to_list(None)
    
    for item in items:
        if "_id" in item: item["_id"] = str(item["_id"])
        
    return items

@router.get("", response_model=Dict[str, Any])
async def get_pegawai_list(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    skip = (page - 1) * limit
    query = {}
    if search:
        query["$or"] = [
            {"nama_lengkap": {"$regex": search, "$options": "i"}},
            {"nip": {"$regex": search, "$options": "i"}}
        ]
        
    total = await db.pegawai.count_documents(query)
    cursor = db.pegawai.find(query).skip(skip).limit(limit).sort("nama_lengkap", 1)
    items = await cursor.to_list(length=limit)
    
    # ObjectId to String
    for item in items:
        if "_id" in item: item["_id"] = str(item["_id"])
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit)
    }

@router.post("", response_model=Pegawai)
async def create_pegawai(pegawai_in: PegawaiCreate, current_user: str = Depends(get_current_user)):
    existing = await db.pegawai.find_one({"nip": pegawai_in.nip})
    if existing:
        raise HTTPException(status_code=400, detail="NIP already exists")
        
    new_pegawai = Pegawai(**pegawai_in.dict())
    result = await db.pegawai.insert_one(new_pegawai.model_dump(by_alias=True, exclude=["id"]))
    return await db.pegawai.find_one({"_id": result.inserted_id})

@router.put("/{id}", response_model=Pegawai)
async def update_pegawai(id: str, pegawai_in: PegawaiCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    # Check NIP conflict if changed
    existing = await db.pegawai.find_one({"nip": pegawai_in.nip, "_id": {"$ne": ObjectId(id)}})
    if existing: raise HTTPException(status_code=400, detail="NIP already used by another employee")
    
    update_data = pegawai_in.dict(exclude_unset=True)
    # Don't update created_at, update updated_at if schema had it
    
    res = await db.pegawai.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=True
    )
    if not res: raise HTTPException(status_code=404)
    return res

@router.delete("/{id}")
async def delete_pegawai(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    res = await db.pegawai.delete_one({"_id": ObjectId(id)})
    if res.deleted_count == 0: raise HTTPException(status_code=404)
    return {"message": "Pegawai deleted"}

@router.post("/{id}/mutasi", response_model=Pegawai)
async def mutasi_pegawai(id: str, mutasi: MutasiPegawai, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    pegawai = await db.pegawai.find_one({"_id": ObjectId(id)})
    if not pegawai: raise HTTPException(status_code=404)
    
    # Create History Record
    riwayat = RiwayatKarir(
        jenis=mutasi.jenis_mutasi,
        deskripsi=mutasi.keterangan or f"Mutasi ke {mutasi.jabatan_baru}",
        jabatan_baru=mutasi.jabatan_baru,
        unit_kerja_baru=f"{mutasi.unit_kerja_baru.get('eselon1','')}, {mutasi.unit_kerja_baru.get('eselon2','')}",
        pangkat_baru=mutasi.pangkat_baru,
        sk_ref=mutasi.sk_ref,
        tanggal=mutasi.tgl_efektif
    )
    
    # Update Fields
    update_fields = {
        "jabatan": mutasi.jabatan_baru,
    }
    if mutasi.pangkat_baru:
        update_fields["pangkat_golongan"] = mutasi.pangkat_baru
        
    # Update Unit Kerja if provided
    if mutasi.unit_kerja_baru:
        for k, v in mutasi.unit_kerja_baru.items():
            if k in ['eselon1', 'eselon2', 'eselon3', 'eselon4']:
                update_fields[k] = v
                
    # Execute Update
    res = await db.pegawai.find_one_and_update(
        {"_id": ObjectId(id)},
        {
            "$set": update_fields,
            "$push": {"riwayat_karir": riwayat.dict()}
        },
        return_document=True
    )
    
    return res
