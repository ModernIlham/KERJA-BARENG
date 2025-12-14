from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from models import Barang, BarangCreate
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

@router.get("", response_model=Dict[str, Any])
async def get_barang_list(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    
    # Specific Filters
    filter_kode: Optional[str] = None,
    filter_nama: Optional[str] = None,
    filter_merk: Optional[str] = None,
    filter_kondisi: Optional[str] = None,
    filter_lokasi: Optional[str] = None,
    filter_nup: Optional[str] = None,
    filter_golongan: Optional[str] = None,
    
    current_user: str = Depends(get_current_user)
):
    skip = (page - 1) * limit
    query = {}
    
    # Global Search
    if search:
        query["$or"] = [
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"kode_barang": {"$regex": search, "$options": "i"}},
            {"nup": {"$regex": search, "$options": "i"}}
        ]
        
    # Specific Column Filters
    if filter_kode: query["kode_barang"] = {"$regex": filter_kode, "$options": "i"}
    if filter_nama: query["nama_barang"] = {"$regex": filter_nama, "$options": "i"}
    if filter_merk: query["merk"] = {"$regex": filter_merk, "$options": "i"}
    if filter_kondisi: query["kondisi"] = filter_kondisi # Exact match for dropdown usually
    if filter_lokasi: query["lokasi_fisik"] = {"$regex": filter_lokasi, "$options": "i"}
    if filter_nup: query["nup"] = {"$regex": filter_nup, "$options": "i"}
    if filter_golongan: query["golongan_barang"] = {"$regex": filter_golongan, "$options": "i"}
        
    total = await db.barang.count_documents(query)
    cursor = db.barang.find(query).skip(skip).limit(limit).sort("nama_barang", 1)
    items = await cursor.to_list(length=limit)
    
    for item in items:
        if "_id" in item: item["_id"] = str(item["_id"])
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit)
    }

@router.get("/export")
async def export_barang_excel(
    search: Optional[str] = None,
    filter_kode: Optional[str] = None,
    filter_nama: Optional[str] = None,
    filter_merk: Optional[str] = None,
    filter_kondisi: Optional[str] = None,
    filter_lokasi: Optional[str] = None,
    filter_nup: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    """
    Export filtered data to Excel
    """
    query = {}
    if search:
        query["$or"] = [
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"kode_barang": {"$regex": search, "$options": "i"}}
        ]
    if filter_kode: query["kode_barang"] = {"$regex": filter_kode, "$options": "i"}
    if filter_nama: query["nama_barang"] = {"$regex": filter_nama, "$options": "i"}
    if filter_merk: query["merk"] = {"$regex": filter_merk, "$options": "i"}
    if filter_kondisi: query["kondisi"] = filter_kondisi
    if filter_lokasi: query["lokasi_fisik"] = {"$regex": filter_lokasi, "$options": "i"}
    if filter_nup: query["nup"] = {"$regex": filter_nup, "$options": "i"}
    
    # Fetch All (Limit to reasonable size e.g. 50k to prevent OOM)
    cursor = db.barang.find(query).limit(50000)
    items = await cursor.to_list(None)
    
    if not items:
        raise HTTPException(status_code=404, detail="Tidak ada data untuk diexport")
        
    # Convert to DataFrame
    data_list = []
    for item in items:
        data_list.append({
            "Kode Barang": item.get('kode_barang'),
            "NUP": item.get('nup'),
            "Nama Barang": item.get('nama_barang'),
            "Merk": item.get('merk'),
            "Tipe": item.get('tipe'),
            "Kondisi": item.get('kondisi'),
            "Stok": item.get('stok'),
            "Nilai Perolehan": item.get('nilai_perolehan'),
            "Nilai Buku": item.get('nilai_buku'),
            "Lokasi": item.get('lokasi_fisik'),
            "Tahun Anggaran": item.get('tahun_anggaran')
        })
        
    df = pd.DataFrame(data_list)
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='MasterBarang')
    output.seek(0)
    
    return StreamingResponse(
        output,
        headers={'Content-Disposition': f'attachment; filename="Export_Barang_{datetime.now().strftime("%Y%m%d")}.xlsx"'},
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@router.post("", response_model=Barang)
async def create_barang(barang_in: BarangCreate, current_user: str = Depends(get_current_user)):
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
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid ID")
    update_data = barang_update.dict(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc)
    result = await db.barang.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=True
    )
    if not result: raise HTTPException(status_code=404, detail="Barang not found")
    return result

@router.delete("/{id}")
async def delete_barang(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid ID")
    result = await db.barang.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Barang not found")
    return {"message": "Barang deleted successfully"}

@router.post("/import")
async def import_barang_excel(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Format file harus Excel (.xls, .xlsx)")

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df = df.where(pd.notnull(df), None)
        
        count_processed = 0
        count_inserted = 0
        count_updated = 0
        
        for index, row in df.iterrows():
            try:
                kode = str(row.get('Kode Barang', '')).strip()
                nup = str(row.get('NUP', '')).strip()
                if not kode or not nup: continue
                    
                item_data = {
                    "kode_barang": kode,
                    "nup": nup,
                    "nama_barang": row.get('Nama Barang') or "Tanpa Nama",
                    "merk": row.get('Merk'),
                    "tipe": row.get('Tipe'),
                    "kondisi": row.get('Kondisi'),
                    "nilai_perolehan": clean_currency(row.get('Nilai Perolehan')),
                    "nilai_buku": clean_currency(row.get('Nilai Buku')),
                    "nilai_penyusutan": clean_currency(row.get('Nilai Penyusutan')),
                    "nilai_satuan": clean_currency(row.get('Nilai Perolehan')), 
                    "tgl_perolehan": str(row.get('Tanggal Perolehan'))[:10] if row.get('Tanggal Perolehan') else None,
                    "tahun_anggaran": str(row.get('Tahun Anggaran', '')),
                    "lokasi_fisik": row.get('Lokasi') or row.get('Alamat'),
                    "ruang": row.get('Ruang'),
                    "alamat": row.get('Alamat'),
                    "kab_kota": row.get('Kab/Kota'),
                    "provinsi": row.get('Provinsi'),
                    "kode_satker": str(row.get('Kode Satker', '')),
                    "nama_satker": row.get('Nama Satker'),
                    "intra_ekstra": row.get('Aset Intra / Extra'),
                    "status_aset": "Aktif",
                    "stok": 1,
                    "updated_at": datetime.now(timezone.utc)
                }
                
                result = await db.barang.update_one(
                    {"kode_barang": kode, "nup": nup},
                    {"$set": item_data},
                    upsert=True
                )
                
                if result.upserted_id: count_inserted += 1
                elif result.modified_count > 0: count_updated += 1
                count_processed += 1
                
            except Exception as e: continue
                
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
