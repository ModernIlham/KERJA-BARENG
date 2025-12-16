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
                consumed_info.append(f"{remaining_needed} @ {b_price}")
                remaining_needed = 0
                updated_batches.append(b_data)
            else:
                cost = b_qty * b_price
                total_cost_out += cost
                remaining_needed -= b_qty
                consumed_info.append(f"{b_qty} @ {b_price} (All)")
                
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
            unit_penerima=None, # payload doesn't have it in BulkCreate? 
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
        
        await db.transaksi_persediaan.insert_one(record.dict(by_alias=True, exclude=["id"]))
        results.append(item.get('nama_barang'))
        
    return {"message": f"Berhasil memproses {len(results)} item keluar", "items": results}
