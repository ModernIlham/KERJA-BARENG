"""
Master Data Barang (Asset Master)
- Master catalog of all company assets
- Source for employee asset assignment
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

class MasterBarangBase(BaseModel):
    """Base model for master asset"""
    nama_barang: str
    kode_barang: Optional[str] = None
    kategori: str = "Umum"  # Elektronik, Furniture, Kendaraan, Peralatan Kantor, Umum
    merk: Optional[str] = None
    tipe: Optional[str] = None
    satuan: str = "Unit"
    kondisi_default: str = "Baik"  # Baik, Rusak Ringan, Rusak Berat
    nilai_perolehan: float = 0
    spesifikasi: Optional[str] = None
    deskripsi: Optional[str] = None
    foto_url: Optional[str] = None
    stok_tersedia: int = 0  # Total available stock (not assigned)


class MasterBarangCreate(MasterBarangBase):
    """Create model for master asset"""
    pass


class MasterBarangUpdate(BaseModel):
    """Update model for master asset"""
    nama_barang: Optional[str] = None
    kode_barang: Optional[str] = None
    kategori: Optional[str] = None
    merk: Optional[str] = None
    tipe: Optional[str] = None
    satuan: Optional[str] = None
    kondisi_default: Optional[str] = None
    nilai_perolehan: Optional[float] = None
    spesifikasi: Optional[str] = None
    deskripsi: Optional[str] = None
    foto_url: Optional[str] = None
    stok_tersedia: Optional[int] = None


class MasterBarang(MasterBarangBase):
    """Full model for master asset"""
    id: Optional[str] = None
    total_assigned: int = 0  # Total assigned to employees
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ========== HELPER FUNCTIONS ==========

def serialize_barang(barang: dict) -> dict:
    """Convert MongoDB document to JSON-serializable dict"""
    if "_id" in barang:
        barang["id"] = str(barang.pop("_id"))
    return barang


async def generate_kode_barang(kategori: str) -> str:
    """Generate unique asset code based on category"""
    prefix_map = {
        "Elektronik": "ELK",
        "Furniture": "FRN",
        "Kendaraan": "KND",
        "Peralatan Kantor": "PKT",
        "Umum": "UMM"
    }
    prefix = prefix_map.get(kategori, "UMM")
    year = datetime.now().year
    
    # Count existing items with same prefix and year
    pattern = f"^{prefix}-{year}-"
    count = await db.master_barang.count_documents({"kode_barang": {"$regex": pattern}})
    
    return f"{prefix}-{year}-{str(count + 1).zfill(4)}"


# ========== CRUD ENDPOINTS ==========

@router.get("", response_model=Dict[str, Any])
async def get_master_barang_list(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    kategori: Optional[str] = None,
    sort_by: Optional[str] = "nama_barang",
    sort_order: Optional[str] = "asc",
    current_user: str = Depends(get_current_user)
):
    """Get paginated list of master assets"""
    skip = (page - 1) * limit
    query = {}
    
    # Search
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"nama_barang": search_regex},
            {"kode_barang": search_regex},
            {"merk": search_regex},
            {"tipe": search_regex},
            {"deskripsi": search_regex},
        ]
    
    # Filters
    if kategori:
        query["kategori"] = kategori
    
    # Sorting
    sort_direction = 1 if sort_order == "asc" else -1
    
    total = await db.master_barang.count_documents(query)
    cursor = db.master_barang.find(query).skip(skip).limit(limit).sort(sort_by, sort_direction)
    items = await cursor.to_list(length=limit)
    
    # Get assigned count for each item
    for item in items:
        master_id = str(item["_id"])
        assigned_count = await db.aset_pegawai.count_documents({
            "master_barang_id": master_id,
            "status": "Dipinjam"
        })
        item["total_assigned"] = assigned_count
        serialize_barang(item)
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if limit > 0 else 0
    }


@router.post("", response_model=Dict)
async def create_master_barang(
    barang_in: MasterBarangCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create new master asset"""
    
    # Generate code if not provided
    kode = barang_in.kode_barang
    if not kode:
        kode = await generate_kode_barang(barang_in.kategori)
    
    # Check for duplicate code
    existing = await db.master_barang.find_one({"kode_barang": kode})
    if existing:
        raise HTTPException(status_code=400, detail=f"Kode barang '{kode}' sudah ada")
    
    # Build document
    new_barang = {
        **barang_in.dict(),
        "kode_barang": kode,
        "total_assigned": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.master_barang.insert_one(new_barang)
    new_barang["id"] = str(result.inserted_id)
    if "_id" in new_barang:
        del new_barang["_id"]
    
    return {"message": "Barang berhasil ditambahkan", "data": new_barang}


@router.get("/all", response_model=List[Dict])
async def get_all_master_barang_simple(
    current_user: str = Depends(get_current_user)
):
    """Get all master assets for dropdown selection (simplified)"""
    cursor = db.master_barang.find({}, {
        "nama_barang": 1,
        "kode_barang": 1,
        "kategori": 1,
        "merk": 1,
        "tipe": 1,
        "nilai_perolehan": 1,
        "stok_tersedia": 1,
        "kondisi_default": 1
    }).sort("nama_barang", 1)
    
    items = await cursor.to_list(length=1000)
    for item in items:
        serialize_barang(item)
    
    return items


@router.get("/{id}", response_model=Dict)
async def get_master_barang_detail(
    id: str,
    current_user: str = Depends(get_current_user)
):
    """Get master asset detail by ID"""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID tidak valid")
    
    barang = await db.master_barang.find_one({"_id": ObjectId(id)})
    if not barang:
        raise HTTPException(status_code=404, detail="Barang tidak ditemukan")
    
    # Get assigned count
    assigned_count = await db.aset_pegawai.count_documents({
        "master_barang_id": id,
        "status": "Dipinjam"
    })
    barang["total_assigned"] = assigned_count
    
    # Get assignment history
    assignments = await db.aset_pegawai.find({
        "master_barang_id": id
    }).to_list(length=100)
    
    for a in assignments:
        if "_id" in a:
            a["id"] = str(a.pop("_id"))
    
    barang["assignments"] = assignments
    
    return serialize_barang(barang)


@router.put("/{id}", response_model=Dict)
async def update_master_barang(
    id: str,
    barang_in: MasterBarangUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update master asset"""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID tidak valid")
    
    update_data = {k: v for k, v in barang_in.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Check for duplicate code if updating
    if "kode_barang" in update_data:
        existing = await db.master_barang.find_one({
            "kode_barang": update_data["kode_barang"],
            "_id": {"$ne": ObjectId(id)}
        })
        if existing:
            raise HTTPException(status_code=400, detail=f"Kode barang '{update_data['kode_barang']}' sudah ada")
    
    result = await db.master_barang.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Barang tidak ditemukan")
    
    return {"message": "Barang berhasil diperbarui", "data": serialize_barang(result)}


@router.delete("/{id}")
async def delete_master_barang(
    id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete master asset"""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID tidak valid")
    
    # Check if any assets are assigned
    assigned_count = await db.aset_pegawai.count_documents({
        "master_barang_id": id,
        "status": "Dipinjam"
    })
    
    if assigned_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"Tidak dapat menghapus: {assigned_count} aset masih dipinjam pegawai"
        )
    
    result = await db.master_barang.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Barang tidak ditemukan")
    
    return {"message": "Barang berhasil dihapus"}


# ========== STATISTICS ==========

@router.get("/statistik/summary")
async def get_master_barang_summary(
    current_user: dict = Depends(get_current_user)
):
    """Get master asset summary statistics"""
    
    # Total items
    total = await db.master_barang.count_documents({})
    
    # By kategori
    pipeline_kategori = [
        {"$group": {"_id": "$kategori", "count": {"$sum": 1}, "nilai": {"$sum": "$nilai_perolehan"}}}
    ]
    kategori_stats = await db.master_barang.aggregate(pipeline_kategori).to_list(length=100)
    
    # Total nilai
    pipeline_nilai = [
        {"$group": {"_id": None, "total": {"$sum": "$nilai_perolehan"}, "total_stok": {"$sum": "$stok_tersedia"}}}
    ]
    total_nilai = await db.master_barang.aggregate(pipeline_nilai).to_list(length=1)
    
    # Total assigned
    total_assigned = await db.aset_pegawai.count_documents({"status": "Dipinjam"})
    
    return {
        "total_jenis_barang": total,
        "total_stok_tersedia": total_nilai[0]["total_stok"] if total_nilai else 0,
        "total_nilai": total_nilai[0]["total"] if total_nilai else 0,
        "total_assigned": total_assigned,
        "by_kategori": {item["_id"] or "Lainnya": {"count": item["count"], "nilai": item["nilai"]} for item in kategori_stats}
    }


# ========== ASSIGN TO EMPLOYEE ==========

@router.post("/{id}/assign")
async def assign_barang_to_pegawai(
    id: str,
    pegawai_id: str,
    serial_number: Optional[str] = None,
    keterangan: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Assign master asset to employee - creates new aset_pegawai record"""
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="ID barang tidak valid")
    if not ObjectId.is_valid(pegawai_id):
        raise HTTPException(status_code=400, detail="ID pegawai tidak valid")
    
    # Get master barang
    master = await db.master_barang.find_one({"_id": ObjectId(id)})
    if not master:
        raise HTTPException(status_code=404, detail="Barang tidak ditemukan")
    
    # Check stock
    if master.get("stok_tersedia", 0) <= 0:
        raise HTTPException(status_code=400, detail="Stok barang habis")
    
    # Get pegawai info
    pegawai = await db.pegawai.find_one({"_id": ObjectId(pegawai_id)})
    if not pegawai:
        raise HTTPException(status_code=404, detail="Pegawai tidak ditemukan")
    
    # Create aset_pegawai record
    new_aset = {
        "master_barang_id": id,
        "nama_aset": master.get("nama_barang"),
        "kode_aset": master.get("kode_barang"),
        "kategori": master.get("kategori", "Umum"),
        "merk": master.get("merk"),
        "tipe": master.get("tipe"),
        "serial_number": serial_number,
        "kondisi": master.get("kondisi_default", "Baik"),
        "nilai_perolehan": master.get("nilai_perolehan", 0),
        "tgl_perolehan": datetime.now(timezone.utc).isoformat(),
        "lokasi": None,
        "keterangan": keterangan,
        "pemegang_id": pegawai_id,
        "pemegang_nama": pegawai.get("nama_lengkap"),
        "pemegang_nip": pegawai.get("nip") or pegawai.get("nik") or pegawai.get("nrp"),
        "pemegang_unit_kerja": pegawai.get("eselon2") or pegawai.get("eselon1"),
        "status": "Dipinjam",
        "tgl_penyerahan": datetime.now(timezone.utc).isoformat(),
        "riwayat_pemegang": [{
            "pemegang_id": pegawai_id,
            "pemegang_nama": pegawai.get("nama_lengkap"),
            "pemegang_nip": pegawai.get("nip") or pegawai.get("nik") or pegawai.get("nrp"),
            "tgl_mulai": datetime.now(timezone.utc).isoformat(),
            "tgl_selesai": None,
            "keterangan": keterangan or "Penyerahan dari master barang"
        }],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.aset_pegawai.insert_one(new_aset)
    
    # Decrease stock
    await db.master_barang.update_one(
        {"_id": ObjectId(id)},
        {"$inc": {"stok_tersedia": -1}}
    )
    
    new_aset["id"] = str(result.inserted_id)
    if "_id" in new_aset:
        del new_aset["_id"]
    
    return {
        "message": f"Barang berhasil diserahkan ke {pegawai.get('nama_lengkap')}",
        "data": new_aset
    }
