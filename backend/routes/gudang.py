from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
from ..database import db
from ..auth import get_current_user
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/gudang", tags=["gudang"])

# --- Pydantic Models ---
class Gudang(BaseModel):
    id: Optional[str] = None
    nama_gudang: str
    kode_gudang: str
    lokasi: Optional[str] = None
    alamat: Optional[str] = None
    kapasitas: Optional[int] = None
    penanggung_jawab: Optional[str] = None
    keterangan: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GudangMovement(BaseModel):
    id: Optional[str] = None
    gudang_id: str
    gudang_nama: str
    jenis: str  # MASUK, KELUAR
    barang_id: str
    kode_barang: str
    nup: str
    kode_register: Optional[str] = None
    nama_barang: str
    nilai_buku: float = 0
    alasan: Optional[str] = None  # Pengembalian, Transfer, dll
    dari_pegawai_id: Optional[str] = None
    dari_pegawai_nama: Optional[str] = None
    ke_pegawai_id: Optional[str] = None
    ke_pegawai_nama: Optional[str] = None
    keterangan: Optional[str] = None
    petugas: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# --- Gudang CRUD ---
@router.get("")
async def get_gudang_list(current_user: str = Depends(get_current_user)):
    """Get all warehouses"""
    cursor = db.gudang.find({}).sort("nama_gudang", 1)
    gudangs = await cursor.to_list(1000)
    result = []
    for g in gudangs:
        g['id'] = str(g['_id'])
        del g['_id']
        # Count assets in this warehouse
        count = await db.barang.count_documents({
            "gudang_id": g['id'],
            "status_aset": "Di Gudang"
        })
        g['jumlah_aset'] = count
        result.append(g)
    return result

@router.post("")
async def create_gudang(data: Gudang, current_user: str = Depends(get_current_user)):
    """Create a new warehouse"""
    # Check duplicate kode_gudang
    existing = await db.gudang.find_one({"kode_gudang": data.kode_gudang})
    if existing:
        raise HTTPException(status_code=400, detail="Kode gudang sudah ada")
    
    gudang_dict = data.model_dump(exclude={"id"})
    gudang_dict["created_at"] = datetime.now(timezone.utc)
    result = await db.gudang.insert_one(gudang_dict)
    return {"message": "Gudang berhasil ditambahkan", "id": str(result.inserted_id)}

@router.put("/{gudang_id}")
async def update_gudang(gudang_id: str, data: dict, current_user: str = Depends(get_current_user)):
    """Update warehouse"""
    if not ObjectId.is_valid(gudang_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    update_data = {k: v for k, v in data.items() if k not in ['id', '_id', 'created_at']}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    result = await db.gudang.update_one(
        {"_id": ObjectId(gudang_id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Gudang tidak ditemukan")
    return {"message": "Gudang berhasil diupdate"}

@router.delete("/{gudang_id}")
async def delete_gudang(gudang_id: str, current_user: str = Depends(get_current_user)):
    """Delete warehouse (soft delete)"""
    if not ObjectId.is_valid(gudang_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    # Check if there are assets in this warehouse
    count = await db.barang.count_documents({
        "gudang_id": gudang_id,
        "status_aset": "Di Gudang"
    })
    if count > 0:
        raise HTTPException(status_code=400, detail=f"Tidak dapat menghapus gudang. Masih ada {count} aset di gudang ini.")
    
    result = await db.gudang.update_one(
        {"_id": ObjectId(gudang_id)},
        {"$set": {"is_active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Gudang tidak ditemukan")
    return {"message": "Gudang berhasil dihapus"}

# --- Asset Movement ---
@router.get("/movements")
async def get_movements(
    gudang_id: Optional[str] = None,
    jenis: Optional[str] = None,
    limit: int = 100,
    current_user: str = Depends(get_current_user)
):
    """Get asset movement history"""
    query = {}
    if gudang_id:
        query["gudang_id"] = gudang_id
    if jenis:
        query["jenis"] = jenis
    
    cursor = db.gudang_movements.find(query).sort("timestamp", -1).limit(limit)
    movements = await cursor.to_list(None)
    result = []
    for m in movements:
        m['id'] = str(m['_id'])
        del m['_id']
        result.append(m)
    return result

@router.get("/assets/{gudang_id}")
async def get_gudang_assets(
    gudang_id: str,
    search: Optional[str] = None,
    limit: int = 100,
    current_user: str = Depends(get_current_user)
):
    """Get all assets in a specific warehouse"""
    query = {
        "gudang_id": gudang_id,
        "status_aset": "Di Gudang"
    }
    if search:
        query["$or"] = [
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"kode_barang": {"$regex": search, "$options": "i"}},
            {"nup": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.barang.find(query).limit(limit)
    assets = await cursor.to_list(None)
    
    result = []
    for a in assets:
        result.append({
            "id": str(a['_id']),
            "kode_barang": a.get('kode_barang'),
            "nup": a.get('nup'),
            "kode_register": a.get('kode_register'),
            "nama_barang": a.get('nama_barang'),
            "merk": a.get('merk'),
            "kondisi": a.get('kondisi'),
            "nilai_buku": a.get('nilai_buku', 0),
            "tgl_masuk_gudang": a.get('tgl_masuk_gudang'),
            "alasan_masuk": a.get('alasan_masuk_gudang')
        })
    return result

@router.post("/return-asset")
async def return_asset_to_gudang(
    payload: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    """
    Return an asset from employee back to warehouse.
    This updates the asset status and creates movement records.
    """
    barang_id = payload.get("barang_id")
    gudang_id = payload.get("gudang_id")
    alasan = payload.get("alasan", "Pengembalian")
    keterangan = payload.get("keterangan")
    
    if not barang_id or not gudang_id:
        raise HTTPException(status_code=400, detail="barang_id dan gudang_id wajib diisi")
    
    if not ObjectId.is_valid(barang_id) or not ObjectId.is_valid(gudang_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    # Get asset
    asset = await db.barang.find_one({"_id": ObjectId(barang_id)})
    if not asset:
        raise HTTPException(status_code=404, detail="Aset tidak ditemukan")
    
    # Get warehouse
    gudang = await db.gudang.find_one({"_id": ObjectId(gudang_id)})
    if not gudang:
        raise HTTPException(status_code=404, detail="Gudang tidak ditemukan")
    
    # Get current holder info
    detail_lainnya = asset.get("detail_lainnya", {})
    dari_pegawai_id = detail_lainnya.get("pemegang_id")
    dari_pegawai_nama = detail_lainnya.get("pemegang_nama")
    
    # Update asset status
    update_fields = {
        "status_aset": "Di Gudang",
        "gudang_id": gudang_id,
        "gudang_nama": gudang.get("nama_gudang"),
        "lokasi_fisik": gudang.get("nama_gudang"),
        "tgl_masuk_gudang": datetime.now(timezone.utc).isoformat(),
        "alasan_masuk_gudang": alasan,
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Remove holder info
    update_fields["detail_lainnya"] = detail_lainnya
    update_fields["detail_lainnya"]["pemegang_id"] = None
    update_fields["detail_lainnya"]["pemegang_nama"] = None
    update_fields["detail_lainnya"]["riwayat_pemegang"] = detail_lainnya.get("riwayat_pemegang", [])
    if dari_pegawai_nama:
        update_fields["detail_lainnya"]["riwayat_pemegang"].append({
            "pegawai_id": dari_pegawai_id,
            "nama": dari_pegawai_nama,
            "tgl_pinjam": detail_lainnya.get("tgl_pinjam"),
            "tgl_kembali": datetime.now(timezone.utc).isoformat()
        })
    
    await db.barang.update_one(
        {"_id": ObjectId(barang_id)},
        {"$set": update_fields}
    )
    
    # Update aset_pegawai record
    await db.aset_pegawai.update_many(
        {"barang_id": barang_id, "status": "Dipinjam"},
        {"$set": {
            "status": "Dikembalikan",
            "tgl_kembali": datetime.now(timezone.utc).isoformat(),
            "dikembalikan_ke": gudang.get("nama_gudang"),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Create movement record
    movement = GudangMovement(
        gudang_id=gudang_id,
        gudang_nama=gudang.get("nama_gudang"),
        jenis="MASUK",
        barang_id=barang_id,
        kode_barang=asset.get("kode_barang", ""),
        nup=asset.get("nup", ""),
        kode_register=asset.get("kode_register"),
        nama_barang=asset.get("nama_barang", ""),
        nilai_buku=asset.get("nilai_buku", 0),
        alasan=alasan,
        dari_pegawai_id=dari_pegawai_id,
        dari_pegawai_nama=dari_pegawai_nama,
        keterangan=keterangan,
        petugas=current_user.full_name
    )
    await db.gudang_movements.insert_one(movement.model_dump(exclude={"id"}))
    
    # Create transaksi record
    from .transaksi import Transaksi
    tx = Transaksi(
        jenis="KEMBALI",
        barang_id=barang_id,
        kode_barang=asset.get("kode_barang", ""),
        nup=asset.get("nup", ""),
        nama_barang=asset.get("nama_barang", ""),
        jumlah=1,
        nilai_satuan=asset.get("nilai_buku", 0),
        total_nilai=asset.get("nilai_buku", 0),
        pegawai_id=dari_pegawai_id,
        nama_pegawai=dari_pegawai_nama,
        unit_penerima=gudang.get("nama_gudang"),
        keterangan=f"Pengembalian ke gudang: {alasan}. {keterangan or ''}",
        petugas=current_user.full_name
    )
    await db.transaksi.insert_one(tx.model_dump(by_alias=True, exclude=["id"]))
    
    return {
        "message": f"Aset berhasil dikembalikan ke gudang {gudang.get('nama_gudang')}",
        "barang_id": barang_id,
        "gudang_id": gudang_id
    }

@router.post("/transfer-asset")
async def transfer_asset_between_gudang(
    payload: Dict[str, Any],
    current_user: str = Depends(get_current_user)
):
    """Transfer asset from one warehouse to another"""
    barang_id = payload.get("barang_id")
    from_gudang_id = payload.get("from_gudang_id")
    to_gudang_id = payload.get("to_gudang_id")
    keterangan = payload.get("keterangan")
    
    if not all([barang_id, from_gudang_id, to_gudang_id]):
        raise HTTPException(status_code=400, detail="Missing required fields")
    
    # Get asset
    asset = await db.barang.find_one({"_id": ObjectId(barang_id)})
    if not asset:
        raise HTTPException(status_code=404, detail="Aset tidak ditemukan")
    
    # Get warehouses
    from_gudang = await db.gudang.find_one({"_id": ObjectId(from_gudang_id)})
    to_gudang = await db.gudang.find_one({"_id": ObjectId(to_gudang_id)})
    if not from_gudang or not to_gudang:
        raise HTTPException(status_code=404, detail="Gudang tidak ditemukan")
    
    # Update asset
    await db.barang.update_one(
        {"_id": ObjectId(barang_id)},
        {"$set": {
            "gudang_id": to_gudang_id,
            "gudang_nama": to_gudang.get("nama_gudang"),
            "lokasi_fisik": to_gudang.get("nama_gudang"),
            "updated_at": datetime.now(timezone.utc)
        }}
    )
    
    # Create movement records (KELUAR from old, MASUK to new)
    base_movement = {
        "barang_id": barang_id,
        "kode_barang": asset.get("kode_barang", ""),
        "nup": asset.get("nup", ""),
        "kode_register": asset.get("kode_register"),
        "nama_barang": asset.get("nama_barang", ""),
        "nilai_buku": asset.get("nilai_buku", 0),
        "alasan": "Transfer Gudang",
        "keterangan": keterangan,
        "petugas": current_user.full_name,
        "timestamp": datetime.now(timezone.utc)
    }
    
    # KELUAR from old warehouse
    out_movement = {**base_movement, "gudang_id": from_gudang_id, "gudang_nama": from_gudang.get("nama_gudang"), "jenis": "KELUAR"}
    await db.gudang_movements.insert_one(out_movement)
    
    # MASUK to new warehouse
    in_movement = {**base_movement, "gudang_id": to_gudang_id, "gudang_nama": to_gudang.get("nama_gudang"), "jenis": "MASUK"}
    await db.gudang_movements.insert_one(in_movement)
    
    return {
        "message": f"Aset berhasil dipindahkan dari {from_gudang.get('nama_gudang')} ke {to_gudang.get('nama_gudang')}",
        "barang_id": barang_id
    }

@router.get("/summary")
async def get_gudang_summary(current_user: str = Depends(get_current_user)):
    """Get summary statistics for all warehouses"""
    gudangs = await db.gudang.find({"is_active": True}).to_list(1000)
    
    result = []
    total_aset = 0
    total_nilai = 0
    
    for g in gudangs:
        gudang_id = str(g['_id'])
        
        # Count and sum assets
        pipeline = [
            {"$match": {"gudang_id": gudang_id, "status_aset": "Di Gudang"}},
            {"$group": {
                "_id": None,
                "count": {"$sum": 1},
                "total_nilai": {"$sum": "$nilai_buku"}
            }}
        ]
        agg = await db.barang.aggregate(pipeline).to_list(1)
        
        count = agg[0]["count"] if agg else 0
        nilai = agg[0]["total_nilai"] if agg else 0
        
        total_aset += count
        total_nilai += nilai
        
        result.append({
            "id": gudang_id,
            "nama_gudang": g.get("nama_gudang"),
            "kode_gudang": g.get("kode_gudang"),
            "lokasi": g.get("lokasi"),
            "jumlah_aset": count,
            "total_nilai": nilai
        })
    
    return {
        "gudang_list": result,
        "summary": {
            "total_gudang": len(result),
            "total_aset": total_aset,
            "total_nilai": total_nilai
        }
    }
