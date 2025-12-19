from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional
from datetime import datetime, timezone
from models import StockOpname, Barang, Persediaan, TransaksiPersediaan
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("/", response_model=List[dict])
async def get_opname_history(
    limit: int = 50, 
    asset_type: str = Query("persediaan", description="barang or persediaan"),
    current_user: str = Depends(get_current_user)
):
    query = {"asset_type": asset_type}
    cursor = db.opname.find(query).sort("tanggal", -1).limit(limit)
    items = await cursor.to_list(length=limit)
    
    # Convert ObjectId to string for serialization
    for item in items:
        if "_id" in item:
            item["_id"] = str(item["_id"])
    
    return items

@router.post("/", response_model=StockOpname)
async def submit_opname(
    barang_id: str = Body(...),
    stok_fisik: int = Body(...),
    asset_type: str = Body("persediaan"), # Default to persediaan for this phase
    keterangan: Optional[str] = Body(None),
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(barang_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    # 1. Fetch Item based on Type
    if asset_type == 'persediaan':
        collection = db.persediaan
    else:
        collection = db.barang
        
    item = await collection.find_one({"_id": ObjectId(barang_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    stok_sistem = item.get('stok', 0)
    selisih = stok_fisik - stok_sistem
    
    # 2. Record Opname
    opname_rec = StockOpname(
        barang_id=barang_id,
        asset_type=asset_type,
        nama_barang=item.get('nama_barang', 'Unknown'),
        stok_sistem=stok_sistem,
        stok_fisik=stok_fisik,
        selisih=selisih,
        keterangan=keterangan,
        petugas=current_user
    )
    
    res = await db.opname.insert_one(opname_rec.model_dump(by_alias=True, exclude=["id"]))
    
    # 3. Auto Adjust if Persediaan
    if asset_type == 'persediaan' and selisih != 0:
        # Update Master Stock
        await db.persediaan.update_one(
            {"_id": ObjectId(barang_id)},
            {"$set": {"stok": stok_fisik, "updated_at": datetime.now(timezone.utc)}}
        )
        
        # Record Transaction (Adjustment)
        tx_record = TransaksiPersediaan(
            jenis="opname", # Special type for opname adjustment
            persediaan_id=barang_id,
            kode_barang=item.get('kode_barang'),
            nup=item.get('nup'),
            nama_barang=item.get('nama_barang'),
            jumlah=abs(selisih), # Magnitude of change
            nilai_satuan=item.get('nilai_satuan', 0),
            total_nilai=abs(selisih) * item.get('nilai_satuan', 0),
            stok_sebelum=stok_sistem,
            stok_sesudah=stok_fisik,
            keterangan=f"Opname Adjustment: {keterangan or ''} (Selisih: {selisih})",
            petugas=current_user,
            timestamp=datetime.now(timezone.utc)
        )
        await db.transaksi_persediaan.insert_one(tx_record.model_dump(by_alias=True, exclude=["id"]))

    # Handle Aset Tetap adjustment if needed (Simplified for now)
    elif asset_type == 'barang' and selisih != 0:
        await db.barang.update_one(
            {"_id": ObjectId(barang_id)},
            {"$set": {"stok": stok_fisik, "updated_at": datetime.now(timezone.utc)}}
        )

    return await db.opname.find_one({"_id": res.inserted_id})
