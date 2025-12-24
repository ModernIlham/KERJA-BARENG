from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from auth import get_current_user
from models import User, Transaksi
from pydantic import BaseModel, Field
import os

router = APIRouter()

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- Pydantic Models ---
class GudangCreate(BaseModel):
    nama_gudang: str
    kode_gudang: str
    lokasi: Optional[str] = None
    alamat: Optional[str] = None
    kapasitas: Optional[int] = None
    penanggung_jawab: Optional[str] = None
    keterangan: Optional[str] = None

class GudangUpdate(BaseModel):
    nama_gudang: Optional[str] = None
    kode_gudang: Optional[str] = None
    lokasi: Optional[str] = None
    alamat: Optional[str] = None
    kapasitas: Optional[int] = None
    penanggung_jawab: Optional[str] = None
    keterangan: Optional[str] = None
    is_active: Optional[bool] = None

# --- Gudang CRUD ---
@router.get("")
async def get_gudang_list(
    search: Optional[str] = None,
    is_active: Optional[bool] = True,
    current_user: User = Depends(get_current_user)
):
    """Get all warehouses"""
    query = {}
    if is_active is not None:
        query["is_active"] = is_active
    if search:
        query["$or"] = [
            {"nama_gudang": {"$regex": search, "$options": "i"}},
            {"kode_gudang": {"$regex": search, "$options": "i"}},
            {"lokasi": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.gudang.find(query).sort("nama_gudang", 1)
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

@router.get("/summary")
async def get_gudang_summary(current_user: User = Depends(get_current_user)):
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

@router.get("/{gudang_id}")
async def get_gudang_detail(gudang_id: str, current_user: User = Depends(get_current_user)):
    """Get warehouse detail by ID"""
    if not ObjectId.is_valid(gudang_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    gudang = await db.gudang.find_one({"_id": ObjectId(gudang_id)})
    if not gudang:
        raise HTTPException(status_code=404, detail="Gudang tidak ditemukan")
    
    gudang['id'] = str(gudang['_id'])
    del gudang['_id']
    
    # Count assets
    count = await db.barang.count_documents({
        "gudang_id": gudang_id,
        "status_aset": "Di Gudang"
    })
    gudang['jumlah_aset'] = count
    
    return gudang

@router.post("")
async def create_gudang(data: GudangCreate, current_user: User = Depends(get_current_user)):
    """Create a new warehouse"""
    # Check duplicate kode_gudang
    existing = await db.gudang.find_one({"kode_gudang": data.kode_gudang})
    if existing:
        raise HTTPException(status_code=400, detail="Kode gudang sudah ada")
    
    gudang_dict = data.model_dump()
    gudang_dict["is_active"] = True
    gudang_dict["created_at"] = datetime.now(timezone.utc)
    gudang_dict["created_by"] = current_user.full_name
    
    result = await db.gudang.insert_one(gudang_dict)
    return {"message": "Gudang berhasil ditambahkan", "id": str(result.inserted_id)}

@router.put("/{gudang_id}")
async def update_gudang(gudang_id: str, data: GudangUpdate, current_user: User = Depends(get_current_user)):
    """Update warehouse"""
    if not ObjectId.is_valid(gudang_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    update_data["updated_by"] = current_user.full_name
    
    result = await db.gudang.update_one(
        {"_id": ObjectId(gudang_id)},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Gudang tidak ditemukan")
    return {"message": "Gudang berhasil diupdate"}

@router.delete("/{gudang_id}")
async def delete_gudang(gudang_id: str, current_user: User = Depends(get_current_user)):
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
        {"$set": {"is_active": False, "deleted_at": datetime.now(timezone.utc)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Gudang tidak ditemukan")
    return {"message": "Gudang berhasil dihapus"}

# --- Asset Movement ---
@router.get("/movements/list")
async def get_movements(
    gudang_id: Optional[str] = None,
    jenis: Optional[str] = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
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
    current_user: User = Depends(get_current_user)
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
            "tipe": a.get('tipe'),
            "kondisi": a.get('kondisi'),
            "nilai_buku": a.get('nilai_buku', 0),
            "nilai_perolehan": a.get('nilai_perolehan', 0),
            "tgl_masuk_gudang": a.get('tgl_masuk_gudang'),
            "alasan_masuk": a.get('alasan_masuk_gudang')
        })
    return result

@router.post("/return-asset")
async def return_asset_to_gudang(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user)
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
    
    # Update asset status - PRESERVE kode_barang (CRITICAL: Never modify this!)
    update_fields = {
        "status_aset": "Di Gudang",
        "gudang_id": gudang_id,
        "gudang_nama": gudang.get("nama_gudang"),
        "lokasi_fisik": gudang.get("nama_gudang"),
        "tgl_masuk_gudang": datetime.now(timezone.utc).isoformat(),
        "alasan_masuk_gudang": alasan,
        "updated_at": datetime.now(timezone.utc)
    }
    
    # Remove holder info but preserve riwayat
    new_detail_lainnya = detail_lainnya.copy()
    new_detail_lainnya["pemegang_id"] = None
    new_detail_lainnya["pemegang_nama"] = None
    
    # Add to history
    riwayat_list = new_detail_lainnya.get("riwayat_pemegang", [])
    if dari_pegawai_nama:
        riwayat_list.append({
            "pegawai_id": dari_pegawai_id,
            "nama": dari_pegawai_nama,
            "tgl_pinjam": detail_lainnya.get("tgl_pinjam"),
            "tgl_kembali": datetime.now(timezone.utc).isoformat()
        })
    new_detail_lainnya["riwayat_pemegang"] = riwayat_list
    update_fields["detail_lainnya"] = new_detail_lainnya
    
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
    movement = {
        "gudang_id": gudang_id,
        "gudang_nama": gudang.get("nama_gudang"),
        "jenis": "MASUK",
        "barang_id": barang_id,
        "kode_barang": asset.get("kode_barang", ""),  # Use original kode_barang
        "nup": asset.get("nup", ""),
        "kode_register": asset.get("kode_register"),
        "nama_barang": asset.get("nama_barang", ""),
        "nilai_buku": asset.get("nilai_buku", 0),
        "alasan": alasan,
        "dari_pegawai_id": dari_pegawai_id,
        "dari_pegawai_nama": dari_pegawai_nama,
        "keterangan": keterangan,
        "petugas": current_user.full_name,
        "timestamp": datetime.now(timezone.utc)
    }
    await db.gudang_movements.insert_one(movement)
    
    # Create transaksi record
    tx = Transaksi(
        jenis="KEMBALI",
        barang_id=barang_id,
        kode_barang=asset.get("kode_barang", ""),  # Use original kode_barang
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

@router.post("/distribute-asset")
async def distribute_asset_from_gudang(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Distribute an asset from warehouse to employee.
    """
    barang_id = payload.get("barang_id")
    pegawai_id = payload.get("pegawai_id")
    keterangan = payload.get("keterangan")
    
    if not barang_id or not pegawai_id:
        raise HTTPException(status_code=400, detail="barang_id dan pegawai_id wajib diisi")
    
    if not ObjectId.is_valid(barang_id) or not ObjectId.is_valid(pegawai_id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    
    # Get asset
    asset = await db.barang.find_one({"_id": ObjectId(barang_id)})
    if not asset:
        raise HTTPException(status_code=404, detail="Aset tidak ditemukan")
    
    if asset.get("status_aset") != "Di Gudang":
        raise HTTPException(status_code=400, detail="Aset tidak berada di gudang")
    
    # Get employee
    pegawai = await db.pegawai.find_one({"_id": ObjectId(pegawai_id)})
    if not pegawai:
        raise HTTPException(status_code=404, detail="Pegawai tidak ditemukan")
    
    gudang_id = asset.get("gudang_id")
    gudang_nama = asset.get("gudang_nama", "")
    
    # Get employee unit
    unit_kerja = pegawai.get("eselon4") or pegawai.get("eselon3") or pegawai.get("eselon2") or pegawai.get("eselon1") or ""
    
    # Update asset - PRESERVE kode_barang (CRITICAL!)
    update_fields = {
        "status_aset": "Dipinjamkan",
        "gudang_id": None,
        "gudang_nama": None,
        "lokasi_fisik": unit_kerja,
        "updated_at": datetime.now(timezone.utc)
    }
    
    detail_lainnya = asset.get("detail_lainnya", {})
    detail_lainnya["pemegang_id"] = pegawai_id
    detail_lainnya["pemegang_nama"] = pegawai.get("nama_lengkap")
    detail_lainnya["tgl_pinjam"] = datetime.now(timezone.utc).isoformat()
    update_fields["detail_lainnya"] = detail_lainnya
    
    await db.barang.update_one(
        {"_id": ObjectId(barang_id)},
        {"$set": update_fields}
    )
    
    # Create aset_pegawai record
    nip_pegawai = pegawai.get('nip') or pegawai.get('nik') or pegawai.get('nrp')
    
    new_aset_pegawai = {
        "barang_id": barang_id,
        "nama_aset": asset.get('nama_barang', ''),
        "kode_aset": f"{asset.get('kode_barang', '')}/{asset.get('nup', '')}",
        "kategori": "Umum",
        "merk": asset.get('merk', ''),
        "tipe": asset.get('tipe', ''),
        "kondisi": asset.get('kondisi', 'Baik'),
        "nilai_perolehan": asset.get('nilai_perolehan', 0),
        "lokasi": unit_kerja,
        "keterangan": keterangan,
        "pemegang_id": pegawai_id,
        "pemegang_nama": pegawai.get("nama_lengkap"),
        "pemegang_nip": nip_pegawai,
        "pemegang_unit_kerja": unit_kerja,
        "status": "Dipinjam",
        "tgl_penyerahan": datetime.now(timezone.utc).isoformat(),
        "riwayat_pemegang": [{
            "pemegang_id": pegawai_id,
            "pemegang_nama": pegawai.get("nama_lengkap"),
            "pemegang_nip": nip_pegawai,
            "tgl_mulai": datetime.now(timezone.utc).isoformat(),
            "tgl_selesai": None,
            "keterangan": keterangan or "Distribusi dari Gudang"
        }],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    await db.aset_pegawai.insert_one(new_aset_pegawai)
    
    # Create movement record
    if gudang_id:
        movement = {
            "gudang_id": gudang_id,
            "gudang_nama": gudang_nama,
            "jenis": "KELUAR",
            "barang_id": barang_id,
            "kode_barang": asset.get("kode_barang", ""),
            "nup": asset.get("nup", ""),
            "nama_barang": asset.get("nama_barang", ""),
            "nilai_buku": asset.get("nilai_buku", 0),
            "alasan": "Distribusi ke Pegawai",
            "ke_pegawai_id": pegawai_id,
            "ke_pegawai_nama": pegawai.get("nama_lengkap"),
            "keterangan": keterangan,
            "petugas": current_user.full_name,
            "timestamp": datetime.now(timezone.utc)
        }
        await db.gudang_movements.insert_one(movement)
    
    return {
        "message": f"Aset berhasil diserahkan ke {pegawai.get('nama_lengkap')}",
        "barang_id": barang_id,
        "pegawai_id": pegawai_id
    }

@router.post("/transfer-asset")
async def transfer_asset_between_gudang(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user)
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
    
    # Update asset - PRESERVE kode_barang (CRITICAL!)
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
