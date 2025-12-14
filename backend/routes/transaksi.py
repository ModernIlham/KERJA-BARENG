from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models import Transaksi, TransaksiCreate
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
    limit: int = 50, 
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
        
    current_stok = barang.get('stok', 0)
    new_stok = current_stok
    
    # Logic Update Stock
    if tx_in.jenis == "MASUK":
        new_stok += tx_in.jumlah
    elif tx_in.jenis == "KELUAR":
        if current_stok < tx_in.jumlah:
            raise HTTPException(status_code=400, detail="Stok tidak mencukupi")
        new_stok -= tx_in.jumlah
    elif tx_in.jenis == "OPNAME":
        new_stok = tx_in.jumlah # Actual count
    else:
        raise HTTPException(status_code=400, detail="Invalid Transaction Type")
        
    # Update Barang
    await db.barang.update_one(
        {"_id": ObjectId(tx_in.barang_id)},
        {"$set": {"stok": new_stok, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Get Pegawai & Unit Info
    nama_pegawai = None
    unit_penerima = None
    
    if tx_in.pegawai_id and ObjectId.is_valid(tx_in.pegawai_id):
        pegawai = await db.pegawai.find_one({"_id": ObjectId(tx_in.pegawai_id)})
        if pegawai:
            nama_pegawai = pegawai['nama_lengkap']
            # Logic: Unit penerima is usually the lowest relevant unit of the employee
            unit_penerima = pegawai.get('eselon3') or pegawai.get('eselon2') or pegawai.get('eselon1') or "Non-Unit"
            
    # For Opname, add diff to keterangan
    keterangan = tx_in.keterangan
    if tx_in.jenis == "OPNAME":
        diff = new_stok - current_stok
        keterangan = f"{keterangan or ''} (Selisih: {diff:+d})"
    
    new_tx = Transaksi(
        jenis=tx_in.jenis,
        barang_id=tx_in.barang_id,
        kode_barang=barang.get('kode_barang', ''),
        nup=barang.get('nup', ''),
        nama_barang=barang['nama_barang'],
        jumlah=tx_in.jumlah, 
        pegawai_id=tx_in.pegawai_id,
        nama_pegawai=nama_pegawai,
        unit_penerima=unit_penerima,
        keterangan=keterangan,
        bukti_dokumen=tx_in.bukti_dokumen
    )
    
    result = await db.transaksi.insert_one(new_tx.model_dump(by_alias=True, exclude=["id"]))
    return await db.transaksi.find_one({"_id": result.inserted_id})
