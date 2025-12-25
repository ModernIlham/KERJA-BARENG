"""Routes for cross-module transactions (Persediaan <-> Aset)"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime, timezone
from uuid import uuid4

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


@router.post("/reklasifikasi")
async def create_cross_reklasifikasi(
    payload: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    """
    Handle cross-module reclassification between Persediaan and Aset Tetap.
    
    Supports:
    - PERSEDIAAN_TO_ASET: Move item from persediaan to barang (aset tetap)
    - ASET_TO_PERSEDIAAN: Move item from barang (aset tetap) to persediaan
    """
    jenis = payload.get("jenis")
    source_id = payload.get("source_id")
    source_type = payload.get("source_type")  # 'persediaan' or 'barang'
    
    if not jenis or jenis not in ['PERSEDIAAN_TO_ASET', 'ASET_TO_PERSEDIAAN']:
        raise HTTPException(status_code=400, detail="Jenis reklasifikasi tidak valid")
    if not source_id:
        raise HTTPException(status_code=400, detail="Source ID wajib diisi")
    if not ObjectId.is_valid(source_id):
        raise HTTPException(status_code=400, detail="Invalid source ID")
    
    is_persediaan_to_aset = jenis == 'PERSEDIAAN_TO_ASET'
    
    # Get source item
    source_collection = 'persediaan' if is_persediaan_to_aset else 'barang'
    source_item = await db[source_collection].find_one({"_id": ObjectId(source_id)})
    
    if not source_item:
        raise HTTPException(status_code=404, detail="Item sumber tidak ditemukan")
    
    # Build transaction record
    transaksi_record = {
        "id": str(uuid4()),
        "jenis": jenis,
        "source_id": source_id,
        "source_type": source_type,
        "source_collection": source_collection,
        "kode_barang_asal": payload.get("kode_barang_asal") or source_item.get("kode_barang"),
        "nama_barang": payload.get("nama_barang") or source_item.get("nama_barang"),
        "no_sppa": payload.get("no_sppa"),
        "tanggal_transaksi": payload.get("tanggal_transaksi"),
        "golongan_tujuan": payload.get("golongan_tujuan"),
        "kode_barang_tujuan": payload.get("kode_barang_tujuan"),
        "nilai_perolehan": payload.get("nilai_perolehan", 0),
        "nilai_satuan": payload.get("nilai_satuan", 0),
        "jumlah": payload.get("jumlah", 1),
        "satuan": payload.get("satuan"),
        "merk": payload.get("merk"),
        "tipe": payload.get("tipe"),
        "kondisi": payload.get("kondisi", "Baik"),
        "alasan_reklasifikasi": payload.get("alasan_reklasifikasi"),
        "no_dokumen_pendukung": payload.get("no_dokumen_pendukung"),
        "keterangan": payload.get("keterangan"),
        "petugas": current_user.full_name if hasattr(current_user, 'full_name') else str(current_user),
        "status": "COMPLETED",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    if is_persediaan_to_aset:
        # PERSEDIAAN -> ASET
        # 1. Create new aset in barang collection
        
        # Get golongan uraian
        golongan_tujuan = payload.get("golongan_tujuan", "2")
        golongan_ref = await db.kodefikasi.find_one({"kode": golongan_tujuan, "level": 1})
        golongan_uraian = f"{golongan_tujuan} - {golongan_ref.get('uraian', '')}" if golongan_ref else None
        
        # Generate NUP for new asset
        kode_barang_tujuan = payload.get("kode_barang_tujuan", "")
        max_nup_item = await db.barang.find_one(
            {"kode_barang": kode_barang_tujuan},
            sort=[("nup", -1)]
        )
        new_nup = "1"
        if max_nup_item and max_nup_item.get('nup'):
            try:
                current_nup = int(str(max_nup_item['nup']).replace('(Sementara)', '').strip())
                new_nup = str(current_nup + 1)
            except:
                new_nup = "1"
        
        new_aset = {
            "id": str(uuid4()),
            "kode_barang": kode_barang_tujuan,
            "nup": new_nup,
            "nama_barang": source_item.get("nama_barang"),
            "merk": source_item.get("merk"),
            "tipe": source_item.get("tipe"),
            "satuan": source_item.get("satuan"),
            "kondisi": source_item.get("kondisi", "Baik"),
            "kuantitas": payload.get("jumlah", source_item.get("stok", 1)),
            "nilai_perolehan": payload.get("nilai_perolehan", source_item.get("stok", 1) * source_item.get("nilai_satuan", 0)),
            "nilai_buku": payload.get("nilai_perolehan", source_item.get("stok", 1) * source_item.get("nilai_satuan", 0)),
            "nilai_satuan": source_item.get("nilai_satuan", 0),
            "golongan_barang": golongan_uraian,
            "tgl_perolehan": payload.get("tanggal_transaksi"),
            "source": "reklasifikasi_persediaan",
            "reklasifikasi_dari": {
                "collection": "persediaan",
                "id": source_id,
                "kode_barang": source_item.get("kode_barang"),
                "nama_barang": source_item.get("nama_barang")
            },
            "status_aset": "Aktif",
            "lokasi_fisik": source_item.get("lokasi_fisik"),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Insert new aset
        result_aset = await db.barang.insert_one(new_aset)
        transaksi_record["target_id"] = str(result_aset.inserted_id)
        transaksi_record["target_collection"] = "barang"
        
        # 2. Mark source persediaan as reklasifikasi
        await db.persediaan.update_one(
            {"_id": ObjectId(source_id)},
            {"$set": {
                "status_reklasifikasi": "REKLASIFIKASI_KE_ASET",
                "reklasifikasi_ke": {
                    "collection": "barang",
                    "id": str(result_aset.inserted_id),
                    "kode_barang": kode_barang_tujuan,
                    "tanggal": payload.get("tanggal_transaksi")
                },
                "stok": 0,  # Zero out stock
                "status_aset": "Non Aktif",
                "updated_at": datetime.now(timezone.utc)
            }}
        )
        
    else:
        # ASET -> PERSEDIAAN
        # 1. Create new persediaan in persediaan collection
        
        new_persediaan = {
            "id": str(uuid4()),
            "kode_barang": payload.get("kode_barang_tujuan") or source_item.get("kode_barang"),
            "nup": "1",
            "nama_barang": source_item.get("nama_barang"),
            "merk": source_item.get("merk"),
            "tipe": source_item.get("tipe"),
            "satuan": source_item.get("satuan"),
            "kondisi": source_item.get("kondisi", "Baik"),
            "stok": source_item.get("kuantitas", 1),
            "nilai_satuan": source_item.get("nilai_satuan") or (source_item.get("nilai_perolehan", 0) / max(source_item.get("kuantitas", 1), 1)),
            "golongan_barang": "1 - Persediaan",
            "tgl_perolehan": payload.get("tanggal_transaksi"),
            "source": "reklasifikasi_aset",
            "reklasifikasi_dari": {
                "collection": "barang",
                "id": source_id,
                "kode_barang": source_item.get("kode_barang"),
                "nup": source_item.get("nup"),
                "nama_barang": source_item.get("nama_barang")
            },
            "status_aset": "Aktif",
            "lokasi_fisik": source_item.get("lokasi_fisik"),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Insert new persediaan
        result_pers = await db.persediaan.insert_one(new_persediaan)
        transaksi_record["target_id"] = str(result_pers.inserted_id)
        transaksi_record["target_collection"] = "persediaan"
        
        # 2. Mark source aset as reklasifikasi
        await db.barang.update_one(
            {"_id": ObjectId(source_id)},
            {"$set": {
                "status_reklasifikasi": "REKLASIFIKASI_KE_PERSEDIAAN",
                "reklasifikasi_ke": {
                    "collection": "persediaan",
                    "id": str(result_pers.inserted_id),
                    "tanggal": payload.get("tanggal_transaksi")
                },
                "status_aset": "Non Aktif",
                "updated_at": datetime.now(timezone.utc)
            }}
        )
    
    # 3. Record transaction in transaksi collection
    await db.transaksi.insert_one(transaksi_record)
    
    # Also record in transaksi_persediaan for history
    persediaan_record = {
        "jenis": "reklasifikasi_" + ("keluar" if is_persediaan_to_aset else "masuk"),
        "persediaan_id": source_id if is_persediaan_to_aset else transaksi_record.get("target_id"),
        "kode_barang": payload.get("kode_barang_asal"),
        "nama_barang": payload.get("nama_barang"),
        "jumlah": payload.get("jumlah", 1),
        "nilai_satuan": payload.get("nilai_satuan", 0),
        "total_nilai": payload.get("nilai_perolehan", 0),
        "keterangan": f"Reklasifikasi {'ke Aset' if is_persediaan_to_aset else 'dari Aset'}: {payload.get('keterangan', '')}",
        "dokumen_ref": payload.get("no_sppa"),
        "no_dokumen_pendukung": payload.get("no_dokumen_pendukung"),
        "petugas": current_user.full_name if hasattr(current_user, 'full_name') else str(current_user),
        "timestamp": datetime.now(timezone.utc)
    }
    await db.transaksi_persediaan.insert_one(persediaan_record)
    
    return {
        "message": f"Reklasifikasi berhasil",
        "transaksi_id": transaksi_record["id"],
        "target_id": transaksi_record.get("target_id"),
        "jenis": jenis
    }


@router.get("/riwayat")
async def get_cross_reklasifikasi_history(
    page: int = 1,
    limit: int = 50,
    current_user: str = Depends(get_current_user)
):
    """
    Get history of cross-module reclassifications.
    """
    query = {
        "jenis": {"$in": ["PERSEDIAAN_TO_ASET", "ASET_TO_PERSEDIAAN"]}
    }
    
    skip = (page - 1) * limit
    total = await db.transaksi.count_documents(query)
    
    cursor = db.transaksi.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }
