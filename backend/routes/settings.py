from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict
from pydantic import BaseModel
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
import math
from datetime import datetime, timezone

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- Models ---
class UnitKerja(BaseModel):
    id: Optional[str] = None
    nama_unit: str
    eselon: str
    parent_id: Optional[str] = None
    
class UserSettings(BaseModel):
    email: str
    full_name: str
    role: str
    is_active: bool

# --- Helpers ---
def clean_number(val):
    if val is None: return 0
    if isinstance(val, (int, float)): return val
    if isinstance(val, str):
        try:
            # Remove common currency chars
            clean = val.replace("Rp", "").replace(".", "").replace(",", "").strip()
            return float(clean) if clean else 0
        except: return 0
    return 0

# --- Routes ---

@router.get("/users", response_model=List[UserSettings])
async def get_users(current_user: str = Depends(get_current_user)):
    users = await db.users.find().to_list(100)
    return [
        UserSettings(
            email=u['email'], 
            full_name=u['full_name'], 
            role=u.get('role', 'user'),
            is_active=True 
        ) for u in users
    ]

@router.get("/unit-kerja")
async def get_unit_kerja(current_user: str = Depends(get_current_user)):
    units = await db.unit_kerja.find().to_list(1000)
    result = []
    for u in units:
        u['id'] = str(u['_id'])
        result.append(u)
    return result

@router.post("/unit-kerja")
async def add_unit_kerja(unit: UnitKerja, current_user: str = Depends(get_current_user)):
    new_unit = unit.dict(exclude={'id'})
    res = await db.unit_kerja.insert_one(new_unit)
    return {"message": "Unit Kerja added", "id": str(res.inserted_id)}

@router.delete("/unit-kerja/{id}")
async def delete_unit_kerja(id: str, current_user: str = Depends(get_current_user)):
    await db.unit_kerja.delete_one({"_id": ObjectId(id)})
    return {"message": "Unit Kerja deleted"}

# --- DATABASE MAINTENANCE ROUTES ---

@router.post("/database/normalize")
async def normalize_data(current_user: str = Depends(get_current_user)):
    """
    Memperbaiki format data: Konversi String angka ke Float/Int, bersihkan kode, dll.
    """
    barang_cursor = db.barang.find({})
    count = 0
    async for item in barang_cursor:
        updates = {}
        
        # 1. Clean Numeric Fields
        for field in ['nilai_perolehan', 'nilai_buku', 'nilai_penyusutan', 'nilai_satuan']:
            val = item.get(field)
            if isinstance(val, str):
                updates[field] = clean_number(val)
                
        # 2. Ensure Stok is Int
        if isinstance(item.get('stok'), str):
            try: updates['stok'] = int(clean_number(item.get('stok')))
            except: updates['stok'] = 0
            
        # 3. Clean Kode (Remove dots if stored)
        kode = item.get('kode_barang')
        if kode and ("." in kode or " " in kode):
            updates['kode_barang'] = kode.replace(".", "").replace(" ", "").strip()
            
        if updates:
            await db.barang.update_one({"_id": item['_id']}, {"$set": updates})
            count += 1
            
    return {"message": f"Normalisasi selesai. {count} data diperbaiki formatnya."}

@router.post("/database/recalculate-stock")
async def recalculate_stock(current_user: str = Depends(get_current_user)):
    """
    Hitung ulang stok Master Barang berdasarkan Riwayat Transaksi.
    (Audit Stok)
    """
    # 1. Reset all stock to 0 (or initial import state?)
    # Ideally, we calculate: Saldo Awal (from Import/Setup) + Masuk - Keluar
    # If no initial balance record exists, assume 0 + transactions.
    
    # Let's aggregate transactions per barang
    pipeline = [
        {"$group": {
            "_id": "$barang_id",
            "total_masuk": {"$sum": {"$cond": [{"$in": ["$jenis", ["MASUK", "SALDO_AWAL"]]}, "$jumlah", 0]}},
            "total_keluar": {"$sum": {"$cond": [{"$eq": ["$jenis", "KELUAR"]}, "$jumlah", 0]}},
            "last_opname": {"$max": {"$cond": [{"$eq": ["$jenis", "OPNAME"]}, "$timestamp", None]}},
            # If opname exists, we should rely on that + transactions AFTER opname
            # This complex logic is simplified here: Just Sum(In) - Sum(Out) for MVP.
            # Ideally: Find latest 'PENYESUAIAN' (Opname) -> Start balance from there -> Add subsequent tx.
        }}
    ]
    
    tx_aggs = await db.transaksi.aggregate(pipeline).to_list(None)
    
    count = 0
    for agg in tx_aggs:
        bid = agg['_id']
        if not bid or not ObjectId.is_valid(bid): continue
        
        # Simple Logic: Calculated Stock
        calc_stok = agg['total_masuk'] - agg['total_keluar']
        
        # Check Opname logic override? 
        # If we have OPNAME/PENYESUAIAN transaction type, 'jumlah' IS the physical stock at that time.
        # So we need to process chronologically for accuracy.
        # Fallback to chronological processing for items with transactions
        
        txs = await db.transaksi.find({"barang_id": bid}).sort("timestamp", 1).to_list(None)
        running_stok = 0
        for tx in txs:
            if tx['jenis'] in ['MASUK', 'SALDO_AWAL']:
                running_stok += tx['jumlah']
            elif tx['jenis'] == 'KELUAR':
                running_stok -= tx['jumlah']
            elif tx['jenis'] in ['OPNAME', 'PENYESUAIAN']:
                # If transaction record stores the ACTUAL stock in 'jumlah', reset running stock
                # Note: In previous `transaksi.py`, for PENYESUAIAN we stored actual count in `jumlah`.
                running_stok = tx['jumlah']
        
        # Update Master
        await db.barang.update_one(
            {"_id": ObjectId(bid)},
            {"$set": {"stok": running_stok}}
        )
        count += 1
        
    return {"message": f"Stok berhasil dihitung ulang untuk {count} barang berdasarkan riwayat transaksi."}

@router.post("/database/reset")
async def reset_database(
    target: str, # 'transaksi', 'barang', 'all'
    current_user: str = Depends(get_current_user)
):
    if target == 'transaksi':
        await db.transaksi.delete_many({})
        await db.stok_batches.delete_many({}) # Clear batches too
        await db.opname.delete_many({})
        return {"message": "Data Transaksi & Opname berhasil dihapus total."}
        
    elif target == 'barang':
        await db.barang.delete_many({})
        return {"message": "Data Master Barang berhasil dihapus total."}
        
    elif target == 'referensi':
        await db.kodefikasi.delete_many({})
        return {"message": "Data Referensi Kode berhasil dihapus."}
        
    elif target == 'all':
        await db.transaksi.delete_many({})
        await db.stok_batches.delete_many({})
        await db.opname.delete_many({})
        await db.barang.delete_many({})
        await db.pegawai.delete_many({})
        # Keep Users & Settings?
        return {"message": "SEMUA DATA (Barang, Transaksi, Pegawai) berhasil di-reset ke awal."}
        
    raise HTTPException(status_code=400, detail="Target reset tidak valid")
