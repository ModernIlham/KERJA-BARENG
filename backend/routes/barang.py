from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from typing import List, Optional
from models import Barang, BarangCreate
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime, timezone
import pandas as pd
import io

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("/", response_model=List[Barang])
async def get_barang_list(
    skip: int = 0, 
    limit: int = 50, 
    search: Optional[str] = None,
    kategori: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"kode_barang": {"$regex": search, "$options": "i"}},
            {"nup": {"$regex": search, "$options": "i"}}
        ]
        
    cursor = db.barang.find(query).skip(skip).limit(limit).sort("nama_barang", 1)
    barang_list = await cursor.to_list(length=limit)
    return barang_list

@router.post("/", response_model=Barang)
async def create_barang(barang_in: BarangCreate, current_user: str = Depends(get_current_user)):
    # Check duplicate code + NUP (Composite Key)
    existing = await db.barang.find_one({
        "kode_barang": barang_in.kode_barang,
        "nup": barang_in.nup
    })
    if existing:
        raise HTTPException(status_code=400, detail="Barang dengan Kode dan NUP tersebut sudah ada")
        
    new_barang = Barang(**barang_in.dict())
    result = await db.barang.insert_one(new_barang.model_dump(by_alias=True, exclude=["id"]))
    created_barang = await db.barang.find_one({"_id": result.inserted_id})
    return created_barang

@router.put("/{id}", response_model=Barang)
async def update_barang(id: str, barang_update: BarangCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    update_data = barang_update.dict(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc)
    
    result = await db.barang.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Barang not found")
    return result

@router.delete("/{id}")
async def delete_barang(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    result = await db.barang.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Barang not found")
    return {"message": "Barang deleted successfully"}

@router.post("/import")
async def import_barang_excel(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    """
    Import Master Barang from Excel (SIMAN format).
    Updates existing items based on Kode Barang + NUP.
    """
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Format file harus Excel (.xls, .xlsx)")

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df = df.where(pd.notnull(df), None) # Replace NaN with None
        
        count_processed = 0
        count_inserted = 0
        count_updated = 0
        
        for index, row in df.iterrows():
            try:
                # 1. Map Columns
                kode = str(row.get('Kode Barang', '')).strip()
                nup = str(row.get('NUP', '')).strip()
                
                if not kode or not nup:
                    continue
                    
                # Mapping from Excel Headers to DB Model
                item_data = {
                    "kode_barang": kode,
                    "nup": nup,
                    "nama_barang": row.get('Nama Barang') or "Tanpa Nama",
                    "merk": row.get('Merk'),
                    "tipe": row.get('Tipe'),
                    "kondisi": row.get('Kondisi'),
                    
                    # Financials
                    "nilai_perolehan": float(row.get('Nilai Perolehan', 0) or 0),
                    "nilai_buku": float(row.get('Nilai Buku', 0) or 0),
                    "nilai_penyusutan": float(row.get('Nilai Penyusutan', 0) or 0),
                    "nilai_satuan": float(row.get('Nilai Perolehan', 0) or 0), # Default to acquisition value
                    
                    # Dates (Try to parse)
                    "tgl_perolehan": str(row.get('Tanggal Perolehan'))[:10] if row.get('Tanggal Perolehan') else None,
                    "tahun_anggaran": str(row.get('Tahun Anggaran', '')),
                    
                    # Location
                    "lokasi_fisik": row.get('Lokasi') or row.get('Alamat'),
                    "ruang": row.get('Ruang'),
                    "alamat": row.get('Alamat'),
                    "kab_kota": row.get('Kab/Kota'),
                    "provinsi": row.get('Provinsi'),
                    
                    # Classification
                    "kode_satker": str(row.get('Kode Satker', '')),
                    "nama_satker": row.get('Nama Satker'),
                    "intra_ekstra": row.get('Aset Intra / Extra'),
                    "status_aset": "Aktif", # Default
                    
                    # Inventory
                    "stok": 1, # SIMAN is itemized, so 1 per row usually
                    "updated_at": datetime.now(timezone.utc)
                }
                
                # 2. Upsert to DB
                result = await db.barang.update_one(
                    {"kode_barang": kode, "nup": nup},
                    {"$set": item_data},
                    upsert=True
                )
                
                if result.upserted_id:
                    count_inserted += 1
                elif result.modified_count > 0:
                    count_updated += 1
                
                count_processed += 1
                
            except Exception as e:
                print(f"Error processing row {index}: {e}")
                continue
                
        return {
            "message": "Import selesai",
            "processed": count_processed,
            "inserted": count_inserted,
            "updated": count_updated
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membaca file: {str(e)}")

@router.get("/summary/stats")
async def get_barang_stats(current_user: str = Depends(get_current_user)):
    pipeline = [
         {"$group": {
            "_id": None,
            "total_items": {"$sum": 1},
            "total_value": {"$sum": "$nilai_perolehan"}, 
            "critical_stock": {"$sum": {"$cond": [{"$lte": ["$stok", 0]}, 1, 0]}}
        }}
    ]
    
    result = await db.barang.aggregate(pipeline).to_list(1)
    if not result:
        return {"total_items": 0, "total_value": 0, "critical_stock": 0}
    return result[0]
