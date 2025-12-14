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
import html
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

def sanitize_json(obj):
    """Recursively replace NaN with None for JSON serialization"""
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, dict):
        return {k: sanitize_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_json(v) for v in obj]
    return obj

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
        
    # SANITIZE JSON (Fix NaN error)
    items = sanitize_json(items)
    
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
        # Important: Convert NaN to None for entire DF first
        df = df.where(pd.notnull(df), None)
        
        count_processed = 0; count_updated = 0; count_inserted = 0
        for index, row in df.iterrows():
            try:
                kode = clean_code_str(row.get('Kode Barang', ''))
                nup = clean_code_str(row.get('NUP', ''))
                reg = clean_code_str(row.get('Kode Register', ''))
                if not kode: continue 
                
                # Filter 'nan' strings
                if kode.lower() == 'nan': continue
                if nup.lower() == 'nan': nup = ''
                
                dup_query = { "$or": [{"kode_barang": kode, "nup": nup}] }
                if reg: dup_query["$or"].append({"kode_register": reg})
                
                gol = await get_golongan_uraian(kode)
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
                        # Ensure no NaN in detail
                        if isinstance(val, float) and (math.isnan(val) or math.isinf(val)):
                            val = None
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
    title_style = ParagraphStyle('ReportTitle', parent=styles['Title'], fontSize=16, leading=20, spaceAfter=10, textColor=colors.darkblue)
    subtitle_style = ParagraphStyle('ReportSubtitle', parent=styles['Normal'], fontSize=10, textColor=colors.grey)
    header_style = ParagraphStyle('TableHeader', parent=styles['Normal'], fontSize=9, textColor=colors.white, alignment=TA_CENTER)
    cell_style = ParagraphStyle('TableCell', parent=styles['Normal'], fontSize=8, leading=10)
    group_style = ParagraphStyle('GroupHeader', parent=styles['Heading3'], fontSize=11, textColor=colors.darkblue, spaceBefore=10, spaceAfter=5)
    
    elements.append(Paragraph("LAPORAN DAFTAR ASET (BMN)", title_style))
    elements.append(Paragraph(f"Kementerian/Lembaga: SIMAN-G System", subtitle_style))
    filter_info = f"Filter: {search or filter_golongan or 'Semua'}" if not ids else "Data Terpilih Manual"
    elements.append(Paragraph(f"Tanggal Cetak: {datetime.now().strftime('%d %B %Y')} | {filter_info}", subtitle_style))
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
    
    current_gol = None
    table_data = []
    total_asset_value = 0
    total_items = len(items)
    idx = 1
    
    for item in items:
        try:
            gol = item.get('golongan_barang', 'Tanpa Golongan')
            
            if gol != current_gol:
                if table_data:
                    t = Table(table_data, colWidths=col_widths, repeatRows=1)
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0,0), (-1,0), colors.Color(0.1, 0.2, 0.4)),
                        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
                        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.Color(0.95, 0.95, 0.95)]),
                        ('VALIGN', (0,0), (-1,-1), 'TOP'),
                        ('ALIGN', (6,0), (7,-1), 'RIGHT'),
                        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
                        ('TOPPADDING', (0,0), (-1,-1), 6),
                    ]))
                    elements.append(t)
                    elements.append(Spacer(1, 10))
                    table_data = []
                
                elements.append(Paragraph(f"<b>{html.escape(str(gol))}</b>", group_style))
                table_data.append(headers)
                current_gol = gol
            
            merk_tipe_str = f"{item.get('merk', '')} {item.get('tipe', '')}".strip()
            val_buku = item.get('nilai_buku', 0)
            total_asset_value += val_buku
            
            row = [
                Paragraph(str(idx), cell_style),
                Paragraph(html.escape(str(item.get('kode_barang',''))), cell_style),
                Paragraph(html.escape(str(item.get('nup',''))), cell_style),
                Paragraph(html.escape(str(item.get('nama_barang',''))), cell_style),
                Paragraph(html.escape(str(merk_tipe_str)), cell_style),
                Paragraph(html.escape(str(item.get('kondisi',''))), cell_style),
                Paragraph(f"{item.get('nilai_perolehan',0):,.0f}", ParagraphStyle('RightNum', parent=cell_style, alignment=TA_RIGHT)),
                Paragraph(f"{val_buku:,.0f}", ParagraphStyle('RightNumBold', parent=cell_style, alignment=TA_RIGHT, fontName='Helvetica-Bold'))
            ]
            table_data.append(row)
            idx += 1
        except Exception:
            continue
        
    if table_data:
        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.Color(0.1, 0.2, 0.4)),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.Color(0.95, 0.95, 0.95)]),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ALIGN', (6,0), (7,-1), 'RIGHT'),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('TOPPADDING', (0,0), (-1,-1), 6),
        ]))
        elements.append(t)
        
    elements.append(Spacer(1, 20))
    summary_data = [
        ["Total Item", f"{total_items} Unit"],
        ["Total Nilai Buku", f"Rp {total_asset_value:,.0f}"]
    ]
    st = Table(summary_data, colWidths=[4*cm, 6*cm], hAlign='RIGHT')
    st.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('ALIGN', (0,0), (0,-1), 'RIGHT'),
        ('ALIGN', (1,0), (1,-1), 'LEFT'),
        ('TEXTCOLOR', (0,0), (-1,-1), colors.darkblue),
        ('LINEBELOW', (0,0), (-1,-1), 1, colors.darkblue),
    ]))
    elements.append(st)
        
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        headers={'Content-Disposition': f'attachment; filename="Laporan_Aset_{datetime.now().strftime("%Y%m%d")}.pdf"'},
        media_type='application/pdf'
    )

@router.post("", response_model=Barang)
async def create_barang(barang_in: BarangCreate, current_user: str = Depends(get_current_user)):
    barang_in.kode_barang = clean_code_str(barang_in.kode_barang)
    barang_in.nup = clean_code_str(barang_in.nup)
    
    existing = await db.barang.find_one({"kode_barang": barang_in.kode_barang, "nup": barang_in.nup})
    if existing: raise HTTPException(status_code=400, detail="Barang exists")
    
    if not barang_in.golongan_barang:
        barang_in.golongan_barang = await get_golongan_uraian(barang_in.kode_barang)
        
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
    if barang_update.kode_barang and not barang_update.golongan_barang:
        barang_update.golongan_barang = await get_golongan_uraian(barang_update.kode_barang)
    update_data = barang_update.dict(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc)
    res = await db.barang.find_one_and_update({"_id": ObjectId(id)}, {"$set": update_data}, return_document=True)
    if not res: raise HTTPException(status_code=404)
    return res

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
            # ... apply filters ...
    else:
        if not ids: raise HTTPException(status_code=400, detail="No IDs provided")
        obj_ids = [ObjectId(i) for i in ids if ObjectId.is_valid(i)]
        result = await db.barang.delete_many({"_id": {"$in": obj_ids}})
    return {"message": f"Berhasil menghapus {result.deleted_count} data."}

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
    items = sanitize_json(items) # Sanitize for export too if needed
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
