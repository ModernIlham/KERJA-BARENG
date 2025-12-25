from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import List, Dict, Any
from models import Transaksi, TransaksiCreate, StokBatch, User
from auth import get_current_user
from lib.activity_logger import log_activity
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime, timezone
import math
from pymongo import UpdateOne
from lib.image_processor import process_image_upload

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Transaction types that require approval
APPROVAL_REQUIRED_TYPES = [
    'PERUBAHAN_KUANTITAS',
    'PERUBAHAN_KONDISI', 
    'KOREKSI_NILAI_BMN',
    'KOREKSI_NILAI_KDP',
    'REKLASIFIKASI_MASUK',
    'REKLASIFIKASI_KELUAR',
    'REKLASIFIKASI_KDP',
    'PERSEDIAAN_TO_ASET',
    'ASET_TO_PERSEDIAAN'
]

async def check_approval_required(jenis: str) -> bool:
    """Check if transaction type requires approval based on system settings."""
    config = await db.system_settings.find_one({"key": "approval_config"})
    if not config or not config.get("enabled", True):
        return False
    
    require_approval_for = config.get("require_approval_for", APPROVAL_REQUIRED_TYPES)
    return jenis in require_approval_for

def sanitize_for_json(obj):
    """
    Sanitize MongoDB document for JSON serialization.
    Handles: ObjectId, datetime, float infinity/nan values
    """
    import math
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, ObjectId):
        return str(obj)
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    return obj

# Reuse FIFO logic (Optimized)
async def process_fifo_out(barang_id: str, quantity: int, session=None):
    cursor = db.stok_batches.find(
        {"barang_id": barang_id, "jumlah_sisa": {"$gt": 0}}
    ).sort("tgl_masuk", 1)
    batches = await cursor.to_list(1000)
    
    remaining = quantity
    total_val = 0.0
    updated_batches = []
    
    for batch in batches:
        if remaining <= 0: break
        deduct = min(batch['jumlah_sisa'], remaining)
        total_val += deduct * batch['nilai_satuan']
        batch['jumlah_sisa'] -= deduct
        updated_batches.append(batch)
        remaining -= deduct
    
    # Bulk Write Optimization
    if updated_batches:
        ops = []
        for batch in updated_batches:
            ops.append(UpdateOne(
                {"_id": batch["_id"]}, 
                {"$set": {"jumlah_sisa": batch["jumlah_sisa"]}}
            ))
        await db.stok_batches.bulk_write(ops, session=session)
        
    return total_val

@router.get("", response_model=Dict[str, Any])
async def get_transaksi_list(
    page: int = 1,
    limit: int = 20,
    current_user: str = Depends(get_current_user)
):
    skip = (page - 1) * limit
    total = await db.transaksi.count_documents({})
    cursor = db.transaksi.find().sort("timestamp", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    
    # Convert IDs
    for item in items:
        if "_id" in item: item["_id"] = str(item["_id"])
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit)
    }

@router.post("", response_model=Transaksi)
async def create_transaksi(tx_in: TransaksiCreate, current_user: User = Depends(get_current_user)):
    if not ObjectId.is_valid(tx_in.barang_id):
        raise HTTPException(status_code=400, detail="Invalid Barang ID")
        
    barang = await db.barang.find_one({"_id": ObjectId(tx_in.barang_id)})
    if not barang: raise HTTPException(status_code=404)
    
    current_stok = barang.get('stok', 0)
    new_stok = current_stok
    total_nilai_tx = 0.0
    
    if tx_in.jenis == "MASUK":
        new_stok += tx_in.jumlah
        if not tx_in.nilai_satuan: tx_in.nilai_satuan = barang.get('nilai_satuan', 0)
        total_nilai_tx = tx_in.jumlah * tx_in.nilai_satuan
        
        # Batch
        from models import StokBatch
        new_batch = StokBatch(
            barang_id=tx_in.barang_id,
            kode_barang=barang.get('kode_barang'),
            nup=barang.get('nup'),
            tgl_masuk=datetime.now(timezone.utc),
            jumlah_awal=tx_in.jumlah,
            jumlah_sisa=tx_in.jumlah,
            nilai_satuan=tx_in.nilai_satuan,
            dokumen_ref=tx_in.dokumen_ref
        )
        await db.stok_batches.insert_one(new_batch.model_dump(by_alias=True, exclude=["id"]))

    elif tx_in.jenis == "KELUAR":
        if current_stok < tx_in.jumlah: raise HTTPException(status_code=400, detail="Stok kurang")
        new_stok -= tx_in.jumlah
        total_nilai_tx = await process_fifo_out(tx_in.barang_id, tx_in.jumlah)
        tx_in.nilai_satuan = total_nilai_tx / tx_in.jumlah if tx_in.jumlah > 0 else 0

    elif tx_in.jenis == "OPNAME":
        diff = tx_in.jumlah - current_stok
        new_stok = tx_in.jumlah
    
    elif tx_in.jenis in ["PENGEMBANGAN", "PENGEMBANGAN_KDP"]:
        # For development transactions, don't change stock
        # Just record the transaction value
        total_nilai_tx = tx_in.nilai_satuan * tx_in.jumlah if tx_in.nilai_satuan else 0
        # Don't update stok for development transactions
        new_stok = current_stok
        
    # Only update stok if it changed (skip for PENGEMBANGAN types which handle their own update)
    if tx_in.jenis not in ["PENGEMBANGAN", "PENGEMBANGAN_KDP"]:
        await db.barang.update_one(
            {"_id": ObjectId(tx_in.barang_id)},
            {"$set": {"stok": new_stok, "updated_at": datetime.now(timezone.utc), "nilai_satuan": tx_in.nilai_satuan}}
        )
    else:
        # For PENGEMBANGAN transactions, only update timestamp (nilai is updated by frontend PUT call)
        await db.barang.update_one(
            {"_id": ObjectId(tx_in.barang_id)},
            {"$set": {"updated_at": datetime.now(timezone.utc)}}
        )
    
    nama_pegawai = None
    unit_penerima = None
    if tx_in.pegawai_id and ObjectId.is_valid(tx_in.pegawai_id):
        pegawai = await db.pegawai.find_one({"_id": ObjectId(tx_in.pegawai_id)})
        if pegawai:
            nama_pegawai = pegawai['nama_lengkap']
            unit_penerima = pegawai.get('eselon3')
            
    new_tx = Transaksi(
        jenis="PENYESUAIAN" if tx_in.jenis == "OPNAME" else tx_in.jenis,
        barang_id=tx_in.barang_id,
        kode_barang=barang.get('kode_barang', ''),
        nup=barang.get('nup', ''),
        nama_barang=barang['nama_barang'],
        jumlah=tx_in.jumlah,
        nilai_satuan=tx_in.nilai_satuan,
        total_nilai=total_nilai_tx,
        pegawai_id=tx_in.pegawai_id,
        nama_pegawai=nama_pegawai,
        unit_penerima=unit_penerima,
        keterangan=tx_in.keterangan,
        dokumen_ref=tx_in.dokumen_ref,
        dokumen_sumber_id=tx_in.dokumen_sumber_id,
        no_sppa=tx_in.no_sppa,
        no_sppa_2=tx_in.no_sppa_2,
        nama_penyedia=tx_in.nama_penyedia,
        npwp_penyedia=tx_in.npwp_penyedia,
        petugas=current_user.full_name
    )
    
    result = await db.transaksi.insert_one(new_tx.model_dump(by_alias=True, exclude=["id"]))

    # LOG ACTIVITY
    await log_activity(
        db, 
        user_id=str(current_user.id),
        user_name=current_user.full_name,
        action="CREATE",
        module="Transaksi Aset",
        target_id=str(result.inserted_id),
        details=f"Transaksi {tx_in.jenis} Barang: {barang['nama_barang']} ({tx_in.jumlah} unit)"
    )
    
    # Return the created transaction
    created_tx = await db.transaksi.find_one({"_id": result.inserted_id})
    if created_tx:
        created_tx["_id"] = str(created_tx["_id"])
    return created_tx

@router.post("/bulk")
async def bulk_asset_transaction(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Handle bulk transactions for Aset Tetap (Moving multiple specific assets).
    INTEGRATION: When assets are distributed to employees (KELUAR/DISTRIBUSI), 
    automatically creates records in aset_pegawai collection.
    
    Payload: {
        "asset_ids": ["id1", "id2"],
        "jenis": "KELUAR" | "MASUK" | "MUTASI" | "DISTRIBUSI",
        "keterangan": "...",
        "dokumen_ref": "...",
        "pegawai_id": "...",
        "unit_penerima": "..."
    }
    """
    asset_ids = payload.get("asset_ids", [])
    jenis = payload.get("jenis")
    if not asset_ids or not jenis:
        raise HTTPException(status_code=400, detail="Missing required fields")
        
    valid_ids = [ObjectId(i) for i in asset_ids if ObjectId.is_valid(i)]
    if not valid_ids:
        raise HTTPException(status_code=400, detail="No valid Asset IDs")
        
    # Get Assets
    cursor = db.barang.find({"_id": {"$in": valid_ids}})
    assets = await cursor.to_list(None)
    
    # Process recipient info
    nama_pegawai = None
    nip_pegawai = None
    unit_penerima = payload.get("unit_penerima")
    pegawai_id = payload.get("pegawai_id")
    
    if pegawai_id and ObjectId.is_valid(pegawai_id):
        pegawai = await db.pegawai.find_one({"_id": ObjectId(pegawai_id)})
        if pegawai:
            nama_pegawai = pegawai.get('nama_lengkap')
            nip_pegawai = pegawai.get('nip') or pegawai.get('nik') or pegawai.get('nrp')
            # If unit_penerima not manually provided, take from employee
            if not unit_penerima:
                unit_penerima = pegawai.get('eselon2') or pegawai.get('eselon3') or pegawai.get('eselon4')

    created_ids = []
    aset_pegawai_ids = []
    
    for asset in assets:
        # Create Transaction Log
        new_tx = Transaksi(
            jenis=jenis,
            barang_id=str(asset["_id"]),
            kode_barang=asset.get('kode_barang', ''),
            nup=asset.get('nup', ''),
            nama_barang=asset.get('nama_barang', ''),
            jumlah=1, # Always 1 for specific asset movement
            nilai_satuan=asset.get('nilai_buku', 0),
            total_nilai=asset.get('nilai_buku', 0),
            pegawai_id=pegawai_id,
            nama_pegawai=nama_pegawai,
            unit_penerima=unit_penerima,
            keterangan=payload.get("keterangan"),
            dokumen_ref=payload.get("dokumen_ref"),
            no_sppa=payload.get("no_sppa"),
            no_sppa_2=payload.get("no_sppa_2"),
            petugas=current_user.full_name,
            timestamp=datetime.now(timezone.utc)
        )
        
        res = await db.transaksi.insert_one(new_tx.model_dump(by_alias=True, exclude=["id"]))
        created_ids.append(str(res.inserted_id))
        
        # Update Asset Status/Location
        update_fields = {"updated_at": datetime.now(timezone.utc)}
        
        # INTEGRATION: Create aset_pegawai record when distributing to employee
        if jenis in ["KELUAR", "DISTRIBUSI"] and pegawai_id:
            update_fields["status_aset"] = "Dipinjamkan"
            if unit_penerima:
                update_fields["lokasi_fisik"] = unit_penerima
            update_fields["detail_lainnya"] = asset.get("detail_lainnya", {})
            update_fields["detail_lainnya"]["pemegang_id"] = pegawai_id
            update_fields["detail_lainnya"]["pemegang_nama"] = nama_pegawai
            
            # Create/Update aset_pegawai record
            existing_aset = await db.aset_pegawai.find_one({
                "barang_id": str(asset["_id"]),
                "status": "Dipinjam"
            })
            
            if not existing_aset:
                # Create new aset_pegawai record
                golongan = asset.get('golongan_barang', '')
                kategori = "Umum"
                if golongan:
                    if "Peralatan" in golongan or "Mesin" in golongan:
                        kategori = "Elektronik"
                    elif "Gedung" in golongan:
                        kategori = "Bangunan"
                    elif "Tanah" in golongan:
                        kategori = "Tanah"
                    elif "Kendaraan" in golongan:
                        kategori = "Kendaraan"
                
                new_aset_pegawai = {
                    "barang_id": str(asset["_id"]),
                    "transaksi_id": str(res.inserted_id),
                    "nama_aset": asset.get('nama_barang', ''),
                    "kode_aset": f"{asset.get('kode_barang', '')}/{asset.get('nup', '')}",
                    "kategori": kategori,
                    "merk": asset.get('merk', ''),
                    "tipe": asset.get('tipe', ''),
                    "serial_number": asset.get('detail_lainnya', {}).get('serial_number'),
                    "kondisi": asset.get('kondisi', 'Baik'),
                    "nilai_perolehan": asset.get('nilai_perolehan', 0),
                    "tgl_perolehan": asset.get('tgl_perolehan'),
                    "lokasi": unit_penerima,
                    "keterangan": payload.get("keterangan"),
                    "pemegang_id": pegawai_id,
                    "pemegang_nama": nama_pegawai,
                    "pemegang_nip": nip_pegawai,
                    "pemegang_unit_kerja": unit_penerima,
                    "status": "Dipinjam",
                    "tgl_penyerahan": datetime.now(timezone.utc).isoformat(),
                    "riwayat_pemegang": [{
                        "pemegang_id": pegawai_id,
                        "pemegang_nama": nama_pegawai,
                        "pemegang_nip": nip_pegawai,
                        "tgl_mulai": datetime.now(timezone.utc).isoformat(),
                        "tgl_selesai": None,
                        "keterangan": payload.get("keterangan") or f"Distribusi dari Transaksi Aset"
                    }],
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
                aset_result = await db.aset_pegawai.insert_one(new_aset_pegawai)
                aset_pegawai_ids.append(str(aset_result.inserted_id))
            else:
                # Asset already held, update to new holder
                await db.aset_pegawai.update_one(
                    {"_id": existing_aset["_id"]},
                    {
                        "$set": {
                            "pemegang_id": pegawai_id,
                            "pemegang_nama": nama_pegawai,
                            "pemegang_nip": nip_pegawai,
                            "pemegang_unit_kerja": unit_penerima,
                            "tgl_penyerahan": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc)
                        },
                        "$push": {
                            "riwayat_pemegang": {
                                "pemegang_id": pegawai_id,
                                "pemegang_nama": nama_pegawai,
                                "pemegang_nip": nip_pegawai,
                                "tgl_mulai": datetime.now(timezone.utc).isoformat(),
                                "tgl_selesai": None,
                                "keterangan": payload.get("keterangan") or "Transfer dari Transaksi Aset"
                            }
                        }
                    }
                )
                aset_pegawai_ids.append(str(existing_aset["_id"]))
                
        elif jenis == "MUTASI":
            if unit_penerima:
                update_fields["lokasi_fisik"] = unit_penerima
                update_fields["kode_satker"] = "MUTASI"
        
        elif jenis == "MASUK":
            # When returning asset
            update_fields["status_aset"] = "Aktif"
            # Also update aset_pegawai if exists
            await db.aset_pegawai.update_one(
                {"barang_id": str(asset["_id"]), "status": "Dipinjam"},
                {
                    "$set": {
                        "status": "Tersedia",
                        "pemegang_id": None,
                        "pemegang_nama": None,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
                
        await db.barang.update_one({"_id": asset["_id"]}, {"$set": update_fields})

    return {
        "message": f"Successfully processed {len(created_ids)} assets", 
        "ids": created_ids,
        "aset_pegawai_ids": aset_pegawai_ids,
        "count": len(created_ids)
    }

@router.post("/{id}/upload-bukti")
async def upload_bukti_transaksi(
    id: str,
    file: UploadFile = File(...),
    keterangan: str = Form(""),
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    try:
        # Validate image
        if not file.content_type.startswith("image/"):
             raise HTTPException(status_code=400, detail="File must be an image")

        # Process upload
        result = await process_image_upload(file, "bukti_transaksi", db)
        
        foto_data = {
            "url": f"/api/uploads/{result['optimized']}",
            "keterangan": keterangan,
            "uploaded_at": datetime.now(timezone.utc)
        }
        
        # Update Transaksi
        res = await db.transaksi.update_one(
            {"_id": ObjectId(id)},
            {"$push": {"bukti_fotos": foto_data}}
        )
        
        if res.modified_count == 0:
            raise HTTPException(status_code=404, detail="Transaksi not found")
            
        return {"message": "Bukti berhasil diupload", "data": foto_data}
        
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/perubahan")
async def create_transaksi_perubahan(
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Create a perubahan (change) transaction for BMN/KDP.
    Supports:
    - PERUBAHAN_KUANTITAS
    - PERUBAHAN_KONDISI
    - KOREKSI_NILAI_BMN
    - KOREKSI_NILAI_KDP
    - REKLASIFIKASI_MASUK
    - REKLASIFIKASI_KELUAR
    - REKLASIFIKASI_KDP
    """
    jenis = payload.get("jenis")
    barang_id = payload.get("barang_id")
    no_sppa = payload.get("no_sppa")
    tanggal_transaksi = payload.get("tanggal_transaksi")
    
    if not jenis:
        raise HTTPException(status_code=400, detail="Jenis transaksi wajib diisi")
    if not barang_id:
        raise HTTPException(status_code=400, detail="Barang ID wajib diisi")
    if not no_sppa:
        raise HTTPException(status_code=400, detail="No SPPA wajib diisi")
    
    # Get the asset
    if not ObjectId.is_valid(barang_id):
        raise HTTPException(status_code=400, detail="Invalid barang ID")
    
    asset = await db.barang.find_one({"_id": ObjectId(barang_id)})
    if not asset:
        raise HTTPException(status_code=404, detail="Aset tidak ditemukan")
    
    # Build transaction record
    transaksi_record = {
        "jenis": jenis,
        "sub_jenis": payload.get("sub_jenis"),
        "barang_id": barang_id,
        "kode_barang": payload.get("kode_barang") or asset.get("kode_barang"),
        "nup": payload.get("nup") or asset.get("nup"),
        "nama_barang": payload.get("nama_barang") or asset.get("nama_barang"),
        "no_sppa": no_sppa,
        "tanggal_transaksi": tanggal_transaksi,
        "petugas": current_user.full_name,
        "created_at": datetime.now(timezone.utc),
        "status": "COMPLETED"
    }
    
    # Process based on transaction type
    update_fields = {"updated_at": datetime.now(timezone.utc)}
    
    if jenis == "PERUBAHAN_KUANTITAS":
        sub_jenis = payload.get("sub_jenis", "BERTAMBAH")
        kuantitas_awal = payload.get("kuantitas_awal", 0)
        kuantitas_perubahan = payload.get("kuantitas_perubahan", 0)
        kuantitas_akhir = payload.get("kuantitas_akhir", 0)
        
        transaksi_record.update({
            "kuantitas_awal": kuantitas_awal,
            "kuantitas_perubahan": kuantitas_perubahan,
            "kuantitas_akhir": kuantitas_akhir,
            "alasan": payload.get("alasan"),
            "dokumen_pendukung": payload.get("dokumen_pendukung"),
            "keterangan": payload.get("keterangan")
        })
        
        # Update asset quantity
        update_fields["kuantitas"] = kuantitas_akhir
        update_fields["jumlah"] = kuantitas_akhir
        
    elif jenis == "PERUBAHAN_KONDISI":
        kondisi_awal = payload.get("kondisi_awal")
        kondisi_akhir = payload.get("kondisi_akhir")
        
        transaksi_record.update({
            "kondisi_awal": kondisi_awal,
            "kondisi_akhir": kondisi_akhir,
            "penyebab": payload.get("penyebab"),
            "tanggal_kejadian": payload.get("tanggal_kejadian"),
            "lokasi_kejadian": payload.get("lokasi_kejadian"),
            "dokumen_pendukung": payload.get("dokumen_pendukung"),
            "keterangan": payload.get("keterangan")
        })
        
        # Update asset condition
        update_fields["kondisi"] = kondisi_akhir
        
    elif jenis in ["KOREKSI_NILAI_BMN", "KOREKSI_NILAI_KDP"]:
        sub_jenis = payload.get("sub_jenis", "BERTAMBAH")
        nilai_perolehan_awal = payload.get("nilai_perolehan_awal", 0)
        nilai_buku_awal = payload.get("nilai_buku_awal", 0)
        nilai_koreksi = payload.get("nilai_koreksi", 0)
        nilai_perolehan_akhir = payload.get("nilai_perolehan_akhir", 0)
        nilai_buku_akhir = payload.get("nilai_buku_akhir", 0)
        
        transaksi_record.update({
            "nilai_perolehan_awal": nilai_perolehan_awal,
            "nilai_buku_awal": nilai_buku_awal,
            "nilai_koreksi": nilai_koreksi,
            "nilai_perolehan_akhir": nilai_perolehan_akhir,
            "nilai_buku_akhir": nilai_buku_akhir,
            "alasan_koreksi": payload.get("alasan_koreksi"),
            "dasar_koreksi": payload.get("dasar_koreksi"),
            "no_dokumen_pendukung": payload.get("no_dokumen_pendukung"),
            "keterangan": payload.get("keterangan")
        })
        
        # Update asset values
        update_fields["nilai_perolehan"] = nilai_perolehan_akhir
        update_fields["nilai_buku"] = nilai_buku_akhir
        
    elif jenis in ["REKLASIFIKASI_MASUK", "REKLASIFIKASI_KELUAR"]:
        golongan_awal = payload.get("golongan_awal")
        golongan_baru = payload.get("golongan_baru")
        kode_barang_baru = payload.get("kode_barang_baru")
        
        # Determine status based on transaction type
        if jenis == "REKLASIFIKASI_KELUAR":
            transaksi_record["status"] = "PENDING_MASUK"  # Waiting for Reklasifikasi Masuk
        else:
            transaksi_record["status"] = "COMPLETED"
            # Link to the original KELUAR transaction if provided
            if payload.get("linked_transaction_id"):
                transaksi_record["linked_transaction_id"] = payload.get("linked_transaction_id")
        
        transaksi_record.update({
            "golongan_awal": golongan_awal,
            "golongan_baru": golongan_baru,
            "kode_barang_baru": kode_barang_baru,
            "kode_barang_lama": asset.get("kode_barang"),
            "nama_barang_baru": payload.get("nama_barang_baru"),
            "nilai_perolehan": payload.get("nilai_perolehan") or asset.get("nilai_perolehan"),
            "nilai_buku": payload.get("nilai_buku") or asset.get("nilai_buku"),
            "alasan_reklasifikasi": payload.get("alasan_reklasifikasi"),
            "unit_asal": payload.get("unit_asal"),
            "unit_tujuan": payload.get("unit_tujuan"),
            "no_dokumen_pendukung": payload.get("no_dokumen_pendukung"),
            "keterangan": payload.get("keterangan")
        })
        
        # For REKLASIFIKASI_KELUAR: Mark asset as pending reclassification
        if jenis == "REKLASIFIKASI_KELUAR":
            update_fields["status_reklasifikasi"] = "PENDING_MASUK"
            update_fields["reklasifikasi_tujuan"] = {
                "golongan_baru": golongan_baru,
                "kode_barang_baru": kode_barang_baru
            }
        
        # For REKLASIFIKASI_MASUK: Update asset to new classification
        if jenis == "REKLASIFIKASI_MASUK":
            update_fields["golongan_barang"] = golongan_baru
            if kode_barang_baru:
                update_fields["kode_barang"] = kode_barang_baru
            update_fields["status_reklasifikasi"] = None
            update_fields["reklasifikasi_tujuan"] = None
            
            # Update the linked KELUAR transaction to COMPLETED
            if payload.get("linked_transaction_id") and ObjectId.is_valid(payload.get("linked_transaction_id")):
                await db.transaksi.update_one(
                    {"_id": ObjectId(payload.get("linked_transaction_id"))},
                    {"$set": {"status": "COMPLETED", "completed_at": datetime.now(timezone.utc)}}
                )
            
    elif jenis == "REKLASIFIKASI_KDP":
        kdp_tujuan_id = payload.get("kdp_tujuan_id")
        nilai_yang_dipindahkan = payload.get("nilai_yang_dipindahkan", 0)
        
        transaksi_record.update({
            "kdp_tujuan_id": kdp_tujuan_id,
            "kdp_tujuan_kode": payload.get("kdp_tujuan_kode"),
            "kdp_tujuan_nama": payload.get("kdp_tujuan_nama"),
            "nilai_asal": payload.get("nilai_asal"),
            "kdp_tujuan_nilai_awal": payload.get("kdp_tujuan_nilai_awal"),
            "nilai_yang_dipindahkan": nilai_yang_dipindahkan,
            "alasan_reklasifikasi": payload.get("alasan_reklasifikasi"),
            "no_dokumen_pendukung": payload.get("no_dokumen_pendukung"),
            "keterangan": payload.get("keterangan")
        })
        
        # Update both KDP assets
        nilai_asal_sekarang = asset.get("nilai_buku") or asset.get("nilai_perolehan") or 0
        update_fields["nilai_buku"] = nilai_asal_sekarang - nilai_yang_dipindahkan
        
        # Update KDP tujuan
        if kdp_tujuan_id and ObjectId.is_valid(kdp_tujuan_id):
            kdp_tujuan = await db.barang.find_one({"_id": ObjectId(kdp_tujuan_id)})
            if kdp_tujuan:
                nilai_tujuan_sekarang = kdp_tujuan.get("nilai_buku") or kdp_tujuan.get("nilai_perolehan") or 0
                await db.barang.update_one(
                    {"_id": ObjectId(kdp_tujuan_id)},
                    {"$set": {
                        "nilai_buku": nilai_tujuan_sekarang + nilai_yang_dipindahkan,
                        "updated_at": datetime.now(timezone.utc)
                    }}
                )
    
    # Insert transaction record
    result = await db.transaksi.insert_one(transaksi_record)
    
    # Update the asset
    await db.barang.update_one({"_id": ObjectId(barang_id)}, {"$set": update_fields})
    
    # Log activity
    await log_activity(
        db,
        user_id=str(current_user.id) if hasattr(current_user, 'id') else "system",
        user_name=current_user.full_name if hasattr(current_user, 'full_name') else "System",
        action=f"create_{jenis.lower()}",
        module="transaksi",
        target_id=str(result.inserted_id),
        details=f"Transaksi {jenis} untuk {asset.get('nama_barang')}",
        metadata={"jenis": jenis, "barang_id": barang_id}
    )
    
    return {
        "message": f"Transaksi {jenis} berhasil dicatat",
        "id": str(result.inserted_id),
        "jenis": jenis
    }


@router.get("/reklasifikasi/pending")
async def get_pending_reklasifikasi(
    current_user: str = Depends(get_current_user)
):
    """
    Get list of Reklasifikasi Keluar transactions that are pending for Reklasifikasi Masuk.
    """
    cursor = db.transaksi.find({
        "jenis": "REKLASIFIKASI_KELUAR",
        "status": "PENDING_MASUK"
    }).sort("created_at", -1)
    
    items = await cursor.to_list(None)
    
    # Enrich with asset data
    result = []
    for item in items:
        if "_id" in item:
            item["id"] = str(item["_id"])
            del item["_id"]
        
        # Get current asset data
        if item.get("barang_id") and ObjectId.is_valid(item.get("barang_id")):
            asset = await db.barang.find_one({"_id": ObjectId(item["barang_id"])})
            if asset:
                item["asset_info"] = {
                    "nama_barang": asset.get("nama_barang"),
                    "kode_barang": asset.get("kode_barang"),
                    "nup": asset.get("nup"),
                    "golongan_barang": asset.get("golongan_barang"),
                    "nilai_perolehan": asset.get("nilai_perolehan"),
                    "nilai_buku": asset.get("nilai_buku"),
                    "kondisi": asset.get("kondisi"),
                    "merk": asset.get("merk"),
                    "tipe": asset.get("tipe")
                }
        
        result.append(item)
    
    return result

@router.get("/detail/{id}")
async def get_transaksi_detail(
    id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get detailed transaction info including related asset data.
    """
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid transaction ID")
    
    transaksi = await db.transaksi.find_one({"_id": ObjectId(id)})
    if not transaksi:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    
    # Convert ID
    transaksi["id"] = str(transaksi["_id"])
    del transaksi["_id"]
    
    # Get asset data
    if transaksi.get("barang_id") and ObjectId.is_valid(transaksi.get("barang_id")):
        asset = await db.barang.find_one({"_id": ObjectId(transaksi["barang_id"])})
        if asset:
            asset["id"] = str(asset["_id"])
            del asset["_id"]
            transaksi["asset"] = sanitize_for_json(asset)
    
    # Get linked transaction if exists
    if transaksi.get("linked_transaction_id") and ObjectId.is_valid(transaksi.get("linked_transaction_id")):
        linked = await db.transaksi.find_one({"_id": ObjectId(transaksi["linked_transaction_id"])})
        if linked:
            linked["id"] = str(linked["_id"])
            del linked["_id"]
            transaksi["linked_transaction"] = sanitize_for_json(linked)
    
    return sanitize_for_json(transaksi)

@router.get("/riwayat")
async def get_riwayat_transaksi(
    page: int = 1,
    limit: int = 50,
    jenis: str = None,
    search: str = None,
    start_date: str = None,
    end_date: str = None,
    current_user: str = Depends(get_current_user)
):
    """
    Get comprehensive transaction history with filters.
    """
    query = {}
    
    if jenis:
        query["jenis"] = jenis
    
    if search:
        query["$or"] = [
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"kode_barang": {"$regex": search, "$options": "i"}},
            {"no_sppa": {"$regex": search, "$options": "i"}},
            {"nup": {"$regex": search, "$options": "i"}}
        ]
    
    if start_date:
        query["created_at"] = {"$gte": datetime.fromisoformat(start_date.replace('Z', '+00:00'))}
    
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            query["created_at"] = {"$lte": datetime.fromisoformat(end_date.replace('Z', '+00:00'))}
    
    skip = (page - 1) * limit
    total = await db.transaksi.count_documents(query)
    
    cursor = db.transaksi.find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    
    # Convert IDs and enrich data
    result = []
    for item in items:
        if "_id" in item:
            item["id"] = str(item["_id"])
            del item["_id"]
        result.append(item)
    
    # Get transaction type summary
    pipeline = [
        {"$match": query if jenis else {}},
        {"$group": {"_id": "$jenis", "count": {"$sum": 1}}}
    ]
    type_summary = {}
    async for doc in db.transaksi.aggregate(pipeline):
        type_summary[doc["_id"]] = doc["count"]
    
    return {
        "data": result,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit),
        "type_summary": type_summary
    }

