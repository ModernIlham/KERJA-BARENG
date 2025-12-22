from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, portrait
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from auth import get_current_user
import os
import io

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# KIB Types mapping
KIB_TYPES = {
    "2": {"name": "Tanah", "code": "A"},
    "3": {"name": "Peralatan dan Mesin", "code": "B"},
    "4": {"name": "Gedung dan Bangunan", "code": "C"},
    "5": {"name": "Jalan, Irigasi dan Jaringan", "code": "D"},
    "6": {"name": "Aset Tetap Lainnya", "code": "E"},
    "7": {"name": "Konstruksi dalam Pengerjaan", "code": "F"}
}

def get_kib_type(kode_barang: str) -> dict:
    """Determine KIB type based on first digit of kode_barang"""
    if not kode_barang:
        return {"name": "Unknown", "code": "X"}
    first_digit = kode_barang[0]
    return KIB_TYPES.get(first_digit, {"name": "Aset", "code": "X"})

@router.get("/kib/settings")
async def get_kib_settings(current_user: str = Depends(get_current_user)):
    """Get KIB organization settings"""
    settings = await db.system_settings.find_one({"key": "kib_settings"})
    if not settings:
        # Return defaults
        return {
            "uapb": "KEMENTERIAN/LEMBAGA",
            "uappb_e1": "ESELON I",
            "uappb_w": "WILAYAH",
            "uakpb_nama": "NAMA SATKER",
            "uakpb_kode": "000000"
        }
    return {
        "uapb": settings.get("uapb", ""),
        "uappb_e1": settings.get("uappb_e1", ""),
        "uappb_w": settings.get("uappb_w", ""),
        "uakpb_nama": settings.get("uakpb_nama", ""),
        "uakpb_kode": settings.get("uakpb_kode", "")
    }

@router.put("/kib/settings")
async def update_kib_settings(
    settings: dict,
    current_user: str = Depends(get_current_user)
):
    """Update KIB organization settings"""
    await db.system_settings.update_one(
        {"key": "kib_settings"},
        {"$set": {
            "key": "kib_settings",
            "uapb": settings.get("uapb", ""),
            "uappb_e1": settings.get("uappb_e1", ""),
            "uappb_w": settings.get("uappb_w", ""),
            "uakpb_nama": settings.get("uakpb_nama", ""),
            "uakpb_kode": settings.get("uakpb_kode", ""),
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )
    return {"message": "Settings updated"}

@router.get("/kib/{aset_id}")
async def get_kib_data(aset_id: str, current_user: str = Depends(get_current_user)):
    """Get KIB data for a specific asset"""
    if not ObjectId.is_valid(aset_id):
        raise HTTPException(status_code=400, detail="Invalid asset ID")
    
    aset = await db.barang.find_one({"_id": ObjectId(aset_id)})
    if not aset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    aset["_id"] = str(aset["_id"])
    
    # Get KIB settings
    settings = await db.system_settings.find_one({"key": "kib_settings"})
    org_settings = {
        "uapb": settings.get("uapb", "") if settings else "",
        "uappb_e1": settings.get("uappb_e1", "") if settings else "",
        "uappb_w": settings.get("uappb_w", "") if settings else "",
        "uakpb_nama": settings.get("uakpb_nama", "") if settings else "",
        "uakpb_kode": settings.get("uakpb_kode", "") if settings else ""
    }
    
    # Determine KIB type
    kib_type = get_kib_type(aset.get("kode_barang", ""))
    
    return {
        "aset": aset,
        "kib_type": kib_type,
        "org_settings": org_settings
    }

@router.get("/kib/{aset_id}/pdf")
async def generate_kib_pdf(aset_id: str, current_user: str = Depends(get_current_user)):
    """Generate KIB PDF for a specific asset"""
    if not ObjectId.is_valid(aset_id):
        raise HTTPException(status_code=400, detail="Invalid asset ID")
    
    aset = await db.barang.find_one({"_id": ObjectId(aset_id)})
    if not aset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Get settings
    settings = await db.system_settings.find_one({"key": "kib_settings"})
    org = {
        "uapb": settings.get("uapb", "KEMENTERIAN/LEMBAGA") if settings else "KEMENTERIAN/LEMBAGA",
        "uappb_e1": settings.get("uappb_e1", "ESELON I") if settings else "ESELON I",
        "uappb_w": settings.get("uappb_w", "WILAYAH") if settings else "WILAYAH",
        "uakpb_nama": settings.get("uakpb_nama", "NAMA SATKER") if settings else "NAMA SATKER",
        "uakpb_kode": settings.get("uakpb_kode", "000000") if settings else "000000"
    }
    
    kib_type = get_kib_type(aset.get("kode_barang", ""))
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=A4,
        rightMargin=15*mm, 
        leftMargin=15*mm, 
        topMargin=15*mm, 
        bottomMargin=15*mm
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontSize=14,
        alignment=TA_CENTER,
        spaceAfter=5
    )
    header_style = ParagraphStyle(
        'HeaderStyle',
        parent=styles['Normal'],
        fontSize=9,
        alignment=TA_CENTER,
        leading=12
    )
    normal_style = ParagraphStyle(
        'NormalStyle',
        parent=styles['Normal'],
        fontSize=8,
        leading=10
    )
    label_style = ParagraphStyle(
        'LabelStyle',
        parent=styles['Normal'],
        fontSize=7,
        textColor=colors.grey
    )
    
    # Header - Organization Info
    header_data = [
        ["UAPB:", org["uapb"], "", "UAKPB:", org["uakpb_nama"]],
        ["UAPPB-E1:", org["uappb_e1"], "", "KODE:", org["uakpb_kode"]],
        ["UAPPB-W:", org["uappb_w"], "", "", ""]
    ]
    header_table = Table(header_data, colWidths=[2*cm, 5*cm, 1*cm, 2*cm, 5*cm])
    header_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (3, 0), (3, -1), 'Helvetica-Bold'),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 10))
    
    # Title
    kib_title = f"KARTU IDENTITAS BARANG ({kib_type['code']})"
    elements.append(Paragraph(kib_title, title_style))
    elements.append(Paragraph(kib_type['name'].upper(), header_style))
    elements.append(Spacer(1, 10))
    
    # Main data table
    nama_barang = aset.get('nama_barang', '-')
    kode_barang = aset.get('kode_barang', '-')
    nup = aset.get('nup', '-')
    merk = aset.get('merk', '-')
    tipe = aset.get('tipe', '-')
    kondisi = aset.get('kondisi', '-')
    nilai_perolehan = aset.get('nilai_perolehan', 0)
    nilai_buku = aset.get('nilai_buku', 0)
    tgl_perolehan = aset.get('tgl_perolehan', '-')
    lokasi = aset.get('lokasi_fisik', '-')
    alamat = aset.get('alamat', '-')
    
    # Photo section (4 photos)
    fotos = aset.get('fotos', [])
    
    # Format currency
    def fmt_currency(val):
        try:
            return f"Rp {val:,.0f}".replace(",", ".")
        except:
            return "Rp 0"
    
    # Build main data table based on KIB type
    first_digit = aset.get("kode_barang", "0")[0] if aset.get("kode_barang") else "0"
    
    # Common fields
    main_data = [
        ["1.", "Nama Barang", nama_barang],
        ["2.", "Kode Barang / NUP", f"{kode_barang} / {nup}"],
        ["3.", "Merk / Type", f"{merk} / {tipe}"],
        ["4.", "Kondisi", kondisi],
        ["5.", "Nilai Perolehan", fmt_currency(nilai_perolehan)],
        ["6.", "Nilai Buku", fmt_currency(nilai_buku)],
        ["7.", "Tanggal Perolehan", tgl_perolehan or "-"],
        ["8.", "Lokasi", lokasi or "-"],
    ]
    
    # Add type-specific fields
    if first_digit == "2":  # Tanah
        main_data.extend([
            ["9.", "Luas Tanah (m²)", str(aset.get('luas_tanah', '-'))],
            ["10.", "No. Sertifikat", aset.get('no_sertifikat', '-')],
            ["11.", "Jenis Sertifikat", aset.get('jenis_sertifikat', '-')],
            ["12.", "Tgl. Sertifikat", aset.get('tgl_sertifikat', '-')],
            ["13.", "Status Sertifikasi", aset.get('status_sertifikasi', '-')],
            ["14.", "Alamat", alamat],
        ])
    elif first_digit == "3":  # Peralatan dan Mesin
        detail = aset.get('detail_lainnya', {}) or {}
        main_data.extend([
            ["9.", "No. Seri Pabrik", detail.get('No Seri Pabrik', '-')],
            ["10.", "Tahun Pembuatan", detail.get('Tahun Pembuatan', '-')],
            ["11.", "No. Rangka", detail.get('No Rangka/NIK', '-')],
            ["12.", "No. Mesin", detail.get('No Mesin', '-')],
            ["13.", "No. BPKB", detail.get('No BPKB', '-')],
            ["14.", "No. Polisi", detail.get('No Polisi', '-')],
        ])
    elif first_digit == "4":  # Gedung dan Bangunan
        main_data.extend([
            ["9.", "Luas Bangunan (m²)", str(aset.get('luas_bangunan', '-'))],
            ["10.", "Jumlah Lantai", aset.get('jumlah_lantai', '-')],
            ["11.", "No. IMB", aset.get('no_imb', '-')],
            ["12.", "Tgl. IMB", aset.get('tgl_imb', '-')],
            ["13.", "Alamat", alamat],
        ])
    elif first_digit == "5":  # Jalan, Irigasi, Jaringan
        detail = aset.get('detail_lainnya', {}) or {}
        main_data.extend([
            ["9.", "Panjang (m)", detail.get('Panjang', '-')],
            ["10.", "Lebar (m)", detail.get('Lebar', '-')],
            ["11.", "Luas (m²)", detail.get('Luas', '-')],
            ["12.", "Alamat", alamat],
        ])
    else:
        main_data.extend([
            ["9.", "Alamat", alamat],
        ])
    
    main_table = Table(main_data, colWidths=[1*cm, 4*cm, 10*cm])
    main_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('BACKGROUND', (0, 0), (1, -1), colors.Color(0.95, 0.95, 0.95)),
        ('FONTNAME', (0, 0), (1, -1), 'Helvetica-Bold'),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(main_table)
    elements.append(Spacer(1, 15))
    
    # Photo section title
    elements.append(Paragraph("<b>FOTO BARANG</b>", normal_style))
    elements.append(Spacer(1, 5))
    
    # Photo placeholders (2x2 grid)
    photo_width = 6*cm
    photo_height = 4.5*cm
    
    photo_cells = []
    for i in range(4):
        if i < len(fotos) and fotos[i].get('url'):
            try:
                img_path = f"/app{fotos[i]['url']}"
                if os.path.exists(img_path):
                    img = Image(img_path, width=photo_width, height=photo_height)
                    photo_cells.append(img)
                else:
                    photo_cells.append(Paragraph(f"Foto {i+1}\n(File tidak ditemukan)", header_style))
            except Exception as e:
                photo_cells.append(Paragraph(f"Foto {i+1}\n(Error: {str(e)[:20]})", header_style))
        else:
            photo_cells.append(Paragraph(f"Foto {i+1}\n(Belum ada)", header_style))
    
    photo_table_data = [
        [photo_cells[0], photo_cells[1]],
        [photo_cells[2], photo_cells[3]]
    ]
    photo_table = Table(photo_table_data, colWidths=[7.5*cm, 7.5*cm], rowHeights=[5*cm, 5*cm])
    photo_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.Color(0.98, 0.98, 0.98)),
    ]))
    elements.append(photo_table)
    elements.append(Spacer(1, 10))
    
    # Footer with date
    today = datetime.now().strftime("%d %B %Y")
    elements.append(Paragraph(f"<i>Dicetak pada: {today}</i>", label_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"KIB_{kib_type['code']}_{kode_barang}_{nup}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
