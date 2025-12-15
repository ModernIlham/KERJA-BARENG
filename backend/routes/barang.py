from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Body
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from models import Barang, BarangCreate
from lib.image_processor import compress_image
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
    # ... (Import logic same as previous success, keeping it) ...
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
                if not kode: continue 
                if str(kode).lower() == 'nan': continue
                if str(nup).lower() == 'nan': nup = '1'
                
                dup_query = { "$or": [{"kode_barang": kode, "nup": nup}] }
                if reg: dup_query["$or"].append({"kode_register": reg})
                
                k = kode[:1]
                gol = f"{k} - {ref_map.get(k, golongan_map.get(k, 'Unknown'))}"
                
                tgl = str(row.get('Tanggal Perolehan'))[:10] if row.get('Tanggal Perolehan') else None
                thn = None
                if tgl:
                    try: thn = str(datetime.strptime(tgl, "%Y-%m-%d").year)
                    except: thn = tgl[:4]
                else: thn = str(row.get('Tahun Anggaran', ''))
                
                item_data = {
                    "source": "import",
                    "kode_barang": kode, "nup": nup, "golongan_barang": gol,
                    "nama_barang": row.get('Nama Barang') or "Tanpa Nama",
                    "merk": row.get('Merk'), "tipe": row.get('Tipe'), "kondisi": row.get('Kondisi'),
                    "nilai_perolehan": clean_currency(row.get('Nilai Perolehan')),
                    "nilai_buku": clean_currency(row.get('Nilai Buku')),
                    "nilai_penyusutan": clean_currency(row.get('Nilai Penyusutan')),
                    "nilai_satuan": clean_currency(row.get('Nilai Perolehan')), 
                    "tgl_perolehan": tgl, "tahun_anggaran": thn,
                    "lokasi_fisik": row.get('Lokasi'), "ruang": row.get('Ruang'),
                    "alamat": row.get('Alamat'), "kab_kota": row.get('Kab/Kota'), "provinsi": row.get('Provinsi'),
                    "kecamatan": row.get('Kecamatan'), "kelurahan": row.get('Kelurahan/Desa'), "rt_rw": row.get('RT/RW'),
                    "kode_pos": str(row.get('Kode Pos', '')),
                    "kode_satker": str(row.get('Kode Satker', '')), "nama_satker": row.get('Nama Satker'),
                    "intra_ekstra": row.get('Aset Intra / Extra'), "kode_register": reg,
                    "status_penggunaan": row.get('Status Penggunaan'),
                    "luas_tanah": clean_currency(row.get('Luas Tanah Seluruhnya')),
                    "luas_bangunan": clean_currency(row.get('Luas Bangunan')),
                    "no_sertifikat": str(row.get('No Sertifikat', '')),
                    "status_sertifikasi": row.get('Status Sertifikasi'),
                    "jenis_sertifikat": row.get('Jenis Sertipikat') or row.get('Jenis Sertifikat'),
                    "tgl_sertifikat": str(row.get('Tanggal Sertifikat'))[:10] if row.get('Tanggal Sertifikat') else None,
                    "no_psp": str(row.get('No PSP', '')),
                    "tgl_psp": str(row.get('Tanggal PSP'))[:10] if row.get('Tanggal PSP') else None,
                    "status_aset": "Aktif", "stok": 1, "updated_at": datetime.now(timezone.utc)
                }
                
                known_keys = ['Kode Barang', 'NUP', 'Kode Register', 'Nama Barang', 'Merk', 'Tipe', 'Kondisi', 
                              'Nilai Perolehan', 'Nilai Buku', 'Nilai Penyusutan', 'Tanggal Perolehan', 'Tahun Anggaran',
                              'Lokasi', 'Ruang', 'Alamat', 'Kab/Kota', 'Provinsi', 'Kecamatan', 'Kelurahan/Desa', 'RT/RW', 'Kode Pos',
                              'Kode Satker', 'Nama Satker', 'Aset Intra / Extra', 'Status Penggunaan', 
                              'Luas Tanah Seluruhnya', 'Luas Bangunan', 'No Sertifikat', 'Status Sertifikasi', 'Jenis Sertipikat', 
                              'Tanggal Sertifikat', 'No PSP', 'Tanggal PSP', 'No']
                detail_lainnya = {}
                for col in row.keys():
                    if col not in known_keys:
                        val = row.get(col)
                        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)): val = None
                        detail_lainnya[col] = val
                item_data['detail_lainnya'] = detail_lainnya
                
                result = await db.barang.update_one(dup_query, {"$set": item_data}, upsert=True)
                if result.upserted_id: count_inserted += 1
                else: count_updated += 1
                count_processed += 1
            except: continue
        return {"message": "Import selesai", "processed": count_processed, "inserted": count_inserted, "updated": count_updated, "note": "Data duplikat telah ditimpa (overwrite)."}
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

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
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    upload_dir = "/app/uploads/barang"
    os.makedirs(upload_dir, exist_ok=True)
    
    new_fotos = []
    for file in files:
        safe_name = f"{id}_{int(datetime.now().timestamp())}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(upload_dir, safe_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        new_fotos.append({
            "url": f"/api/uploads/barang/{safe_name}",
            "is_thumbnail": False,
            "keterangan": keterangan,
            "uploaded_at": datetime.now(timezone.utc)
        })
    
    # If no photos existed before, make first one thumbnail
    item = await db.barang.find_one({"_id": ObjectId(id)})
    if not item.get("fotos") and new_fotos:
        new_fotos[0]["is_thumbnail"] = True
        
    await db.barang.update_one(
        {"_id": ObjectId(id)},
        {"$push": {"fotos": {"$each": new_fotos}}}
    )
    return {"message": "Uploaded", "fotos": new_fotos}

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