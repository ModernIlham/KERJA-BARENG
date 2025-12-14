from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
import pandas as pd
import io
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("/lookup")
async def lookup_kode(kode: str, current_user: str = Depends(get_current_user)):
    """
    Parses a 10+ digit code and returns hierarchy.
    Logic:
    Digit 1: Golongan
    Digit 1-3: Bidang
    Digit 1-5: Kelompok
    Digit 1-7: Sub Kelompok
    Digit 1-10: Sub Sub Kelompok
    """
    clean_kode = kode.replace(".", "").strip()
    result = {
        "golongan": None,
        "bidang": None,
        "kelompok": None,
        "sub_kelompok": None,
        "sub_sub_kelompok": None,
        "uraian_barang": None
    }
    
    # We try to fetch from DB 'kodefikasi' first
    # Assuming user imported the reference data.
    # If not, we fall back to some hardcoded basic logic or return empty descriptions.
    
    prefixes = []
    if len(clean_kode) >= 1: prefixes.append(clean_kode[:1])
    if len(clean_kode) >= 3: prefixes.append(clean_kode[:3])
    if len(clean_kode) >= 5: prefixes.append(clean_kode[:5])
    if len(clean_kode) >= 7: prefixes.append(clean_kode[:7])
    if len(clean_kode) >= 10: prefixes.append(clean_kode[:10])
    
    # Bulk fetch
    cursor = db.kodefikasi.find({"kode": {"$in": prefixes}})
    refs = await cursor.to_list(None)
    ref_map = {r['kode']: r['uraian'] for r in refs}
    
    # Basic Hardcoded Fallback for Golongan (Level 1) if DB empty
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
        result["golongan"] = f"{k} - {ref_map.get(k, golongan_map.get(k, 'Unknown'))}"
        
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
        result["uraian_barang"] = uraian # Suggestion for Nama Barang
        
    return result

@router.post("/import")
async def import_referensi(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    """
    Import Table 'KodefikasiBarang' from Excel
    Expected Cols: 'Kode', 'Uraian'
    """
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Excel only")
        
    try:
        contents = await file.read()
        # Read specifically 'KodefikasiBarang' sheet if possible, else first sheet
        try:
            df = pd.read_excel(io.BytesIO(contents), sheet_name='KodefikasiBarang')
        except:
            df = pd.read_excel(io.BytesIO(contents)) # Fallback
            
        df = df.where(pd.notnull(df), None)
        
        count = 0
        for index, row in df.iterrows():
            kode = str(row.get('Kode', '')).replace(".", "").strip()
            uraian = str(row.get('Uraian', '')).strip()
            
            if not kode or not uraian: continue
            
            # Determine Level based on length
            level = 0
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
            
        return {"message": f"Import Referensi Selesai. {count} data diproses."}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
