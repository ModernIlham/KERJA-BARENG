from fastapi import APIRouter, Depends
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
from bson import ObjectId

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

def sanitize_json(data):
    if isinstance(data, list):
        return [sanitize_json(item) for item in data]
    elif isinstance(data, dict):
        return {k: sanitize_json(v) for k, v in data.items()}
    elif isinstance(data, ObjectId):
        return str(data)
    return data

@router.get("/bmn-summary")
async def get_laporan_bmn_summary(current_user: str = Depends(get_current_user)):
    # 1. Ringkasan Nilai Aset (By Category)
    pipeline_nilai = [
        {"$project": {
            "nilai_perolehan": 1,
            "nilai_penyusutan": 1,
            "nilai_buku": 1,
            "category": {
                "$switch": {
                    "branches": [
                        {"case": {"$regexMatch": {"input": "$kode_barang", "regex": "^3\.01"}}, "then": "Tanah"},
                        {"case": {"$regexMatch": {"input": "$kode_barang", "regex": "^3\.03"}}, "then": "Gedung & Bangunan"},
                        {"case": {"$regexMatch": {"input": "$kode_barang", "regex": "^3\.02"}}, "then": "Peralatan & Mesin"},
                    ],
                    "default": "Aset Lainnya"
                }
            }
        }},
        {"$group": {
            "_id": "$category",
            "count": {"$sum": 1},
            "nilai_perolehan": {"$sum": "$nilai_perolehan"},
            "nilai_penyusutan": {"$sum": "$nilai_penyusutan"},
            "nilai_buku": {"$sum": "$nilai_buku"}
        }}
    ]
    nilai_stats = await db.barang.aggregate(pipeline_nilai).to_list(100)
    
    # 2. Kondisi Aset
    pipeline_kondisi = [
        {"$group": {
            "_id": "$kondisi",
            "count": {"$sum": 1}
        }}
    ]
    kondisi_stats = await db.barang.aggregate(pipeline_kondisi).to_list(100)
    
    # 3. Mutasi Summary (Current Year)
    current_year = datetime.now().year
    start_date = datetime(current_year, 1, 1)
    
    pipeline_mutasi = [
        {"$match": {
            "timestamp": {"$gte": start_date}
        }},
        {"$group": {
            "_id": "$jenis", # MASUK, KELUAR, PENYESUAIAN
            "count": {"$sum": 1}, # Unit count (approximated by transaction count for now, ideally sum of quantities)
            "qty": {"$sum": "$jumlah"},
            "total_nilai": {"$sum": "$total_nilai"}
        }}
    ]
    mutasi_stats = await db.transaksi.aggregate(pipeline_mutasi).to_list(100)
    
    # 4. KIB List (Top 50 by Value)
    kib_list = await db.barang.find({}).sort("nilai_perolehan", -1).limit(50).to_list(50)
    
    # Format data for frontend
    summary = {
        "nilai_aset": {
            "Tanah": next((x for x in nilai_stats if x["_id"] == "Tanah"), {"count": 0, "nilai_perolehan": 0}),
            "Gedung & Bangunan": next((x for x in nilai_stats if x["_id"] == "Gedung & Bangunan"), {"count": 0, "nilai_perolehan": 0}),
            "Peralatan & Mesin": next((x for x in nilai_stats if x["_id"] == "Peralatan & Mesin"), {"count": 0, "nilai_perolehan": 0}),
            "Aset Lainnya": next((x for x in nilai_stats if x["_id"] == "Aset Lainnya"), {"count": 0, "nilai_perolehan": 0}),
        },
        "penyusutan": {
            "total": sum(x["nilai_penyusutan"] for x in nilai_stats),
            "tahun_berjalan": 0 # Placeholder if not tracked separately
        },
        "nilai_buku": {
            "total": sum(x["nilai_buku"] for x in nilai_stats)
        },
        "kondisi": {
            "Baik": next((x['count'] for x in kondisi_stats if x["_id"] == "Baik"), 0),
            "Rusak Ringan": next((x['count'] for x in kondisi_stats if x["_id"] == "Rusak Ringan"), 0),
            "Rusak Berat": next((x['count'] for x in kondisi_stats if x["_id"] == "Rusak Berat"), 0),
            "total": sum(x['count'] for x in kondisi_stats)
        },
        "mutasi": mutasi_stats,
        "kib": kib_list
    }
    
    return sanitize_json(summary)
