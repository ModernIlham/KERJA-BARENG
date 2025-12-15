from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict
from pydantic import BaseModel
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId, json_util
import math
import json
import io
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
            # Indo Format: 10.000,00 -> 10000.00
            clean = val.replace("Rp", "").strip()
            
            # Check for comma as decimal separator
            if "," in clean:
                # Remove thousands separator (.)
                clean = clean.replace(".", "")
                # Replace decimal separator (,) with (.)
                clean = clean.replace(",", ".")
            else:
                # Assuming standard format or no decimals
                clean = clean.replace(".", "").replace(",", "")
                
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
        stok_val = item.get('stok')
        if isinstance(stok_val, str) or isinstance(stok_val, float):
            try: updates['stok'] = int(clean_number(stok_val))
            except: updates['stok'] = 0
            
        # 3. Clean Kode (Remove dots if stored)
        kode = item.get('kode_barang')
        if kode and isinstance(kode, str) and ("." in kode or " " in kode):
            updates['kode_barang'] = kode.replace(".", "").replace(" ", "").strip()
            
        if updates:
            await db.barang.update_one({"_id": item['_id']}, {"$set": updates})
            count += 1
            
    return {"message": f"Normalisasi selesai. {count} data diperbaiki formatnya."}

@router.post("/database/recalculate-stock")
async def recalculate_stock(current_user: str = Depends(get_current_user)):
    """
    Hitung ulang stok Master Barang berdasarkan Riwayat Transaksi.
    """
    # Pipeline: Group Transaction Impacts by BarangID
    pipeline = [
        {"$group": {
            "_id": "$barang_id",
            "total_masuk": {"$sum": {"$cond": [{"$in": ["$jenis", ["MASUK", "SALDO_AWAL"]]}, "$jumlah", 0]}},
            "total_keluar": {"$sum": {"$cond": [{"$eq": ["$jenis", "KELUAR"]}, "$jumlah", 0]}},
            # We need to know if there's any OPNAME to potentially override logic, 
            # but usually recalculation implies trusting the transaction log flow.
        }}
    ]
    
    tx_aggs = await db.transaksi.aggregate(pipeline).to_list(10000)
    
    count = 0
    for agg in tx_aggs:
        bid_str = agg['_id']
        if not bid_str: continue
        
        try:
            bid = ObjectId(bid_str)
        except:
            continue
            
        # Detailed Chronological Calculation (Safe Method)
        # Fetch all transactions for this item sorted by time
        txs = await db.transaksi.find({"barang_id": bid_str}).sort("timestamp", 1).to_list(10000)
        
        running_stok = 0
        for tx in txs:
            if tx['jenis'] in ['MASUK', 'SALDO_AWAL']:
                running_stok += tx['jumlah']
            elif tx['jenis'] == 'KELUAR':
                running_stok -= tx['jumlah']
            elif tx['jenis'] in ['OPNAME', 'PENYESUAIAN']:
                # Assume 'jumlah' in PENYESUAIAN record is the ACTUAL STOCK resulting from opname
                # This aligns with how we store Opname in previous steps
                running_stok = tx['jumlah']
        
        # Ensure non-negative? Maybe warn?
        # Update Master
        await db.barang.update_one(
            {"_id": bid},
            {"$set": {"stok": running_stok}}
        )
        count += 1
        
    return {"message": f"Stok berhasil dihitung ulang untuk {count} barang aktif."}

@router.post("/database/reset")
async def reset_database(
    target: str, # 'transaksi', 'barang', 'referensi', 'all'
    current_user: str = Depends(get_current_user)
):
    if target == 'transaksi':
        await db.transaksi.delete_many({})
        await db.stok_batches.delete_many({})
        await db.opname.delete_many({})
        # Optionally reset stock to 0? Or keep as is?
        # Usually if you delete transactions, stock history is gone, so stock should be reset or kept as "Initial".
        # Let's keep Master Barang intact.
        return {"message": "Data Transaksi & Opname berhasil dihapus total."}
        
    elif target == 'barang':
        await db.barang.delete_many({})
        # If barang gone, transactions should be gone too to prevent orphans?
        # Or at least warn.
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
        return {"message": "SEMUA DATA (Barang, Transaksi, Pegawai) berhasil di-reset ke awal."}
        
    raise HTTPException(status_code=400, detail="Target reset tidak valid")

@router.get("/database/backup")
async def backup_database(current_user: str = Depends(get_current_user)):
    """
    Download JSON dump of main collections
    """
    data = {}
    data['barang'] = await db.barang.find().to_list(50000)
    data['transaksi'] = await db.transaksi.find().to_list(50000)
    data['pegawai'] = await db.pegawai.find().to_list(50000)
    data['referensi'] = await db.kodefikasi.find().to_list(50000)
    
    # Convert ObjectIds and Datetimes
    json_str = json_util.dumps(data)
    
    return StreamingResponse(
        io.BytesIO(json_str.encode()),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=backup_siman_{datetime.now().strftime('%Y%m%d')}.json"}
    )
# --- Config Endpoints ---

@router.get("/config")
async def get_system_config(current_user: str = Depends(get_current_user)):
    config = await db.system_settings.find_one({"key": "general"})
    if not config:
        # Create default
        new_config = SystemSettings(key="general")
        await db.system_settings.insert_one(new_config.model_dump())
        return new_config.model_dump()
    
    # Check if month changed, reset counter if needed (lazy reset)
    current_month_str = datetime.now(timezone.utc).strftime("%Y-%m")
    if config.get("current_month") != current_month_str:
        await db.system_settings.update_one(
            {"key": "general"},
            {"$set": {"current_month": current_month_str, "current_month_count": 0}}
        )
        config["current_month"] = current_month_str
        config["current_month_count"] = 0
        
    if "_id" in config: config["_id"] = str(config["_id"])
    return config

@router.put("/config")
async def update_system_config(data: dict = Body(...), current_user: str = Depends(get_current_user)):
    limit = data.get("monthly_upload_limit")
    if limit is None or limit < 0:
        raise HTTPException(status_code=400, detail="Invalid limit")
    
    await db.system_settings.update_one(
        {"key": "general"},
        {"$set": {"monthly_upload_limit": limit}},
        upsert=True
    )
    return {"message": "Configuration updated", "limit": limit}
