    # ... imports remain same ...
    
    # NEW ENDPOINT FOR GROUPED HISTORY
@router.get("/grouped", response_model=Dict)
async def get_grouped_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    # 1. Build Query
    query = {}
    if search:
        query["$or"] = [
            {"nama_barang": {"$regex": search, "$options": "i"}},
            {"dokumen_ref": {"$regex": search, "$options": "i"}},
            {"no_bukti": {"$regex": search, "$options": "i"}},
            {"keterangan": {"$regex": search, "$options": "i"}}
        ]

    # 2. Aggregation Pipeline
    pipeline = [
        { "$match": query },
        { "$sort": { "timestamp": -1 } },
        { "$group": {
            "_id": {
                "dokumen_ref": { "$ifNull": ["$dokumen_ref", ""] },
                "no_bukti": { "$ifNull": ["$no_bukti", ""] },
                "jenis": "$jenis",
                # Group by timestamp (rounded to minute to catch bulk inserts)
                # "time_bucket": { 
                #    "$dateToString": { "format": "%Y-%m-%d %H:%M", "date": "$timestamp" } 
                # }
                # Actually, simpler: just group by Doc Ref if exists. 
                # If Doc Ref is empty, use _id (unique group per item)
            },
            "timestamp": { "$first": "$timestamp" },
            "total_items": { "$sum": 1 },
            "total_nilai": { "$sum": "$total_nilai" },
            "keterangan": { "$first": "$keterangan" },
            "petugas": { "$first": "$petugas" },
            "unit_penerima": { "$first": "$unit_penerima" },
            "bukti_fotos": { "$first": "$bukti_fotos" },
            "items": { "$push": {
                "_id": "$_id",
                "nama_barang": "$nama_barang",
                "kode_barang": "$kode_barang",
                "jumlah": "$jumlah",
                "nilai_satuan": "$nilai_satuan",
                "total_nilai": "$total_nilai",
                "stok_sebelum": "$stok_sebelum",
                "stok_sesudah": "$stok_sesudah",
                "batch_number": "$batch_number",
                "expired_date": "$expired_date"
            }}
        }},
        # Handle cases where Doc Ref is empty -> Split back to single items?
        # Actually, if I group by empty string, ALL items without doc ref go to ONE big group.
        # FIX: We need a smarter ID.
        { "$addFields": {
            "group_id_val": {
                "$cond": {
                    "if": { "$eq": ["$_id.dokumen_ref", ""] },
                    "then": { "$toString": "$_id" }, # Unique ID if no doc
                    "else": "$_id.dokumen_ref"
                }
            }
        }},
        # Re-sort after grouping
        { "$sort": { "timestamp": -1 } },
        # Pagination
        { "$facet": {
            "metadata": [ { "$count": "total" } ],
            "data": [ { "$skip": (page - 1) * limit }, { "$limit": limit } ]
        }}
    ]
    
    # We need a better Grouping Strategy for "No Document" items.
    # The current Strategy puts all "" documents into one group bucket (per jenis/time).
    # Correct Strategy:
    # If `dokumen_ref` is present, use it.
    # If NOT present, use `_id` as the grouping key (so it stays single).
    
    # Improved Pipeline
    pipeline_v2 = [
        { "$match": query },
        { "$addFields": {
            "group_key": {
                "$cond": {
                    "if": { "$and": [
                        { "$ne": ["$dokumen_ref", None] },
                        { "$ne": ["$dokumen_ref", ""] }
                    ]},
                    "then": { 
                        "doc": "$dokumen_ref", 
                        "bukti": "$no_bukti",
                        "jenis": "$jenis",
                        # Add date to key to split same doc ref used on different days?
                        "day": { "$dateToString": { "format": "%Y-%m-%d", "date": "$timestamp" } }
                    },
                    "else": "$_id" # Unique Group
                }
            }
        }},
        { "$sort": { "timestamp": -1 } },
        { "$group": {
            "_id": "$group_key",
            "timestamp": { "$first": "$timestamp" },
            "dokumen_ref": { "$first": "$dokumen_ref" },
            "no_bukti": { "$first": "$no_bukti" },
            "jenis": { "$first": "$jenis" },
            "total_items": { "$sum": 1 },
            "total_nilai": { "$sum": "$total_nilai" },
            "keterangan": { "$first": "$keterangan" },
            "petugas": { "$first": "$petugas" },
            "unit_penerima": { "$first": "$unit_penerima" },
            "bukti_fotos": { "$first": "$bukti_fotos" },
            "items": { "$push": {
                "_id": "$_id",
                "nama_barang": "$nama_barang",
                "kode_barang": "$kode_barang",
                "jumlah": "$jumlah",
                "nilai_satuan": "$nilai_satuan",
                "total_nilai": "$total_nilai",
                "stok_sebelum": "$stok_sebelum",
                "stok_sesudah": "$stok_sesudah",
                "batch_number": "$batch_number",
                "expired_date": "$expired_date"
            }}
        }},
        { "$sort": { "timestamp": -1 } },
        { "$facet": {
            "metadata": [ { "$count": "total" } ],
            "data": [ { "$skip": (page - 1) * limit }, { "$limit": limit } ]
        }}
    ]

    result = await db.transaksi_persediaan.aggregate(pipeline_v2).to_list(length=1)
    
    metadata = result[0]['metadata']
    total = metadata[0]['total'] if metadata else 0
    data = result[0]['data']
    
    return {
        "data": sanitize_json(data),
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": math.ceil(total / limit) if total > 0 else 0
    }
