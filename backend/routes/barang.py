from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Body
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from models import Barang, BarangCreate
from lib.image_processor import compress_image, process_image_upload
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
import shutil
from datetime import datetime, timezone
import pandas as pd
import io
import math
import html
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from pydantic import BaseModel

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- Request Models ---
class BulkDeleteRequest(BaseModel):
    ids: Optional[List[str]] = []
    select_all_mode: bool = False
    search: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None

def clean_currency(value):
    if value is None: return 0.0
    if isinstance(value, (int, float)):
        if math.isnan(value) or math.isinf(value): return 0.0
        return float(value)
    if isinstance(value, str):
        clean = value.replace('Rp', '').replace('.', '').replace(',', '').strip()
        if not clean: return 0.0
        try: return float(clean)
        except ValueError: return 0.0
    return 0.0

def clean_code_str(val):
    if val is None: return ""
    s = str(val).strip()
    if s.endswith(".0"): return s[:-2]
    return s

async def get_golongan_uraian(kode: str):
    if not kode: return None
    k = kode[:1]
    ref = await db.kodefikasi.find_one({"kode": k})
    if ref: return f"{k} - {ref['uraian']}"
    golongan_map = {
        "1": "Persediaan", "2": "Tanah", "3": "Peralatan dan Mesin",
        "4": "Gedung dan Bangunan", "5": "Jalan, Irigasi dan Jaringan",
        "6": "Aset Tetap Lainnya", "7": "Konstruksi dalam Pengerjaan", "8": "Aset Tak Berwujud"
    }
    desc = golongan_map.get(k, "Unknown")
    return f"{k} - {desc}"

@router.get("/next-nup")
async def get_next_nup(kode: str, current_user: str = Depends(get_current_user)):
    kode = clean_code_str(kode)
    collation = {'locale': 'en_US', 'numericOrdering': True}
    last_item = await db.barang.find({"kode_barang": kode}).collation(collation).sort("nup", -1).limit(1).to_list(1)
    next_nup = 1
    if last_item:
        try: next_nup = int(last_item[0]['nup']) + 1
        except: pass
    return {"nup": str(next_nup), "formatted": f"{next_nup} (Sementara)"}

@router.get("", response_model=Dict[str, Any])
async def get_barang_list(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    filter_kode: Optional[str] = None,
    filter_nama: Optional[str] = None,
    filter_merk: Optional[str] = None,
    filter_kondisi: Optional[str] = None,
    filter_lokasi: Optional[str] = None,
    filter_nup: Optional[str] = None,
    filter_golongan: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    skip = (page - 1) * limit
    query = {}
    if search:
        query["$or"] = [
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"kode_barang": {"$regex": search, "$options": "i"}},
            {"nup": {"$regex": search, "$options": "i"}}
        ]
    if filter_kode: query["kode_barang"] = {"$regex": filter_kode, "$options": "i"}
    if filter_nama: query["nama_barang"] = {"$regex": filter_nama, "$options": "i"}
    if filter_merk: query["merk"] = {"$regex": filter_merk, "$options": "i"}
    if filter_kondisi: query["kondisi"] = filter_kondisi 
    if filter_lokasi: query["lokasi_fisik"] = {"$regex": filter_lokasi, "$options": "i"}
    if filter_nup: query["nup"] = {"$regex": filter_nup, "$options": "i"}
    if filter_golongan: query["golongan_barang"] = {"$regex": filter_golongan, "$options": "i"}
        
    total = await db.barang.count_documents(query)
    collation = {'locale': 'en_US', 'numericOrdering': True}
    cursor = db.barang.find(query).collation(collation).sort([("kode_barang", 1), ("nup", 1)]).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    
    for item in items:
        if "_id" in item: item["_id"] = str(item["_id"])
        
    items = sanitize_json(items)
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit)
    }

def sanitize_json(obj):
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {k: sanitize_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_json(v) for v in obj]
    return obj

@router.post("/import")
async def import_barang_excel(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    """Import aset tetap dari file Excel format SIMAN"""
    if not file.filename.endswith(('.xls', '.xlsx')): raise HTTPException(status_code=400, detail="Excel only")
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df = df.where(pd.notnull(df), None)
        
        count_processed = 0; count_updated = 0; count_inserted = 0
        
        # PRE-FETCH REFERENCE
        refs = await db.kodefikasi.find({}).to_list(None)
        ref_map = {r['kode']: r['uraian'] for r in refs}
        golongan_map = { "1": "Persediaan", "2": "Tanah", "3": "Peralatan", "4": "Gedung", "5": "Jalan", "6": "Aset Lain", "7": "KDP", "8": "Tak Berwujud" }

        for index, row in df.iterrows():
            try:
                kode = clean_code_str(row.get('Kode Barang', ''))
                nup = clean_code_str(row.get('NUP', ''))
                reg = clean_code_str(row.get('Kode Register', ''))
                nama_barang = row.get('Nama Barang')
                
                # Skip rows without essential data
                if not nama_barang or str(nama_barang).lower() == 'nan':
                    continue
                
                # If no Kode Barang, try to generate from Kode Register or use placeholder
                if not kode or str(kode).lower() == 'nan':
                    if reg and str(reg).lower() != 'nan':
                        # Use first 16 chars of Kode Register as Kode Barang
                        kode = str(reg)[:16]
                    else:
                        # Generate based on row number with prefix
                        kode = f"IMPORT-{index+1:06d}"
                
                if not nup or str(nup).lower() == 'nan': 
                    nup = '1'
                else:
                    # Clean NUP - remove decimal if present
                    try:
                        nup = str(int(float(nup)))
                    except:
                        nup = str(nup).split('.')[0]
                
                # Determine duplicate query
                dup_query = {}
                if reg and str(reg).lower() != 'nan':
                    dup_query = {"kode_register": reg}
                else:
                    dup_query = {"kode_barang": kode, "nup": nup}
                
                # Determine golongan from kode or Jenis BMN
                k = kode[:1] if kode else "6"
                jenis_bmn = row.get('Jenis BMN', '')
                if jenis_bmn:
                    jenis_lower = str(jenis_bmn).lower()
                    if 'tanah' in jenis_lower: k = '2'
                    elif 'gedung' in jenis_lower or 'bangunan' in jenis_lower: k = '4'
                    elif 'peralatan' in jenis_lower or 'mesin' in jenis_lower: k = '3'
                    elif 'jalan' in jenis_lower: k = '5'
                    elif 'kdp' in jenis_lower or 'konstruksi' in jenis_lower: k = '7'
                
                gol = f"{k} - {ref_map.get(k, golongan_map.get(k, 'Unknown'))}"
                
                # Handle dates
                tgl_perolehan = str(row.get('Tanggal Perolehan'))[:10] if row.get('Tanggal Perolehan') else None
                tgl_buku_pertama = str(row.get('Tanggal Buku Pertama'))[:10] if row.get('Tanggal Buku Pertama') else None
                tgl_penghapusan = str(row.get('Tanggal Pengapusan'))[:10] if row.get('Tanggal Pengapusan') else None
                tgl_psp = str(row.get('Tanggal PSP'))[:10] if row.get('Tanggal PSP') else None
                
                # Handle invalid dates
                if tgl_penghapusan and '0001' in tgl_penghapusan:
                    tgl_penghapusan = None
                if tgl_psp and '9999' in tgl_psp:
                    tgl_psp = None
                
                thn = None
                if tgl_perolehan:
                    try: thn = str(datetime.strptime(tgl_perolehan, "%Y-%m-%d").year)
                    except: thn = tgl_perolehan[:4] if tgl_perolehan else None
                
                # Build comprehensive item data from SIMAN format
                item_data = {
                    "source": "import",
                    # Basic Info
                    "kode_barang": kode, 
                    "nup": nup, 
                    "golongan_barang": gol,
                    "jenis_bmn": row.get('Jenis BMN'),
                    "nama_barang": nama_barang or "Tanpa Nama",
                    "status_bmn": row.get('Status BMN') or "Aktif",
                    "merk": row.get('Merk'), 
                    "tipe": row.get('Tipe'), 
                    "kondisi": row.get('Kondisi') or "Baik",
                    "umur_aset": row.get('Umur Aset'),
                    "satuan": "Unit",
                    
                    # Intra/Extra & Status
                    "intra_ekstra": row.get('Intra / Extra') or row.get('Aset Intra / Extra'),
                    "henti_guna": row.get('Henti Guna'),
                    "status_sbsn": row.get('Status SBSN'),
                    "status_bmn_idle": row.get('Status BMN Idle'),
                    "status_kemitraan": row.get('Status Kemitraan'),
                    "bpybds": row.get('BPYBDS'),
                    "usulan_barang_hilang": row.get('Usulan Barang Hilang'),
                    "usulan_barang_rb": row.get('Usulan Barang RB'),
                    "usul_hapus": row.get('Usul Hapus'),
                    "hibah": row.get('Hibah') or row.get('Hibah DKTP'),
                    "dktp": row.get('DKTP') or row.get('Hibah DKTP'),
                    "konsesi": row.get('Konsensi') or row.get('Konsensi Jasa'),
                    "jasa_properti": row.get('Jasa Properti') or row.get('Konsensi Jasa'),
                    "investasi": row.get('Investasi') or row.get('Properti Investasi'),
                    
                    # Dokumen
                    "jenis_dokumen": row.get('Jenis Dokumen'),
                    "no_dokumen": str(row.get('No Dokumen', '')) if row.get('No Dokumen') else None,
                    "no_bpkp": str(row.get('No BPKP', '')) if row.get('No BPKP') else None,
                    "no_polisi": str(row.get('No Polisi', '')) if row.get('No Polisi') else None,
                    
                    # Sertifikat
                    "status_sertifikasi": row.get('Status Sertifikasi'),
                    "jenis_sertifikat": row.get('Jenis Sertipikat') or row.get('Jenis Sertifikat'),
                    "no_sertifikat": str(row.get('No Sertifikat', '')) if row.get('No Sertifikat') else None,
                    "nama_sertifikat": row.get('Nama'),
                    
                    # Dates
                    "tgl_buku_pertama": tgl_buku_pertama,
                    "tgl_perolehan": tgl_perolehan, 
                    "tgl_penghapusan": tgl_penghapusan,
                    "tahun_anggaran": thn,
                    
                    # Values
                    "nilai_perolehan_pertama": clean_currency(row.get('Nilai Perolehan Pertama')),
                    "nilai_mutasi": clean_currency(row.get('Nilai Mutasi')),
                    "nilai_perolehan": clean_currency(row.get('Nilai Perolehan')),
                    "nilai_penyusutan": clean_currency(row.get('Nilai Penyusutan')),
                    "nilai_buku": clean_currency(row.get('Nilai Buku')),
                    "nilai_satuan": clean_currency(row.get('Nilai Perolehan')), 
                    
                    # Luas
                    "luas_tanah": clean_currency(row.get('Luas Tanah Seluruhnya')),
                    "luas_tanah_bangunan": clean_currency(row.get('Luas Tanah Untuk Bangunan')),
                    "luas_tanah_sarana": clean_currency(row.get('Luas Tanah Untuk Sarana Lingkungan')),
                    "luas_lahan_kosong": clean_currency(row.get('Luas Lahan Kosong')),
                    "luas_bangunan": clean_currency(row.get('Luas Bangunan')),
                    "luas_tapak_bangunan": clean_currency(row.get('Luas Tapak Bangunan')),
                    "luas_pemanfaatan": clean_currency(row.get('Luas Pemanfataan')),
                    "jumlah_lantai": row.get('Jumlah Lantai'),
                    "jumlah_foto": row.get('Jumlah Foto'),
                    
                    # PSP
                    "status_penggunaan": row.get('Status Penggunaan'),
                    "no_psp": str(row.get('No PSP', '')) if row.get('No PSP') else None,
                    "tgl_psp": tgl_psp,
                    
                    # Lokasi - handle both "Lokasi" / "Ruang" and combined "Lokasi Ruang"
                    "alamat": row.get('Alamat'),
                    "rt_rw": row.get('RT/RW'),
                    "kelurahan": row.get('Kelurahan/Desa'),
                    "kecamatan": row.get('Kecamatan'),
                    "kab_kota": row.get('Kab/Kota'),
                    "kode_kab_kota": str(row.get('Kode Kab/Kota', '')) if row.get('Kode Kab/Kota') else None,
                    "provinsi": row.get('Provinsi'),
                    "kode_provinsi": str(row.get('Kode Provinsi', '')) if row.get('Kode Provinsi') else None,
                    "kode_pos": str(row.get('Kode Pos', '')) if row.get('Kode Pos') else None,
                    "lokasi_fisik": row.get('Lokasi') or row.get('Lokasi Ruang'),
                    "ruang": row.get('Ruang') or row.get('Lokasi Ruang'),
                    
                    # SBSK & Optimalisasi
                    "sbsk": row.get('SBSK'),
                    "optimalisasi": row.get('Optimalisasi'),
                    "penghuni": row.get('Penghuni'),
                    "pengguna": row.get('Pengguna'),
                    
                    # KPKNL & Kanwil
                    "kode_kpknl": str(row.get('Kode KPKNL', '')) if row.get('Kode KPKNL') else None,
                    "uraian_kpknl": row.get('Uraian KPKNL'),
                    "uraian_kanwil_djkn": row.get('Uraian Kanwil DJKN'),
                    
                    # Satker & Unit
                    "kode_satker": str(row.get('Kode Satker', '')) if row.get('Kode Satker') else None, 
                    "nama_satker": row.get('Nama Satker'),
                    "nama_kl": row.get('Nama K/L'),
                    "nama_e1": row.get('Nama E1'),
                    "nama_korwil": row.get('Nama Korwil'),
                    "kode_register": reg,
                    
                    # Kendaraan
                    "jenis_identitas": row.get('Jenis Identitas'),
                    "no_identitas": str(row.get('No Identitas', '')) if row.get('No Identitas') else None,
                    "no_stnk": str(row.get('No STNK', '')) if row.get('No STNK') else None,
                    "nama_pengguna": row.get('Nama Pengguna'),
                    "status_pmk": row.get('Status PMK'),
                    
                    # System fields
                    "status_aset": "Aktif", 
                    "stok": 1, 
                    "updated_at": datetime.now(timezone.utc)
                }
                
                result = await db.barang.update_one(dup_query, {"$set": item_data}, upsert=True)
                if result.upserted_id: count_inserted += 1
                else: count_updated += 1
                count_processed += 1
            except Exception as e: 
                print(f"Error processing row {index}: {e}")
                continue
        return {"message": "Import selesai", "processed": count_processed, "inserted": count_inserted, "updated": count_updated, "note": "Data duplikat telah ditimpa (overwrite)."}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.get("/template")
async def download_template_aset_tetap(current_user: str = Depends(get_current_user)):
    """Download template Excel untuk import Aset Tetap (format SIMAN)"""
    # Define all columns based on SIMAN format
    columns = [
        "No", "Jenis BMN", "Kode Satker", "Nama Satker", "Kode Barang", "NUP", "Nama Barang",
        "Status BMN", "Merk", "Tipe", "Kondisi", "Umur Aset", "Intra / Extra", "Henti Guna",
        "Status SBSN", "Status BMN Idle", "Status Kemitraan", "BPYBDS", "Usulan Barang Hilang",
        "Usulan Barang RB", "Usul Hapus", "Hibah", "DKTP", "Konsensi", "Jasa Properti", "Investasi",
        "Jenis Dokumen", "No Dokumen", "No BPKP", "No Polisi", "Status Sertifikasi", "Jenis Sertipikat",
        "No Sertifikat", "Nama", "Tanggal Buku Pertama", "Tanggal Perolehan", "Tanggal Pengapusan",
        "Nilai Perolehan Pertama", "Nilai Mutasi", "Nilai Perolehan", "Nilai Penyusutan", "Nilai Buku",
        "Luas Tanah Seluruhnya", "Luas Tanah Untuk Bangunan", "Luas Tanah Untuk Sarana Lingkungan",
        "Luas Lahan Kosong", "Luas Bangunan", "Luas Tapak Bangunan", "Luas Pemanfataan", "Jumlah Lantai",
        "Jumlah Foto", "Status Penggunaan", "No PSP", "Tanggal PSP", "Alamat", "RT/RW", "Kelurahan/Desa",
        "Kecamatan", "Kab/Kota", "Kode Kab/Kota", "Provinsi", "Kode Provinsi", "Kode Pos", "SBSK",
        "Optimalisasi", "Penghuni", "Pengguna", "Kode KPKNL", "Uraian KPKNL", "Uraian Kanwil DJKN",
        "Nama K/L", "Nama E1", "Nama Korwil", "Kode Register", "Lokasi", "Ruang", "Jenis Identitas",
        "No Identitas", "No STNK", "Nama Pengguna", "Status PMK"
    ]
    
    # Create sample data
    sample_data = {col: [] for col in columns}
    sample_row = {
        "No": 1,
        "Jenis BMN": "TANAH",
        "Kode Satker": "123456",
        "Nama Satker": "Satker Contoh",
        "Kode Barang": "2.01.01.01.001",
        "NUP": "1",
        "Nama Barang": "Tanah Bangunan Kantor",
        "Status BMN": "Aktif",
        "Merk": "-",
        "Tipe": "-",
        "Kondisi": "Baik",
        "Umur Aset": "",
        "Intra / Extra": "Intra",
        "Henti Guna": "Tidak",
        "Status SBSN": "Tidak",
        "Status BMN Idle": "Tidak",
        "Status Kemitraan": "Tidak",
        "BPYBDS": "",
        "Usulan Barang Hilang": "Tidak",
        "Usulan Barang RB": "Tidak",
        "Usul Hapus": "Tidak",
        "Hibah": "",
        "DKTP": "",
        "Konsensi": "",
        "Jasa Properti": "",
        "Investasi": "",
        "Jenis Dokumen": "Kontrak",
        "No Dokumen": "DOC/2024/001",
        "No BPKP": "",
        "No Polisi": "",
        "Status Sertifikasi": "Sudah",
        "Jenis Sertipikat": "SHM",
        "No Sertifikat": "12345",
        "Nama": "",
        "Tanggal Buku Pertama": "2024-01-01",
        "Tanggal Perolehan": "2024-01-01",
        "Tanggal Pengapusan": "",
        "Nilai Perolehan Pertama": 1000000000,
        "Nilai Mutasi": 0,
        "Nilai Perolehan": 1000000000,
        "Nilai Penyusutan": 0,
        "Nilai Buku": 1000000000,
        "Luas Tanah Seluruhnya": 1000,
        "Luas Tanah Untuk Bangunan": 500,
        "Luas Tanah Untuk Sarana Lingkungan": 300,
        "Luas Lahan Kosong": 200,
        "Luas Bangunan": 400,
        "Luas Tapak Bangunan": 400,
        "Luas Pemanfataan": 1000,
        "Jumlah Lantai": 2,
        "Jumlah Foto": 0,
        "Status Penggunaan": "Digunakan Sendiri",
        "No PSP": "PSP/2024/001",
        "Tanggal PSP": "2024-01-15",
        "Alamat": "Jl. Contoh No. 1",
        "RT/RW": "001/002",
        "Kelurahan/Desa": "Kelurahan Contoh",
        "Kecamatan": "Kecamatan Contoh",
        "Kab/Kota": "Jakarta Pusat",
        "Kode Kab/Kota": "3171",
        "Provinsi": "DKI Jakarta",
        "Kode Provinsi": "31",
        "Kode Pos": "10110",
        "SBSK": "",
        "Optimalisasi": "",
        "Penghuni": "",
        "Pengguna": "",
        "Kode KPKNL": "",
        "Uraian KPKNL": "",
        "Uraian Kanwil DJKN": "",
        "Nama K/L": "Kementerian Contoh",
        "Nama E1": "Eselon 1 Contoh",
        "Nama Korwil": "",
        "Kode Register": "REG001",
        "Lokasi": "Gedung A",
        "Ruang": "Lantai 1",
        "Jenis Identitas": "",
        "No Identitas": "",
        "No STNK": "",
        "Nama Pengguna": "",
        "Status PMK": ""
    }
    
    for col in columns:
        sample_data[col].append(sample_row.get(col, ""))
    
    df = pd.DataFrame(sample_data)
    
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Data Aset Tetap', index=False)
        
        # Auto-adjust column widths
        worksheet = writer.sheets['Data Aset Tetap']
        for idx, col in enumerate(df.columns):
            max_length = max(len(str(col)), 12)
            worksheet.column_dimensions[chr(65 + idx % 26) if idx < 26 else chr(64 + idx // 26) + chr(65 + idx % 26)].width = max_length + 2
    
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': 'attachment; filename=Template_Import_Aset_Tetap_SIMAN.xlsx'}
    )

@router.get("/pdf")
async def download_barang_pdf(
    search: Optional[str] = None,
    filter_kode: Optional[str] = None,
    filter_nama: Optional[str] = None,
    filter_merk: Optional[str] = None,
    filter_kondisi: Optional[str] = None,
    filter_lokasi: Optional[str] = None,
    filter_nup: Optional[str] = None,
    filter_golongan: Optional[str] = None,
    ids: Optional[str] = None, 
    all_selected: bool = False,
    current_user: str = Depends(get_current_user)
):
    query = {}
    if ids and not all_selected:
        id_list = [ObjectId(i) for i in ids.split(",") if ObjectId.is_valid(i)]
        if id_list: query["_id"] = {"$in": id_list}
    else:
        if search:
            query["$or"] = [
                {"nama_barang": {"$regex": search, "$options": "i"}},
                {"kode_barang": {"$regex": search, "$options": "i"}}
            ]
        if filter_kode: query["kode_barang"] = {"$regex": filter_kode, "$options": "i"}
        if filter_nama: query["nama_barang"] = {"$regex": filter_nama, "$options": "i"}
        if filter_merk: query["merk"] = {"$regex": filter_merk, "$options": "i"}
        if filter_kondisi: query["kondisi"] = filter_kondisi
        if filter_lokasi: query["lokasi_fisik"] = {"$regex": filter_lokasi, "$options": "i"}
        if filter_nup: query["nup"] = {"$regex": filter_nup, "$options": "i"}
        if filter_golongan: query["golongan_barang"] = {"$regex": filter_golongan, "$options": "i"}
    
    collation = {'locale': 'en_US', 'numericOrdering': True}
    cursor = db.barang.find(query).collation(collation).sort([("golongan_barang", 1), ("kode_barang", 1), ("nup", 1)]).limit(5000)
    items = await cursor.to_list(None)
    if not items: raise HTTPException(status_code=404, detail="No data found for PDF")
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=20, leftMargin=20, topMargin=30, bottomMargin=30)
    elements = []
    styles = getSampleStyleSheet()
    style_normal = styles['Normal']; style_normal.fontSize = 8
    style_header = styles['Heading3']; style_header.fontSize = 10
    
    elements.append(Paragraph("LAPORAN DAFTAR ASET (BMN)", styles['Title']))
    elements.append(Paragraph(f"Tanggal Cetak: {datetime.now().strftime('%d %B %Y')}", styles['Normal']))
    elements.append(Spacer(1, 15))
    
    col_widths = [0.8*cm, 3*cm, 1.2*cm, 8*cm, 4.5*cm, 1.5*cm, 3*cm, 3*cm]
    headers = ["No", "Kode", "NUP", "Nama", "Merk/Tipe", "Kond", "Perolehan", "Buku"]
    
    # Header Row
    header_row = [Paragraph(h, styles['Normal']) for h in headers]
    
    current_gol = None; table_data = []; total_asset_value = 0; total_items = len(items); idx = 1
    
    for item in items:
        try:
            gol = item.get('golongan_barang', 'Tanpa Golongan')
            if gol != current_gol:
                if table_data:
                    t = Table(table_data, colWidths=col_widths, repeatRows=1)
                    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.Color(0.1,0.2,0.4)), ('TEXTCOLOR',(0,0),(-1,0),colors.white), ('GRID',(0,0),(-1,-1),0.5,colors.lightgrey)]))
                    elements.append(t); elements.append(Spacer(1, 10)); table_data = []
                elements.append(Paragraph(f"<b>{html.escape(str(gol))}</b>", style_header))
                table_data.append(header_row)
                current_gol = gol
            
            merk_tipe_str = f"{item.get('merk', '')} {item.get('tipe', '')}".strip()
            val_buku = item.get('nilai_buku', 0)
            total_asset_value += val_buku
            
            row = [
                str(idx),
                Paragraph(html.escape(str(item.get('kode_barang',''))), style_normal),
                html.escape(str(item.get('nup',''))),
                Paragraph(html.escape(str(item.get('nama_barang',''))), style_normal),
                Paragraph(html.escape(str(merk_tipe_str)), style_normal),
                html.escape(str(item.get('kondisi',''))),
                f"{item.get('nilai_perolehan',0):,.0f}",
                f"{val_buku:,.0f}"
            ]
            table_data.append(row); idx += 1
        except: continue
        
    if table_data:
        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.Color(0.1,0.2,0.4)), ('TEXTCOLOR',(0,0),(-1,0),colors.white), ('GRID',(0,0),(-1,-1),0.5,colors.lightgrey)]))
        elements.append(t)
        
    doc.build(elements); buffer.seek(0)
    return StreamingResponse(buffer, headers={'Content-Disposition': 'attachment; filename="Laporan_Aset.pdf"'}, media_type='application/pdf')

# --- UPDATED BULK DELETE ---
@router.post("/bulk-delete")
async def bulk_delete_barang(
    payload: BulkDeleteRequest,
    current_user: str = Depends(get_current_user)
):
    ids = payload.ids
    select_all_mode = payload.select_all_mode
    search = payload.search
    filters = payload.filters
    
    query = {}
    if select_all_mode:
        if search: query["$or"] = [{"nama_barang": {"$regex": search, "$options": "i"}}, {"kode_barang": {"$regex": search, "$options": "i"}}, {"nup": {"$regex": search, "$options": "i"}}]
        if filters:
            if filters.get('kode'): query["kode_barang"] = {"$regex": filters['kode'], "$options": "i"}
            if filters.get('nama'): query["nama_barang"] = {"$regex": filters['nama'], "$options": "i"}
            if filters.get('merk'): query["merk"] = {"$regex": filters['merk'], "$options": "i"}
            if filters.get('kondisi'): query["kondisi"] = filters['kondisi']
            if filters.get('lokasi'): query["lokasi_fisik"] = {"$regex": filters['lokasi'], "$options": "i"}
            if filters.get('nup'): query["nup"] = {"$regex": filters['nup'], "$options": "i"}
            if filters.get('golongan'): query["golongan_barang"] = {"$regex": filters['golongan'], "$options": "i"}
        result = await db.barang.delete_many(query)
    else:
        if not ids: raise HTTPException(status_code=400, detail="No IDs provided")
        obj_ids = [ObjectId(i) for i in ids if ObjectId.is_valid(i)]
        result = await db.barang.delete_many({"_id": {"$in": obj_ids}})
    return {"message": f"Berhasil menghapus {result.deleted_count} data."}

# ... (Create/Update/Delete endpoints same as before) ...
@router.post("", response_model=Barang)
async def create_barang(barang_in: BarangCreate, current_user: str = Depends(get_current_user)):
    barang_in.kode_barang = clean_code_str(barang_in.kode_barang)
    barang_in.nup = clean_code_str(barang_in.nup)
    if barang_in.tgl_perolehan and not barang_in.tahun_anggaran: barang_in.tahun_anggaran = barang_in.tgl_perolehan[:4]
    existing = await db.barang.find_one({"kode_barang": barang_in.kode_barang, "nup": barang_in.nup})
    if existing: raise HTTPException(status_code=400, detail="Barang exists")
    if not barang_in.golongan_barang: barang_in.golongan_barang = await get_golongan_uraian(barang_in.kode_barang)
    new_data = barang_in.dict()
    new_data['source'] = 'manual'
    if (new_data['kode_barang'].startswith('1')):
        raise HTTPException(status_code=400, detail="Kode Barang berawalan '1' adalah Persediaan (Aset Lancar). Tidak boleh diinput sebagai Aset Tetap.")
    
    # Ensure detail_lainnya and tgl_buku are properly set from Pydantic model
    if barang_in.tgl_buku:
        new_data['tgl_buku'] = barang_in.tgl_buku
    if barang_in.detail_lainnya:
        new_data['detail_lainnya'] = barang_in.detail_lainnya
        
    new_barang = Barang(**new_data)
    result = await db.barang.insert_one(new_barang.model_dump(by_alias=True, exclude=["id"]))
    return await db.barang.find_one({"_id": result.inserted_id})

@router.put("/{id}", response_model=Barang)
async def update_barang(id: str, barang_update: BarangCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    if barang_update.kode_barang: barang_update.kode_barang = clean_code_str(barang_update.kode_barang)
    if barang_update.nup: barang_update.nup = clean_code_str(barang_update.nup)
    if barang_update.kode_barang and not barang_update.golongan_barang: barang_update.golongan_barang = await get_golongan_uraian(barang_update.kode_barang)
    if barang_update.tgl_perolehan: barang_update.tahun_anggaran = barang_update.tgl_perolehan[:4]
    update_data = barang_update.dict(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc)
    res = await db.barang.find_one_and_update({"_id": ObjectId(id)}, {"$set": update_data}, return_document=True)
    if not res: raise HTTPException(status_code=404)
    return res

@router.patch("/{id}/status")
async def update_barang_status(id: str, status_data: dict = Body(...), current_user: str = Depends(get_current_user)):
    """Update only the status_aset field of a barang item"""
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid ID")
    
    new_status = status_data.get("status_aset")
    if new_status not in ["Aktif", "Non Aktif", "Dipinjamkan"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
    
    update_data = {
        "status_aset": new_status,
        "updated_at": datetime.now(timezone.utc)
    }
    
    res = await db.barang.find_one_and_update(
        {"_id": ObjectId(id)}, 
        {"$set": update_data}, 
        return_document=True
    )
    
    if not res: raise HTTPException(status_code=404, detail="Barang not found")
    return {"message": "Status updated", "status_aset": new_status}

@router.delete("/{id}")
async def delete_barang(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    res = await db.barang.delete_one({"_id": ObjectId(id)})
    if res.deleted_count == 0: raise HTTPException(status_code=404)
    return {"message": "Deleted"}

@router.get("/export")
async def export_barang_excel(
    search: Optional[str] = None, filter_kode: Optional[str] = None, filter_nama: Optional[str] = None,
    filter_merk: Optional[str] = None, filter_kondisi: Optional[str] = None, filter_lokasi: Optional[str] = None,
    filter_nup: Optional[str] = None, ids: Optional[str] = None, all_selected: bool = False,
    current_user: str = Depends(get_current_user)
):
    query = {}
    if ids and not all_selected:
        id_list = [ObjectId(i) for i in ids.split(",") if ObjectId.is_valid(i)]
        if id_list: query["_id"] = {"$in": id_list}
    else:
        if search: query["$or"] = [{"nama_barang": {"$regex": search, "$options": "i"}}, {"kode_barang": {"$regex": search, "$options": "i"}}]
        if filter_kode: query["kode_barang"] = {"$regex": filter_kode, "$options": "i"}
        # ...
    cursor = db.barang.find(query).limit(50000)
    items = await cursor.to_list(None)
    items = sanitize_json(items)
    if not items: raise HTTPException(status_code=404, detail="No data")
    data_list = []
    for item in items:
        row = {
            "Golongan": item.get('golongan_barang'), "Kode Barang": item.get('kode_barang'),
            "NUP": item.get('nup'), "Nama Barang": item.get('nama_barang'),
            "Merk": item.get('merk'), "Tipe": item.get('tipe'),
            "Kondisi": item.get('kondisi'), "Stok": item.get('stok'),
            "Nilai Perolehan": item.get('nilai_perolehan'), "Nilai Buku": item.get('nilai_buku'),
            "Lokasi": item.get('lokasi_fisik'), "Tahun Anggaran": item.get('tahun_anggaran')
        }
        if item.get('detail_lainnya'): row.update(item.get('detail_lainnya'))
        data_list.append(row)
    df = pd.DataFrame(data_list)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer: df.to_excel(writer, index=False)
    output.seek(0)
    return StreamingResponse(output, headers={'Content-Disposition': 'attachment; filename="Export.xlsx"'}, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@router.get("/summary/stats")
async def get_barang_stats(current_user: str = Depends(get_current_user)):
    pipeline = [{"$group": {"_id": None, "total_items": {"$sum": 1}, "total_value": {"$sum": "$nilai_perolehan"}, "critical_stock": {"$sum": {"$cond": [{"$lte": ["$stok", 0]}, 1, 0]}}}}]
    result = await db.barang.aggregate(pipeline).to_list(1)
    if not result: return {"total_items": 0, "total_value": 0, "critical_stock": 0}
    return result[0]

@router.post("/{id}/upload-fotos")
async def upload_fotos(
    id: str,
    files: List[UploadFile] = File(...),
    keterangan: Optional[str] = Body(""),
    current_user: str = Depends(get_current_user)
):
    # 1. Check Rate Limit
    config = await db.system_settings.find_one({"key": "general"})
    if not config:
        config = {"monthly_upload_limit": 500, "current_month": datetime.now(timezone.utc).strftime("%Y-%m"), "current_month_count": 0}
        await db.system_settings.insert_one(config)
    
    current_month_str = datetime.now(timezone.utc).strftime("%Y-%m")
    
    # Auto-reset if month changed
    if config.get("current_month") != current_month_str:
        config["current_month"] = current_month_str
        config["current_month_count"] = 0
        await db.system_settings.update_one({"key": "general"}, {"$set": {"current_month": current_month_str, "current_month_count": 0}})
    
    # 3. Process each file
    new_fotos = []
    errors = []
    
    for file in files:
        try:
            # Validate image
            if not file.content_type.startswith("image/"):
                errors.append(f"{file.filename}: Not an image")
                continue

            # Process with centralized processor (handles compression & saving)
            # Reset cursor just in case
            await file.seek(0)
            result = await process_image_upload(file, "barang", db)
            
            # Result contains relative paths like "barang/xyz.jpg"
            # We need full API URLs
            
            new_fotos.append({
                "url": f"/api/uploads/{result['optimized']}",
                "is_thumbnail": False,
                "keterangan": keterangan,
                "uploaded_at": datetime.now(timezone.utc)
            })
            
        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")
            continue

    if not new_fotos and errors:
        raise HTTPException(status_code=500, detail=f"Failed to upload: {'; '.join(errors)}")

    # 4. Update Counter
    if new_fotos:
        await db.system_settings.update_one(
            {"key": "general"},
            {"$inc": {"current_month_count": len(new_fotos)}}
        )
    
    # 5. Update Barang Record
    # If no photos existed before, make first one thumbnail
    item = await db.barang.find_one({"_id": ObjectId(id)})
    if not item.get("fotos") and new_fotos:
        new_fotos[0]["is_thumbnail"] = True
        
    if new_fotos:
        await db.barang.update_one(
            {"_id": ObjectId(id)},
            {"$push": {"fotos": {"$each": new_fotos}}}
        )
        
    return {"message": "Uploaded", "fotos": new_fotos, "errors": errors}

@router.put("/{id}/set-thumbnail")
async def set_thumbnail(id: str, payload: dict = Body(...), current_user: str = Depends(get_current_user)):
    url = payload.get("url")
    if not url: raise HTTPException(status_code=400)
    
    # Unset all
    await db.barang.update_one(
        {"_id": ObjectId(id), "fotos.is_thumbnail": True},
        {"$set": {"fotos.$.is_thumbnail": False}}
    )
    
    # Set specific
    await db.barang.update_one(
        {"_id": ObjectId(id), "fotos.url": url},
        {"$set": {"fotos.$.is_thumbnail": True}}
    )
    return {"message": "Thumbnail updated"}

@router.delete("/{id}/foto")
async def delete_foto(id: str, payload: dict = Body(...), current_user: str = Depends(get_current_user)):
    url = payload.get("url")
    await db.barang.update_one(
        {"_id": ObjectId(id)},
        {"$pull": {"fotos": {"url": url}}}
    )
    # Ideally delete file from disk too
    try:
        file_path = f"/app{url}"
        if os.path.exists(file_path): os.remove(file_path)
    except: pass
    return {"message": "Foto deleted"}

@router.put("/{id}/foto-metadata")
async def update_foto_metadata(id: str, payload: dict = Body(...), current_user: str = Depends(get_current_user)):
    url = payload.get("url")
    keterangan = payload.get("keterangan")
    
    await db.barang.update_one(
        {"_id": ObjectId(id), "fotos.url": url},
        {"$set": {"fotos.$.keterangan": keterangan}}
    )
    return {"message": "Updated"}