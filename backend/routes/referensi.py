from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
import pandas as pd
import io
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from models import Kodefikasi, KodefikasiCreate # Assuming models.py exists with these
from bson import ObjectId

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# ... existing endpoints ...

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
    if existing:
        raise HTTPException(status_code=400, detail="Kode sudah ada")
        
    new_ref = Kodefikasi(kode=clean_kode, uraian=item.uraian, level=level)
    res = await db.kodefikasi.insert_one(new_ref.model_dump(by_alias=True, exclude=["id"]))
    return await db.kodefikasi.find_one({"_id": res.inserted_id})

@router.put("/{id}", response_model=Kodefikasi)
async def update_referensi(id: str, item: KodefikasiCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    clean_kode = item.kode.replace(".", "").strip()
    await db.kodefikasi.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"kode": clean_kode, "uraian": item.uraian}}
    )
    return await db.kodefikasi.find_one({"_id": ObjectId(id)})

@router.delete("/{id}")
async def delete_referensi(id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(id): raise HTTPException(status_code=400)
    await db.kodefikasi.delete_one({"_id": ObjectId(id)})
    return {"message": "Deleted"}

@router.get("/lookup")
async def lookup_kode(kode: str, current_user: str = Depends(get_current_user)):
    # ... logic same as before ...
    clean_kode = kode.replace(".", "").strip()
    result = {
        "golongan": None,
        "bidang": None,
        "kelompok": None,
        "sub_kelompok": None,
        "sub_sub_kelompok": None,
        "uraian_barang": None
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
    
    # Simple hardcoded fallback for Level 1 if needed
    golongan_map = {"1": "Persediaan", "2": "Tanah", "3": "Peralatan", "4": "Gedung", "5": "Jalan", "6": "Lainnya"}
    
    if len(clean_kode) >= 1:
        k = clean_kode[:1]
        result["golongan"] = f"{k} - {ref_map.get(k, golongan_map.get(k, ''))}"
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

@router.post("/import")
async def import_referensi(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    """
    STRICT IMPORT for 'Master Kode Barang Referensi.xlsx'
    Mandatory Columns: 'kd_brg', 'ur_sskel'
    """
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="File harus format Excel (.xlsx)")
        
    try:
        contents = await file.read()
        try:
            # Try finding correct sheet or read active
            df = pd.read_excel(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"File rusak atau tidak bisa dibaca: {str(e)}")
            
        df = df.where(pd.notnull(df), None)
        
        # --- STRICT VALIDATION START ---
        # Normalize columns (lowercase, strip)
        df.columns = [str(c).strip() for c in df.columns]
        
        # Required columns mapping based on user file: 'kd_brg' and 'ur_sskel'
        required_cols = ['kd_brg', 'ur_sskel']
        found_cols = [c for c in required_cols if c in df.columns]
        
        if len(found_cols) < len(required_cols):
            # Detailed Error
            missing = set(required_cols) - set(df.columns)
            raise HTTPException(
                status_code=400, 
                detail=f"FORMAT SALAH! Kolom wajib tidak ditemukan: {', '.join(missing)}. "
                       f"Kolom yang ada: {', '.join(df.columns)}. "
                       f"Gunakan Template yang disediakan."
            )
        # --- STRICT VALIDATION END ---
        
        count = 0
        batch_ops = []
        
        for index, row in df.iterrows():
            raw_kode = str(row.get('kd_brg', ''))
            kode = raw_kode.replace(".", "").replace("'", "").strip()
            uraian = str(row.get('ur_sskel', '')).strip()
            
            if not kode or not uraian or kode.lower() == 'nan': 
                continue
            
            # Determine Level
            level = 5
            if len(kode) == 1: level = 1
            elif len(kode) == 3: level = 2
            elif len(kode) == 5: level = 3
            elif len(kode) == 7: level = 4
            elif len(kode) >= 10: level = 5
            
            # Use upsert one by one for simplicity in this stack, or bulk write for speed
            # For 15k rows, single updates might be slow but safe.
            # Let's trust single update for now or use bulk write if slow.
            
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"System Error: {str(e)}")
