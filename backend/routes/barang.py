from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
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
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm

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
    """Remove .0 from float-strings (e.g. '301.0' -> '301')"""
    if val is None: return ""
    s = str(val).strip()
    if s.endswith(".0"):
        return s[:-2]
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
    
    # Sort numeric strings properly? For now standard sort
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

@router.post("", response_model=Barang)
async def create_barang(barang_in: BarangCreate, current_user: str = Depends(get_current_user)):
    # Clean Inputs
    barang_in.kode_barang = clean_code_str(barang_in.kode_barang)
    barang_in.nup = clean_code_str(barang_in.nup)
    
    existing = await db.barang.find_one({
        "kode_barang": barang_in.kode_barang,
        "nup": barang_in.nup
    })
    if existing: raise HTTPException(status_code=400, detail="Barang dengan Kode dan NUP tersebut sudah ada")
    
    if not barang_in.golongan_barang:
        barang_in.golongan_barang = await get_golongan_uraian(barang_in.kode_barang)
        
    new_barang = Barang(**barang_in.dict())
    result = await db.barang.insert_one(new_barang.model_dump(by_alias=True, exclude=["id"]))
    created_barang = await db.barang.find_one({"_id": result.inserted_id})
    return created_barang

@router.put("/{id}", response_model=Barang)
async def update_barang(id: str, barang_update: BarangCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    if barang_update.kode_barang: barang_update.kode_barang = clean_code_str(barang_update.kode_barang)
    if barang_update.nup: barang_update.nup = clean_code_str(barang_update.nup)
    
    if barang_update.kode_barang and not barang_update.golongan_barang:
        barang_update.golongan_barang = await get_golongan_uraian(barang_update.kode_barang)
        
    update_data = barang_update.dict(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc)
    result = await db.barang.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$set": update_data},
        return_document=True
    )
    if not result: raise HTTPException(status_code=404)
    return result

@router.post("/import")
async def import_barang_excel(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    if not file.filename.endswith(('.xls', '.xlsx')): raise HTTPException(status_code=400, detail="Excel only")

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df = df.where(pd.notnull(df), None)
        
        count_processed = 0
        count_inserted = 0
        count_skipped = 0
        
        for index, row in df.iterrows():
            try:
                # 1. Map Columns & Clean
                kode = clean_code_str(row.get('Kode Barang', ''))
                nup = clean_code_str(row.get('NUP', ''))
                register_code = clean_code_str(row.get('Kode Register', ''))
                
                # Check empty rows
                if not kode or not nup:
                    continue
                
                # 2. Duplicate Check (Skip logic)
                # Check Kode+NUP OR Register
                dup_query = {
                    "$or": [
                        {"kode_barang": kode, "nup": nup}
                    ]
                }
                if register_code:
                    dup_query["$or"].append({"kode_register": register_code})
                    
                existing = await db.barang.find_one(dup_query)
                if existing:
                    count_skipped += 1
                    continue
                
                # 3. Prepare Data
                golongan_text = await get_golongan_uraian(kode)
                    
                item_data = {
                    "kode_barang": kode,
                    "nup": nup,
                    "golongan_barang": golongan_text, 
                    "nama_barang": row.get('Nama Barang') or "Tanpa Nama",
                    "merk": row.get('Merk'),
                    "tipe": row.get('Tipe'),
                    "kondisi": row.get('Kondisi'),
                    "nilai_perolehan": clean_currency(row.get('Nilai Perolehan')),
                    "nilai_buku": clean_currency(row.get('Nilai Buku')),
                    "nilai_penyusutan": clean_currency(row.get('Nilai Penyusutan')),
                    "nilai_satuan": clean_currency(row.get('Nilai Perolehan')), 
                    "tgl_perolehan": str(row.get('Tanggal Perolehan'))[:10] if row.get('Tanggal Perolehan') else None,
                    "tahun_anggaran": str(row.get('Tahun Anggaran', '')),
                    
                    # Full Data Mapping
                    "lokasi_fisik": row.get('Lokasi'),
                    "ruang": row.get('Ruang'),
                    "alamat": row.get('Alamat'),
                    "kab_kota": row.get('Kab/Kota'),
                    "provinsi": row.get('Provinsi'),
                    "kode_satker": str(row.get('Kode Satker', '')),
                    "nama_satker": row.get('Nama Satker'),
                    "intra_ekstra": row.get('Aset Intra / Extra'),
                    "kode_register": register_code,
                    
                    "status_aset": "Aktif",
                    "stok": 1,
                    "updated_at": datetime.now(timezone.utc)
                }
                
                # 4. Insert (Not Upsert)
                result = await db.barang.insert_one(item_data)
                if result.inserted_id: count_inserted += 1
                
                count_processed += 1
                
            except Exception as e: continue
                
        return {
            "message": "Import selesai",
            "processed": count_processed,
            "inserted": count_inserted,
            "skipped_duplicates": count_skipped
        }

    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{id}")
async def delete_barang(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    result = await db.barang.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0: raise HTTPException(status_code=404)
    return {"message": "Deleted"}

@router.get("/pdf")
async def download_barang_pdf(
    search: Optional[str] = None,
    filter_golongan: Optional[str] = None,
    ids: Optional[str] = None, # Comma separated IDs
    current_user: str = Depends(get_current_user)
):
    query = {}
    
    if ids:
        id_list = [ObjectId(i) for i in ids.split(",") if ObjectId.is_valid(i)]
        if id_list:
            query["_id"] = {"$in": id_list}
    else:
        if search:
            query["$or"] = [
                {"nama_barang": {"$regex": search, "$options": "i"}},
                {"kode_barang": {"$regex": search, "$options": "i"}}
            ]
        if filter_golongan: query["golongan_barang"] = {"$regex": filter_golongan, "$options": "i"}
    
    collation = {'locale': 'en_US', 'numericOrdering': True}
    cursor = db.barang.find(query).collation(collation).sort([("golongan_barang", 1), ("kode_barang", 1), ("nup", 1)]).limit(5000)
    items = await cursor.to_list(None)
    
    if not items: raise HTTPException(status_code=404, detail="No data")
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), rightMargin=20, leftMargin=20, topMargin=20, bottomMargin=20)
    elements = []
    styles = getSampleStyleSheet()
    
    style_normal = styles['Normal']
    style_normal.fontSize = 8
    style_header = styles['Heading3']
    style_header.fontSize = 10
    
    elements.append(Paragraph("DAFTAR MASTER BARANG (BMN)", styles['Title']))
    filter_text = "Data Terpilih" if ids else f"Filter: {search or 'Semua'}"
    elements.append(Paragraph(f"Tanggal Cetak: {datetime.now().strftime('%d-%m-%Y')} | {filter_text}", style_normal))
    elements.append(Spacer(1, 12))
    
    current_gol = None
    table_data = []
    headers = ["No", "Kode Barang", "NUP", "Nama Barang", "Merk/Tipe", "Kondisi", "Perolehan (Rp)", "Nilai Buku (Rp)"]
    col_widths = [0.8*cm, 3*cm, 1.2*cm, 8*cm, 4.5*cm, 1.5*cm, 3*cm, 3*cm]
    
    row_idx = 1
    for item in items:
        gol = item.get('golongan_barang', 'Tanpa Golongan')
        
        if gol != current_gol:
            if table_data:
                t = Table(table_data, colWidths=col_widths, repeatRows=1)
                t.setStyle(TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
                    ('TEXTCOLOR', (0,0), (-1,0), colors.black),
                    ('ALIGN', (0,0), (-1,-1), 'LEFT'),
                    ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0,0), (-1,0), 8),
                    ('BOTTOMPADDING', (0,0), (-1,0), 4),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
                    ('ALIGN', (6,0), (7,-1), 'RIGHT'),
                    ('VALIGN', (0,0), (-1,-1), 'TOP'), 
                ]))
                elements.append(t)
                elements.append(Spacer(1, 12))
                table_data = []
            
            elements.append(Paragraph(f"<b>GOLONGAN: {gol}</b>", style_header))
            table_data.append(headers)
            current_gol = gol
            
        merk_tipe_str = f"{item.get('merk', '')} {item.get('tipe', '')}".strip()
        
        row = [
            str(row_idx),
            item.get('kode_barang', ''),
            item.get('nup', ''),
            Paragraph(item.get('nama_barang', ''), style_normal), 
            Paragraph(merk_tipe_str, style_normal),               
            item.get('kondisi', ''),
            f"{item.get('nilai_perolehan', 0):,.0f}",
            f"{item.get('nilai_buku', 0):,.0f}"
        ]
        table_data.append(row)
        row_idx += 1
        
    if table_data:
        t = Table(table_data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.lightgrey),
            ('TEXTCOLOR', (0,0), (-1,0), colors.black),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,0), 8),
            ('BOTTOMPADDING', (0,0), (-1,0), 4),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('ALIGN', (6,0), (7,-1), 'RIGHT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ]))
        elements.append(t)
        
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        headers={'Content-Disposition': f'attachment; filename="Laporan_Barang_{datetime.now().strftime("%Y%m%d")}.pdf"'},
        media_type='application/pdf'
    )

@router.get("/export")
async def export_barang_excel(
    search: Optional[str] = None,
    filter_kode: Optional[str] = None,
    filter_nama: Optional[str] = None,
    filter_merk: Optional[str] = None,
    filter_kondisi: Optional[str] = None,
    filter_lokasi: Optional[str] = None,
    filter_nup: Optional[str] = None,
    ids: Optional[str] = None, 
    current_user: str = Depends(get_current_user)
):
    query = {}
    
    if ids:
        id_list = [ObjectId(i) for i in ids.split(",") if ObjectId.is_valid(i)]
        if id_list:
            query["_id"] = {"$in": id_list}
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
    
    collation = {'locale': 'en_US', 'numericOrdering': True}
    cursor = db.barang.find(query).collation(collation).sort([("kode_barang", 1), ("nup", 1)]).limit(50000)
    items = await cursor.to_list(None)
    
    if not items: raise HTTPException(status_code=404, detail="No data")
        
    data_list = []
    for item in items:
        data_list.append({
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
        })
        
    df = pd.DataFrame(data_list)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='MasterBarang')
    output.seek(0)
    
    return StreamingResponse(
        output,
        headers={'Content-Disposition': f'attachment; filename="Export_Barang_{datetime.now().strftime("%Y%m%d")}.xlsx"'},
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
