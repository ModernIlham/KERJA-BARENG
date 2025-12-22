from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict
from pydantic import BaseModel
from models import SystemSettings
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId, json_util
import math
from routes.logo_logic import handle_logo_upload
from fastapi import UploadFile, File
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
    order: Optional[int] = 0
    
class UserSettings(BaseModel):
    email: str
    full_name: str
    role: str
    is_active: bool
    pegawai_id: Optional[str] = None

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
            is_active=True,
            pegawai_id=u.get('pegawai_id')
        ) for u in users
    ]

@router.get("/unit-kerja")
async def get_unit_kerja(current_user: str = Depends(get_current_user)):
    units = await db.unit_kerja.find().to_list(1000)
    result = []
    for u in units:
        u['id'] = str(u['_id'])
        del u['_id']  # Remove the ObjectId field
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

@router.put("/unit-kerja/{id}")
async def update_unit_kerja(id: str, unit: UnitKerja, current_user: str = Depends(get_current_user)):
    """Update unit kerja - supports name, parent, eselon, and order changes"""
    update_data = {}
    if unit.nama_unit:
        update_data["nama_unit"] = unit.nama_unit
    if unit.eselon:
        update_data["eselon"] = unit.eselon
    if unit.parent_id is not None:
        update_data["parent_id"] = unit.parent_id if unit.parent_id != "" else None
    if unit.order is not None:
        update_data["order"] = unit.order
    
    if update_data:
        await db.unit_kerja.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    return {"message": "Unit Kerja updated", "id": id}

@router.put("/unit-kerja/{id}/move")
async def move_unit_kerja(id: str, data: dict, current_user: str = Depends(get_current_user)):
    """Move unit to new parent or reorder within same parent"""
    new_parent_id = data.get("parent_id")
    new_order = data.get("order", 0)
    new_eselon = data.get("eselon")
    
    update_data = {"order": new_order}
    
    if new_parent_id is not None:
        update_data["parent_id"] = new_parent_id if new_parent_id != "" else None
    
    if new_eselon:
        update_data["eselon"] = new_eselon
    
    await db.unit_kerja.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    return {"message": "Unit moved successfully", "id": id}

@router.post("/unit-kerja/reorder")
async def reorder_unit_kerja(data: dict, current_user: str = Depends(get_current_user)):
    """Bulk reorder units - receives array of {id, order, parent_id}"""
    items = data.get("items", [])
    
    for item in items:
        unit_id = item.get("id")
        order = item.get("order", 0)
        parent_id = item.get("parent_id")
        
        update_data = {"order": order}
        if parent_id is not None:
            update_data["parent_id"] = parent_id if parent_id != "" else None
        
        await db.unit_kerja.update_one({"_id": ObjectId(unit_id)}, {"$set": update_data})
    
    return {"message": f"Reordered {len(items)} units"}

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
    asset_type: str = "all", # 'all', 'aset', 'persediaan'
    txn_type: str = "all", # 'all', 'in', 'out'
    current_user: str = Depends(get_current_user)
):
    if target == 'transaksi':
        deleted_counts = []
        
        # 1. Handle Aset Tetap Transaksi (db.transaksi)
        if asset_type in ['all', 'aset']:
            query = {}
            if txn_type == 'in':
                query["jenis"] = "MASUK"
            elif txn_type == 'out':
                query["jenis"] = "KELUAR"
            
            res = await db.transaksi.delete_many(query)
            if res.deleted_count > 0:
                deleted_counts.append(f"{res.deleted_count} Riwayat Aset Tetap")
                
            # If deleting all asset transactions, maybe clean Opname too?
            # Keeping it simple for now as per request.
            if txn_type == 'all':
                 await db.opname.delete_many({"asset_type": "barang"})

        # 2. Handle Persediaan Transaksi (db.transaksi_persediaan)
        if asset_type in ['all', 'persediaan']:
            query = {}
            if txn_type == 'in':
                query["jenis"] = "in"
            elif txn_type == 'out':
                query["jenis"] = "out"
                
            res = await db.transaksi_persediaan.delete_many(query)
            if res.deleted_count > 0:
                deleted_counts.append(f"{res.deleted_count} Riwayat Persediaan")

        if not deleted_counts:
            return {"message": "Tidak ada data transaksi yang dihapus."}
            
        return {"message": f"Berhasil menghapus: {', '.join(deleted_counts)}"}
        
    elif target == 'barang':
        query = {}
        deleted_desc = "Semua Master Barang"
        
        # Determine query based on asset_type
        # Note: We need to distinguish between Aset Tetap and Persediaan in the 'barang' collection.
        # How do we distinguish? 
        # Usually Persediaan items have 'stok' or specific logic? 
        # Or maybe they are in different collections?
        # WAIT! In this app, 'barang' collection is usually Aset Tetap, and 'persediaan' collection is Persediaan.
        # Let's check models.py and routes.
        # routes/barang.py uses db.barang
        # routes/persediaan.py uses db.persediaan
        
        # So 'barang' target actually needs to delete from DIFFERENT collections based on asset_type.
        
        results = []
        
        # 1. Delete Aset Tetap (collection: barang)
        if asset_type in ['all', 'aset']:
            res = await db.barang.delete_many({})
            if res.deleted_count > 0:
                results.append(f"{res.deleted_count} Aset Tetap")
                
        # 2. Delete Persediaan (collection: persediaan)
        if asset_type in ['all', 'persediaan']:
            res = await db.persediaan.delete_many({})
            if res.deleted_count > 0:
                results.append(f"{res.deleted_count} Persediaan")
                
        if not results:
            return {"message": "Tidak ada data master barang yang dihapus."}
            
        return {"message": f"Berhasil menghapus: {', '.join(results)}"}
        
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
@router.get("/instansi")
async def get_instansi_config(current_user: str = Depends(get_current_user)):
    config = await db.system_settings.find_one({"key": "instansi"})
    if not config:
        return {}
    if "_id" in config: config["_id"] = str(config["_id"])
    return config

@router.put("/instansi")
async def update_instansi_config(data: dict = Body(...), current_user: str = Depends(get_current_user)):
    await db.system_settings.update_one(
        {"key": "instansi"},
        {"$set": data},
        upsert=True
    )
    return {"message": "Informasi Instansi diperbarui"}

@router.post("/instansi/logo")
async def upload_instansi_logo(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    return await handle_logo_upload(file, db)

@router.delete("/instansi/logo")
async def delete_instansi_logo(current_user: str = Depends(get_current_user)):
    await db.system_settings.update_one(
        {"key": "instansi"},
        {"$set": {"logo_url": None}},
        upsert=True
    )
    return {"message": "Logo dihapus"}
        
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
