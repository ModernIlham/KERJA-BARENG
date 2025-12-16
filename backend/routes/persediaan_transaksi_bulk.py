@router.post("/in/bulk")
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
            
        # 3. Create Batch
        new_batch = PersediaanBatch(
            qty=item_req.jumlah,
            price=input_price,
            nota_dinas=payload.dokumen_ref,
            expiry=item_req.expired_date if item_req.expired_date else item.get('expired_date'),
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
        
        await db.transaksi_persediaan.insert_one(record.dict(by_alias=True, exclude=["id"]))
        results.append(item.get('nama_barang'))
        
    return {"message": f"Berhasil memproses {len(results)} item", "items": results}
