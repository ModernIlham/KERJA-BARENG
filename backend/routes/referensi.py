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
    
    return {
        "data": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit)
    }

@router.get("/template")
async def get_import_template():
    try:
        data = [
            {"kd_brg": "3", "ur_sskel": "Peralatan dan Mesin"},
            {"kd_brg": "301", "ur_sskel": "Alat Besar"},
            {"kd_brg": "30101", "ur_sskel": "Alat Besar Darat"}
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
    """
    Smart Import for Referensi Kode.
    Accepts standard SIMAN headers ('kd_brg', 'ur_sskel') OR common aliases.
    """
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="File harus format Excel (.xlsx)")
        
    try:
        contents = await file.read()
        try:
            df = pd.read_excel(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"File rusak: {str(e)}")
            
        df = df.where(pd.notnull(df), None)
        # Normalize headers: lowercase, strip
        df.columns = [str(c).strip().lower() for c in df.columns]
        
        # Column Mapping Strategy
        col_map = {
            'kode': ['kd_brg', 'kode', 'kode barang', 'kode_barang', 'kd_aset'],
            'uraian': ['ur_sskel', 'uraian', 'nama barang', 'nama_barang', 'ur_brg']
        }
        
        found_kode = next((c for c in col_map['kode'] if c in df.columns), None)
        found_uraian = next((c for c in col_map['uraian'] if c in df.columns), None)
        
        if not found_kode or not found_uraian:
            raise HTTPException(
                status_code=400, 
                detail=f"Header tidak dikenali. Pastikan ada kolom Kode ('kd_brg'/'Kode') dan Uraian ('ur_sskel'/'Nama Barang'). Ditemukan: {', '.join(df.columns)}"
            )
        
        count = 0
        batch_ops = [] # For bulk write if needed, using simple loop for now
        
        for index, row in df.iterrows():
            raw_kode = str(row.get(found_kode, ''))
            # Clean: remove dots, quotes, spaces
            kode = ''.join(filter(str.isdigit, raw_kode))
            uraian = str(row.get(found_uraian, '')).strip()
            
            if not kode or not uraian: continue
            
            # Level Logic
            level = 5 
            length = len(kode)
            if length == 1: level = 1
            elif length == 3: level = 2
            elif length == 5: level = 3
            elif length == 7: level = 4
            elif length >= 10: level = 5
            
            # Upsert
            await db.kodefikasi.update_one(
                {"kode": kode},
                {"$set": {"uraian": uraian, "level": level}},
                upsert=True
            )
            count += 1
            
        return {"message": f"Import Berhasil! {count} kode referensi tersimpan."}
        
    except HTTPException as he: raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"System Error: {str(e)}")

# ... (Existing CRUD Endpoints: create, update, delete, lookup) ...
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
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    await db.kodefikasi.delete_one({"_id": ObjectId(id)})
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
