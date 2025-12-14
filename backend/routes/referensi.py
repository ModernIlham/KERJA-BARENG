from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
import pandas as pd
import io
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from models import Kodefikasi, KodefikasiCreate
from bson import ObjectId

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("", response_model=List[Kodefikasi])
async def get_referensi_list(
    skip: int = 0, 
    limit: int = 100, 
    search: Optional[str] = None,
    level: Optional[int] = None,
    current_user: str = Depends(get_current_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"uraian": {"$regex": search, "$options": "i"}},
            {"kode": {"$regex": search, "$options": "i"}}
        ]
    if level:
        query["level"] = level
        
    cursor = db.kodefikasi.find(query).skip(skip).limit(limit).sort("kode", 1)
    return await cursor.to_list(length=limit)

@router.post("/import")
async def import_referensi(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    """
    STRICT IMPORT for 'Master Kode Barang Referensi.xlsx'
    Mandatory Columns: 'kd_brg', 'ur_sskel'
    Logic:
    - 1 Digit: Golongan (Level 1)
    - 3 Digits: Bidang (Level 2)
    - 5 Digits: Kelompok (Level 3)
    - 7 Digits: Sub Kelompok (Level 4)
    - 10 Digits: Sub Sub Kelompok (Level 5)
    """
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="File harus format Excel (.xlsx)")
        
    try:
        contents = await file.read()
        try:
            df = pd.read_excel(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"File rusak atau tidak bisa dibaca: {str(e)}")
            
        df = df.where(pd.notnull(df), None)
        df.columns = [str(c).strip() for c in df.columns]
        
        # Strict Header Validation
        required_cols = ['kd_brg', 'ur_sskel']
        found_cols = [c for c in required_cols if c in df.columns]
        
        if len(found_cols) < len(required_cols):
            missing = set(required_cols) - set(df.columns)
            raise HTTPException(
                status_code=400, 
                detail=f"FORMAT SALAH! Kolom wajib: {', '.join(required_cols)}. "
                       f"Kolom yang ditemukan: {', '.join(df.columns)}."
            )
        
        count = 0
        for index, row in df.iterrows():
            raw_kode = str(row.get('kd_brg', ''))
            # Remove all non-numeric characters EXCEPT if needed, but standard BMN is digits.
            # Usually BMN codes like 3.01.01... are stored as '30101...' in DB for indexing.
            # We strip '.', ' ', etc.
            kode = ''.join(filter(str.isdigit, raw_kode))
            uraian = str(row.get('ur_sskel', '')).strip()
            
            if not kode or not uraian: continue
            
            # Determine Level based on Digit Length
            # 1 digit  (1)          -> Golongan
            # 3 digits (1.01)       -> Bidang
            # 5 digits (1.01.01)    -> Kelompok
            # 7 digits (1.01.01.01) -> Sub Kelompok
            # 10 digits (1.01.01.01.001) -> Sub Sub Kelompok
            
            level = 5 # Default
            length = len(kode)
            
            if length == 1: level = 1
            elif length == 3: level = 2
            elif length == 5: level = 3
            elif length == 7: level = 4
            elif length >= 10: level = 5
            else:
                # Invalid length for standard BMN, but save anyway as level 5 or skip?
                # Let's save as level 0 or Unknown to avoid data loss, or just skip logic.
                pass 
            
            await db.kodefikasi.update_one(
                {"kode": kode},
                {"$set": {"uraian": uraian, "level": level}},
                upsert=True
            )
            count += 1
            
        return {"message": f"Import Berhasil! {count} data kode barang telah tersimpan."}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"System Error: {str(e)}")

@router.get("/lookup")
async def lookup_kode(kode: str, current_user: str = Depends(get_current_user)):
    """
    Auto-Lookup logic based on 10-digit BMN Code
    """
    clean_kode = ''.join(filter(str.isdigit, kode))
    
    result = {
        "golongan": None,
        "bidang": None,
        "kelompok": None,
        "sub_kelompok": None,
        "sub_sub_kelompok": None,
        "uraian_barang": None
    }
    
    # Generate prefixes
    prefixes = []
    if len(clean_kode) >= 1: prefixes.append(clean_kode[:1])
    if len(clean_kode) >= 3: prefixes.append(clean_kode[:3])
    if len(clean_kode) >= 5: prefixes.append(clean_kode[:5])
    if len(clean_kode) >= 7: prefixes.append(clean_kode[:7])
    if len(clean_kode) >= 10: prefixes.append(clean_kode[:10])
    
    cursor = db.kodefikasi.find({"kode": {"$in": prefixes}})
    refs = await cursor.to_list(None)
    ref_map = {r['kode']: r['uraian'] for r in refs}
    
    if len(clean_kode) >= 1:
        k = clean_kode[:1]
        result["golongan"] = f"{k} - {ref_map.get(k, 'Unknown')}"
    if len(clean_kode) >= 3:
        k = clean_kode[:3]
        result["bidang"] = f"{k} - {ref_map.get(k, '')}"
    if len(clean_kode) >= 5:
        k = clean_kode[:5]
        result["kelompok"] = f"{k} - {ref_map.get(k, '')}"
    if len(clean_kode) >= 7:
        k = clean_kode[:7]
        result["sub_kelompok"] = f"{k} - {ref_map.get(k, '')}"
    if len(clean_kode) >= 10:
        k = clean_kode[:10]
        uraian = ref_map.get(k, '')
        result["sub_sub_kelompok"] = f"{k} - {uraian}"
        result["uraian_barang"] = uraian
        
    return result
