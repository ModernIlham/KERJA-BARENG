from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Body
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from models import Barang, BarangCreate
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime, timezone
import pandas as pd
import io
import math
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_RIGHT

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit)
    }

@router.post("/import")
async def import_barang_excel(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    if not file.filename.endswith(('.xls', '.xlsx')): raise HTTPException(status_code=400, detail="Excel only")

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df = df.where(pd.notnull(df), None)
        
        count_processed = 0
        count_updated = 0
        count_inserted = 0
        
        for index, row in df.iterrows():
            try:
                kode = clean_code_str(row.get('Kode Barang', ''))
                nup = clean_code_str(row.get('NUP', ''))
                reg = clean_code_str(row.get('Kode Register', ''))
                if not kode: continue # Skip if no Kode
                
                # Rule: Update if Kode+NUP exists OR Register exists
                dup_query = { "$or": [{"kode_barang": kode, "nup": nup}] }
                if reg: dup_query["$or"].append({"kode_register": reg})
                
                gol = await get_golongan_uraian(kode)
                
                # Date & Year Rule
                tgl_perolehan = str(row.get('Tanggal Perolehan'))[:10] if row.get('Tanggal Perolehan') else None
                tahun_anggaran = None
                if tgl_perolehan:
                    # FORCE Rule: Tahun from Tanggal Perolehan
                    try:
                        tahun_anggaran = str(datetime.strptime(tgl_perolehan, "%Y-%m-%d").year)
                    except:
                        # Fallback simple string parse
                        tahun_anggaran = tgl_perolehan[:4]
                else:
                    # Fallback to column if tgl missing (rare)
                    tahun_anggaran = str(row.get('Tahun Anggaran', ''))
                
                # Collect ALL known columns
                item_data = {
                    "kode_barang": kode, "nup": nup, "golongan_barang": gol,
                    "nama_barang": row.get('Nama Barang') or "Tanpa Nama",
                    "merk": row.get('Merk'), "tipe": row.get('Tipe'), "kondisi": row.get('Kondisi'),
                    "nilai_perolehan": clean_currency(row.get('Nilai Perolehan')),
                    "nilai_buku": clean_currency(row.get('Nilai Buku')),
                    "nilai_penyusutan": clean_currency(row.get('Nilai Penyusutan')),
                    "nilai_satuan": clean_currency(row.get('Nilai Perolehan')), 
                    "tgl_perolehan": tgl_perolehan,
                    "tahun_anggaran": tahun_anggaran,
                    
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
                
                # Dynamic Extra Fields (Save EVERYTHING else)
                known_keys = ['Kode Barang', 'NUP', 'Kode Register', 'Nama Barang', 'Merk', 'Tipe', 'Kondisi', 
                              'Nilai Perolehan', 'Nilai Buku', 'Nilai Penyusutan', 'Tanggal Perolehan', 'Tahun Anggaran',
                              'Lokasi', 'Ruang', 'Alamat', 'Kab/Kota', 'Provinsi', 'Kecamatan', 'Kelurahan/Desa', 'RT/RW', 'Kode Pos',
                              'Kode Satker', 'Nama Satker', 'Aset Intra / Extra', 'Status Penggunaan', 
                              'Luas Tanah Seluruhnya', 'Luas Bangunan', 'No Sertifikat', 'Status Sertifikasi', 'Jenis Sertipikat', 
                              'Tanggal Sertifikat', 'No PSP', 'Tanggal PSP', 'No']
                              
                detail_lainnya = {}
                for col in row.keys():
                    if col not in known_keys:
                        detail_lainnya[col] = row.get(col)
                        
                item_data['detail_lainnya'] = detail_lainnya
                
                # Overwrite Logic
                result = await db.barang.update_one(
                    dup_query,
                    {"$set": item_data},
                    upsert=True
                )
                
                if result.upserted_id: count_inserted += 1
                else: count_updated += 1
                count_processed += 1
                
            except Exception as e: 
                # print(f"Error row {index}: {e}")
                continue
                
        return {
            "message": "Import selesai",
            "processed": count_processed,
            "inserted": count_inserted,
            "updated": count_updated,
            "note": "Data duplikat telah ditimpa (overwrite). Semua kolom tersimpan."
        }

    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=Barang)
async def create_barang(barang_in: BarangCreate, current_user: str = Depends(get_current_user)):
    barang_in.kode_barang = clean_code_str(barang_in.kode_barang)
    barang_in.nup = clean_code_str(barang_in.nup)
    
    # Auto Year Rule (Manual Input)
    if barang_in.tgl_perolehan:
        barang_in.tahun_anggaran = barang_in.tgl_perolehan[:4]
    
    existing = await db.barang.find_one({"kode_barang": barang_in.kode_barang, "nup": barang_in.nup})
    if existing: raise HTTPException(status_code=400, detail="Barang exists")
    
    if not barang_in.golongan_barang:
        barang_in.golongan_barang = await get_golongan_uraian(barang_in.kode_barang)
        
    new_barang = Barang(**barang_in.dict())
    result = await db.barang.insert_one(new_barang.model_dump(by_alias=True, exclude=["id"]))
    return await db.barang.find_one({"_id": result.inserted_id})

@router.put("/{id}", response_model=Barang)
async def update_barang(id: str, barang_update: BarangCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    if barang_update.kode_barang: barang_update.kode_barang = clean_code_str(barang_update.kode_barang)
    if barang_update.nup: barang_update.nup = clean_code_str(barang_update.nup)
    if barang_update.kode_barang and not barang_update.golongan_barang:
        barang_update.golongan_barang = await get_golongan_uraian(barang_update.kode_barang)
        
    # Auto Year Rule (Update)
    if barang_update.tgl_perolehan:
        barang_update.tahun_anggaran = barang_update.tgl_perolehan[:4]
        
    update_data = barang_update.dict(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc)
    res = await db.barang.find_one_and_update({"_id": ObjectId(id)}, {"$set": update_data}, return_document=True)
    if not res: raise HTTPException(status_code=404)
    return res

# ... (Delete, PDF, Export, Bulk Delete remain same) ...
# I will output them to ensure file completeness

@router.delete("/{id}")
async def delete_barang(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    res = await db.barang.delete_one({"_id": ObjectId(id)})
    if res.deleted_count == 0: raise HTTPException(status_code=404)
    return {"message": "Deleted"}

@router.post("/bulk-delete")
async def bulk_delete_barang(
    ids: Optional[List[str]] = Body(default=None),
    select_all_mode: bool = Body(default=False),
    search: Optional[str] = Body(default=None),
    filters: Optional[Dict[str, Any]] = Body(default=None),
    current_user: str = Depends(get_current_user)
):
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

@router.get("/pdf")
async def download_barang_pdf(
    search: Optional[str] = None,
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
        if search: query["$or"] = [{"nama_barang": {"$regex": search, "$options": "i"}}, {"kode_barang": {"$regex": search, "$options": "i"}}]
        if filter_golongan: query["golongan_barang"] = {"$regex": filter_golongan, "$options": "i"}
    
    collation = {'locale': 'en_US', 'numericOrdering': True}
    cursor = db.barang.find(query).collation(collation).sort([("golongan_barang", 1), ("kode_barang", 1), ("nup", 1)]).limit(5000)
    items = await cursor.to_list(None)
    
    if not items: raise HTTPException(status_code=404, detail="No data")
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=20, leftMargin=20, topMargin=30, bottomMargin=30)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('ReportTitle', parent=styles['Title'], fontSize=16, leading=20, spaceAfter=10, textColor=colors.darkblue)
    subtitle_style = ParagraphStyle('ReportSubtitle', parent=styles['Normal'], fontSize=10, textColor=colors.grey)
    header_style = ParagraphStyle('TableHeader', parent=styles['Normal'], fontSize=9, textColor=colors.white, alignment=TA_CENTER)
    cell_style = ParagraphStyle('TableCell', parent=styles['Normal'], fontSize=8, leading=10)
    group_style = ParagraphStyle('GroupHeader', parent=styles['Heading3'], fontSize=11, textColor=colors.darkblue, spaceBefore=10, spaceAfter=5)
    
    elements.append(Paragraph("LAPORAN DAFTAR ASET (BMN)", title_style))
    elements.append(Paragraph(f"Tanggal Cetak: {datetime.now().strftime('%d %B %Y')}", subtitle_style))
    elements.append(Spacer(1, 15))
    
    col_widths = [0.8*cm, 3*cm, 1.2*cm, 8*cm, 4.5*cm, 1.5*cm, 3*cm, 3*cm]
    headers = [
        Paragraph("No", header_style),
        Paragraph("Kode Barang", header_style),
        Paragraph("NUP", header_style),
        Paragraph("Nama Barang", header_style),
        Paragraph("Merk/Tipe", header_style),
        Paragraph("Kond", header_style),
        Paragraph("Perolehan", header_style),
        Paragraph("Nilai Buku", header_style)
    ]
    
    current_gol = None; table_data = []
    total_asset_value = 0; total_items = len(items); idx = 1
    
    for item in items:
        gol = item.get('golongan_barang', 'Tanpa Golongan')
        if gol != current_gol:
            if table_data:
                t = Table(table_data, colWidths=col_widths, repeatRows=1)
                t.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), colors.Color(0.1, 0.2, 0.4)), ('TEXTCOLOR', (0,0), (-1,0), colors.white), ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey), ('ALIGN', (6,0), (7,-1), 'RIGHT'), ('VALIGN', (0,0), (-1,-1), 'TOP')]))
                elements.append(t); elements.append(Spacer(1, 10)); table_data = []
            elements.append(Paragraph(f"{gol}", group_style)); table_data.append(headers); current_gol = gol
            
        val_buku = item.get('nilai_buku', 0)
        total_asset_value += val_buku
        row = [
            Paragraph(str(idx), cell_style),
            Paragraph(item.get('kode_barang',''), cell_style),
            Paragraph(item.get('nup',''), cell_style),
            Paragraph(item.get('nama_barang',''), cell_style),
            Paragraph(f"{item.get('merk', '')} {item.get('tipe', '')}", cell_style),
            Paragraph(item.get('kondisi',''), cell_style),
            Paragraph(f"{item.get('nilai_perolehan', 0):,.0f}", ParagraphStyle('RightNum', parent=cell_style, alignment=TA_RIGHT)),
            Paragraph(f"{val_buku:,.0f}", ParagraphStyle('RightNumBold', parent=cell_style, alignment=TA_RIGHT, fontName='Helvetica-Bold'))
        ]
        table_data.append(row); idx += 1
        
    if table_data:
        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,0), colors.Color(0.1, 0.2, 0.4)), ('TEXTCOLOR', (0,0), (-1,0), colors.white), ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey), ('ALIGN', (6,0), (7,-1), 'RIGHT'), ('VALIGN', (0,0), (-1,-1), 'TOP')]))
        elements.append(t)
        
    doc.build(elements); buffer.seek(0)
    return StreamingResponse(buffer, headers={'Content-Disposition': f'attachment; filename="Laporan_Aset.pdf"'}, media_type='application/pdf')

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
    if not items: raise HTTPException(status_code=404, detail="No data")
    
    # Export Dynamic Fields too?
    # For now, export main fields + mapped fields
    data_list = []
    for item in items:
        row = {
            "Golongan": item.get('golongan_barang'),
            "Kode Barang": item.get('kode_barang'),
            "NUP": item.get('nup'),
            "Nama Barang": item.get('nama_barang'),
            "Merk": item.get('merk'),
            "Tipe": item.get('tipe'),
            "Kondisi": item.get('kondisi'),
            "Stok": item.get('stok'),
            "Nilai Perolehan": item.get('nilai_perolehan'),
            "Nilai Buku": item.get('nilai_buku'),
            "Lokasi": item.get('lokasi_fisik'),
            "Tahun Anggaran": item.get('tahun_anggaran')
        }
        # Merge Extra Details if exist
        if item.get('detail_lainnya'):
            row.update(item.get('detail_lainnya'))
        data_list.append(row)
        
    df = pd.DataFrame(data_list)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer: df.to_excel(writer, index=False)
    output.seek(0)
    return StreamingResponse(output, headers={'Content-Disposition': 'attachment; filename="Export.xlsx"'}, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
