from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from typing import List, Optional
from models import Kodefikasi
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
import pandas as pd
import io
import csv

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# --- Models ---
from pydantic import BaseModel
class KodefikasiCreate(BaseModel):
    kode: str
    uraian: str
    level: Optional[int] = None

# --- Endpoints ---

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
    
    golongan_map = {
        "1": "Persediaan",
        "2": "Tanah",
        "3": "Peralatan dan Mesin",
        "4": "Gedung dan Bangunan",
        "5": "Jalan, Irigasi dan Jaringan",
        "6": "Aset Tetap Lainnya",
        "7": "Konstruksi dalam Pengerjaan",
        "8": "Aset Tak Berwujud"
    }
    
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
    Import Table 'KodefikasiBarang' from Excel or CSV
    Smart column detection.
    """
    if not file.filename.endswith(('.xls', '.xlsx', '.csv')):
        raise HTTPException(status_code=400, detail="File harus Excel (.xlsx) atau CSV (.csv)")
        
    try:
        contents = await file.read()
        
        # Read file based on extension
        if file.filename.endswith('.csv'):
            # Try sniffing delimiters commonly used
            try:
                # Assuming utf-8 encoding first
                df = pd.read_csv(io.BytesIO(contents))
            except:
                # Try latin-1 if utf-8 fails
                df = pd.read_csv(io.BytesIO(contents), encoding='latin-1')
        else:
            try:
                df = pd.read_excel(io.BytesIO(contents), sheet_name='KodefikasiBarang')
            except:
                df = pd.read_excel(io.BytesIO(contents)) 
            
        df = df.where(pd.notnull(df), None)
        
        # Normalize columns to lowercase for matching
        df.columns = [c.strip().lower() for c in df.columns]
        
        # Identify columns
        col_kode = None
        col_uraian = None
        
        # Priority map for Code
        for candidate in ['kode', 'kd_brg', 'kd_sskel', 'kd_aset', 'kode barang']:
            if candidate in df.columns:
                col_kode = candidate
                break
                
        # Priority map for Uraian
        for candidate in ['uraian', 'ur_sskel', 'ur_brg', 'nama barang', 'nama_barang']:
            if candidate in df.columns:
                col_uraian = candidate
                break
        
        if not col_kode or not col_uraian:
            raise HTTPException(status_code=400, detail=f"Kolom tidak ditemukan. Wajib ada: Kode, Uraian. Ditemukan: {list(df.columns)}")
        
        count = 0
        for index, row in df.iterrows():
            raw_kode = str(row.get(col_kode, ''))
            
            # Clean weird chars
            kode = raw_kode.replace(".", "").replace("'", "").replace('"', "").strip()
            uraian = str(row.get(col_uraian, '')).strip()
            
            if not kode or not uraian or kode.lower() == 'nan': continue
            
            # Determine Level
            level = 5
            if len(kode) == 1: level = 1
            elif len(kode) == 3: level = 2
            elif len(kode) == 5: level = 3
            elif len(kode) == 7: level = 4
            elif len(kode) >= 10: level = 5
            
            await db.kodefikasi.update_one(
                {"kode": kode},
                {"$set": {"uraian": uraian, "level": level}},
                upsert=True
            )
            count += 1
            
        return {"message": f"Import Selesai. {count} kodefikasi berhasil diproses."}
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Gagal memproses file: {str(e)}")
