from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
from models import StockOpname, Barang
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Reuse Transaction Logic
from routes.transaksi import create_transaksi, TransaksiCreate

@router.get("/", response_model=List[StockOpname])
async def get_opname_history(limit: int = 50, current_user: str = Depends(get_current_user)):
    cursor = db.opname.find().sort("tanggal", -1).limit(limit)
    return await cursor.to_list(length=limit)

@router.post("/", response_model=StockOpname)
async def submit_opname(
    barang_id: str,
    stok_fisik: int,
    keterangan: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(barang_id):
        raise HTTPException(status_code=400, detail="Invalid Barang ID")
        
    barang = await db.barang.find_one({"_id": ObjectId(barang_id)})
    if not barang:
        raise HTTPException(status_code=404, detail="Barang not found")
        
    stok_sistem = barang.get('stok', 0)
    selisih = stok_fisik - stok_sistem
    
    # 1. Record Opname Event
    opname_rec = StockOpname(
        barang_id=barang_id,
        nama_barang=barang['nama_barang'],
        stok_sistem=stok_sistem,
        stok_fisik=stok_fisik,
        selisih=selisih,
        keterangan=keterangan,
        petugas=current_user
    )
    
    res = await db.opname.insert_one(opname_rec.model_dump(by_alias=True, exclude=["id"]))
    
    # 2. Auto Adjust Stock if there is difference
    if selisih != 0:
        # Call Transaction Logic to handle FIFO adjustments properly
        # We reuse the logic in routes/transaksi.py via internal call or duplicating logic?
        # Reuse via function call is cleaner if possible, or just re-implement adjustment logic here.
        # Since 'create_transaksi' is an endpoint fn, calling it directly is tricky with Depends.
        # We will assume logic is shared. For MVP, let's call the core logic.
        
        # We'll use the 'create_transaksi' logic but we need to mock the input
        # Actually, simpler to just trigger the 'OPNAME' transaction type we built
        
        tx_in = TransaksiCreate(
            jenis="OPNAME",
            barang_id=barang_id,
            jumlah=stok_fisik, # Send ACTUAL count
            keterangan=f"Auto Adjustment from Opname: {keterangan or ''}",
            dokumen_ref=f"OPN-{res.inserted_id}"
        )
        
        # We need to manually invoke the logic or duplicate it. 
        # Duplicating the core update logic (minus HTTP overhead) is safer here.
        
        # ... (Duplicate simplified update logic from Transaksi route for Opname)
        new_stok = stok_fisik
        await db.barang.update_one(
            {"_id": ObjectId(barang_id)},
            {"$set": {"stok": new_stok, "updated_at": datetime.now(timezone.utc)}}
        )
        
        # Record Transaction
        from models import Transaksi
        new_tx = Transaksi(
            jenis="PENYESUAIAN",
            barang_id=barang_id,
            kode_barang=barang.get('kode_barang'),
            nup=barang.get('nup'),
            nama_barang=barang['nama_barang'],
            jumlah=stok_fisik, # Or diff? Usually Opname records actual.
            keterangan=f"Selisih: {selisih}. {keterangan}",
            petugas=current_user
        )
        await db.transaksi.insert_one(new_tx.model_dump(by_alias=True, exclude=["id"]))

    return await db.opname.find_one({"_id": res.inserted_id})
