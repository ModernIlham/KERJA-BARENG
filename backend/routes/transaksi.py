from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models import Transaksi, TransaksiCreate, Barang
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("/", response_model=List[Transaksi])
async def get_transaksi_list(
    limit: int = 20, 
    current_user: str = Depends(get_current_user)
):
    cursor = db.transaksi.find().sort("timestamp", -1).limit(limit)
    return await cursor.to_list(length=limit)

@router.post("/", response_model=Transaksi)
async def create_transaksi(tx_in: TransaksiCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(tx_in.barang_id):
        raise HTTPException(status_code=400, detail="Invalid Barang ID")
        
    # Get Barang
    barang = await db.barang.find_one({"_id": ObjectId(tx_in.barang_id)})
    if not barang:
        raise HTTPException(status_code=404, detail="Barang not found")
        
    # Update Stock Logic
    new_stok = barang['stok']
    if tx_in.jenis == "MASUK":
        new_stok += tx_in.jumlah
    elif tx_in.jenis == "KELUAR":
        if barang['stok'] < tx_in.jumlah:
            raise HTTPException(status_code=400, detail="Stok tidak mencukupi")
        new_stok -= tx_in.jumlah
    else:
        raise HTTPException(status_code=400, detail="Invalid Transaction Type")
        
    # Update Barang
    await db.barang.update_one(
        {"_id": ObjectId(tx_in.barang_id)},
        {"$set": {"stok": new_stok, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Get Pegawai Name if ID provided
    nama_pegawai = None
    if tx_in.pegawai_id:
        pegawai = await db.pegawai.find_one({"_id": ObjectId(tx_in.pegawai_id)})
        if pegawai:
            nama_pegawai = pegawai['nama_lengkap']
            
    # Create Transaction Record
    new_tx = Transaksi(
        jenis=tx_in.jenis,
        barang_id=tx_in.barang_id,
        nama_barang=barang['nama_barang'],
        jumlah=tx_in.jumlah,
        pegawai_id=tx_in.pegawai_id,
        nama_pegawai=nama_pegawai,
        keterangan=tx_in.keterangan
    )
    
    result = await db.transaksi.insert_one(new_tx.model_dump(by_alias=True, exclude=["id"]))
    return await db.transaksi.find_one({"_id": result.inserted_id})
