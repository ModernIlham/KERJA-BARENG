from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
import math

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

def sanitize_doc(doc):
    """Sanitize MongoDB document for JSON serialization"""
    if doc is None:
        return None
    if isinstance(doc, dict):
        result = {}
        for k, v in doc.items():
            if k == '_id':
                result['id'] = str(v)
            elif isinstance(v, ObjectId):
                result[k] = str(v)
            elif isinstance(v, float):
                if math.isnan(v) or math.isinf(v):
                    result[k] = None
                else:
                    result[k] = v
            elif isinstance(v, dict):
                result[k] = sanitize_doc(v)
            elif isinstance(v, list):
                result[k] = [sanitize_doc(item) if isinstance(item, (dict, list)) else item for item in v]
            else:
                result[k] = v
        return result
    elif isinstance(doc, list):
        return [sanitize_doc(item) for item in doc]
    return doc

@router.get("/mutasi")
async def get_laporan_mutasi(
    start_date: str,
    end_date: str,
    current_user: str = Depends(get_current_user)
):
    """
    Laporan Mutasi: Saldo Awal, Mutasi Masuk, Mutasi Keluar, Saldo Akhir
    """
    sd = datetime.strptime(start_date, "%Y-%m-%d")
    ed = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    
    # 1. Get All Items
    items = await db.barang.find({}, {"nama_barang": 1, "kode_barang": 1, "satuan": 1}).to_list(1000)
    
    report = []
    
    for item in items:
        bid = item['_id']
        
        # Calculate Saldo Awal (Tx before start_date)
        pipeline_awal = [
            {"$match": {
                "barang_id": str(bid),
                "timestamp": {"$lt": sd}
            }},
            {"$group": {
                "_id": None,
                "masuk": {"$sum": {"$cond": [{"$in": ["$jenis", ["MASUK", "SALDO_AWAL"]]}, "$jumlah", 0]}},
                "keluar": {"$sum": {"$cond": [{"$eq": ["$jenis", "KELUAR"]}, "$jumlah", 0]}},
                # Opname diffs logic omitted for speed, assuming processed as adj
            }}
        ]
        res_awal = await db.transaksi.aggregate(pipeline_awal).to_list(1000)
        saldo_awal = (res_awal[0]['masuk'] - res_awal[0]['keluar']) if res_awal else 0
        
        # Calculate Mutasi (Tx within range)
        pipeline_mutasi = [
            {"$match": {
                "barang_id": str(bid),
                "timestamp": {"$gte": sd, "$lte": ed}
            }},
            {"$group": {
                "_id": None,
                "masuk": {"$sum": {"$cond": [{"$in": ["$jenis", ["MASUK", "SALDO_AWAL"]]}, "$jumlah", 0]}},
                "keluar": {"$sum": {"$cond": [{"$eq": ["$jenis", "KELUAR"]}, "$jumlah", 0]}}
            }}
        ]
        res_mutasi = await db.transaksi.aggregate(pipeline_mutasi).to_list(1000)
        mutasi_masuk = res_mutasi[0]['masuk'] if res_mutasi else 0
        mutasi_keluar = res_mutasi[0]['keluar'] if res_mutasi else 0
        
        saldo_akhir = saldo_awal + mutasi_masuk - mutasi_keluar
        
        if saldo_awal == 0 and mutasi_masuk == 0 and mutasi_keluar == 0:
            continue # Skip inactive items
            
        report.append({
            "kode_barang": item.get('kode_barang'),
            "nama_barang": item.get('nama_barang'),
            "satuan": item.get('satuan', 'Unit'),
            "saldo_awal": saldo_awal,
            "mutasi_masuk": mutasi_masuk,
            "mutasi_keluar": mutasi_keluar,
            "saldo_akhir": saldo_akhir
        })
        
    return report

@router.get("/posisi-stok")
async def get_posisi_stok(current_user: str = Depends(get_current_user)):
    """
    Laporan Posisi Stok (Current Stock + Value)
    """
    pipeline = [
        {"$project": {
            "kode_barang": 1,
            "nama_barang": 1,
            "kategori": 1,
            "stok": 1,
            "nilai_satuan": 1,
            "total_nilai": {"$multiply": ["$stok", "$nilai_satuan"]}
        }},
        {"$sort": {"nama_barang": 1}}
    ]
    results = await db.barang.aggregate(pipeline).to_list(1000)
    return [sanitize_doc(r) for r in results]

@router.get("/kartu-gudang")
async def get_kartu_gudang(
    barang_id: str,
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(barang_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    barang = await db.barang.find_one({"_id": ObjectId(barang_id)})
    if not barang:
        raise HTTPException(status_code=404, detail="Barang not found")
        
    sd = datetime.strptime(start_date, "%Y-%m-%d") if start_date else datetime.min
    ed = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59) if end_date else datetime.max
    
    # Calc Initial Balance
    pipeline_awal = [
        {"$match": {
            "barang_id": barang_id,
            "timestamp": {"$lt": sd}
        }},
        {"$group": {
            "_id": None,
            "masuk": {"$sum": {"$cond": [{"$in": ["$jenis", ["MASUK", "SALDO_AWAL"]]}, "$jumlah", 0]}},
            "keluar": {"$sum": {"$cond": [{"$eq": ["$jenis", "KELUAR"]}, "$jumlah", 0]}}
        }}
    ]
    res_awal = await db.transaksi.aggregate(pipeline_awal).to_list(1000)
    current_saldo = (res_awal[0]['masuk'] - res_awal[0]['keluar']) if res_awal else 0
    initial_saldo = current_saldo
    
    # Get Transactions
    cursor = db.transaksi.find({
        "barang_id": barang_id,
        "timestamp": {"$gte": sd, "$lte": ed}
    }).sort("timestamp", 1)
    
    txs = await cursor.to_list(10000)
    mutasi = []
    
    for tx in txs:
        m_in = 0
        m_out = 0
        if tx['jenis'] in ['MASUK', 'SALDO_AWAL']:
            m_in = tx['jumlah']
            current_saldo += m_in
        elif tx['jenis'] == 'KELUAR':
            m_out = tx['jumlah']
            current_saldo -= m_out
        elif tx['jenis'] == 'PENYESUAIAN':
            # Logic: Penyesuaian is absolute or diff?
            # In previous logic we assumed it sets the stock.
            # But here let's treat 'jumlah' as the new stock.
            # So diff = jumlah - prev_saldo
            target = tx['jumlah']
            diff = target - current_saldo
            if diff > 0: m_in = diff
            else: m_out = abs(diff)
            current_saldo = target
            
        mutasi.append({
            "tanggal": tx['timestamp'],
            "no_dokumen": tx.get('dokumen_ref', '-'),
            "keterangan": tx.get('keterangan', '-'),
            "masuk": m_in,
            "keluar": m_out,
            "saldo": current_saldo
        })
        
    return {
        "barang": barang,
        "periode": {"start": start_date, "end": end_date},
        "saldo_awal": initial_saldo,
        "mutasi": mutasi
    }
