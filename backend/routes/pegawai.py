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
from lib.activity_logger import log_activity

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
async def create_pegawai(pegawai_in: PegawaiCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.pegawai.find_one({"nip": pegawai_in.nip})
    if existing:
        raise HTTPException(status_code=400, detail="NIP already exists")
        
    new_pegawai = Pegawai(**pegawai_in.dict())
    result = await db.pegawai.insert_one(new_pegawai.model_dump(by_alias=True, exclude=["id"]))
    
    # Log activity
    await log_activity(
        db=db,
        user_id=str(current_user.get("_id", "")),
        user_name=current_user.get("full_name", "Unknown"),
        action="CREATE",
        module="Pegawai",
        target_id=str(result.inserted_id),
        details=f"Menambahkan pegawai baru: {pegawai_in.nama_lengkap}",
        metadata={"nama": pegawai_in.nama_lengkap, "nip": pegawai_in.nip}
    )
    
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
    """Generate Excel template with dropdown validations matching website options"""
    
    # --- REFERENCE DATA (Sesuai dengan PegawaiForm.js) ---
    PANGKAT_ASN = [
        "Juru Muda (I/a)", "Juru Muda Tingkat I (I/b)", "Juru (I/c)", "Juru Tingkat I (I/d)",
        "Pengatur Muda (II/a)", "Pengatur Muda Tingkat I (II/b)", "Pengatur (II/c)", "Pengatur Tingkat I (II/d)",
        "Penata Muda (III/a)", "Penata Muda Tingkat I (III/b)", "Penata (III/c)", "Penata Tingkat I (III/d)",
        "Pembina (IV/a)", "Pembina Tingkat I (IV/b)", "Pembina Utama Muda (IV/c)", "Pembina Utama Madya (IV/d)", "Pembina Utama (IV/e)"
    ]
    PANGKAT_TNI = [
        "Prajurit Dua", "Prajurit Satu", "Prajurit Kepala", 
        "Kopral Dua", "Kopral Satu", "Kopral Kepala",
        "Sersan Dua", "Sersan Satu", "Sersan Kepala", "Sersan Mayor",
        "Pembantu Letnan Dua", "Pembantu Letnan Satu",
        "Letnan Dua", "Letnan Satu", "Kapten",
        "Mayor", "Letnan Kolonel", "Kolonel",
        "Brigadir Jenderal", "Mayor Jenderal", "Letnan Jenderal", "Jenderal"
    ]
    PANGKAT_POLRI = [
        "Bhayangkara Dua", "Bhayangkara Satu", "Bhayangkara Kepala",
        "Ajun Brigadir Polisi Dua", "Ajun Brigadir Polisi Satu", "Ajun Brigadir Polisi",
        "Brigadir Polisi Dua", "Brigadir Polisi Satu", "Brigadir Polisi", "Brigadir Polisi Kepala",
        "Ajun Inspektur Polisi Dua", "Ajun Inspektur Polisi Satu",
        "Inspektur Polisi Dua", "Inspektur Polisi Satu", "Ajun Komisaris Polisi",
        "Komisaris Polisi", "Ajun Komisaris Besar Polisi", "Komisaris Besar Polisi"
    ]
    ALL_PANGKAT = PANGKAT_ASN + PANGKAT_TNI + PANGKAT_POLRI
    
    STATUS_KEPEGAWAIAN = ["PNS", "PPPK", "TNI", "POLRI", "Non-ASN", "Honorer"]
    JENIS_KELAMIN = ["Laki-laki", "Perempuan"]
    AGAMA = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu", "Lainnya"]
    STATUS_PERKAWINAN = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"]
    PENDIDIKAN = ["SD", "SMP", "SMA/SMK", "D1", "D2", "D3", "D4/S1", "S2", "S3"]
    KEWARGANEGARAAN = ["WNI", "WNA"]
    STATUS_AKTIF = ["AKTIF", "CUTI", "TUGAS_BELAJAR", "KELUAR", "PENSIUN", "MUTASI KELUAR", "MENINGGAL"]
    # Non-ASN Fields
    JENIS_NON_ASN = ["Kontrak", "Outsourcing"]
    SUB_KATEGORI_NON_ASN = ["PPNPN", "Konsultan Individu", "Tenaga Ahli", "Teknisi", "Pramubakti", "Satpam", "Supir", "Magang"]
    
    # Status Fields
    STATUS_PENEMPATAN = ["Definitif", "Mutasi", "Penugasan"]
    STATUS_JABATAN = ["Definitif", "Plt", "Plh", "Pj", "Pjs"]
    JENIS_IDENTITAS_WNA = ["PASPOR", "KITAS", "KITAP"]
    
    # Fetch unit kerja from database
    units = await db.unit_kerja.find({}).to_list(1000)
    eselon1_list = sorted(list(set(u.get('nama_unit', '') for u in units if u.get('eselon') == '1' and u.get('nama_unit'))))
    eselon2_list = sorted(list(set(u.get('nama_unit', '') for u in units if u.get('eselon') == '2' and u.get('nama_unit'))))
    eselon3_list = sorted(list(set(u.get('nama_unit', '') for u in units if u.get('eselon') == '3' and u.get('nama_unit'))))
    eselon4_list = sorted(list(set(u.get('nama_unit', '') for u in units if u.get('eselon') == '4' and u.get('nama_unit'))))
    eselon5_list = sorted(list(set(u.get('nama_unit', '') for u in units if u.get('eselon') == '5' and u.get('nama_unit'))))
    
    # Fetch banks from database (dynamic)
    banks = await db.banks.find().sort("nama_bank", 1).to_list(1000)
    if not banks:
        # Use default if no banks in DB
        NAMA_BANK = ["BRI", "BNI", "Mandiri", "BTN", "Bank Syariah Indonesia (BSI)", "BCA", "CIMB Niaga", "Danamon", "Permata", "OCBC NISP", "Maybank", "Lainnya"]
    else:
        NAMA_BANK = [b.get('nama_bank') for b in banks if b.get('nama_bank')]
    
    # Create Workbook
    wb = Workbook()
    
    # --- SHEET 1: Template Import ---
    ws = wb.active
    ws.title = "Template Import"
    
    # Define ALL columns matching PegawaiForm.js - 35 columns total
    columns = [
        # Identitas Utama (A-H)
        ("A", "Nama Lengkap", 30, True),
        ("B", "Gelar Depan", 12, False),
        ("C", "Gelar Belakang", 15, False),
        ("D", "Kewarganegaraan", 15, False),
        ("E", "NIP", 20, False),  # WNI ASN
        ("F", "NRP", 20, False),  # WNI TNI/POLRI
        ("G", "NIK", 20, False),  # WNI Non-ASN atau KTP
        ("H", "NPWP", 20, False),
        
        # Identitas WNA (I-J)
        ("I", "Jenis Identitas WNA", 18, False),  # PASPOR/KITAS/KITAP
        ("J", "Nomor Identitas WNA", 20, False),
        
        # Data Pribadi (K-O)
        ("K", "Jenis Kelamin", 15, False),
        ("L", "Tempat Lahir", 20, False),
        ("M", "Tanggal Lahir", 15, False),
        ("N", "Agama", 12, False),
        ("O", "Status Perkawinan", 18, False),
        ("P", "Pendidikan Terakhir", 20, False),
        
        # Status Kepegawaian (Q-V)
        ("Q", "Status Kepegawaian", 18, False),
        ("R", "Pangkat/Golongan", 25, False),
        ("S", "Status Penempatan", 18, False),  # Definitif/Mutasi/Penugasan
        ("T", "Instansi Asal", 25, False),  # Jika Penugasan
        ("U", "Masa Penugasan Berakhir", 20, False),  # Jika Penugasan
        ("V", "Status Jabatan", 15, False),  # Definitif/Plt/Plh/Pj
        
        # Non-ASN Detail (W-Z)
        ("W", "Jenis Non-ASN", 15, False),  # Kontrak/Outsourcing
        ("X", "Sub-Kategori Non-ASN", 20, False),  # PPNPN/Satpam/dll
        ("Y", "Tgl Mulai Kontrak", 18, False),
        ("Z", "Tgl Selesai Kontrak", 18, False),
        
        # Jabatan & Unit Kerja (AA-AF)
        ("AA", "Jabatan", 35, False),
        ("AB", "Jabatan Fungsional Melekat", 30, False),
        ("AC", "Eselon 1", 40, False),
        ("AD", "Eselon 2", 40, False),
        ("AE", "Eselon 3", 40, False),
        ("AF", "Eselon 4", 40, False),
        ("AG", "Eselon 5", 40, False),
        
        # Kontak & Bank (AH-AL)
        ("AH", "No Telp", 15, False),
        ("AI", "Email", 30, False),
        ("AJ", "Nama Bank", 25, False),
        ("AK", "No Rekening", 20, False),
        
        # Lainnya (AL-AM)
        ("AL", "Status", 15, False),  # AKTIF/CUTI/dll
        ("AM", "Keterangan", 30, False),
    ]
    
    # Styles
    header_fill = PatternFill(start_color="1F4E79", end_color="1F4E79", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=10)
    required_fill = PatternFill(start_color="FFC000", end_color="FFC000", fill_type="solid")
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Write Headers
    for col, (col_letter, header, width, is_required) in enumerate(columns, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = required_fill if is_required else header_fill
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = border
        # Handle column letters for AA, AB, etc.
        if len(col_letter) == 1:
            ws.column_dimensions[col_letter].width = width
        else:
            ws.column_dimensions[col_letter].width = width
    
    # Add example row (row 2) - 39 columns matching new structure
    example_data = [
        # A-H: Identitas Utama
        "Budi Santoso",  # Nama Lengkap
        "Dr.",  # Gelar Depan
        "S.E., M.M.",  # Gelar Belakang
        "WNI",  # Kewarganegaraan
        "198001012005011001",  # NIP
        "",  # NRP (untuk TNI/POLRI)
        "3201010101010001",  # NIK
        "12.345.678.9-012.000",  # NPWP
        
        # I-J: WNA (kosong untuk WNI)
        "",  # Jenis Identitas WNA
        "",  # Nomor Identitas WNA
        
        # K-P: Data Pribadi
        "Laki-laki",  # Jenis Kelamin
        "Jakarta",  # Tempat Lahir
        "01/01/1980",  # Tanggal Lahir
        "Islam",  # Agama
        "Kawin",  # Status Perkawinan
        "D4/S1",  # Pendidikan Terakhir
        
        # Q-V: Status Kepegawaian
        "PNS",  # Status Kepegawaian
        "Penata (III/c)",  # Pangkat/Golongan
        "Definitif",  # Status Penempatan
        "",  # Instansi Asal
        "",  # Masa Penugasan Berakhir
        "Definitif",  # Status Jabatan
        
        # W-Z: Non-ASN Detail (kosong untuk ASN)
        "",  # Jenis Non-ASN
        "",  # Sub-Kategori Non-ASN
        "",  # Tgl Mulai Kontrak
        "",  # Tgl Selesai Kontrak
        
        # AA-AG: Jabatan & Unit Kerja
        "Kepala Seksi Umum",  # Jabatan
        "PPK, Bendahara",  # Jabatan Fungsional Melekat
        eselon1_list[0] if eselon1_list else "",  # Eselon 1
        eselon2_list[0] if eselon2_list else "",  # Eselon 2
        eselon3_list[0] if eselon3_list else "",  # Eselon 3
        eselon4_list[0] if eselon4_list else "",  # Eselon 4
        eselon5_list[0] if eselon5_list else "",  # Eselon 5
        
        # AH-AK: Kontak & Bank
        "08123456789",  # No Telp
        "budi@example.com",  # Email
        "BRI",  # Nama Bank
        "1234567890",  # No Rekening
        
        # AL-AM: Lainnya
        "AKTIF",  # Status
        "",  # Keterangan
    ]
    
    example_fill = PatternFill(start_color="E2EFDA", end_color="E2EFDA", fill_type="solid")
    for col, value in enumerate(example_data, 1):
        cell = ws.cell(row=2, column=col, value=value)
        cell.fill = example_fill
        cell.border = border
        cell.alignment = Alignment(horizontal='left', vertical='center')
    
    # Set row height
    ws.row_dimensions[1].height = 30
    ws.row_dimensions[2].height = 20
    
    # --- ADD DATA VALIDATIONS (Dropdowns) ---
    def add_dropdown(col_letter, options, row_start=3, row_end=1000):
        if not options:
            return
        formula = '"' + ','.join(str(o) for o in options[:250]) + '"'
        dv = DataValidation(type="list", formula1=formula, allow_blank=True)
        dv.error = "Pilih dari daftar yang tersedia"
        dv.errorTitle = "Input Tidak Valid"
        dv.prompt = "Pilih dari dropdown"
        dv.promptTitle = "Pilihan"
        ws.add_data_validation(dv)
        dv.add(f"{col_letter}{row_start}:{col_letter}{row_end}")
    
    # Add ALL validations matching PegawaiForm.js
    add_dropdown("D", KEWARGANEGARAAN)  # Kewarganegaraan
    add_dropdown("I", JENIS_IDENTITAS_WNA)  # Jenis Identitas WNA
    add_dropdown("K", JENIS_KELAMIN)  # Jenis Kelamin
    add_dropdown("N", AGAMA)  # Agama
    add_dropdown("O", STATUS_PERKAWINAN)  # Status Perkawinan
    add_dropdown("P", PENDIDIKAN)  # Pendidikan Terakhir
    add_dropdown("Q", STATUS_KEPEGAWAIAN)  # Status Kepegawaian
    add_dropdown("R", ALL_PANGKAT)  # Pangkat/Golongan (semua)
    add_dropdown("S", STATUS_PENEMPATAN)  # Status Penempatan
    add_dropdown("V", STATUS_JABATAN)  # Status Jabatan
    add_dropdown("W", JENIS_NON_ASN)  # Jenis Non-ASN
    add_dropdown("X", SUB_KATEGORI_NON_ASN)  # Sub-Kategori Non-ASN
    add_dropdown("AJ", NAMA_BANK)  # Nama Bank
    add_dropdown("AL", STATUS_AKTIF)  # Status
    
    # Unit kerja dropdowns
    if eselon1_list:
        add_dropdown("AC", eselon1_list)
    if eselon2_list:
        add_dropdown("AD", eselon2_list)
    if eselon3_list:
        add_dropdown("AE", eselon3_list)
    if eselon4_list:
        add_dropdown("AF", eselon4_list)
    if eselon5_list:
        add_dropdown("AG", eselon5_list)
    
    # --- SHEET 2: Referensi Data ---
    ws_ref = wb.create_sheet("Referensi Data")
    ws_ref.sheet_properties.tabColor = "0070C0"
    
    ref_data = [
        ("Status Kepegawaian", STATUS_KEPEGAWAIAN),
        ("Pangkat ASN", PANGKAT_ASN),
        ("Pangkat TNI", PANGKAT_TNI),
        ("Pangkat POLRI", PANGKAT_POLRI),
        ("Jenis Non-ASN", JENIS_NON_ASN),
        ("Sub-Kategori Non-ASN", SUB_KATEGORI_NON_ASN),
        ("Status Penempatan", STATUS_PENEMPATAN),
        ("Status Jabatan", STATUS_JABATAN),
        ("Jenis Kelamin", JENIS_KELAMIN),
        ("Agama", AGAMA),
        ("Status Perkawinan", STATUS_PERKAWINAN),
        ("Pendidikan", PENDIDIKAN),
        ("Kewarganegaraan", KEWARGANEGARAAN),
        ("Jenis ID WNA", JENIS_IDENTITAS_WNA),
        ("Nama Bank", NAMA_BANK),
        ("Status Sistem", STATUS_AKTIF),
        ("Eselon 1", eselon1_list),
        ("Eselon 2", eselon2_list),
        ("Eselon 3", eselon3_list),
        ("Eselon 4", eselon4_list),
        ("Eselon 5", eselon5_list),
    ]
    
    col_offset = 1
    for title, items in ref_data:
        # Header
        cell = ws_ref.cell(row=1, column=col_offset, value=title)
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal='center')
        
        # Items
        for row_idx, item in enumerate(items, 2):
            ws_ref.cell(row=row_idx, column=col_offset, value=item)
        
        # Set width
        ws_ref.column_dimensions[chr(64 + col_offset)].width = max(len(title) + 5, 20)
        col_offset += 1
    
    # --- SHEET 3: Petunjuk ---
    ws_help = wb.create_sheet("Petunjuk Pengisian")
    ws_help.sheet_properties.tabColor = "00B050"
    
    instructions = [
        ("PETUNJUK IMPORT DATA PEGAWAI", ""),
        ("", ""),
        ("1. KOLOM WAJIB (Kuning)", "NIP dan Nama Lengkap HARUS diisi"),
        ("2. FORMAT TANGGAL", "Gunakan format DD/MM/YYYY (contoh: 01/01/1980)"),
        ("3. DROPDOWN", "Kolom dengan dropdown akan menampilkan pilihan saat diklik"),
        ("4. JENIS NON-ASN", "Hanya diisi jika Status Kepegawaian = Non-ASN atau Honorer"),
        ("5. PANGKAT/GOLONGAN", "Diisi sesuai status (ASN gunakan golongan I-IV)"),
        ("6. ESELON", "Pilih dari dropdown sesuai struktur organisasi yang ada"),
        ("7. DUPLIKAT", "Data dengan NIP/NIK/NPWP yang sudah ada akan dilewati"),
        ("8. SHEET REFERENSI", "Lihat sheet 'Referensi Data' untuk daftar lengkap pilihan"),
        ("", ""),
        ("TIPS:", ""),
        ("- Pastikan semua kolom dropdown menggunakan nilai yang tersedia", ""),
        ("- Hapus baris contoh (baris 2 hijau) sebelum import", ""),
        ("- Simpan file dalam format .xlsx", ""),
    ]
    
    for row_idx, (col1, col2) in enumerate(instructions, 1):
        cell1 = ws_help.cell(row=row_idx, column=1, value=col1)
        cell2 = ws_help.cell(row=row_idx, column=2, value=col2)
        if row_idx == 1:
            cell1.font = Font(bold=True, size=14, color="1F4E79")
        elif col1.startswith(("1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.")):
            cell1.font = Font(bold=True)
    
    ws_help.column_dimensions['A'].width = 35
    ws_help.column_dimensions['B'].width = 60
    
    # Freeze panes
    ws.freeze_panes = "A2"
    
    # Save to bytes
    output = BytesIO()
    wb.save(output)
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
        df = pd.read_excel(BytesIO(contents), sheet_name=0)  # Read first sheet only
        
        # 1. Required columns (minimal)
        required_columns = {"NIP", "Nama Lengkap"}
        file_cols = [c.strip() for c in df.columns]
        missing_required = [c for c in required_columns if c not in file_cols]
        
        if missing_required:
            raise HTTPException(status_code=400, detail=f"Kolom wajib tidak ditemukan: {', '.join(missing_required)}")
            
        # 2. Process Data
        success_count = 0
        skipped_count = 0
        failed_count = 0
        errors = []
        
        # Clean data: Trim whitespace from all string columns
        df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
        
        # Helper to get cell value
        def get_val(row, col, default=None):
            val = row.get(col)
            if pd.isna(val) or str(val).lower() in ['nan', 'none', '']:
                return default
            return str(val).strip() if isinstance(val, (str, int, float)) else default
        
        # Iterate rows
        for index, row in df.iterrows():
            try:
                # Basic Validation - Nama Lengkap is required
                nama = get_val(row, "Nama Lengkap")
                if not nama or "Budi Santoso" in nama:  # Skip example row
                    if not nama:
                        failed_count += 1
                        errors.append(f"Baris {index+2}: Nama Lengkap kosong")
                    continue

                # Get identity fields
                nip = get_val(row, "NIP")
                nrp = get_val(row, "NRP")
                nik = get_val(row, "NIK")
                npwp = get_val(row, "NPWP")
                
                # Skip example rows
                if nip and "198001012005011001" in nip:
                    continue

                # Uniqueness Check
                query_conditions = []
                if nip: query_conditions.append({"nip": nip})
                if nrp: query_conditions.append({"nrp": nrp})
                if nik: query_conditions.append({"nik": nik})
                if npwp: query_conditions.append({"npwp": npwp})
                
                if query_conditions:
                    existing = await db.pegawai.find_one({"$or": query_conditions})
                    if existing:
                        skipped_count += 1
                        continue
                
                # Parse date fields helper
                def parse_date(date_str):
                    if not date_str:
                        return None
                    for fmt in ["%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d"]:
                        try:
                            return datetime.strptime(date_str, fmt).isoformat()
                        except:
                            continue
                    return None
                    
                # Construct Object with ALL fields matching PegawaiForm.js
                new_pegawai = Pegawai(
                    # Identitas Utama
                    nama_lengkap=nama,
                    gelar_depan=get_val(row, "Gelar Depan"),
                    gelar_belakang=get_val(row, "Gelar Belakang"),
                    kewarganegaraan=get_val(row, "Kewarganegaraan", "WNI"),
                    nip=nip,
                    nrp=nrp,
                    nik=nik,
                    npwp=npwp,
                    
                    # WNA Identity
                    jenis_identitas_wna=get_val(row, "Jenis Identitas WNA"),
                    nomor_identitas_wna=get_val(row, "Nomor Identitas WNA"),
                    
                    # Data Pribadi
                    jenis_kelamin=get_val(row, "Jenis Kelamin"),
                    tempat_lahir=get_val(row, "Tempat Lahir"),
                    tanggal_lahir=parse_date(get_val(row, "Tanggal Lahir")),
                    agama=get_val(row, "Agama"),
                    status_perkawinan=get_val(row, "Status Perkawinan"),
                    pendidikan_terakhir=get_val(row, "Pendidikan Terakhir"),
                    
                    # Status Kepegawaian
                    status_kepegawaian=get_val(row, "Status Kepegawaian"),
                    pangkat_golongan=get_val(row, "Pangkat/Golongan"),
                    status_penempatan=get_val(row, "Status Penempatan"),
                    instansi_asal=get_val(row, "Instansi Asal"),
                    masa_penugasan_end=parse_date(get_val(row, "Masa Penugasan Berakhir")),
                    status_jabatan=get_val(row, "Status Jabatan"),
                    
                    # Non-ASN Detail
                    jenis_non_asn=get_val(row, "Jenis Non-ASN"),
                    sub_kategori_non_asn=get_val(row, "Sub-Kategori Non-ASN"),
                    tgl_mulai_kontrak=parse_date(get_val(row, "Tgl Mulai Kontrak")),
                    tgl_selesai_kontrak=parse_date(get_val(row, "Tgl Selesai Kontrak")),
                    
                    # Jabatan & Unit Kerja
                    jabatan=get_val(row, "Jabatan"),
                    jabatan_melekat=get_val(row, "Jabatan Fungsional Melekat"),
                    eselon1=get_val(row, "Eselon 1"),
                    eselon2=get_val(row, "Eselon 2"),
                    eselon3=get_val(row, "Eselon 3"),
                    eselon4=get_val(row, "Eselon 4"),
                    eselon5=get_val(row, "Eselon 5"),
                    
                    # Kontak & Bank
                    no_telp=get_val(row, "No Telp"),
                    email=get_val(row, "Email"),
                    nama_bank=get_val(row, "Nama Bank"),
                    no_rekening=get_val(row, "No Rekening"),
                    
                    # Status & Lainnya
                    status=get_val(row, "Status", "AKTIF"),
                    keterangan=get_val(row, "Keterangan")
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
            "errors": errors[:50]  # Limit error messages
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
