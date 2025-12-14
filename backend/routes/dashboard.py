from fastapi import APIRouter, Depends
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("/summary")
async def get_dashboard_summary(current_user: str = Depends(get_current_user)):
    # 1. Total Stats
    stats_pipeline = [
        {"$group": {
            "_id": None,
            "total_items": {"$sum": 1},
            "total_value": {"$sum": {"$multiply": ["$stok", "$nilai_per_unit"]}},
            "critical_stock": {"$sum": {"$cond": [{"$lte": ["$stok", 5]}, 1, 0]}}
        }}
    ]
    stats = await db.barang.aggregate(stats_pipeline).to_list(1)
    stats_res = stats[0] if stats else {"total_items": 0, "total_value": 0, "critical_stock": 0}
    
    # 2. Recent Transactions
    recent_tx = await db.transaksi.find().sort("timestamp", -1).limit(5).to_list(5)
    
    # 3. Monthly Expenditure (Barang Keluar)
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
