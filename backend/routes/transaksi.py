from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from models import Transaksi, TransaksiCreate, StokBatch
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime, timezone

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def process_fifo_out(barang_id: str, quantity: int, session=None):
    """
    Deduct quantity from batches FIFO style.
    Returns the total value of items removed.
    """
    # 1. Get batches with stock > 0, sorted by date (Oldest first)
    cursor = db.stok_batches.find(
        {"barang_id": barang_id, "jumlah_sisa": {"$gt": 0}}
    ).sort("tgl_masuk", 1)
    
    batches = await cursor.to_list(None)
    
    remaining_qty_to_deduct = quantity
    total_value_removed = 0.0
    
    updated_batches = []
    
    for batch in batches:
        if remaining_qty_to_deduct <= 0:
            break
            
        deduct_from_batch = min(batch['jumlah_sisa'], remaining_qty_to_deduct)
        
        # Calculate Value
        total_value_removed += deduct_from_batch * batch['nilai_satuan']
        
        # Update Batch State (InMemory)
        batch['jumlah_sisa'] -= deduct_from_batch
        updated_batches.append(batch)
        
        remaining_qty_to_deduct -= deduct_from_batch
        
    if remaining_qty_to_deduct > 0:
        # Not enough stock in batches! 
        # This shouldn't happen if we checked total stock before, unless DB inconsistent.
        # Fallback: Deduct value based on last known batch price or average
        pass
        
    # Commit Batch Updates
    for batch in updated_batches:
        await db.stok_batches.update_one(
            {"_id": batch["_id"]},
            {"$set": {"jumlah_sisa": batch["jumlah_sisa"]}},
            session=session
        )
        
    return total_value_removed

@router.get("/", response_model=List[Transaksi])
async def get_transaksi_list(
    limit: int = 50, 
    current_user: str = Depends(get_current_user)
):
    cursor = db.transaksi.find().sort("timestamp", -1).limit(limit)
    return await cursor.to_list(length=limit)

@router.post("/", response_model=Transaksi)
async def create_transaksi(tx_in: TransaksiCreate, current_user: str = Depends(get_current_user)):
    # 1. Validate Barang
    if not ObjectId.is_valid(tx_in.barang_id):
        raise HTTPException(status_code=400, detail="Invalid Barang ID")
        
    barang = await db.barang.find_one({"_id": ObjectId(tx_in.barang_id)})
    if not barang:
        raise HTTPException(status_code=404, detail="Barang not found")
    
    current_stok = barang.get('stok', 0)
    new_stok = current_stok
    total_nilai_tx = 0.0
    
    # 2. Logic Per Transaction Type
    if tx_in.jenis == "MASUK":
        new_stok += tx_in.jumlah
        
        # Validate Nilai Satuan for MASUK
        if not tx_in.nilai_satuan or tx_in.nilai_satuan < 0:
             # Fallback to existing if not provided (though should be provided)
             tx_in.nilai_satuan = barang.get('nilai_satuan', 0)
        
        total_nilai_tx = tx_in.jumlah * tx_in.nilai_satuan
        
        # Create New Batch
        new_batch = StokBatch(
            barang_id=tx_in.barang_id,
            kode_barang=barang.get('kode_barang'),
            nup=barang.get('nup'),
            tgl_masuk=datetime.now(timezone.utc),
            jumlah_awal=tx_in.jumlah,
            jumlah_sisa=tx_in.jumlah,
            nilai_satuan=tx_in.nilai_satuan,
            dokumen_ref=tx_in.dokumen_ref
        )
        await db.stok_batches.insert_one(new_batch.model_dump(by_alias=True, exclude=["id"]))
        
        # Update Average Price / Last Price in Barang?
        # Typically we keep 'NilaiPerolehan' as total value. 
        # But Barang model has 'nilai_satuan'. Let's update it to weighted average or last?
        # Let's update to Last Price for simplicity or keep Weighted Avg if tracking total value.
        pass

    elif tx_in.jenis == "KELUAR":
        if current_stok < tx_in.jumlah:
            raise HTTPException(status_code=400, detail=f"Stok tidak mencukupi. Tersedia: {current_stok}")
        
        new_stok -= tx_in.jumlah
        
        # Process FIFO to get value
        total_value_removed = await process_fifo_out(tx_in.barang_id, tx_in.jumlah)
        total_nilai_tx = total_value_removed
        
        # Calculate implied unit price for this transaction
        tx_in.nilai_satuan = total_value_removed / tx_in.jumlah if tx_in.jumlah > 0 else 0

    elif tx_in.jenis == "OPNAME":
        # Handled in dedicated endpoint usually, but if called here:
        # We need to know if it's Gain or Loss
        diff = tx_in.jumlah - current_stok # tx_in.jumlah is actual physical
        new_stok = tx_in.jumlah
        
        if diff > 0: # Gain (Surplus)
            # Add Batch
             # Need price. Use last known.
             price = barang.get('nilai_satuan', 0)
             total_nilai_tx = diff * price
             
             new_batch = StokBatch(
                barang_id=tx_in.barang_id,
                kode_barang=barang.get('kode_barang'),
                nup=barang.get('nup'),
                tgl_masuk=datetime.now(timezone.utc),
                jumlah_awal=diff,
                jumlah_sisa=diff,
                nilai_satuan=price,
                dokumen_ref="OPNAME_SURPLUS"
            )
             await db.stok_batches.insert_one(new_batch.model_dump(by_alias=True, exclude=["id"]))
             
        elif diff < 0: # Loss (Deficit)
            qty_lost = abs(diff)
            total_value_removed = await process_fifo_out(tx_in.barang_id, qty_lost)
            total_nilai_tx = total_value_removed
            
    else:
        raise HTTPException(status_code=400, detail="Invalid Transaction Type")
        
    # 3. Update Barang Master
    # Update total value? 
    # Current Value = (Old Stock * Old Price) +/- Transaction Value
    # Simplified: Value = Sum of Batches (Best), but expensive.
    # Hybrid: Update 'nilai_buku'
    
    await db.barang.update_one(
        {"_id": ObjectId(tx_in.barang_id)},
        {"$set": {
            "stok": new_stok, 
            "updated_at": datetime.now(timezone.utc),
            "nilai_satuan": tx_in.nilai_satuan # Update last price seen
        }}
    )
    
    # 4. Resolve Parties
    nama_pegawai = None
    unit_penerima = None
    if tx_in.pegawai_id and ObjectId.is_valid(tx_in.pegawai_id):
        pegawai = await db.pegawai.find_one({"_id": ObjectId(tx_in.pegawai_id)})
        if pegawai:
            nama_pegawai = pegawai['nama_lengkap']
            unit_penerima = pegawai.get('eselon3') or pegawai.get('eselon2') or "Umum"

    # 5. Create Record
    new_tx = Transaksi(
        jenis="PENYESUAIAN" if tx_in.jenis == "OPNAME" else tx_in.jenis,
        barang_id=tx_in.barang_id,
        kode_barang=barang.get('kode_barang', ''),
        nup=barang.get('nup', ''),
        nama_barang=barang['nama_barang'],
        jumlah=tx_in.jumlah,
        nilai_satuan=tx_in.nilai_satuan,
        total_nilai=total_nilai_tx,
        pegawai_id=tx_in.pegawai_id,
        nama_pegawai=nama_pegawai,
        unit_penerima=unit_penerima,
        keterangan=tx_in.keterangan,
        dokumen_ref=tx_in.dokumen_ref,
        petugas=current_user # admin email
    )
    
    result = await db.transaksi.insert_one(new_tx.model_dump(by_alias=True, exclude=["id"]))
    return await db.transaksi.find_one({"_id": result.inserted_id})
