from fastapi import APIRouter, HTTPException, Depends, Body, Query
from typing import List, Dict, Optional
from models import TransaksiPersediaan, TransaksiPersediaanCreate, Persediaan
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime, timezone
import math

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Helper to sanitize
def sanitize_json(data):
    if isinstance(data, list):
        return [sanitize_json(item) for item in data]
    elif isinstance(data, dict):
        return {k: sanitize_json(v) for k, v in data.items()}
    elif isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, float) and (math.isnan(data) or math.isinf(data)):
        return 0.0
    return data

@router.get("/", response_model=Dict)
async def get_all_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"kode_barang": {"$regex": search, "$options": "i"}},
            {"dokumen_ref": {"$regex": search, "$options": "i"}},
            {"keterangan": {"$regex": search, "$options": "i"}}
        ]
        
    total = await db.transaksi_persediaan.count_documents(query)
    skip = (page - 1) * limit
    
    cursor = db.transaksi_persediaan.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    
    return {
        "data": sanitize_json(items),
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0
    }

# ... (Existing endpoints: /in, /out, /history/{id} remain below) ...

@router.post("/in")
async def stock_in(txn: TransaksiPersediaanCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(txn.persediaan_id):
        raise HTTPException(status_code=400, detail="Invalid Persediaan ID")
    
    # 1. Get current item
    item = await db.persediaan.find_one({"_id": ObjectId(txn.persediaan_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Persediaan not found")
    
    current_stok = item.get('stok', 0)
    current_nilai = item.get('nilai_satuan', 0)
    
    # 2. Calculate Weighted Average Price
    # Formula: ((Old_Qty * Old_Price) + (New_Qty * New_Price)) / (Old_Qty + New_Qty)
    new_stok = current_stok + txn.jumlah
    new_nilai = 0
    if new_stok > 0:
        total_value_old = current_stok * current_nilai
        total_value_new = txn.jumlah * (txn.nilai_satuan or current_nilai) # Use existing price if not provided
        new_nilai = (total_value_old + total_value_new) / new_stok
    
    # 3. Update Persediaan
    update_data = {
        "stok": new_stok,
        "nilai_satuan": new_nilai,
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Update expired date if provided (assuming latest batch dictates expiry or just updating info)
    if txn.expired_date:
        update_data["expired_date"] = txn.expired_date
        
    await db.persediaan.update_one(
        {"_id": ObjectId(txn.persediaan_id)},
        {"$set": update_data}
    )
    
    # 4. Create Transaction Record
    record = TransaksiPersediaan(
        jenis="in",
        persediaan_id=txn.persediaan_id,
        kode_barang=item.get('kode_barang'),
        nup=item.get('nup'),
        nama_barang=item.get('nama_barang'),
        batch_number=txn.batch_number,
        expired_date=txn.expired_date,
        jumlah=txn.jumlah,
        nilai_satuan=txn.nilai_satuan or current_nilai,
        total_nilai=txn.jumlah * (txn.nilai_satuan or current_nilai),
        stok_sebelum=current_stok,
        stok_sesudah=new_stok,
        pegawai_id=txn.pegawai_id,
        keterangan=txn.keterangan,
        dokumen_ref=txn.dokumen_ref,
        petugas=current_user,
        timestamp=datetime.now(timezone.utc)
    )
    
    res = await db.transaksi_persediaan.insert_one(record.dict(by_alias=True, exclude=["id"]))
    
    return {"message": "Stock In successful", "new_stok": new_stok, "new_nilai": new_nilai}

@router.post("/out")
async def stock_out(txn: TransaksiPersediaanCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(txn.persediaan_id):
        raise HTTPException(status_code=400, detail="Invalid Persediaan ID")
    
    # 1. Get current item
    item = await db.persediaan.find_one({"_id": ObjectId(txn.persediaan_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Persediaan not found")
    
    current_stok = item.get('stok', 0)
    current_nilai = item.get('nilai_satuan', 0)
    
    # 2. Validate Stock
    if current_stok < txn.jumlah:
        raise HTTPException(status_code=400, detail=f"Stok tidak cukup. Stok saat ini: {current_stok}")
    
    new_stok = current_stok - txn.jumlah
    
    # 3. Update Persediaan
    update_data = {
        "stok": new_stok,
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.persediaan.update_one(
        {"_id": ObjectId(txn.persediaan_id)},
        {"$set": update_data}
    )
    
    # 4. Create Transaction Record
    record = TransaksiPersediaan(
        jenis="out",
        persediaan_id=txn.persediaan_id,
        kode_barang=item.get('kode_barang'),
        nup=item.get('nup'),
        nama_barang=item.get('nama_barang'),
        batch_number=txn.batch_number, # Maybe relevant if picking specific batch (FIFO)
        expired_date=item.get('expired_date'),
        jumlah=txn.jumlah,
        nilai_satuan=current_nilai, # Out price is current average price
        total_nilai=txn.jumlah * current_nilai,
        stok_sebelum=current_stok,
        stok_sesudah=new_stok,
        unit_penerima=txn.unit_penerima,
        pegawai_id=txn.pegawai_id,
        keterangan=txn.keterangan,
        dokumen_ref=txn.dokumen_ref,
        petugas=current_user,
        timestamp=datetime.now(timezone.utc)
    )
    
    await db.transaksi_persediaan.insert_one(record.dict(by_alias=True, exclude=["id"]))
    
    return {"message": "Stock Out successful", "new_stok": new_stok}

@router.get("/history/{persediaan_id}")
async def get_history(persediaan_id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(persediaan_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    cursor = db.transaksi_persediaan.find({"persediaan_id": persediaan_id}).sort("timestamp", -1)
    history = await cursor.to_list(length=100)
    return sanitize_json(history)
