from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List, Optional, Dict, Any
import pandas as pd
import io
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from models import Kodefikasi, KodefikasiCreate
from bson import ObjectId
import math
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("", response_model=Dict[str, Any])
async def get_referensi_list(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    level: Optional[int] = None,
    current_user: str = Depends(get_current_user)
):
    skip = (page - 1) * limit
    query = {}
    if search:
        query["$or"] = [
            {"uraian": {"$regex": search, "$options": "i"}},
            {"kode": {"$regex": search, "$options": "i"}}
        ]
    if level:
        query["level"] = level
        
    total = await db.kodefikasi.count_documents(query)
    cursor = db.kodefikasi.find(query).skip(skip).limit(limit).sort("kode", 1)
    items = await cursor.to_list(length=limit)
    
    # Ensure ObjectId is converted to string for Pydantic/JSON
    for item in items:
        if "_id" in item:
            item["_id"] = str(item["_id"])
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit)
    }

# ... (Rest of the file logic kept same, template, import, crud etc) ...
@router.get("/template")
async def get_import_template():
    try:
        # Standard SIMAN Template
        data = [
            {"kd_brg": "3010101001", "ur_sskel": "Sepeda Motor"},
            {"kd_brg": "3010101002", "ur_sskel": "Mobil Sedan"}
        ]
        df = pd.DataFrame(data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False)
        output.seek(0)
        return StreamingResponse(
            output, 
            headers={'Content-Disposition': 'attachment; filename="Template_Master_Kode_Barang.xlsx"'}, 
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import")
async def import_referensi(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="File harus format Excel (.xlsx)")
        
    try:
        contents = await file.read()
        
        # 1. Read Excel & Find Header
        try:
            df_raw = pd.read_excel(io.BytesIO(contents), header=None)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"File rusak: {str(e)}")
            
        header_idx = -1
        found_mode = None 
        
        for i, row in df_raw.head(20).iterrows():
            row_str = row.astype(str).str.lower().tolist()
            if any('kd_brg' in s or 'kode barang' in s for s in row_str):
                header_idx = i
                if any('golongan barang' in s for s in row_str):
                    found_mode = 'HIERARCHY'
                elif any('ur_sskel' in s or 'uraian' in s for s in row_str):
                    found_mode = 'STANDARD'
                break
        
        if header_idx == -1:
            raise HTTPException(status_code=400, detail="Header tidak ditemukan. Pastikan ada kolom 'Kode Barang' atau 'kd_brg'.")
            
        df = pd.read_excel(io.BytesIO(contents), header=header_idx)
        df = df.where(pd.notnull(df), None)
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        count = 0
        
        if found_mode == 'HIERARCHY':
            col_kode = next((c for c in df.columns if 'kode' in c or 'kd_brg' in c), None)
            col_gol = next((c for c in df.columns if 'golongan' in c), None)
            col_bid = next((c for c in df.columns if 'bidang' in c), None)
            col_kel = next((c for c in df.columns if 'kelompok' in c and 'sub' not in c), None)
            col_sub = next((c for c in df.columns if 'sub kelompok' in c and 'sub - sub' not in c), None)
            col_subsub = next((c for c in df.columns if 'sub - sub' in c or 'ur_sskel' in c), None)
            
            for index, row in df.iterrows():
                raw_kode = str(row.get(col_kode, ''))
                full_kode = ''.join(filter(str.isdigit, raw_kode))
                if not full_kode: continue
                
                if len(full_kode) >= 1 and col_gol:
                    k = full_kode[:1]; u = str(row.get(col_gol, '')).strip()
                    if u: await upsert_kode(k, u, 1)
                if len(full_kode) >= 3 and col_bid:
                    k = full_kode[:3]; u = str(row.get(col_bid, '')).strip()
                    if u: await upsert_kode(k, u, 2)
                if len(full_kode) >= 5 and col_kel:
                    k = full_kode[:5]; u = str(row.get(col_kel, '')).strip()
                    if u: await upsert_kode(k, u, 3)
                if len(full_kode) >= 7 and col_sub:
                    k = full_kode[:7]; u = str(row.get(col_sub, '')).strip()
                    if u: await upsert_kode(k, u, 4)
                if len(full_kode) >= 10 and col_subsub:
                    k = full_kode[:10]; u = str(row.get(col_subsub, '')).strip()
                    if u: await upsert_kode(k, u, 5)
                count += 1

        else: # STANDARD
            col_kode = next((c for c in df.columns if 'kode' in c or 'kd_brg' in c), None)
            col_uraian = next((c for c in df.columns if 'uraian' in c or 'ur_sskel' in c or 'nama' in c), None)
            
            for index, row in df.iterrows():
                raw_kode = str(row.get(col_kode, ''))
                kode = ''.join(filter(str.isdigit, raw_kode))
                uraian = str(row.get(col_uraian, '')).strip()
                if not kode or not uraian: continue
                
                level = 5
                l = len(kode)
                if l == 1: level = 1
                elif l == 3: level = 2
                elif l == 5: level = 3
                elif l == 7: level = 4
                
                await upsert_kode(kode, uraian, level)
                count += 1
            
        return {"message": f"Import Berhasil! {count} baris data diproses."}
        
    except HTTPException as he: raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"System Error: {str(e)}")

async def upsert_kode(kode, uraian, level):
    await db.kodefikasi.update_one(
        {"kode": kode},
        {"$set": {"uraian": uraian, "level": level}},
        upsert=True
    )

@router.post("", response_model=Kodefikasi)
async def create_referensi(item: KodefikasiCreate, current_user: str = Depends(get_current_user)):
    clean_kode = item.kode.replace(".", "").strip()
    level = item.level
    if not level:
        if len(clean_kode) == 1: level = 1
        elif len(clean_kode) == 3: level = 2
        elif len(clean_kode) == 5: level = 3
        elif len(clean_kode) == 7: level = 4
        elif len(clean_kode) >= 10: level = 5
        else: level = 5
    existing = await db.kodefikasi.find_one({"kode": clean_kode})
    if existing: raise HTTPException(status_code=400, detail="Kode sudah ada")
    new_ref = Kodefikasi(kode=clean_kode, uraian=item.uraian, level=level)
    res = await db.kodefikasi.insert_one(new_ref.model_dump(by_alias=True, exclude=["id"]))
    return await db.kodefikasi.find_one({"_id": res.inserted_id})

@router.put("/{id}", response_model=Kodefikasi)
async def update_referensi(id: str, item: KodefikasiCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    clean_kode = item.kode.replace(".", "").strip()
    await db.kodefikasi.update_one({"_id": ObjectId(id)}, {"$set": {"kode": clean_kode, "uraian": item.uraian}})
    return await db.kodefikasi.find_one({"_id": ObjectId(id)})

@router.delete("/{id}")
async def delete_referensi(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400, detail="Invalid ID")
    result = await db.kodefikasi.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0: raise HTTPException(status_code=404, detail="Referensi not found")
    return {"message": "Deleted"}

@router.get("/lookup")
async def lookup_kode(kode: str, current_user: str = Depends(get_current_user)):
    clean_kode = ''.join(filter(str.isdigit, kode))
    result = {
        "golongan": None, "bidang": None, "kelompok": None, 
        "sub_kelompok": None, "sub_sub_kelompok": None, "uraian_barang": None
    }
    prefixes = []
    if len(clean_kode) >= 1: prefixes.append(clean_kode[:1])
    if len(clean_kode) >= 3: prefixes.append(clean_kode[:3])
    if len(clean_kode) >= 5: prefixes.append(clean_kode[:5])
    if len(clean_kode) >= 7: prefixes.append(clean_kode[:7])
    if len(clean_kode) >= 10: prefixes.append(clean_kode[:10])
    
    cursor = db.kodefikasi.find({"kode": {"$in": prefixes}})
    refs = await cursor.to_list(None)
    ref_map = {r['kode']: r['uraian'] for r in refs}
    
    if len(clean_kode) >= 1: result["golongan"] = f"{clean_kode[:1]} - {ref_map.get(clean_kode[:1], 'Unknown')}"
    if len(clean_kode) >= 3: result["bidang"] = f"{clean_kode[:3]} - {ref_map.get(clean_kode[:3], '')}"
    if len(clean_kode) >= 5: result["kelompok"] = f"{clean_kode[:5]} - {ref_map.get(clean_kode[:5], '')}"
    if len(clean_kode) >= 7: result["sub_kelompok"] = f"{clean_kode[:7]} - {ref_map.get(clean_kode[:7], '')}"
    if len(clean_kode) >= 10: 
        result["sub_sub_kelompok"] = f"{clean_kode[:10]} - {ref_map.get(clean_kode[:10], '')}"
        result["uraian_barang"] = ref_map.get(clean_kode[:10], '')
    return result

@router.get("/golongan")
async def get_golongan_list(current_user: str = Depends(get_current_user)):
    """Get list of golongan (level 1) from kodefikasi"""
    cursor = db.kodefikasi.find({"level": 1}).sort("kode", 1)
    items = await cursor.to_list(None)
    return [{"kode": item["kode"], "nama": item["uraian"]} for item in items]

@router.get("/by-golongan/{golongan_kode}")
async def get_kode_by_golongan(
    golongan_kode: str,
    search: Optional[str] = None,
    limit: int = 500,
    current_user: str = Depends(get_current_user)
):
    """
    Get kode barang (level 5/sub-sub kelompok) filtered by golongan.
    golongan_kode: first digit of kode barang (e.g., "2" for "2 - Tanah")
    """
    # Build query - find items starting with golongan_kode and level 5 (sub-sub kelompok)
    query = {
        "kode": {"$regex": f"^{golongan_kode}"},
        "level": 5  # Only get detailed items (sub-sub kelompok)
    }
    
    if search:
        query["$or"] = [
            {"uraian": {"$regex": search, "$options": "i"}},
            {"kode": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.kodefikasi.find(query).sort("kode", 1).limit(limit)
    items = await cursor.to_list(length=limit)
    
    return [{"kode": item["kode"], "uraian": item["uraian"]} for item in items]

@router.get("/all-levels/{golongan_kode}")
async def get_all_levels_by_golongan(
    golongan_kode: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get all kode barang hierarchically filtered by golongan.
    Returns items at all levels for the given golongan.
    """
    query = {
        "kode": {"$regex": f"^{golongan_kode}"}
    }
    
    cursor = db.kodefikasi.find(query).sort([("level", 1), ("kode", 1)])
    items = await cursor.to_list(None)
    
    return [{
        "kode": item["kode"], 
        "uraian": item["uraian"],
        "level": item.get("level", 5)
    } for item in items]

# Export Excel - All Referensi Kode
@router.get("/export/excel")
async def export_referensi_excel(current_user: str = Depends(get_current_user)):
    try:
        # Fetch all kodefikasi sorted by level and kode
        cursor = db.kodefikasi.find({}).sort([("level", 1), ("kode", 1)])
        items = await cursor.to_list(None)
        
        if not items:
            raise HTTPException(status_code=404, detail="Tidak ada data referensi kode")
        
        # Prepare data for Excel
        data_list = []
        for item in items:
            level_name = {
                1: "Golongan",
                2: "Bidang", 
                3: "Kelompok",
                4: "Sub Kelompok",
                5: "Sub-Sub Kelompok"
            }.get(item.get('level', 5), "Level 5")
            
            data_list.append({
                "Kode": item.get('kode', ''),
                "Uraian": item.get('uraian', ''),
                "Level": level_name
            })
        
        df = pd.DataFrame(data_list)
        
        # Create Excel file
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Referensi Kode', index=False)
            
            # Auto-adjust column width
            worksheet = writer.sheets['Referensi Kode']
            for idx, col in enumerate(df.columns):
                max_length = max(df[col].astype(str).apply(len).max(), len(col)) + 2
                worksheet.column_dimensions[chr(65 + idx)].width = min(max_length, 50)
        
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            headers={'Content-Disposition': 'attachment; filename="Referensi_Kode_Barang.xlsx"'}
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating Excel: {str(e)}")

# Export PDF - All Referensi Kode
@router.get("/export/pdf")
async def export_referensi_pdf(current_user: str = Depends(get_current_user)):
    try:
        # Fetch all kodefikasi sorted
        cursor = db.kodefikasi.find({}).sort([("level", 1), ("kode", 1)])
        items = await cursor.to_list(None)
        
        if not items:
            raise HTTPException(status_code=404, detail="Tidak ada data referensi kode")
        
        # Create PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(A4), 
                               leftMargin=1*cm, rightMargin=1*cm,
                               topMargin=2*cm, bottomMargin=2*cm)
        
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=20,
            alignment=TA_CENTER
        )
        elements.append(Paragraph("REFERENSI KODE BARANG", title_style))
        elements.append(Spacer(1, 0.5*cm))
        
        # Prepare table data
        table_data = [['No', 'Kode', 'Uraian', 'Level']]
        
        for idx, item in enumerate(items, 1):
            level_name = {
                1: "Golongan",
                2: "Bidang",
                3: "Kelompok",
                4: "Sub Kelompok",
                5: "Sub-Sub Kelompok"
            }.get(item.get('level', 5), "Level 5")
            
            table_data.append([
                str(idx),
                item.get('kode', ''),
                item.get('uraian', '')[:60],  # Limit text length
                level_name
            ])
        
        # Create table
        col_widths = [1.5*cm, 3*cm, 16*cm, 4*cm]
        table = Table(table_data, colWidths=col_widths, repeatRows=1)
        
        # Table style
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),  # No column center
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        elements.append(table)
        
        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type='application/pdf',
            headers={'Content-Disposition': 'attachment; filename="Referensi_Kode_Barang.pdf"'}
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating PDF: {str(e)}")
