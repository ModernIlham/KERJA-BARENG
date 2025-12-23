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
        
    await db.barang.update_one(
        {"_id": ObjectId(tx_in.barang_id)},
        {"$set": {"stok": new_stok, "updated_at": datetime.now(timezone.utc), "nilai_satuan": tx_in.nilai_satuan}}
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
            petugas=current_user,
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
