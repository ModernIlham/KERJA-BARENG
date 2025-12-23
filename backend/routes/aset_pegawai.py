"""
Asset Tracking & Monitoring for Employees
- Track assets assigned to each employee
- Alert when employee leaves/transfers with assets
- Asset handover management
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone
import os
import math

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ========== PYDANTIC MODELS ==========

class AsetPegawaiBase(BaseModel):
    """Base model for employee asset"""
    nama_aset: str
    kode_aset: Optional[str] = None
    kategori: str = "Umum"  # Elektronik, Furniture, Kendaraan, Peralatan Kantor, Umum
    merk: Optional[str] = None
    tipe: Optional[str] = None
    serial_number: Optional[str] = None
    kondisi: str = "Baik"  # Baik, Rusak Ringan, Rusak Berat
    nilai_perolehan: float = 0
    tgl_perolehan: Optional[str] = None
    lokasi: Optional[str] = None
    keterangan: Optional[str] = None

class AsetPegawaiCreate(AsetPegawaiBase):
    """Create model for employee asset"""
    pemegang_id: Optional[str] = None  # ID pegawai yang memegang

class AsetPegawaiUpdate(BaseModel):
    """Update model for employee asset"""
    nama_aset: Optional[str] = None
    kode_aset: Optional[str] = None
    kategori: Optional[str] = None
    merk: Optional[str] = None
    tipe: Optional[str] = None
    serial_number: Optional[str] = None
    kondisi: Optional[str] = None
    nilai_perolehan: Optional[float] = None
    tgl_perolehan: Optional[str] = None
    lokasi: Optional[str] = None
    keterangan: Optional[str] = None
    status: Optional[str] = None

class AsetPegawai(AsetPegawaiBase):
    """Full model for employee asset"""
    id: Optional[str] = None
    pemegang_id: Optional[str] = None
    pemegang_nama: Optional[str] = None
    pemegang_nip: Optional[str] = None
    pemegang_unit_kerja: Optional[str] = None
    status: str = "Tersedia"  # Tersedia, Dipinjam, Dikembalikan, Rusak, Hilang
    tgl_penyerahan: Optional[str] = None
    tgl_pengembalian: Optional[str] = None
    riwayat_pemegang: List[Dict] = []  # [{pemegang_id, pemegang_nama, tgl_mulai, tgl_selesai, keterangan}]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class SerahTerimaAset(BaseModel):
    """Model for asset handover"""
    pemegang_baru_id: str
    keterangan: Optional[str] = None

class KembalikanAset(BaseModel):
    """Model for asset return"""
    kondisi_pengembalian: str = "Baik"
    keterangan: Optional[str] = None

# ========== HELPER FUNCTIONS ==========

async def get_pegawai_info(pegawai_id: str) -> dict:
    """Get basic pegawai info for asset record"""
    if not pegawai_id or not ObjectId.is_valid(pegawai_id):
        return {"nama": None, "nip": None, "unit_kerja": None}
    
    pegawai = await db.pegawai.find_one({"_id": ObjectId(pegawai_id)})
    if not pegawai:
        return {"nama": None, "nip": None, "unit_kerja": None}
    
    return {
        "nama": pegawai.get("nama_lengkap"),
        "nip": pegawai.get("nip") or pegawai.get("nik") or pegawai.get("nrp"),
        "unit_kerja": pegawai.get("eselon2") or pegawai.get("eselon1")
    }

def serialize_aset(aset: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict"""
    if "_id" in aset:
        aset["id"] = str(aset.pop("_id"))
    return aset

# ========== CRUD ENDPOINTS ==========

@router.get("", response_model=Dict[str, Any])
async def get_aset_pegawai_list(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    kategori: Optional[str] = None,
    pemegang_id: Optional[str] = None,
    kondisi: Optional[str] = None,
    sort_by: Optional[str] = "nama_aset",
    sort_order: Optional[str] = "asc",
    current_user: str = Depends(get_current_user)
):
    """Get paginated list of employee assets"""
    skip = (page - 1) * limit
    query = {}
    
    # Search
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"nama_aset": search_regex},
            {"kode_aset": search_regex},
            {"merk": search_regex},
            {"serial_number": search_regex},
            {"pemegang_nama": search_regex},
            {"pemegang_nip": search_regex},
            {"lokasi": search_regex},
        ]
    
    # Filters
    if status:
        query["status"] = status
    if kategori:
        query["kategori"] = kategori
    if pemegang_id:
        query["pemegang_id"] = pemegang_id
    if kondisi:
        query["kondisi"] = kondisi
    
    # Sorting
    sort_direction = 1 if sort_order == "asc" else -1
    
    total = await db.aset_pegawai.count_documents(query)
    cursor = db.aset_pegawai.find(query).skip(skip).limit(limit).sort(sort_by, sort_direction)
    items = await cursor.to_list(length=limit)
    
    # Serialize
    for item in items:
        serialize_aset(item)
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if limit > 0 else 0
    }

@router.post("", response_model=Dict)
async def create_aset_pegawai(
    aset_in: AsetPegawaiCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new employee asset"""
    
    # Get pemegang info if provided
    pemegang_info = await get_pegawai_info(aset_in.pemegang_id) if aset_in.pemegang_id else {}
    
    # Build asset document
    new_aset = {
        **aset_in.dict(),
        "pemegang_nama": pemegang_info.get("nama"),
        "pemegang_nip": pemegang_info.get("nip"),
        "pemegang_unit_kerja": pemegang_info.get("unit_kerja"),
        "status": "Dipinjam" if aset_in.pemegang_id else "Tersedia",
        "tgl_penyerahan": datetime.now(timezone.utc).isoformat() if aset_in.pemegang_id else None,
        "riwayat_pemegang": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Add initial holder to history if provided
    if aset_in.pemegang_id and pemegang_info.get("nama"):
        new_aset["riwayat_pemegang"].append({
            "pemegang_id": aset_in.pemegang_id,
            "pemegang_nama": pemegang_info.get("nama"),
            "pemegang_nip": pemegang_info.get("nip"),
            "tgl_mulai": datetime.now(timezone.utc).isoformat(),
            "tgl_selesai": None,
            "keterangan": "Penyerahan awal"
        })
    
    result = await db.aset_pegawai.insert_one(new_aset)
    new_aset["id"] = str(result.inserted_id)
    if "_id" in new_aset:
        del new_aset["_id"]
    
    return {"message": "Aset berhasil ditambahkan", "data": new_aset}

@router.get("/{id}", response_model=Dict)
async def get_aset_pegawai_detail(
    id: str,
    current_user: str = Depends(get_current_user)
):
    """Get asset detail by ID"""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID tidak valid")
    
    aset = await db.aset_pegawai.find_one({"_id": ObjectId(id)})
    if not aset:
        raise HTTPException(status_code=404, detail="Aset tidak ditemukan")
    
    return serialize_aset(aset)

@router.put("/{id}", response_model=Dict)
async def update_aset_pegawai(
    id: str,
    aset_in: AsetPegawaiUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update employee asset"""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID tidak valid")
    
    update_data = {k: v for k, v in aset_in.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.aset_pegawai.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Aset tidak ditemukan")
    
    return {"message": "Aset berhasil diperbarui", "data": serialize_aset(result)}

@router.delete("/{id}")
async def delete_aset_pegawai(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete employee asset"""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID tidak valid")
    
    result = await db.aset_pegawai.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Aset tidak ditemukan")
    
    return {"message": "Aset berhasil dihapus"}

# ========== ASSET HANDOVER ENDPOINTS ==========

@router.post("/{id}/serah-terima")
async def serah_terima_aset(
    id: str,
    data: SerahTerimaAset,
    current_user: dict = Depends(get_current_user)
):
    """Transfer asset to new holder"""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID tidak valid")
    
    aset = await db.aset_pegawai.find_one({"_id": ObjectId(id)})
    if not aset:
        raise HTTPException(status_code=404, detail="Aset tidak ditemukan")
    
    # Get new holder info
    new_holder = await get_pegawai_info(data.pemegang_baru_id)
    if not new_holder.get("nama"):
        raise HTTPException(status_code=400, detail="Pemegang baru tidak ditemukan")
    
    # Close current holder's record in history
    riwayat = aset.get("riwayat_pemegang", [])
    if riwayat and riwayat[-1].get("tgl_selesai") is None:
        riwayat[-1]["tgl_selesai"] = datetime.now(timezone.utc).isoformat()
        riwayat[-1]["keterangan"] = f"Diserahkan ke {new_holder.get('nama')}"
    
    # Add new holder to history
    riwayat.append({
        "pemegang_id": data.pemegang_baru_id,
        "pemegang_nama": new_holder.get("nama"),
        "pemegang_nip": new_holder.get("nip"),
        "tgl_mulai": datetime.now(timezone.utc).isoformat(),
        "tgl_selesai": None,
        "keterangan": data.keterangan or "Serah terima aset"
    })
    
    # Update asset
    update_data = {
        "pemegang_id": data.pemegang_baru_id,
        "pemegang_nama": new_holder.get("nama"),
        "pemegang_nip": new_holder.get("nip"),
        "pemegang_unit_kerja": new_holder.get("unit_kerja"),
        "status": "Dipinjam",
        "tgl_penyerahan": datetime.now(timezone.utc).isoformat(),
        "riwayat_pemegang": riwayat,
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.aset_pegawai.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=True
    )
    
    return {
        "message": f"Aset berhasil diserahterimakan ke {new_holder.get('nama')}",
        "data": serialize_aset(result)
    }

@router.post("/{id}/kembalikan")
async def kembalikan_aset(
    id: str,
    data: KembalikanAset,
    current_user: dict = Depends(get_current_user)
):
    """Return asset from current holder"""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID tidak valid")
    
    aset = await db.aset_pegawai.find_one({"_id": ObjectId(id)})
    if not aset:
        raise HTTPException(status_code=404, detail="Aset tidak ditemukan")
    
    if not aset.get("pemegang_id"):
        raise HTTPException(status_code=400, detail="Aset tidak sedang dipinjam")
    
    # Close current holder's record in history
    riwayat = aset.get("riwayat_pemegang", [])
    if riwayat and riwayat[-1].get("tgl_selesai") is None:
        riwayat[-1]["tgl_selesai"] = datetime.now(timezone.utc).isoformat()
        riwayat[-1]["keterangan"] = data.keterangan or "Dikembalikan"
    
    # Update asset
    update_data = {
        "pemegang_id": None,
        "pemegang_nama": None,
        "pemegang_nip": None,
        "pemegang_unit_kerja": None,
        "status": "Tersedia",
        "kondisi": data.kondisi_pengembalian,
        "tgl_pengembalian": datetime.now(timezone.utc).isoformat(),
        "riwayat_pemegang": riwayat,
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.aset_pegawai.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=True
    )
    
    return {
        "message": "Aset berhasil dikembalikan",
        "data": serialize_aset(result)
    }

# ========== EMPLOYEE ASSET TRACKING ==========

@router.get("/pegawai/{pegawai_id}/aset")
async def get_aset_by_pegawai(
    pegawai_id: str,
    current_user: str = Depends(get_current_user)
):
    """Get all assets held by a specific employee"""
    if not ObjectId.is_valid(pegawai_id):
        raise HTTPException(status_code=400, detail="ID pegawai tidak valid")
    
    # Get pegawai info
    pegawai = await db.pegawai.find_one({"_id": ObjectId(pegawai_id)})
    if not pegawai:
        raise HTTPException(status_code=404, detail="Pegawai tidak ditemukan")
    
    # Get assets
    cursor = db.aset_pegawai.find({"pemegang_id": pegawai_id})
    assets = await cursor.to_list(length=100)
    
    for asset in assets:
        serialize_aset(asset)
    
    return {
        "pegawai_id": pegawai_id,
        "nama": pegawai.get("nama_lengkap"),
        "nip": pegawai.get("nip") or pegawai.get("nik") or pegawai.get("nrp"),
        "status": pegawai.get("status"),
        "total_aset": len(assets),
        "total_nilai": sum(a.get("nilai_perolehan", 0) for a in assets),
        "aset": assets
    }

@router.get("/alerts/pegawai-keluar")
async def get_alerts_pegawai_keluar(
    current_user: dict = Depends(get_current_user)
):
    """Get alerts for employees leaving/transferring with assets"""
    from datetime import timedelta
    
    alerts = []
    
    # Get employees with non-active status who have assets
    leaving_statuses = ["KELUAR", "PENSIUN", "MUTASI_KELUAR", "MENINGGAL", "RESIGN", "PHK"]
    
    # Also check contract expiring within 30 days
    today = datetime.now(timezone.utc).date()
    thirty_days_later = today + timedelta(days=30)
    
    # Get all employees with assets
    pipeline = [
        {
            "$lookup": {
                "from": "pegawai",
                "localField": "pemegang_id",
                "foreignField": "_id",
                "as": "pegawai_info"
            }
        },
        {
            "$match": {
                "pemegang_id": {"$ne": None},
                "status": "Dipinjam"
            }
        }
    ]
    
    # Get assets with holders
    assets_with_holders = await db.aset_pegawai.aggregate(pipeline).to_list(length=1000)
    
    # Check each pegawai
    pegawai_checked = set()
    for asset in assets_with_holders:
        pemegang_id = asset.get("pemegang_id")
        if not pemegang_id or pemegang_id in pegawai_checked:
            continue
        
        pegawai_checked.add(pemegang_id)
        
        # Get pegawai details
        if ObjectId.is_valid(pemegang_id):
            pegawai = await db.pegawai.find_one({"_id": ObjectId(pemegang_id)})
        else:
            continue
            
        if not pegawai:
            continue
        
        pegawai_status = (pegawai.get("status") or "").upper()
        
        # Check if leaving
        is_leaving = pegawai_status in leaving_statuses
        
        # Check contract expiring
        contract_expiring = False
        days_remaining = None
        tgl_selesai = pegawai.get("tgl_selesai_kontrak") or pegawai.get("masa_penugasan_end")
        if tgl_selesai:
            try:
                if isinstance(tgl_selesai, str):
                    end_date = datetime.fromisoformat(tgl_selesai.replace('Z', '+00:00')).date()
                else:
                    end_date = tgl_selesai.date() if hasattr(tgl_selesai, 'date') else tgl_selesai
                
                days_remaining = (end_date - today).days
                contract_expiring = 0 <= days_remaining <= 30
            except:
                pass
        
        if is_leaving or contract_expiring:
            # Count assets held
            asset_count = await db.aset_pegawai.count_documents({
                "pemegang_id": pemegang_id,
                "status": "Dipinjam"
            })
            
            # Get asset list
            assets = await db.aset_pegawai.find({
                "pemegang_id": pemegang_id,
                "status": "Dipinjam"
            }).to_list(length=100)
            
            for a in assets:
                serialize_aset(a)
            
            alert_type = "leaving" if is_leaving else "contract_expiring"
            urgency = "critical" if is_leaving else ("high" if days_remaining and days_remaining <= 7 else "medium")
            
            alerts.append({
                "type": alert_type,
                "urgency": urgency,
                "pegawai_id": pemegang_id,
                "pegawai_nama": pegawai.get("nama_lengkap"),
                "pegawai_nip": pegawai.get("nip") or pegawai.get("nik") or pegawai.get("nrp"),
                "pegawai_status": pegawai.get("status"),
                "pegawai_unit": pegawai.get("eselon2") or pegawai.get("eselon1"),
                "days_remaining": days_remaining,
                "asset_count": asset_count,
                "total_nilai": sum(a.get("nilai_perolehan", 0) for a in assets),
                "assets": assets,
                "message": f"{'Pegawai keluar' if is_leaving else f'Kontrak berakhir dalam {days_remaining} hari'} - {asset_count} aset perlu dikembalikan"
            })
    
    # Sort by urgency
    urgency_order = {"critical": 0, "high": 1, "medium": 2}
    alerts.sort(key=lambda x: urgency_order.get(x["urgency"], 3))
    
    return {
        "total": len(alerts),
        "critical": len([a for a in alerts if a["urgency"] == "critical"]),
        "high": len([a for a in alerts if a["urgency"] == "high"]),
        "medium": len([a for a in alerts if a["urgency"] == "medium"]),
        "alerts": alerts
    }

# ========== STATISTICS ==========

@router.get("/statistik/summary")
async def get_aset_summary(
    current_user: dict = Depends(get_current_user)
):
    """Get asset summary statistics"""
    
    # Total assets
    total = await db.aset_pegawai.count_documents({})
    
    # By status
    tersedia = await db.aset_pegawai.count_documents({"status": "Tersedia"})
    dipinjam = await db.aset_pegawai.count_documents({"status": "Dipinjam"})
    rusak = await db.aset_pegawai.count_documents({"status": "Rusak"})
    hilang = await db.aset_pegawai.count_documents({"status": "Hilang"})
    
    # By kategori
    pipeline_kategori = [
        {"$group": {"_id": "$kategori", "count": {"$sum": 1}, "nilai": {"$sum": "$nilai_perolehan"}}}
    ]
    kategori_stats = await db.aset_pegawai.aggregate(pipeline_kategori).to_list(length=100)
    
    # By kondisi
    pipeline_kondisi = [
        {"$group": {"_id": "$kondisi", "count": {"$sum": 1}}}
    ]
    kondisi_stats = await db.aset_pegawai.aggregate(pipeline_kondisi).to_list(length=100)
    
    # Total nilai
    pipeline_nilai = [
        {"$group": {"_id": None, "total": {"$sum": "$nilai_perolehan"}}}
    ]
    total_nilai = await db.aset_pegawai.aggregate(pipeline_nilai).to_list(length=1)
    
    return {
        "total_aset": total,
        "by_status": {
            "tersedia": tersedia,
            "dipinjam": dipinjam,
            "rusak": rusak,
            "hilang": hilang
        },
        "by_kategori": {item["_id"] or "Lainnya": {"count": item["count"], "nilai": item["nilai"]} for item in kategori_stats},
        "by_kondisi": {item["_id"] or "Tidak Diketahui": item["count"] for item in kondisi_stats},
        "total_nilai": total_nilai[0]["total"] if total_nilai else 0
    }
