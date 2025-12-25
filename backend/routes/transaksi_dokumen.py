"""Routes for transaction document upload with digital signature"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse
from typing import Dict, Any, List, Optional
from auth import get_current_user
from models import User
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime, timezone
from uuid import uuid4
import math
import io
import aiofiles
from pathlib import Path

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Ensure upload directory exists
UPLOAD_DIR = Path("/app/uploads/transaksi_dokumen")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@router.post("/{transaksi_id}/upload")
async def upload_dokumen_transaksi(
    transaksi_id: str,
    file: UploadFile = File(...),
    jenis_dokumen: str = Form("pendukung"),
    keterangan: str = Form(""),
    current_user: User = Depends(get_current_user)
):
    """
    Upload dokumen pendukung untuk transaksi.
    
    jenis_dokumen options:
    - pendukung: Dokumen pendukung umum
    - sk: Surat Keputusan
    - ba: Berita Acara
    - sppa: Dokumen SPPA
    """
    if not ObjectId.is_valid(transaksi_id):
        raise HTTPException(status_code=400, detail="Invalid transaksi ID")
    
    # Validate file type
    allowed_types = ["application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Hanya file PDF yang diperbolehkan")
    
    # Check file size (max 10MB)
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Ukuran file maksimal 10MB")
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix or ".pdf"
    unique_filename = f"tx_{transaksi_id}_{uuid4().hex[:8]}{file_ext}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    file_url = f"/api/uploads/transaksi_dokumen/{unique_filename}"
    
    # Build document record
    dokumen_record = {
        "id": str(uuid4()),
        "filename": unique_filename,
        "original_name": file.filename,
        "file_url": file_url,
        "file_size": len(content),
        "jenis_dokumen": jenis_dokumen,
        "keterangan": keterangan,
        "uploaded_by": current_user.full_name,
        "uploaded_at": datetime.now(timezone.utc)
    }
    
    # Update transaksi with document
    result = await db.transaksi.update_one(
        {"_id": ObjectId(transaksi_id)},
        {
            "$push": {"dokumen_pendukung": dokumen_record},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    if result.modified_count == 0:
        # Try with id field
        result = await db.transaksi.update_one(
            {"id": transaksi_id},
            {
                "$push": {"dokumen_pendukung": dokumen_record},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        if result.modified_count == 0:
            os.remove(file_path)  # Cleanup
            raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    
    return {
        "message": "Dokumen berhasil diupload",
        "dokumen": dokumen_record
    }


@router.post("/{transaksi_id}/signature")
async def add_signature_to_transaksi(
    transaksi_id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """
    Add signature to a transaction document.
    
    payload:
    - pegawai_id: ID of the signer
    - posisi: Position/role (e.g., "Petugas", "PPK", "Pimpinan")
    - keterangan: Optional note
    """
    if not ObjectId.is_valid(transaksi_id):
        raise HTTPException(status_code=400, detail="Invalid transaksi ID")
    
    pegawai_id = payload.get("pegawai_id")
    posisi = payload.get("posisi", "Penandatangan")
    keterangan = payload.get("keterangan", "")
    
    if not pegawai_id:
        raise HTTPException(status_code=400, detail="Pegawai ID wajib diisi")
    
    if not ObjectId.is_valid(pegawai_id):
        raise HTTPException(status_code=400, detail="Invalid pegawai ID")
    
    # Get pegawai with signature
    pegawai = await db.pegawai.find_one({"_id": ObjectId(pegawai_id)})
    if not pegawai:
        raise HTTPException(status_code=404, detail="Pegawai tidak ditemukan")
    
    signature_url = pegawai.get("signature_url")
    if not signature_url:
        raise HTTPException(status_code=400, detail="Pegawai belum memiliki tanda tangan digital. Silakan upload tanda tangan di profil pegawai.")
    
    # Build signature record
    signature_record = {
        "id": str(uuid4()),
        "pegawai_id": pegawai_id,
        "nama_pegawai": pegawai.get("nama_lengkap"),
        "nip": pegawai.get("nip"),
        "jabatan": pegawai.get("jabatan"),
        "signature_url": signature_url,
        "posisi": posisi,
        "keterangan": keterangan,
        "signed_at": datetime.now(timezone.utc),
        "signed_by": current_user.full_name
    }
    
    # Update transaksi with signature
    result = await db.transaksi.update_one(
        {"_id": ObjectId(transaksi_id)},
        {
            "$push": {"tanda_tangan": signature_record},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    if result.modified_count == 0:
        result = await db.transaksi.update_one(
            {"id": transaksi_id},
            {
                "$push": {"tanda_tangan": signature_record},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    
    return {
        "message": "Tanda tangan berhasil ditambahkan",
        "signature": signature_record
    }


@router.delete("/{transaksi_id}/signature/{signature_id}")
async def remove_signature(
    transaksi_id: str,
    signature_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Remove a signature from transaction.
    """
    if not ObjectId.is_valid(transaksi_id):
        raise HTTPException(status_code=400, detail="Invalid transaksi ID")
    
    result = await db.transaksi.update_one(
        {"_id": ObjectId(transaksi_id)},
        {
            "$pull": {"tanda_tangan": {"id": signature_id}},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Tanda tangan tidak ditemukan")
    
    return {"message": "Tanda tangan berhasil dihapus"}


@router.delete("/{transaksi_id}/dokumen/{dokumen_id}")
async def remove_dokumen(
    transaksi_id: str,
    dokumen_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Remove a document from transaction.
    """
    if not ObjectId.is_valid(transaksi_id):
        raise HTTPException(status_code=400, detail="Invalid transaksi ID")
    
    # Get transaksi to find the document
    transaksi = await db.transaksi.find_one({"_id": ObjectId(transaksi_id)})
    if not transaksi:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    
    # Find document to delete
    dokumen_list = transaksi.get("dokumen_pendukung", [])
    dokumen_to_delete = None
    for doc in dokumen_list:
        if doc.get("id") == dokumen_id:
            dokumen_to_delete = doc
            break
    
    if not dokumen_to_delete:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")
    
    # Delete file from filesystem
    try:
        file_path = UPLOAD_DIR / dokumen_to_delete.get("filename", "")
        if file_path.exists():
            os.remove(file_path)
    except Exception as e:
        print(f"Error deleting file: {e}")
    
    # Remove from database
    result = await db.transaksi.update_one(
        {"_id": ObjectId(transaksi_id)},
        {
            "$pull": {"dokumen_pendukung": {"id": dokumen_id}},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )
    
    return {"message": "Dokumen berhasil dihapus"}


@router.get("/pegawai-with-signature")
async def get_pegawai_with_signature(
    search: str = Query(None),
    limit: int = Query(20),
    include_all: bool = Query(False),  # Include pegawai without signature
    current_user: User = Depends(get_current_user)
):
    """
    Get list of pegawai who have digital signatures.
    For signature picker dropdown.
    
    If include_all=True, returns all pegawai regardless of signature status.
    """
    query = {}
    
    if not include_all:
        # Only get pegawai with valid signature
        query["signature_url"] = {"$exists": True, "$nin": [None, "", "null"]}
    
    if search:
        search_query = {
            "$or": [
                {"nama_lengkap": {"$regex": search, "$options": "i"}},
                {"nip": {"$regex": search, "$options": "i"}},
                {"jabatan": {"$regex": search, "$options": "i"}}
            ]
        }
        if query:
            query = {"$and": [query, search_query]}
        else:
            query = search_query
    
    cursor = db.pegawai.find(
        query,
        {
            "_id": 1,
            "nama_lengkap": 1,
            "nip": 1,
            "jabatan": 1,
            "signature_url": 1,
            "foto_url": 1
        }
    ).sort("nama_lengkap", 1).limit(limit)
    
    items = await cursor.to_list(length=limit)
    
    result = []
    for item in items:
        sig_url = item.get("signature_url")
        # Filter out null/empty signatures if not include_all
        if not include_all and (not sig_url or sig_url in [None, "", "null"]):
            continue
        result.append({
            "id": str(item["_id"]),
            "nama_lengkap": item.get("nama_lengkap"),
            "nip": item.get("nip"),
            "jabatan": item.get("jabatan"),
            "signature_url": sig_url,
            "foto_url": item.get("foto_url"),
            "has_signature": bool(sig_url and sig_url not in [None, "", "null"])
        })
    
    return result


@router.get("/{transaksi_id}/dokumen")
async def get_transaksi_dokumen(
    transaksi_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get all documents and signatures for a transaction.
    """
    if not ObjectId.is_valid(transaksi_id):
        raise HTTPException(status_code=400, detail="Invalid transaksi ID")
    
    transaksi = await db.transaksi.find_one(
        {"_id": ObjectId(transaksi_id)},
        {"dokumen_pendukung": 1, "tanda_tangan": 1}
    )
    
    if not transaksi:
        transaksi = await db.transaksi.find_one(
            {"id": transaksi_id},
            {"dokumen_pendukung": 1, "tanda_tangan": 1}
        )
    
    if not transaksi:
        raise HTTPException(status_code=404, detail="Transaksi tidak ditemukan")
    
    return {
        "dokumen_pendukung": transaksi.get("dokumen_pendukung", []),
        "tanda_tangan": transaksi.get("tanda_tangan", [])
    }
