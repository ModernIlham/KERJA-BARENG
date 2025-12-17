from fastapi import APIRouter, HTTPException, Depends, Body, Query, UploadFile, File, Form
from typing import List, Dict, Optional
from models import TransaksiPersediaan, TransaksiPersediaanCreate, Persediaan, PersediaanBatch, TransaksiPersediaanBulkCreate
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId
from datetime import datetime, timezone
import math
from lib.image_processor import process_image_upload

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Helper to sanitize
def sanitize_json(data):
    if isinstance(data, list):
        return [sanitize_json(item) for item in data]
    elif isinstance(data, dict):
        return {k: sanitize_json(v) for k, v in data.items()}
    elif isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, float) and (math.isnan(data) or math.isinf(data)):
        return 0.0
    return data

@router.get("/", response_model=Dict)
async def get_all_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    query = {}
    if search:
        query["$or"] = [
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"kode_barang": {"$regex": search, "$options": "i"}},
            {"dokumen_ref": {"$regex": search, "$options": "i"}},
            {"keterangan": {"$regex": search, "$options": "i"}}
        ]
        
    total = await db.transaksi_persediaan.count_documents(query)
    skip = (page - 1) * limit
    
    cursor = db.transaksi_persediaan.find(query).sort("timestamp", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=limit)
    
    return {
        "data": sanitize_json(items),
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0
    }

# ... (Existing endpoints: /in, /out, /history/{id} remain below) ...

@router.post("/in")
async def stock_in(txn: TransaksiPersediaanCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(txn.persediaan_id):
        raise HTTPException(status_code=400, detail="Invalid Persediaan ID")
    
    # 1. Get current item
    item = await db.persediaan.find_one({"_id": ObjectId(txn.persediaan_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Persediaan not found")
    
    current_stok = item.get('stok', 0)
    current_nilai = item.get('nilai_satuan', 0)
    
    # Use provided price or fallback to current average
    input_price = txn.nilai_satuan if (txn.nilai_satuan is not None and txn.nilai_satuan > 0) else current_nilai
    
    # 2. Calculate Weighted Average Price (for reference/display)
    new_stok = current_stok + txn.jumlah
    new_nilai = 0
    if new_stok > 0:
        total_value_old = current_stok * current_nilai
        total_value_new = txn.jumlah * input_price
        new_nilai = (total_value_old + total_value_new) / new_stok
    
    # Helper to safely parse expiry
    expiry_val = txn.expired_date
    if not expiry_val:
            expiry_val = item.get('expired_date')
    
    if expiry_val == "":
        expiry_val = None

    # 3. Create New Batch (FIFO)
    new_batch = PersediaanBatch(
        qty=txn.jumlah,
        price=input_price,
        nota_dinas=txn.dokumen_ref,
        expiry=expiry_val,
        date=datetime.now(timezone.utc)
    )
    
    # 4. Update Persediaan
    update_data = {
        "stok": new_stok,
        "nilai_satuan": new_nilai,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if txn.expired_date:
        update_data["expired_date"] = txn.expired_date
        
    await db.persediaan.update_one(
        {"_id": ObjectId(txn.persediaan_id)},
        {
            "$set": update_data,
            "$push": {"batches": new_batch.dict()}
        }
    )
    
    # 5. Create Transaction Record
    record = TransaksiPersediaan(
        jenis="in",
        persediaan_id=txn.persediaan_id,
        kode_barang=item.get('kode_barang'),
        nup=item.get('nup'),
        nama_barang=item.get('nama_barang'),
        batch_number=new_batch.batch_id, 
        expired_date=txn.expired_date,
        jumlah=txn.jumlah,
        nilai_satuan=input_price,
        total_nilai=txn.jumlah * input_price,
        stok_sebelum=current_stok,
        stok_sesudah=new_stok,
        pegawai_id=txn.pegawai_id,
        keterangan=txn.keterangan,
        dokumen_ref=txn.dokumen_ref,
        petugas=current_user,
        timestamp=datetime.now(timezone.utc)
    )
    
    await db.transaksi_persediaan.insert_one(record.dict(by_alias=True, exclude=["id"]))
    
    return {"message": "Stock In successful", "new_stok": new_stok, "new_nilai": new_nilai, "id": str(record.id)}

@router.post("/out")
async def stock_out(txn: TransaksiPersediaanCreate, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(txn.persediaan_id):
        raise HTTPException(status_code=400, detail="Invalid Persediaan ID")
    
    # 1. Get current item
    item = await db.persediaan.find_one({"_id": ObjectId(txn.persediaan_id)})
    if not item:
        raise HTTPException(status_code=404, detail="Persediaan not found")
    
    current_stok = item.get('stok', 0)
    
    # 2. Validate Stock
    if current_stok < txn.jumlah:
        raise HTTPException(status_code=400, detail=f"Stok tidak cukup. Stok saat ini: {current_stok}")
    
    # --- FIFO LOGIC ---
    batches_data = item.get('batches', [])
    # Convert to objects for easier handling, assuming they match schema
    # Note: If migrating from old data without batches, we might have an issue.
    # Handle legacy data: create a dummy batch for existing stock if batches is empty but stock > 0
    if not batches_data and current_stok > 0:
        dummy_batch = PersediaanBatch(
            qty=current_stok,
            price=item.get('nilai_satuan', 0),
            date=item.get('created_at', datetime.now(timezone.utc)),
            nota_dinas="LEGACY_STOCK"
        )
        batches_data = [dummy_batch.dict()]
    
    # Sort by date
    batches_data.sort(key=lambda x: x.get('date', datetime.min))
    
    remaining_needed = txn.jumlah
    total_cost_out = 0
    updated_batches = []
    consumed_info = []
    
    for b_data in batches_data:
        # We work with dicts directly to preserve IDs etc
        b_qty = b_data.get('qty', 0)
        b_price = b_data.get('price', 0)
        
        if remaining_needed <= 0:
            updated_batches.append(b_data)
            continue
            
        if b_qty > remaining_needed:
            # Partial take
            cost = remaining_needed * b_price
            total_cost_out += cost
            
            b_data['qty'] = b_qty - remaining_needed
            consumed_info.append(f"{remaining_needed} @ {b_price}")
            remaining_needed = 0
            updated_batches.append(b_data)
        else:
            # Full take
            cost = b_qty * b_price
            total_cost_out += cost
            
            remaining_needed -= b_qty
            consumed_info.append(f"{b_qty} @ {b_price} (All)")
            # Do not append to updated_batches
            
    new_stok = current_stok - txn.jumlah
    
    # 3. Update Persediaan
    update_data = {
        "stok": new_stok,
        "batches": updated_batches,
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.persediaan.update_one(
        {"_id": ObjectId(txn.persediaan_id)},
        {"$set": update_data}
    )
    
    # 4. Create Transaction Record
    avg_price_out = total_cost_out / txn.jumlah if txn.jumlah > 0 else 0
    
    record = TransaksiPersediaan(
        jenis="out",
        persediaan_id=txn.persediaan_id,
        kode_barang=item.get('kode_barang'),
        nup=item.get('nup'),
        nama_barang=item.get('nama_barang'),
        batch_number="FIFO_MIX", # multiple batches potentially
        expired_date=item.get('expired_date'),
        jumlah=txn.jumlah,
        nilai_satuan=avg_price_out, 
        total_nilai=total_cost_out,
        stok_sebelum=current_stok,
        stok_sesudah=new_stok,
        unit_penerima=txn.unit_penerima,
        pegawai_id=txn.pegawai_id,
        keterangan=f"{txn.keterangan or ''} [FIFO: {', '.join(consumed_info)}]",
        dokumen_ref=txn.dokumen_ref,
        petugas=current_user,
        timestamp=datetime.now(timezone.utc)
    )
    
    await db.transaksi_persediaan.insert_one(record.dict(by_alias=True, exclude=["id"]))
    
    return {"message": "Stock Out successful", "new_stok": new_stok, "id": str(record.id)}

@router.get("/history/{persediaan_id}")
async def get_history(persediaan_id: str, current_user: str = Depends(get_current_user)):
    if not ObjectId.is_valid(persediaan_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    cursor = db.transaksi_persediaan.find({"persediaan_id": persediaan_id}).sort("timestamp", -1)
    history = await cursor.to_list(length=100)
    return sanitize_json(history)
@router.post("/in/bulk")
    created_ids = []
async def stock_in_bulk(payload: TransaksiPersediaanBulkCreate, current_user: str = Depends(get_current_user)):
    results = []
    
    for item_req in payload.items:
        if not ObjectId.is_valid(item_req.persediaan_id):
            continue
            
        # 1. Get current item
        item = await db.persediaan.find_one({"_id": ObjectId(item_req.persediaan_id)})
        if not item:
            continue
            
        current_stok = item.get('stok', 0)
        current_nilai = item.get('nilai_satuan', 0)
        
        input_price = item_req.nilai_satuan if item_req.nilai_satuan > 0 else current_nilai
        
        # 2. Calc Weighted Avg
        new_stok = current_stok + item_req.jumlah
        new_nilai = 0
        if new_stok > 0:
            total_value_old = current_stok * current_nilai
            total_value_new = item_req.jumlah * input_price
            new_nilai = (total_value_old + total_value_new) / new_stok
            
        # Helper to safely parse expiry
        expiry_val = item_req.expired_date
        if not expiry_val:
             expiry_val = item.get('expired_date')
        
        if expiry_val == "":
            expiry_val = None
            
        # 3. Create Batch
        new_batch = PersediaanBatch(
            qty=item_req.jumlah,
            price=input_price,
            nota_dinas=payload.dokumen_ref,
            expiry=expiry_val,
            date=datetime.now(timezone.utc)
        )
        
        # 4. Update Persediaan
        update_data = {
            "stok": new_stok,
            "nilai_satuan": new_nilai,
            "updated_at": datetime.now(timezone.utc)
        }
        if item_req.expired_date:
            update_data["expired_date"] = item_req.expired_date
            
        await db.persediaan.update_one(
            {"_id": ObjectId(item_req.persediaan_id)},
            {
                "$set": update_data,
                "$push": {"batches": new_batch.dict()}
            }
        )
        
        # 5. Create Record
        record = TransaksiPersediaan(
            jenis="in",
            persediaan_id=item_req.persediaan_id,
            kode_barang=item.get('kode_barang'),
            nup=item.get('nup'),
            nama_barang=item.get('nama_barang'),
            batch_number=new_batch.batch_id,
            expired_date=item_req.expired_date,
            jumlah=item_req.jumlah,
            nilai_satuan=input_price,
            total_nilai=item_req.jumlah * input_price,
            stok_sebelum=current_stok,
            stok_sesudah=new_stok,
            pegawai_id=payload.pegawai_id,
            keterangan=payload.keterangan,
            dokumen_ref=payload.dokumen_ref,
            petugas=current_user,
            timestamp=datetime.now(timezone.utc)
        )
        
        res_insert = await db.transaksi_persediaan.insert_one(record.dict(by_alias=True, exclude=["id"]))
        created_ids.append(str(res_insert.inserted_id))
        results.append(item.get('nama_barang'))
        
    return {"message": f"Berhasil memproses {len(results)} item", "items": results, "ids": created_ids}
    created_ids = []
@router.post("/out/bulk")
async def stock_out_bulk(payload: TransaksiPersediaanBulkCreate, current_user: str = Depends(get_current_user)):
    results = []
    
    for item_req in payload.items:
        if not ObjectId.is_valid(item_req.persediaan_id):
            continue
            
        # 1. Get current item
        item = await db.persediaan.find_one({"_id": ObjectId(item_req.persediaan_id)})
        if not item:
            continue
            
        current_stok = item.get('stok', 0)
        current_nilai = item.get('nilai_satuan', 0)
        
        # 2. Validate Stock
        if current_stok < item_req.jumlah:
            # Skip this item or raise? Let's skip and report error for this item?
            # Or assume frontend checks. Let's just process what we can or fail all?
            # Bulk operations usually fail all if one fails or partial.
            # Let's simple check: if fail, just continue with others but maybe log?
            # User wants robust system.
            # Let's skip this item
            print(f"Skipping {item.get('nama_barang')}: Insufficient stock")
            continue
            
        # --- FIFO LOGIC ---
        batches_data = item.get('batches', [])
        if not batches_data and current_stok > 0:
            dummy_batch = PersediaanBatch(
                qty=current_stok,
                price=item.get('nilai_satuan', 0),
                date=item.get('created_at', datetime.now(timezone.utc)),
                nota_dinas="LEGACY_STOCK"
            )
            batches_data = [dummy_batch.dict()]
        
        batches_data.sort(key=lambda x: x.get('date', datetime.min))
        
        remaining_needed = item_req.jumlah
        total_cost_out = 0
        updated_batches = []
        consumed_info = []
        
        for b_data in batches_data:
            b_qty = b_data.get('qty', 0)
            b_price = b_data.get('price', 0)
            
            if remaining_needed <= 0:
                updated_batches.append(b_data)
                continue
                
            if b_qty > remaining_needed:
                cost = remaining_needed * b_price
                total_cost_out += cost
                b_data['qty'] = b_qty - remaining_needed
                consumed_info.append(f"{remaining_needed} @ {b_price} (Batch: {b_data.get('nota_dinas', '-')})")
                remaining_needed = 0
                updated_batches.append(b_data)
            else:
                cost = b_qty * b_price
                total_cost_out += cost
                remaining_needed -= b_qty
                consumed_info.append(f"{b_qty} @ {b_price} (All) (Batch: {b_data.get('nota_dinas', '-')})")
                
        new_stok = current_stok - item_req.jumlah
        
        # 3. Update Persediaan
        update_data = {
            "stok": new_stok,
            "batches": updated_batches,
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.persediaan.update_one(
            {"_id": ObjectId(item_req.persediaan_id)},
            {"$set": update_data}
        )
        
        # 4. Create Record
        avg_price_out = total_cost_out / item_req.jumlah if item_req.jumlah > 0 else 0
        
        record = TransaksiPersediaan(
            jenis="out",
            persediaan_id=item_req.persediaan_id,
            kode_barang=item.get('kode_barang'),
            nup=item.get('nup'),
            nama_barang=item.get('nama_barang'),
            batch_number="FIFO_MIX",
            expired_date=item.get('expired_date'),
            jumlah=item_req.jumlah,
            nilai_satuan=avg_price_out,
            total_nilai=total_cost_out,
            stok_sebelum=current_stok,
            stok_sesudah=new_stok,
            # Unit penerima is passed via keterangan/dokumen_ref context usually?
            # Or we need to add unit_penerima to bulk item model?
            # The BulkCreate model has global fields.
            # Let's check models.py
            unit_penerima=payload.unit_penerima, 
            # Wait, user wants "Unit Penerima" in header? Or per item?
            # In the image, "Unit Penerima" is usually per transaction header.
            # But TransaksiPersediaan has unit_penerima field.
            # I should assume payload.keterangan contains unit info or add a field to BulkCreate.
            # Let's modify BulkCreate model to include unit_penerima?
            # Or just use keterangan.
            pegawai_id=payload.pegawai_id,
            keterangan=f"{payload.keterangan or ''} [FIFO: {', '.join(consumed_info)}]",
            dokumen_ref=payload.dokumen_ref,
            petugas=current_user,
            timestamp=datetime.now(timezone.utc)
        )
        
        res_insert = await db.transaksi_persediaan.insert_one(record.dict(by_alias=True, exclude=["id"]))
        created_ids.append(str(res_insert.inserted_id))
        results.append(item.get('nama_barang'))
        
    return {"message": f"Berhasil memproses {len(results)} item keluar", "items": results, "ids": created_ids}

@router.post("/upload-bukti")
async def upload_bukti_bulk(
    ids: str = Form(...), # Comma separated IDs
    file: UploadFile = File(...),
    current_user: str = Depends(get_current_user)
):
    try:
        # Validate image
        if not file.content_type.startswith("image/"):
             raise HTTPException(status_code=400, detail="File must be an image")

        # Process upload
        result = await process_image_upload(file, "bukti_transaksi", db)
        
        foto_data = {
            "url": f"/api/uploads/{result['optimized']}",
            "uploaded_at": datetime.now(timezone.utc)
        }
        
        # Parse IDs
        id_list = [ObjectId(i.strip()) for i in ids.split(",") if ObjectId.is_valid(i.strip())]
        
        if not id_list:
            raise HTTPException(status_code=400, detail="No valid IDs provided")
            
        # Update Transactions
        res = await db.transaksi_persediaan.update_many(
            {"_id": {"$in": id_list}},
            {"$push": {"bukti_fotos": foto_data}}
        )
            
        return {"message": "Bukti berhasil diupload", "data": foto_data, "updated": res.modified_count}
        
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

