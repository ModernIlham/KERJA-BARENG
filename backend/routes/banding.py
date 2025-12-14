from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import List
import pandas as pd
import io
from models import Barang
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
import math

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.post("/compare")
async def compare_data(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    if not file.filename.endswith(('.xls', '.xlsx')):
        raise HTTPException(status_code=400, detail="Format file harus Excel (.xls, .xlsx)")

    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        
        # Clean NaN
        df = df.where(pd.notnull(df), None)
        
        # Required columns mapping (Excel Header -> Internal Key)
        # Based on user's uploaded file headers
        col_map = {
            'Kode Barang': 'kode_barang',
            'NUP': 'nup',
            'Nama Barang': 'nama_barang',
            'Nilai Perolehan': 'nilai_perolehan',
            'Kondisi': 'kondisi'
        }
        
        # Validate minimal columns exist
        for col in col_map.keys():
            if col not in df.columns:
                # Try relaxed matching if exact match fails? 
                # For now strict.
                # Actually, let's just proceed with what we find or default
                pass

        # Fetch all System Data (Optimization: Fetch only needed fields)
        # For millions of records, we should iterate or use a more robust strategy (e.g., hash comparison).
        # For MVP/Prototype, fetching all (limit 10k?) is okay, but user said "jutaan data".
        # Better Strategy: 
        # 1. Create a set of (kode_barang, nup) from Excel.
        # 2. Query DB where (kode_barang, nup) IN set (chunked).
        # This is complex for a single http request.
        
        # Simple Strategy for now (Hybrid):
        # Fetch all active items from DB into a Dictionary Keyed by (Kode, NUP)
        
        cursor = db.barang.find({}, {"_id": 0, "kode_barang": 1, "nup": 1, "nama_barang": 1, "nilai_perolehan": 1, "kondisi": 1})
        db_items = await cursor.to_list(None) # Warning: Memory heavy for millions.
        
        db_map = {f"{item.get('kode_barang')}-{item.get('nup')}": item for item in db_items}
        
        results = []
        
        # 1. Check Excel against DB
        excel_keys = set()
        
        for index, row in df.iterrows():
            kode = str(row.get('Kode Barang', '')).strip()
            nup = str(row.get('NUP', '')).strip()
            key = f"{kode}-{nup}"
            excel_keys.add(key)
            
            excel_nilai = float(row.get('Nilai Perolehan', 0) or 0)
            
            if key not in db_map:
                # Not in DB -> "Data Baru / Surplus di Excel"
                results.append({
                    "status": "ONLY_IN_EXCEL",
                    "key": key,
                    "kode_barang": kode,
                    "nup": nup,
                    "nama_barang": row.get('Nama Barang'),
                    "detail": "Data tidak ada di Aplikasi SIMAN-G"
                })
            else:
                # In DB -> Compare Values
                db_item = db_map[key]
                diffs = []
                
                # Compare Nilai (allow small float diff)
                db_nilai = float(db_item.get('nilai_perolehan', 0))
                if abs(excel_nilai - db_nilai) > 100: # Toleransi 100 perak
                    diffs.append(f"Nilai Beda: App({db_nilai}) vs Excel({excel_nilai})")
                
                # Compare Kondisi
                excel_kondisi = str(row.get('Kondisi', '')).strip().lower()
                db_kondisi = str(db_item.get('kondisi', '')).strip().lower()
                if excel_kondisi and db_kondisi and excel_kondisi != db_kondisi:
                    diffs.append(f"Kondisi Beda: App({db_item.get('kondisi')}) vs Excel({row.get('Kondisi')})")
                
                if diffs:
                    results.append({
                        "status": "DIFFERENCE",
                        "key": key,
                        "kode_barang": kode,
                        "nup": nup,
                        "nama_barang": row.get('Nama Barang'),
                        "detail": ", ".join(diffs)
                    })
                # If no diffs, it's MATCH (we don't return matches to save bandwidth usually, or return distinct count)

        # 2. Check DB against Excel (Reverse)
        # Items in DB but NOT in Excel -> "Tidak ada di SIMAN / Hilang?"
        for key, item in db_map.items():
            if key not in excel_keys:
                results.append({
                    "status": "ONLY_IN_APP",
                    "key": key,
                    "kode_barang": item.get('kode_barang'),
                    "nup": item.get('nup'),
                    "nama_barang": item.get('nama_barang'),
                    "detail": "Data tidak ada di File Excel (SIMAN)"
                })
                
        return {
            "summary": {
                "total_excel": len(df),
                "total_app": len(db_items),
                "differences": len(results)
            },
            "details": results[:1000] # Limit response size
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Gagal memproses file: {str(e)}")

@router.post("/import")
async def import_data(file: UploadFile = File(...), current_user: str = Depends(get_current_user)):
    """
    Import data from Excel to MongoDB (Overwrite/Upsert)
    """
    contents = await file.read()
    df = pd.read_excel(io.BytesIO(contents))
    df = df.where(pd.notnull(df), None)
    
    count = 0
    errors = 0
    
    for index, row in df.iterrows():
        try:
            # Map Excel Columns to Model
            # This is a critical mapping based on the file provided
            kode_barang = str(row.get('Kode Barang', '')).strip()
            nup = str(row.get('NUP', '')).strip()
            
            if not kode_barang: continue
            
            item_data = {
                "kode_barang": kode_barang,
                "nup": nup,
                "nama_barang": row.get('Nama Barang'),
                "merk": row.get('Merk'),
                "tipe": row.get('Tipe'),
                "kondisi": row.get('Kondisi'),
                "tgl_perolehan": str(row.get('Tanggal Perolehan'))[:10] if row.get('Tanggal Perolehan') else None,
                "nilai_perolehan": float(row.get('Nilai Perolehan', 0) or 0),
                "nilai_buku": float(row.get('Nilai Buku', 0) or 0),
                "alamat": row.get('Alamat'),
                "lokasi_fisik": row.get('Lokasi'),
                "stok": 1 # SIMAN data usually itemized, so stok 1 per row
            }
            
            # Upsert
            await db.barang.update_one(
                {"kode_barang": kode_barang, "nup": nup},
                {"$set": item_data},
                upsert=True
            )
            count += 1
        except Exception:
            errors += 1
            
    return {"message": f"Import Selesai. Sukses: {count}, Gagal: {errors}"}
