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
