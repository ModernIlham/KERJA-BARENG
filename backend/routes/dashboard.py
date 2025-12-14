from fastapi import APIRouter, Depends, Query
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from typing import Optional

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("/summary")
async def get_dashboard_summary(current_user: str = Depends(get_current_user)):
    # 1. Stats
    stats_pipeline = [
        {"$group": {
            "_id": None,
            "total_items": {"$sum": 1},
            "total_value": {"$sum": "$nilai_perolehan"}, 
            "critical_stock": {"$sum": {"$cond": [{"$lte": ["$stok", 0]}, 1, 0]}}
        }}
    ]
    stats = await db.barang.aggregate(stats_pipeline).to_list(1)
    stats_res = stats[0] if stats else {"total_items": 0, "total_value": 0, "critical_stock": 0}
    
    # 2. Recent Transactions
    recent_tx = await db.transaksi.find().sort("timestamp", -1).limit(5).to_list(5)
    
    # 3. Monthly Expenditure (Global) - Default View
    expenditure_pipeline = [
        {"$match": {"jenis": "KELUAR"}},
        {"$group": {
            "_id": {"month": {"$month": "$timestamp"}, "year": {"$year": "$timestamp"}},
            "total_keluar": {"$sum": "$jumlah"}
        }},
        {"$sort": {"_id.year": 1, "_id.month": 1}},
        {"$limit": 6}
    ]
    expenditure = await db.transaksi.aggregate(expenditure_pipeline).to_list(6)
    
    return {
        "stats": stats_res,
        "recent_activity": recent_tx,
        "expenditure_trend": expenditure
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
    
    # We need to filter transactions where the 'unit_penerima' matches the hierarchy.
    # However, 'unit_penerima' in Transaction is flat. 
    # Better approach: Join with Pegawai collection to get the hierarchy of the person who took the item.
    
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
