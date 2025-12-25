from fastapi import APIRouter, Depends, Query
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from typing import Optional
from datetime import datetime, timezone

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("/summary")
async def get_dashboard_summary(current_user: str = Depends(get_current_user)):
    # 1. Aset Tetap Stats
    aset_pipeline = [
        {"$group": {
            "_id": None,
            "total_items": {"$sum": 1},
            "total_value": {"$sum": "$nilai_perolehan"}, 
            "critical_stock": {"$sum": {"$cond": [{"$lte": ["$stok", 0]}, 1, 0]}}
        }}
    ]
    aset_stats = await db.barang.aggregate(aset_pipeline).to_list(1)
    aset_res = aset_stats[0] if aset_stats else {"total_items": 0, "total_value": 0, "critical_stock": 0}
    
    # 2. Persediaan Stats
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    persediaan_pipeline = [
        {"$group": {
            "_id": None,
            "total_items": {"$sum": 1},
            "total_value": {"$sum": {"$multiply": ["$stok", "$nilai_satuan"]}}, 
            "low_stock": {
                "$sum": {
                    "$cond": [
                        {"$and": [{"$lte": ["$stok", "$batas_kritis"]}, {"$gt": ["$batas_kritis", 0]}]}, 
                        1, 
                        0
                    ]
                }
            },
            "expired": {
                "$sum": {
                    "$cond": [
                        {"$and": [{"$ne": ["$expired_date", None]}, {"$lt": ["$expired_date", today_str]}]}, 
                        1, 
                        0
                    ]
                }
            }
        }}
    ]
    inv_stats = await db.persediaan.aggregate(persediaan_pipeline).to_list(1)
    inv_res = inv_stats[0] if inv_stats else {"total_items": 0, "total_value": 0, "low_stock": 0, "expired": 0}

    # 3. Recent Transactions (Merge Asset & Inventory)
    # Asset Transactions
    recent_tx_asset = await db.transaksi.find().sort("timestamp", -1).limit(5).to_list(5)
    # Inventory Transactions
    recent_tx_inv = await db.transaksi_persediaan.find().sort("timestamp", -1).limit(5).to_list(5)
    
    # Combine and Sort
    all_tx = recent_tx_asset + recent_tx_inv
    
    def get_sort_key(x):
        ts = x.get('timestamp')
        if ts is None:
            return datetime.min
        if isinstance(ts, str):
            try:
                return datetime.fromisoformat(ts.replace('Z', '+00:00'))
            except:
                return datetime.min
        return ts if isinstance(ts, datetime) else datetime.min
    
    all_tx.sort(key=get_sort_key, reverse=True)
    recent_tx = all_tx[:5]
    
    # Format sanitized response
    def sanitize(item):
        if not item: return item
        item['_id'] = str(item['_id'])
        if 'timestamp' in item and item['timestamp']:
            item['timestamp'] = item['timestamp'].isoformat()
        return item

    return {
        "aset_stats": aset_res,
        "persediaan_stats": inv_res,
        "recent_activity": [sanitize(tx) for tx in recent_tx]
    }

@router.get("/rekap-pengeluaran")
async def get_rekap_pengeluaran(
    eselon1: Optional[str] = None,
    eselon2: Optional[str] = None,
    eselon3: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    """
    Returns breakdown of expenditure grouped by Unit (Eselon)
    Used for the hierarchical chart.
    """
    match_stage = {"jenis": "KELUAR"}
    
    lookup_stage = {
        "$lookup": {
            "from": "pegawai",
            "localField": "pegawai_id",
            "foreignField": "_id",
            "as": "pegawai_info"
        }
    }
    
    unwind_stage = {"$unwind": "$pegawai_info"}
    
    # Dynamic Filtering based on inputs
    filter_stage = {}
    if eselon1: filter_stage["pegawai_info.eselon1"] = eselon1
    if eselon2: filter_stage["pegawai_info.eselon2"] = eselon2
    if eselon3: filter_stage["pegawai_info.eselon3"] = eselon3
    
    # Group By next level
    group_field = "$pegawai_info.eselon1"
    if eselon1: group_field = "$pegawai_info.eselon2"
    if eselon2: group_field = "$pegawai_info.eselon3"
    if eselon3: group_field = "$pegawai_info.eselon4"
    
    group_stage = {
        "$group": {
            "_id": group_field,
            "total_keluar": {"$sum": "$jumlah"},
            "total_nilai": {"$sum": 0} # Need to join with Barang to get value? For now quantity is enough.
        }
    }
    
    pipeline = [
        {"$match": match_stage},
        {"$addFields": {"pegawai_id": {"$toObjectId": "$pegawai_id"}}}, # Ensure ID type match
        lookup_stage,
        unwind_stage,
        {"$match": filter_stage},
        group_stage,
        {"$sort": {"total_keluar": -1}}
    ]
    
    results = await db.transaksi.aggregate(pipeline).to_list(20)
    
    # Format for Frontend Chart
    labels = [r["_id"] for r in results if r["_id"]]
    values = [r["total_keluar"] for r in results if r["_id"]]
    
    return {
        "labels": labels,
        "datasets": [{
            "label": "Jumlah Pengeluaran (Unit)",
            "data": values,
            "backgroundColor": "#0F172A"
        }]
    }

@router.get("/filter-options")
async def get_filter_options(current_user: str = Depends(get_current_user)):
    """
    Returns unique Eselon 1, 2, 3 values for dropdowns
    """
    e1 = await db.pegawai.distinct("eselon1")
    e2 = await db.pegawai.distinct("eselon2")
    e3 = await db.pegawai.distinct("eselon3")
    return {
        "eselon1": [x for x in e1 if x],
        "eselon2": [x for x in e2 if x],
        "eselon3": [x for x in e3 if x]
    }
