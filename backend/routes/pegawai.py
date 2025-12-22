from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional, Dict, Any
from models import Pegawai, PegawaiCreate
from auth import get_current_user
from models import Pegawai, PegawaiCreate, MutasiPegawai, RiwayatKarir
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone
import os
import math

import pandas as pd
import uuid
from io import BytesIO
from fastapi.responses import StreamingResponse
from fastapi import UploadFile, File, Form
from lib.image_processor import process_image_upload
from openpyxl import Workbook
from openpyxl.styles import Font, Fill, PatternFill, Alignment, Border, Side
from openpyxl.utils.dataframe import dataframe_to_rows
from openpyxl.worksheet.datavalidation import DataValidation

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("/pejabat")
async def get_pejabat_list(
    role: str = Query("PPK", description="Role to filter (e.g., PPK)"),
    current_user: str = Depends(get_current_user)
):
    # Filter pegawai where jabatan_melekat array contains the role (case insensitive)
    query = {"jabatan_melekat": {"$elemMatch": {"$regex": role, "$options": "i"}}}
    cursor = db.pegawai.find(query).sort("nama_lengkap", 1)
    items = await cursor.to_list(None)
    
    for item in items:
        if "_id" in item: item["_id"] = str(item["_id"])
        
    return items

@router.get("", response_model=Dict[str, Any])
async def get_pegawai_list(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    skip = (page - 1) * limit
    query = {}
    if search:
        query["$or"] = [
            {"nama_lengkap": {"$regex": search, "$options": "i"}},
            {"nip": {"$regex": search, "$options": "i"}}
        ]
        
    total = await db.pegawai.count_documents(query)
    cursor = db.pegawai.find(query).skip(skip).limit(limit).sort("nama_lengkap", 1)
    items = await cursor.to_list(length=limit)
    
    # ObjectId to String
    for item in items:
        if "_id" in item: item["_id"] = str(item["_id"])
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit)
    }

@router.post("", response_model=Pegawai)
async def create_pegawai(pegawai_in: PegawaiCreate, current_user: str = Depends(get_current_user)):
    existing = await db.pegawai.find_one({"nip": pegawai_in.nip})
    if existing:
        raise HTTPException(status_code=400, detail="NIP already exists")
        
    new_pegawai = Pegawai(**pegawai_in.dict())
    result = await db.pegawai.insert_one(new_pegawai.model_dump(by_alias=True, exclude=["id"]))
    return await db.pegawai.find_one({"_id": result.inserted_id})

@router.put("/{id}", response_model=Pegawai)
async def update_pegawai(id: str, pegawai_in: PegawaiCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    # Check NIP conflict if changed
    existing = await db.pegawai.find_one({"nip": pegawai_in.nip, "_id": {"$ne": ObjectId(id)}})
    if existing: raise HTTPException(status_code=400, detail="NIP already used by another employee")
    
    update_data = pegawai_in.dict(exclude_unset=True)
    # Don't update created_at, update updated_at if schema had it
    
    res = await db.pegawai.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=True
    )
    if not res: raise HTTPException(status_code=404)
    return res

@router.get("/{id}", response_model=Pegawai)
async def get_pegawai_detail(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    pegawai = await db.pegawai.find_one({"_id": ObjectId(id)})
    if not pegawai: raise HTTPException(status_code=404)
    return pegawai

@router.delete("/{id}")
async def delete_pegawai(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    res = await db.pegawai.delete_one({"_id": ObjectId(id)})
    if res.deleted_count == 0: raise HTTPException(status_code=404)
    return {"message": "Pegawai deleted"}

@router.post("/{id}/mutasi", response_model=Pegawai)
async def mutasi_pegawai(id: str, mutasi: MutasiPegawai, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    pegawai = await db.pegawai.find_one({"_id": ObjectId(id)})
    if not pegawai: raise HTTPException(status_code=404)
    
    # Create History Record
    riwayat = RiwayatKarir(
        jenis=mutasi.jenis_mutasi,
        deskripsi=mutasi.keterangan or f"Mutasi ke {mutasi.jabatan_baru}",
        jabatan_baru=mutasi.jabatan_baru,
        unit_kerja_baru=f"{mutasi.unit_kerja_baru.get('eselon1','')}, {mutasi.unit_kerja_baru.get('eselon2','')}",
        pangkat_baru=mutasi.pangkat_baru,
        sk_ref=mutasi.sk_ref,
        tanggal=mutasi.tgl_efektif
    )
    
    # Update Fields
    update_fields = {
        "jabatan": mutasi.jabatan_baru,
    }
    if mutasi.pangkat_baru:
        update_fields["pangkat_golongan"] = mutasi.pangkat_baru
        
    # Update Unit Kerja if provided
    if mutasi.unit_kerja_baru:
        for k, v in mutasi.unit_kerja_baru.items():
            if k in ['eselon1', 'eselon2', 'eselon3', 'eselon4']:
                update_fields[k] = v
                
    # Execute Update
    res = await db.pegawai.find_one_and_update(
        {"_id": ObjectId(id)},
        {
            "$set": update_fields,
            "$push": {"riwayat_karir": riwayat.dict()}
        },
        return_document=True
    )
    
@router.get("/import/template")
async def get_import_template(current_user: str = Depends(get_current_user)):
    # Create DataFrame for template
    data = {
        "NIP": ["198001012005011001 (Wajib)"],
        "Nama Lengkap": ["Budi Santoso (Wajib)"],
        "NIK": ["3201010101010001"],
        "NPWP": ["12.345.678.9-012.000"],
        "Jabatan": ["Kepala Seksi Umum"],
        "Eselon 1": ["Sekretariat Jenderal"],
        "Eselon 2": ["Biro Keuangan"],
        "Eselon 3": ["Bagian Perbendaharaan"],
        "Eselon 4": ["Subbagian Verifikasi"],
        "Pangkat/Golongan": ["Penata (III/c)"],
        "Status Kepegawaian": ["PNS"],
        "No Telp": ["08123456789"],
        "Email": ["budi@example.com"],
        "Nama Bank": ["BRI"],
        "No Rekening": ["1234567890"],
        "Gelar Depan": ["Dr."],
        "Gelar Belakang": ["S.E., M.M."]
    }
    df = pd.DataFrame(data)
    
    # Save to Excel in memory
    output = BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Template Import')
        
        # Adjust column width
        worksheet = writer.sheets['Template Import']
        for column in df:
            column_width = max(df[column].astype(str).map(len).max(), len(column)) + 2
            col_idx = df.columns.get_loc(column) + 1
            worksheet.column_dimensions[chr(64 + col_idx)].width = column_width
            
    output.seek(0)
    
    return StreamingResponse(
        output, 
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=template_import_pegawai.xlsx"}
    )

@router.post("/import")
async def import_pegawai(
    file: UploadFile = File(...), 
    current_user: str = Depends(get_current_user)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Format file harus Excel (.xlsx, .xls)")
        
    try:
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        # 1. Validate Columns
        expected_columns = {
            "NIP", "Nama Lengkap", "NIK", "NPWP", "Jabatan", 
            "Eselon 1", "Eselon 2", "Eselon 3", "Eselon 4", 
            "Pangkat/Golongan", "Status Kepegawaian", 
            "No Telp", "Email", "Nama Bank", "No Rekening",
            "Gelar Depan", "Gelar Belakang"
        }
        
        # Check if all expected columns are present (case insensitive check)
        file_cols = [c.strip() for c in df.columns]
        missing = [c for c in expected_columns if c not in file_cols]
        
        if missing:
            raise HTTPException(status_code=400, detail=f"Struktur kolom tidak sesuai. Kolom hilang: {', '.join(missing)}")
            
        # 2. Process Data
        success_count = 0
        skipped_count = 0
        failed_count = 0
        errors = []
        
        # Clean data: Trim whitespace from all string columns
        df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
        
        # Iterate rows
        for index, row in df.iterrows():
            try:
                # Basic Validation
                nip = str(row.get("NIP", "")).strip()
                if not nip or nip == "nan" or "Wajib" in nip: # Skip example row
                    continue
                    
                nama = row.get("Nama Lengkap", "")
                if not nama or str(nama) == "nan": 
                    failed_count += 1
                    errors.append(f"Baris {index+2}: Nama Lengkap kosong")
                    continue

                # Uniqueness Check (Trim System)
                # Check NIP, NIK, NPWP
                nik = str(row.get("NIK", "")).strip() if pd.notna(row.get("NIK")) else None
                npwp = str(row.get("NPWP", "")).strip() if pd.notna(row.get("NPWP")) else None
                
                # Check DB for existing
                query = {"$or": [{"nip": nip}]}
                if nik: query["$or"].append({"nik": nik})
                if npwp: query["$or"].append({"npwp": npwp})
                
                existing = await db.pegawai.find_one(query)
                
                if existing:
                    skipped_count += 1
                    # errors.append(f"Baris {index+2}: Dilewati (Duplikat NIP/NIK/NPWP)") # Optional: Don't treat as error
                    continue
                    
                # Construct Object
                new_pegawai = Pegawai(
                    nip=nip,
                    nama_lengkap=nama,
                    nik=nik,
                    npwp=npwp,
                    jabatan=row.get("Jabatan") if pd.notna(row.get("Jabatan")) else None,
                    eselon1=row.get("Eselon 1") if pd.notna(row.get("Eselon 1")) else None,
                    eselon2=row.get("Eselon 2") if pd.notna(row.get("Eselon 2")) else None,
                    eselon3=row.get("Eselon 3") if pd.notna(row.get("Eselon 3")) else None,
                    eselon4=row.get("Eselon 4") if pd.notna(row.get("Eselon 4")) else None,
                    pangkat_golongan=row.get("Pangkat/Golongan") if pd.notna(row.get("Pangkat/Golongan")) else None,
                    status_kepegawaian=row.get("Status Kepegawaian") if pd.notna(row.get("Status Kepegawaian")) else None,
                    no_telp=str(row.get("No Telp")) if pd.notna(row.get("No Telp")) else None,
                    email=row.get("Email") if pd.notna(row.get("Email")) else None,
                    nama_bank=row.get("Nama Bank") if pd.notna(row.get("Nama Bank")) else None,
                    no_rekening=str(row.get("No Rekening")) if pd.notna(row.get("No Rekening")) else None,
                    gelar_depan=row.get("Gelar Depan") if pd.notna(row.get("Gelar Depan")) else None,
                    gelar_belakang=row.get("Gelar Belakang") if pd.notna(row.get("Gelar Belakang")) else None,
                    status="AKTIF"
                )
                
                # Insert
                await db.pegawai.insert_one(new_pegawai.model_dump(by_alias=True, exclude=["id"]))
                success_count += 1
                
            except Exception as row_err:
                failed_count += 1
                errors.append(f"Baris {index+2}: {str(row_err)}")
                
        return {
            "message": "Import selesai",
            "success": success_count,
            "skipped": skipped_count,
            "failed": failed_count,
            "errors": errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@router.post("/{id}/signature")
async def upload_signature(
    id: str,
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    try:
        # Validate
        if file.content_type not in ["image/png", "image/jpeg"]:
             raise HTTPException(status_code=400, detail="Format signature harus PNG/JPG (Transparan direkomendasikan)")

        # Process upload
        # We assume the file is already a processed image (cropped) or raw signature
        # Just save it.
        result = await process_image_upload(file, "signatures", db)
        
        signature_url = f"/api/uploads/{result['optimized']}"
        
        await db.pegawai.update_one(
            {"_id": ObjectId(id)},
            {"$set": {"signature_url": signature_url, "updated_at": datetime.now(timezone.utc)}}
        )
        
        return {"message": "Tanda tangan berhasil disimpan", "url": signature_url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

        
    except Exception as e:
        # Catch file reading errors
        if isinstance(e, HTTPException): raise e
        print(e)
        raise HTTPException(status_code=400, detail=f"Error membaca file: {str(e)}")
    return res


@router.post("/{id}/upload-dokumen")
async def upload_pegawai_dokumen(
    id: str,
    file: UploadFile = File(...),
    keterangan: str = Form(...),
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    # Check File Size (Approximate via content-length header if available, or read)
    # UploadFile.file is a SpooledTemporaryFile
    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > 1 * 1024 * 1024: # 1MB Limit
        raise HTTPException(status_code=400, detail="Ukuran file maksimal 1MB")
        
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Format file harus PDF atau Gambar (JPG/PNG)")

    try:
        # Save File
        upload_dir = "/app/uploads/pegawai_docs"
        os.makedirs(upload_dir, exist_ok=True)
        
        filename = f"{uuid.uuid4()}{os.path.splitext(file.filename)[1]}"
        file_path = os.path.join(upload_dir, filename)
        
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)
            
        file_url = f"/api/uploads/pegawai_docs/{filename}"
        
        # Create Document Object
        from models import PegawaiDocument
        new_doc = PegawaiDocument(
            filename=filename,
            original_name=file.filename,
            file_url=file_url,
            keterangan=keterangan,
            file_type="pdf" if "pdf" in file.content_type else "image"
        )
        
        # Update DB
        await db.pegawai.update_one(
            {"_id": ObjectId(id)},
            {"$push": {"dokumen": new_doc.dict()}}
        )
        
        return {"message": "Dokumen berhasil diupload", "data": new_doc.dict()}
        
    except Exception as e:
        print(f"Upload Error: {e}")
        raise HTTPException(status_code=500, detail="Gagal mengupload dokumen")

@router.delete("/{id}/dokumen/{doc_id}")
async def delete_pegawai_dokumen(id: str, doc_id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    # Pull from array
    res = await db.pegawai.update_one(
        {"_id": ObjectId(id)},
        {"$pull": {"dokumen": {"id": doc_id}}}
    )
    
    if res.modified_count == 0:
        raise HTTPException(status_code=404, detail="Dokumen tidak ditemukan")
        
    # Optional: Delete physical file (Needs logic to find filename from DB before pull, or accept orphan files)
    # For now, we just remove reference to keep it simple and safe.
    
    return {"message": "Dokumen dihapus"}
