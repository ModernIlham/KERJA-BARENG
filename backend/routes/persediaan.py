from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Body
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from lib.image_processor import compress_image
from models import Persediaan, PersediaanCreate, TransaksiPersediaan, TransaksiPersediaanCreate
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime, timezone
import pandas as pd
import shutil
import io
import math
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY

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

def sanitize_json(data):
    if isinstance(data, list):
        return [sanitize_json(item) for item in data]
    elif isinstance(data, dict):
        return {k: sanitize_json(v) for k, v in data.items()}
    elif isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, float) and (math.isnan(data) or math.isinf(data)):
        return None
    return data

async def get_golongan_uraian(kode_barang: str):
    if not kode_barang or len(kode_barang) < 1: return None
    prefix = kode_barang[0]
    ref = await db.kodefikasi.find_one({"kode": prefix, "level": 1}, {"_id": 0})
    if ref and 'uraian' in ref:
        return f"{prefix} - {ref['uraian']}"
    return None

# GET - List Persediaan with pagination, filters
@router.get("/", response_model=Dict)
async def get_persediaan(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    filter_kode: Optional[str] = None,
    filter_nama: Optional[str] = None,
    filter_merk: Optional[str] = None,
    filter_kondisi: Optional[str] = None,
    filter_lokasi: Optional[str] = None,
    filter_nup: Optional[str] = None,
    filter_golongan: Optional[str] = None,
    filter_batch: Optional[str] = None,
    sort_by: Optional[str] = "nama_barang",
    sort_order: int = Query(1, ge=-1, le=1),
    current_user: str = Depends(get_current_user)
):
    query = {}
    
    if search:
        query["$or"] = [
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"kode_barang": {"$regex": search, "$options": "i"}},
            {"batch_number": {"$regex": search, "$options": "i"}}
        ]
    
    if filter_kode: query["kode_barang"] = {"$regex": filter_kode, "$options": "i"}
    if filter_nama: query["nama_barang"] = {"$regex": filter_nama, "$options": "i"}
    if filter_merk: query["merk"] = {"$regex": filter_merk, "$options": "i"}
    if filter_kondisi: query["kondisi"] = filter_kondisi
    if filter_lokasi: query["lokasi_fisik"] = {"$regex": filter_lokasi, "$options": "i"}
    if filter_nup: query["nup"] = {"$regex": filter_nup, "$options": "i"}
    if filter_golongan: query["golongan_barang"] = {"$regex": filter_golongan, "$options": "i"}
    if filter_batch: query["batch_number"] = {"$regex": filter_batch, "$options": "i"}
    
    total = await db.persediaan.count_documents(query)
    skip = (page - 1) * limit
    
    cursor = db.persediaan.find(query).sort(sort_by, sort_order).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    items = sanitize_json(items)
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0
    }

# GET - Single Persediaan (placed after specific routes to avoid conflicts)
@router.get("/detail/{id}")
async def get_persediaan_by_id(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid ID")
    item = await db.persediaan.find_one({"_id": ObjectId(id)})
    if not item: raise HTTPException(status_code=404, detail="Not found")
    return sanitize_json(item)

# POST - Create Persediaan
@router.post("/", response_model=Persediaan)
async def create_persediaan(persediaan_in: PersediaanCreate, current_user: str = Depends(get_current_user)):
    persediaan_in.kode_barang = clean_code_str(persediaan_in.kode_barang)
    
    # Validate kode_barang length (should be 16 digits for persediaan)
    if len(persediaan_in.kode_barang) < 16:
        # If only 10 digits provided, auto-generate the last 6 digits
        if len(persediaan_in.kode_barang) == 10:
            # Find max kode_barang with same 10-digit prefix
            prefix = persediaan_in.kode_barang
            pattern = f"^{prefix}"
            max_item = await db.persediaan.find_one(
                {"kode_barang": {"$regex": pattern}},
                sort=[("kode_barang", -1)]
            )
            
            if max_item and len(max_item.get('kode_barang', '')) == 16:
                # Extract last 6 digits and increment
                last_six = max_item['kode_barang'][-6:]
                try:
                    next_num = int(last_six) + 1
                    persediaan_in.kode_barang = f"{prefix}{str(next_num).zfill(6)}"
                except:
                    persediaan_in.kode_barang = f"{prefix}000001"
            else:
                # First item with this prefix
                persediaan_in.kode_barang = f"{prefix}000001"
    
    persediaan_in.nup = clean_code_str(persediaan_in.nup) if persediaan_in.nup else "1"
    
    # Auto-generate NUP for manual entry
    if not persediaan_in.nup or persediaan_in.nup == "1":
        max_item = await db.persediaan.find_one(
            {"kode_barang": persediaan_in.kode_barang},
            sort=[("nup", -1)]
        )
        if max_item and max_item.get('nup'):
            try:
                last_nup = int(max_item['nup'].replace('(Sementara)', '').strip())
                persediaan_in.nup = f"{last_nup + 1} (Sementara)"
            except:
                persediaan_in.nup = "1 (Sementara)"
        else:
            persediaan_in.nup = "1 (Sementara)"
    
    # Auto golongan
    if not persediaan_in.golongan_barang:
        persediaan_in.golongan_barang = await get_golongan_uraian(persediaan_in.kode_barang)
    
    # Extract year from tgl_perolehan
    if persediaan_in.tgl_perolehan and not persediaan_in.tahun_anggaran:
        persediaan_in.tahun_anggaran = persediaan_in.tgl_perolehan[:4]
    
    new_data = persediaan_in.dict()
    new_data['source'] = 'manual'
    new_persediaan = Persediaan(**new_data)
    result = await db.persediaan.insert_one(new_persediaan.model_dump(by_alias=True, exclude=["id"]))
    return await db.persediaan.find_one({"_id": result.inserted_id})

# PUT - Update Persediaan
@router.put("/{id}", response_model=Persediaan)
async def update_persediaan(id: str, persediaan_update: PersediaanCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    if persediaan_update.kode_barang: persediaan_update.kode_barang = clean_code_str(persediaan_update.kode_barang)
    if persediaan_update.nup: persediaan_update.nup = clean_code_str(persediaan_update.nup)
    
    if persediaan_update.kode_barang and not persediaan_update.golongan_barang:
        persediaan_update.golongan_barang = await get_golongan_uraian(persediaan_update.kode_barang)
    
    if persediaan_update.tgl_perolehan:
        persediaan_update.tahun_anggaran = persediaan_update.tgl_perolehan[:4]
    
    update_data = persediaan_update.dict(exclude_unset=True)
    update_data['updated_at'] = datetime.now(timezone.utc)
    
    res = await db.persediaan.find_one_and_update(
        {"_id": ObjectId(id)}, 
        {"$set": update_data}, 
        return_document=True
    )
    if not res: raise HTTPException(status_code=404)
    return res

# PATCH - Update Status
@router.patch("/{id}/status")
async def update_persediaan_status(id: str, status_data: dict = Body(...), current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid ID")
    
    new_status = status_data.get("status_aset")
    if new_status not in ["Aktif", "Non Aktif", "Dipinjamkan"]:
        raise HTTPException(status_code=400, detail="Invalid status value")
    
    update_data = {
        "status_aset": new_status,
        "updated_at": datetime.now(timezone.utc)
    }
    
    res = await db.persediaan.find_one_and_update(
        {"_id": ObjectId(id)}, 
        {"$set": update_data}, 
        return_document=True
    )
    
    if not res: raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Status updated", "status_aset": new_status}

# PATCH - Update Batas Kritis (Inline Edit)
@router.patch("/{id}/batas-kritis")
async def update_batas_kritis(id: str, data: dict = Body(...), current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid ID")
    
    batas_kritis = data.get("batas_kritis")
    if batas_kritis is None or not isinstance(batas_kritis, int):
        raise HTTPException(status_code=400, detail="Invalid batas_kritis value")
    
    update_data = {
        "batas_kritis": batas_kritis,
        "updated_at": datetime.now(timezone.utc)
    }
    
    res = await db.persediaan.find_one_and_update(
        {"_id": ObjectId(id)}, 
        {"$set": update_data}, 
        return_document=True
    )
    
    if not res: raise HTTPException(status_code=404, detail="Not found")
    return {"message": "Batas kritis updated", "batas_kritis": batas_kritis}

# DELETE - Single
@router.delete("/{id}")
async def delete_persediaan(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    res = await db.persediaan.delete_one({"_id": ObjectId(id)})
    if res.deleted_count == 0: raise HTTPException(status_code=404)
    return {"message": "Deleted"}

# GET - Download Template Import
@router.get("/template")
async def download_template(current_user: str = Depends(get_current_user)):
    try:
        # Create template with example data
        template_data = {
            'KodeBarang': ['1010301001', '1010301002'],
            'NamaBarang': ['Kertas HVS A4 70gr', 'Pulpen Hitam'],
            'Merk': ['Sinar Dunia', 'Standard'],
            'Tipe': ['', 'Ballpoint'],
            'Satuan': ['Rim', 'Pcs'],
            'StokSaatIni': [10, 25],
            'NilaiSatuan': [50000, 2500],
            'TglPerolehan (DD/MM/YYYY)': ['15/01/2024', '20/01/2024'],
            'Kondisi': ['Baik', 'Baik'],
            'LokasiRuang': ['Gudang ATK', 'Gudang ATK']
        }
        
        df = pd.DataFrame(template_data)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Template Persediaan', index=False)
            
            worksheet = writer.sheets['Template Persediaan']
            for idx, col in enumerate(df.columns):
                max_length = max(df[col].astype(str).apply(len).max(), len(col)) + 2
                worksheet.column_dimensions[chr(65 + idx)].width = min(max_length, 30)
        
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={'Content-Disposition': 'attachment; filename="Template_Import_Persediaan.xlsx"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating template: {str(e)}")

# GET - Auto-update Expired Items Status
@router.get("/update-expired-status")
async def update_expired_status(current_user: str = Depends(get_current_user)):
    """Auto-update status barang expired menjadi 'Barang Rusak'"""
    try:
        today = datetime.now(timezone.utc)
        
        # Find items with expired_date in the past
        result = await db.persediaan.update_many(
            {
                "expired_date": {"$exists": True, "$ne": None, "$lt": today.strftime("%Y-%m-%d")},
                "kondisi": {"$ne": "Barang Rusak"}
            },
            {
                "$set": {
                    "kondisi": "Barang Rusak",
                    "updated_at": today
                }
            }
        )
        
        return {"message": f"Updated {result.modified_count} expired items to 'Barang Rusak'"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating expired status: {str(e)}")

# GET - Generate Nota Dinas Expired Items
@router.get("/nota-dinas-expired")
async def generate_nota_dinas_expired(
    filter_type: str = Query("all", description="all, expired, 2weeks, 1month"),
    current_user: str = Depends(get_current_user)
):
    """Generate nota dinas untuk barang expired"""
    try:
        today = datetime.now(timezone.utc)
        # Auto-update status for strictly expired items
        await db.persediaan.update_many(
            {
                "expired_date": {"$exists": True, "$ne": None, "$lt": today.strftime("%Y-%m-%d")},
                "kondisi": {"$ne": "Barang Rusak"}
            },
            {
                "$set": {"kondisi": "Barang Rusak", "updated_at": today}
            }
        )
        
        # Build query based on filter
        if filter_type == "expired":
            query = {"expired_date": {"$exists": True, "$ne": None, "$lt": today.strftime("%Y-%m-%d")}}
            title = "Barang SUDAH EXPIRED"
        elif filter_type == "2weeks":
            two_weeks = today + pd.Timedelta(days=14)
            query = {
                "expired_date": {"$exists": True, "$ne": None, "$gte": today.strftime("%Y-%m-%d"), "$lte": two_weeks.strftime("%Y-%m-%d")}
            }
            title = "Barang AKAN EXPIRED dalam 2 Minggu"
        elif filter_type == "1month":
            one_month = today + pd.Timedelta(days=30)
            query = {
                "expired_date": {"$exists": True, "$ne": None, "$gte": today.strftime("%Y-%m-%d"), "$lte": one_month.strftime("%Y-%m-%d")}
            }
            title = "Barang AKAN EXPIRED dalam 1 Bulan"
        else:  # all
            one_month = today + pd.Timedelta(days=30)
            query = {
                "$or": [
                    {"expired_date": {"$exists": True, "$ne": None, "$lt": today.strftime("%Y-%m-%d")}},
                    {"expired_date": {"$exists": True, "$ne": None, "$gte": today.strftime("%Y-%m-%d"), "$lte": one_month.strftime("%Y-%m-%d")}}
                ]
            }
            title = "Barang Expired dan Akan Expired"
        
        cursor = db.persediaan.find(query).sort("expired_date", 1)
        items = await cursor.to_list(None)
        
        if not items:
            raise HTTPException(status_code=404, detail="Tidak ada barang expired/akan expired")
        
        # Create PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, 
                               leftMargin=2*cm, rightMargin=2*cm,
                               topMargin=2*cm, bottomMargin=2*cm)
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Header
        header_style = ParagraphStyle('HeaderCenter', parent=styles['Heading1'], fontSize=14, alignment=TA_CENTER, spaceAfter=5)
        elements.append(Paragraph("KEMENTERIAN/LEMBAGA", header_style))
        elements.append(Paragraph("UNIT KERJA", header_style))
        elements.append(Spacer(1, 0.5*cm))
        
        # Title
        title_style = ParagraphStyle('TitleCenter', parent=styles['Heading2'], fontSize=12, alignment=TA_CENTER, spaceAfter=20, fontName='Helvetica-Bold')
        elements.append(Paragraph("<u>NOTA DINAS</u>", title_style))
        
        # Info
        info_style = ParagraphStyle('InfoStyle', parent=styles['Normal'], fontSize=10, spaceAfter=5)
        elements.append(Paragraph(f"Nomor: ___/ND/____/{datetime.now().year}", info_style))
        elements.append(Paragraph(f"Tanggal: {today.strftime('%d %B %Y')}", info_style))
        elements.append(Spacer(1, 0.3*cm))
        
        elements.append(Paragraph("Kepada Yth.", info_style))
        elements.append(Paragraph("Kepala Bagian Umum", info_style))
        elements.append(Paragraph("Di Tempat", info_style))
        elements.append(Spacer(1, 0.3*cm))
        
        elements.append(Paragraph(f"Hal: <b>Pemberitahuan {title}</b>", info_style))
        elements.append(Spacer(1, 0.5*cm))
        
        # Body
        body_style = ParagraphStyle('BodyStyle', parent=styles['Normal'], fontSize=10, alignment=TA_JUSTIFY, spaceAfter=10, leading=14)
        elements.append(Paragraph(
            f"Yang bertanda tangan di bawah ini menyampaikan bahwa terdapat beberapa barang persediaan "
            f"yang {title.lower()}. Berikut daftar barang yang perlu ditindaklanjuti:",
            body_style
        ))
        elements.append(Spacer(1, 0.3*cm))
        
        # Table
        table_data = [['No', 'Kode Barang', 'Nama Barang', 'Expired Date', 'Stok', 'Satuan', 'Status']]
        
        for idx, item in enumerate(items, 1):
            kode = str(item.get('kode_barang', ''))[:16] if item.get('kode_barang') else '-'
            nama = str(item.get('nama_barang', ''))[:35] if item.get('nama_barang') else '-'
            expired = str(item.get('expired_date', '-'))
            satuan = str(item.get('satuan', '-'))[:10] if item.get('satuan') else '-'
            
            # Check status
            if item.get('expired_date'):
                try:
                    exp_date = datetime.strptime(item['expired_date'], "%Y-%m-%d").replace(tzinfo=timezone.utc)
                    days_diff = (exp_date - today).days
                    if days_diff < 0:
                        status = "EXPIRED"
                    elif days_diff <= 14:
                        status = f"{days_diff} hari lagi"
                    else:
                        status = f"{days_diff} hari lagi"
                except:
                    status = "-"
            else:
                status = "-"
            
            table_data.append([str(idx), kode, nama, expired, str(item.get('stok', 0)), satuan, status])
        
        table = Table(table_data, colWidths=[1*cm, 3.5*cm, 5.5*cm, 2.3*cm, 1.5*cm, 1.5*cm, 2.2*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (2, 1), (2, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 0.5*cm))
        
        elements.append(Paragraph(
            "Demikian nota dinas ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.",
            body_style
        ))
        elements.append(Spacer(1, 1*cm))
        
        # TTD
        ttd_style = ParagraphStyle('TTDStyle', parent=styles['Normal'], fontSize=10, alignment=TA_CENTER)
        elements.append(Paragraph("Hormat kami,", ttd_style))
        elements.append(Spacer(1, 1.5*cm))
        elements.append(Paragraph("<u>(_____________________)</u>", ttd_style))
        elements.append(Paragraph("Kepala Bagian Umum", ttd_style))
        
        doc.build(elements)
        buffer.seek(0)
        
        filename = f"Nota_Dinas_Expired_{filter_type}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(buffer, media_type='application/pdf', headers={'Content-Disposition': f'attachment; filename="{filename}"'})
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating nota dinas: {str(e)}")

# GET - Generate Nota Dinas Stok Kritis
@router.get("/nota-dinas-kritis")
async def generate_nota_dinas_kritis(current_user: str = Depends(get_current_user)):
    try:
        # Find items where stok <= batas_kritis
        query = {"$expr": {"$lte": ["$stok", "$batas_kritis"]}, "batas_kritis": {"$gt": 0}}
        cursor = db.persediaan.find(query).sort("kode_barang", 1)
        items = await cursor.to_list(None)
        
        if not items:
            raise HTTPException(status_code=404, detail="Tidak ada persediaan dengan stok kritis")
        
        # Create PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, 
                               leftMargin=2*cm, rightMargin=2*cm,
                               topMargin=2*cm, bottomMargin=2*cm)
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Header - Kop Surat
        header_style = ParagraphStyle(
            'HeaderCenter',
            parent=styles['Heading1'],
            fontSize=14,
            alignment=TA_CENTER,
            spaceAfter=5
        )
        
        elements.append(Paragraph("KEMENTERIAN/LEMBAGA", header_style))
        elements.append(Paragraph("UNIT KERJA", header_style))
        elements.append(Spacer(1, 0.3*cm))
        
        # Garis pembatas
        elements.append(Spacer(1, 0.2*cm))
        
        # Judul Nota Dinas
        title_style = ParagraphStyle(
            'TitleCenter',
            parent=styles['Heading2'],
            fontSize=12,
            alignment=TA_CENTER,
            spaceAfter=20,
            fontName='Helvetica-Bold'
        )
        elements.append(Paragraph("<u>NOTA DINAS</u>", title_style))
        
        # Info Nota
        info_style = ParagraphStyle(
            'InfoStyle',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=5
        )
        
        today = datetime.now(timezone.utc).strftime("%d %B %Y")
        
        elements.append(Paragraph(f"Nomor: ___/ND/____/{datetime.now().year}", info_style))
        elements.append(Paragraph(f"Tanggal: {today}", info_style))
        elements.append(Spacer(1, 0.3*cm))
        
        elements.append(Paragraph("Kepada Yth.", info_style))
        elements.append(Paragraph("Kepala Bagian Umum/Pengadaan", info_style))
        elements.append(Paragraph("Di Tempat", info_style))
        elements.append(Spacer(1, 0.3*cm))
        
        elements.append(Paragraph("Hal: <b>Permohonan Pengadaan Barang (Stok Kritis)</b>", info_style))
        elements.append(Spacer(1, 0.5*cm))
        
        # Isi Surat
        body_style = ParagraphStyle(
            'BodyStyle',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_JUSTIFY,
            spaceAfter=10,
            leading=14
        )
        
        elements.append(Paragraph(
            "Yang bertanda tangan di bawah ini menyampaikan bahwa terdapat beberapa barang persediaan "
            "yang telah mencapai atau berada di bawah batas kritis. Untuk itu, kami mohon agar dapat "
            "dilakukan pengadaan barang dengan rincian sebagai berikut:",
            body_style
        ))
        elements.append(Spacer(1, 0.3*cm))
        
        # Tabel Barang Kritis
        table_data = [['No', 'Kode Barang', 'Nama Barang', 'Stok Saat Ini', 'Batas Kritis', 'Satuan', 'Lokasi']]
        
        for idx, item in enumerate(items, 1):
            kode = str(item.get('kode_barang', ''))[:16] if item.get('kode_barang') else '-'
            nama = str(item.get('nama_barang', ''))[:40] if item.get('nama_barang') else '-'
            satuan = str(item.get('satuan', '-'))[:10] if item.get('satuan') else '-'
            lokasi = str(item.get('lokasi_fisik', '-'))[:15] if item.get('lokasi_fisik') else '-'
            
            table_data.append([
                str(idx),
                kode,
                nama,
                str(item.get('stok', 0)),
                str(item.get('batas_kritis', 0)),
                satuan,
                lokasi
            ])
        
        table = Table(table_data, colWidths=[1*cm, 3.5*cm, 5*cm, 2*cm, 2*cm, 1.5*cm, 2.5*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (2, 1), (2, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 9),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 0.5*cm))
        
        # Penutup
        elements.append(Paragraph(
            "Demikian nota dinas ini kami sampaikan untuk dapat ditindaklanjuti. "
            "Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.",
            body_style
        ))
        elements.append(Spacer(1, 1*cm))
        
        # TTD
        ttd_style = ParagraphStyle(
            'TTDStyle',
            parent=styles['Normal'],
            fontSize=10,
            alignment=TA_CENTER
        )
        
        elements.append(Paragraph("Hormat kami,", ttd_style))
        elements.append(Spacer(1, 1.5*cm))
        elements.append(Paragraph("<u>(_____________________)</u>", ttd_style))
        elements.append(Paragraph("Kepala Bagian Umum", ttd_style))
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        filename = f"Nota_Dinas_Stok_Kritis_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        return StreamingResponse(
            buffer,
            media_type='application/pdf',
            headers={'Content-Disposition': f'attachment; filename="{filename}"'}
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating nota dinas: {str(e)}")

# POST - Import Excel
@router.post("/import")
async def import_persediaan(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    if not file.filename.endswith(('.xls', '.xlsx', '.csv')):
        raise HTTPException(status_code=400, detail="File harus format Excel atau CSV")
    
    try:
        contents = await file.read()
        
        # Read file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        df = df.where(pd.notnull(df), None)
        df.columns = [str(c).strip() for c in df.columns]
        
        # Validate required columns
        required_cols = ['kodebarang', 'namabarang']
        df_cols_lower = [c.lower().replace(' ', '') for c in df.columns]
        
        missing_cols = []
        for req in required_cols:
            if not any(req in col for col in df_cols_lower):
                missing_cols.append(req)
        
        if missing_cols:
            raise HTTPException(
                status_code=400, 
                detail=f"Format file tidak sesuai! Kolom wajib yang hilang: {', '.join(missing_cols)}. Silakan download template yang benar."
            )
        
        count_processed = 0
        count_inserted = 0
        count_updated = 0
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Map columns - flexible mapping
                kode_col = next((c for c in df.columns if 'kode' in c.lower() and 'barang' in c.lower()), None)
                nama_col = next((c for c in df.columns if 'nama' in c.lower() and 'barang' in c.lower()), None)
                merk_col = next((c for c in df.columns if 'merk' in c.lower()), None)
                tipe_col = next((c for c in df.columns if 'tipe' in c.lower()), None)
                satuan_col = next((c for c in df.columns if 'satuan' in c.lower()), None)
                stok_col = next((c for c in df.columns if 'stok' in c.lower()), None)
                nilai_col = next((c for c in df.columns if 'nilai' in c.lower() and 'satuan' in c.lower()), None)
                tgl_col = next((c for c in df.columns if 'tgl' in c.lower() or 'tanggal' in c.lower()), None)
                kondisi_col = next((c for c in df.columns if 'kondisi' in c.lower()), None)
                lokasi_col = next((c for c in df.columns if 'lokasi' in c.lower() or 'ruang' in c.lower()), None)
                
                if not kode_col or not nama_col:
                    continue
                
                kode_barang = clean_code_str(row.get(kode_col))
                if not kode_barang:
                    continue
                
                # Handle kode_barang validation (must be 16 digits)
                # If only 10 digits provided, auto-generate last 6 digits
                if len(kode_barang) == 10:
                    # Find max kode with same prefix
                    prefix = kode_barang
                    pattern = f"^{prefix}"
                    max_item = await db.persediaan.find_one(
                        {"kode_barang": {"$regex": pattern}},
                        sort=[("kode_barang", -1)]
                    )
                    
                    if max_item and len(max_item.get('kode_barang', '')) == 16:
                        last_six = max_item['kode_barang'][-6:]
                        try:
                            next_num = int(last_six) + 1
                            kode_barang = f"{prefix}{str(next_num).zfill(6)}"
                        except:
                            kode_barang = f"{prefix}000001"
                    else:
                        kode_barang = f"{prefix}000001"
                elif len(kode_barang) != 16:
                    # Skip invalid kode barang
                    print(f"Skipping invalid kode_barang: {kode_barang} (length: {len(kode_barang)})")
                    continue
                
                # Auto-populate golongan barang from kode
                golongan = await get_golongan_uraian(kode_barang[:10] if len(kode_barang) >= 10 else kode_barang)
                
                # Prepare data
                item_data = {
                    'kode_barang': kode_barang,
                    'nama_barang': str(row.get(nama_col, '')),
                    'merk': str(row.get(merk_col, '')) if merk_col else None,
                    'tipe': str(row.get(tipe_col, '')) if tipe_col else None,
                    'satuan': str(row.get(satuan_col, '')) if satuan_col else None,
                    'stok': int(row.get(stok_col, 0)) if stok_col else 0,
                    'nilai_satuan': clean_currency(row.get(nilai_col, 0)) if nilai_col else 0,
                    'kondisi': str(row.get(kondisi_col, 'Baik')) if kondisi_col else 'Baik',
                    'lokasi_fisik': str(row.get(lokasi_col, '')) if lokasi_col else None,
                    'golongan_barang': golongan,  # Auto-populate golongan
                    'source': 'import',
                    'nup': '1',  # Default NUP untuk persediaan
                    'updated_at': datetime.now(timezone.utc)
                }
                
                # Parse tanggal
                if tgl_col and row.get(tgl_col):
                    try:
                        tgl_str = str(row.get(tgl_col))
                        if '/' in tgl_str:  # DD/MM/YYYY
                            parts = tgl_str.split('/')
                            if len(parts) == 3:
                                item_data['tgl_perolehan'] = f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
                                item_data['tahun_anggaran'] = parts[2]
                        else:
                            item_data['tgl_perolehan'] = tgl_str[:10]
                    except:
                        pass
                
                # Auto golongan
                if kode_barang:
                    golongan = await get_golongan_uraian(kode_barang)
                    if golongan:
                        item_data['golongan_barang'] = golongan
                
                # Upsert: Update jika kode_barang sudah ada, insert jika baru
                dup_query = {"kode_barang": kode_barang}
                result = await db.persediaan.update_one(
                    dup_query,
                    {"$set": item_data},
                    upsert=True
                )
                
                if result.upserted_id:
                    count_inserted += 1
                else:
                    count_updated += 1
                count_processed += 1
                
            except Exception as e:
                print(f"Error processing row {index}: {str(e)}")
                continue
        
        return {
            "message": "Import selesai",
            "processed": count_processed,
            "inserted": count_inserted,
            "updated": count_updated
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")

# POST - Export Excel
@router.post("/export-excel")
async def export_persediaan_excel(request: dict = Body(...), current_user: str = Depends(get_current_user)):
    try:
        ids = request.get('ids', [])
        select_all = request.get('select_all_mode', False)
        search = request.get('search')
        filters = request.get('filters', {})
        
        query = {}
        
        if select_all:
            # Apply filters
            if search:
                query["$or"] = [
                    {"nama_barang": {"$regex": search, "$options": "i"}},
                    {"kode_barang": {"$regex": search, "$options": "i"}},
                    {"batch_number": {"$regex": search, "$options": "i"}}
                ]
            
            if filters:
                if filters.get('kode'): query["kode_barang"] = {"$regex": filters['kode'], "$options": "i"}
                if filters.get('nama'): query["nama_barang"] = {"$regex": filters['nama'], "$options": "i"}
                if filters.get('merk'): query["merk"] = {"$regex": filters['merk'], "$options": "i"}
                if filters.get('kondisi'): query["kondisi"] = filters['kondisi']
                if filters.get('lokasi'): query["lokasi_fisik"] = {"$regex": filters['lokasi'], "$options": "i"}
                if filters.get('golongan'): query["golongan_barang"] = {"$regex": filters['golongan'], "$options": "i"}
            
            cursor = db.persediaan.find(query).sort("kode_barang", 1)
        else:
            if not ids:
                raise HTTPException(status_code=400, detail="No items selected")
            valid_ids = [ObjectId(id) for id in ids if ObjectId.is_valid(id)]
            cursor = db.persediaan.find({"_id": {"$in": valid_ids}}).sort("kode_barang", 1)
        
        items = await cursor.to_list(None)
        
        if not items:
            raise HTTPException(status_code=404, detail="No data to export")
        
        # Prepare data
        data_list = []
        for item in items:
            data_list.append({
                "Kode Barang": item.get('kode_barang', ''),
                "Nama Barang": item.get('nama_barang', ''),
                "Golongan": item.get('golongan_barang', ''),
                "Merk": item.get('merk', ''),
                "Tipe": item.get('tipe', ''),
                "Satuan": item.get('satuan', ''),
                "Stok": item.get('stok', 0),
                "Batas Kritis": item.get('batas_kritis', 0),
                "Harga Satuan": item.get('nilai_satuan', 0),
                "Total Harga": (item.get('stok', 0) * item.get('nilai_satuan', 0)),
                "Kondisi": item.get('kondisi', ''),
                "Expired Date": item.get('expired_date', ''),
                "Lokasi": item.get('lokasi_fisik', ''),
                "Status": item.get('status_aset', 'Aktif')
            })
        
        df = pd.DataFrame(data_list)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Persediaan', index=False)
            worksheet = writer.sheets['Persediaan']
            for idx, col in enumerate(df.columns):
                max_length = max(df[col].astype(str).apply(len).max(), len(col)) + 2
                worksheet.column_dimensions[chr(65 + idx)].width = min(max_length, 40)
        
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={'Content-Disposition': f'attachment; filename="Export_Persediaan_{datetime.now().strftime("%Y%m%d")}.xlsx"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting: {str(e)}")

# POST - Export PDF
@router.post("/export-pdf")
async def export_persediaan_pdf(request: dict = Body(...), current_user: str = Depends(get_current_user)):
    try:
        ids = request.get('ids', [])
        select_all = request.get('select_all_mode', False)
        search = request.get('search')
        filters = request.get('filters', {})
        
        query = {}
        
        if select_all:
            # Apply filters
            if search:
                query["$or"] = [
                    {"nama_barang": {"$regex": search, "$options": "i"}},
                    {"kode_barang": {"$regex": search, "$options": "i"}},
                    {"batch_number": {"$regex": search, "$options": "i"}}
                ]
            
            if filters:
                if filters.get('kode'): query["kode_barang"] = {"$regex": filters['kode'], "$options": "i"}
                if filters.get('nama'): query["nama_barang"] = {"$regex": filters['nama'], "$options": "i"}
                if filters.get('merk'): query["merk"] = {"$regex": filters['merk'], "$options": "i"}
                if filters.get('kondisi'): query["kondisi"] = filters['kondisi']
                if filters.get('lokasi'): query["lokasi_fisik"] = {"$regex": filters['lokasi'], "$options": "i"}
                if filters.get('golongan'): query["golongan_barang"] = {"$regex": filters['golongan'], "$options": "i"}

            cursor = db.persediaan.find(query).sort("kode_barang", 1)
        else:
            if not ids:
                raise HTTPException(status_code=400, detail="No items selected")
            valid_ids = [ObjectId(id) for id in ids if ObjectId.is_valid(id)]
            cursor = db.persediaan.find({"_id": {"$in": valid_ids}}).sort("kode_barang", 1)
        
        items = await cursor.to_list(None)
        
        if not items:
            raise HTTPException(status_code=404, detail="No data to export")
        
        # Create PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), leftMargin=1*cm, rightMargin=1*cm, topMargin=1.5*cm, bottomMargin=1.5*cm)
        
        elements = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'], fontSize=14, textColor=colors.HexColor('#1e40af'), spaceAfter=15, alignment=TA_CENTER)
        elements.append(Paragraph("DAFTAR PERSEDIAAN", title_style))
        elements.append(Spacer(1, 0.3*cm))
        
        # Table
        table_data = [['No', 'Kode', 'Nama Barang', 'Gol', 'Stok', 'Satuan', 'Batas Kritis', 'Harga', 'Total', 'Kondisi']]
        
        for idx, item in enumerate(items, 1):
            table_data.append([
                str(idx),
                str(item.get('kode_barang', ''))[:14],
                str(item.get('nama_barang', ''))[:25],
                str(item.get('golongan_barang', '-'))[:10],
                str(item.get('stok', 0)),
                str(item.get('satuan', '-'))[:5],
                str(item.get('batas_kritis', 0)),
                f"Rp {item.get('nilai_satuan', 0):,.0f}",
                f"Rp {(item.get('stok', 0) * item.get('nilai_satuan', 0)):,.0f}",
                str(item.get('kondisi', '-'))[:8]
            ])
        
        table = Table(table_data, colWidths=[1*cm, 3*cm, 5*cm, 2.5*cm, 1.5*cm, 1.5*cm, 1.8*cm, 2.5*cm, 2.8*cm, 2*cm])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('ALIGN', (2, 1), (2, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 8),
            ('FONTSIZE', (0, 1), (-1, -1), 7),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(table)
        doc.build(elements)
        buffer.seek(0)
        
        return StreamingResponse(buffer, media_type='application/pdf', headers={'Content-Disposition': f'attachment; filename="Export_Persediaan_{datetime.now().strftime("%Y%m%d")}.pdf"'})
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting PDF: {str(e)}")

# POST - Bulk Delete
class BulkDeleteRequest(BaseModel):
    ids: Optional[List[str]] = []
    select_all_mode: bool = False
    search: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None

@router.post("/bulk-delete")
async def bulk_delete_persediaan(request: BulkDeleteRequest, current_user: str = Depends(get_current_user)):
    if request.select_all_mode:
        query = {}
        if request.search:
            query["$or"] = [
                {"nama_barang": {"$regex": request.search, "$options": "i"}},
                {"kode_barang": {"$regex": request.search, "$options": "i"}}
            ]
        if request.filters:
            filters = request.filters
            if filters.get('kode'): query["kode_barang"] = {"$regex": filters['kode'], "$options": "i"}
            if filters.get('nama'): query["nama_barang"] = {"$regex": filters['nama'], "$options": "i"}
            if filters.get('merk'): query["merk"] = {"$regex": filters['merk'], "$options": "i"}
            if filters.get('kondisi'): query["kondisi"] = filters['kondisi']
            if filters.get('lokasi'): query["lokasi_fisik"] = {"$regex": filters['lokasi'], "$options": "i"}
            if filters.get('golongan'): query["golongan_barang"] = {"$regex": filters['golongan'], "$options": "i"}
        
        result = await db.persediaan.delete_many(query)
        return {"message": f"{result.deleted_count} items deleted"}
    else:
        if not request.ids:
            raise HTTPException(status_code=400, detail="No IDs provided")
        
        valid_ids = [ObjectId(id) for id in request.ids if ObjectId.is_valid(id)]
        if not valid_ids:
            raise HTTPException(status_code=400, detail="No valid IDs")
        
        result = await db.persediaan.delete_many({"_id": {"$in": valid_ids}})
        return {"message": f"{result.deleted_count} items deleted"}

# --- PHOTO MANAGEMENT ENDPOINTS ---

@router.post("/{id}/upload-fotos")
async def upload_fotos(
    id: str,
    files: List[UploadFile] = File(...),
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
    
    if config.get("current_month_count", 0) + len(files) > config.get("monthly_upload_limit", 500):
        remaining = config.get("monthly_upload_limit", 500) - config.get("current_month_count", 0)
        raise HTTPException(status_code=400, detail=f"Batas upload bulanan terlampaui. Sisa kuota: {remaining} foto.")

    keterangan: Optional[str] = Body(""),
    current_user: str = Depends(get_current_user)
):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    
    upload_dir = "/app/uploads/persediaan"
    os.makedirs(upload_dir, exist_ok=True)
        # 2. Compress
        try:
            # Read back contents to compress
            with open(file_path, "rb") as f:
                raw_data = f.read()
            
            compressed_data = compress_image(raw_data)
            
            # Overwrite with compressed data
            with open(file_path, "wb") as f:
                f.write(compressed_data)
        except Exception as e:
            print(f"Compression failed: {e}")

    
    new_fotos = []
    for file in files:
        safe_name = f"{id}_{int(datetime.now().timestamp())}_{file.filename.replace(' ', '_')}"
        file_path = os.path.join(upload_dir, safe_name)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        new_fotos.append({
            "url": f"/api/uploads/persediaan/{safe_name}",
            "is_thumbnail": False,
            "keterangan": keterangan,
            "uploaded_at": datetime.now(timezone.utc)
        })
    
    # If no photos existed before, make first one thumbnail
    item = await db.persediaan.find_one({"_id": ObjectId(id)})
    if not item.get("fotos") and new_fotos:
        new_fotos[0]["is_thumbnail"] = True
        
    await db.persediaan.update_one(
        {"_id": ObjectId(id)},
        {"$push": {"fotos": {"$each": new_fotos}}}
    )
    return {"message": "Uploaded", "fotos": new_fotos}

@router.put("/{id}/set-thumbnail")
async def set_thumbnail(id: str, payload: dict = Body(...), current_user: str = Depends(get_current_user)):
    url = payload.get("url")
    if not url: raise HTTPException(status_code=400)
    
    # Unset all
    await db.persediaan.update_one(
        {"_id": ObjectId(id), "fotos.is_thumbnail": True},
        {"$set": {"fotos.$.is_thumbnail": False}}
    )
    
    # Set specific
    await db.persediaan.update_one(
        {"_id": ObjectId(id), "fotos.url": url},
        {"$set": {"fotos.$.is_thumbnail": True}}
    )
    return {"message": "Thumbnail updated"}

@router.delete("/{id}/foto")
async def delete_foto(id: str, payload: dict = Body(...), current_user: str = Depends(get_current_user)):
    url = payload.get("url")
    await db.persediaan.update_one(
        {"_id": ObjectId(id)},
        {"$pull": {"fotos": {"url": url}}}
    )
    # Ideally delete file from disk too
    try:
        # Remove /api prefix to get disk path relative to /app
        # url is like /api/uploads/persediaan/filename
        # we want /app/uploads/persediaan/filename
        # But wait, app.mount("/api/uploads", ...)
        # So /api/uploads maps to /app/uploads
        # So we just replace /api/uploads with /app/uploads
        
        file_path = url.replace("/api/uploads", "/app/uploads")
        if os.path.exists(file_path): os.remove(file_path)
    except: pass
    return {"message": "Foto deleted"}

@router.put("/{id}/foto-metadata")
async def update_foto_metadata(id: str, payload: dict = Body(...), current_user: str = Depends(get_current_user)):
    url = payload.get("url")
    keterangan = payload.get("keterangan")
    
    await db.persediaan.update_one(
        {"_id": ObjectId(id), "fotos.url": url},
        {"$set": {"fotos.$.keterangan": keterangan}}
    )
    return {"message": "Updated"}
