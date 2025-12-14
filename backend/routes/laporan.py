from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
from auth import get_current_user
from motor.motor_asyncio import AsyncIOMotorClient
import os
from bson import ObjectId

router = APIRouter()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

@router.get("/kartu-gudang")
async def get_kartu_gudang(
    barang_id: str,
    start_date: Optional[str] = None, # YYYY-MM-DD
    end_date: Optional[str] = None,
    current_user: str = Depends(get_current_user)
):
    """
    Generates 'Kartu Gudang' (Stock Card)
    Shows running balance: Date | Doc | In | Out | Balance
    """
    if not ObjectId.is_valid(barang_id):
        raise HTTPException(status_code=400, detail="Invalid ID")
        
    # 1. Get Barang Info
    barang = await db.barang.find_one({"_id": ObjectId(barang_id)})
    if not barang:
        raise HTTPException(status_code=404, detail="Barang not found")
        
    # 2. Build Query
    query = {"barang_id": barang_id}
    
    # Filter Date
    # For running balance, we need ALL history OR calculated initial balance.
    # Calculating initial balance is safer.
    
    all_tx = await db.transaksi.find(query).sort("timestamp", 1).to_list(None)
    
    report_data = []
    saldo = 0
    
    # Filter logic
    sd = datetime.strptime(start_date, "%Y-%m-%d") if start_date else datetime.min
    ed = datetime.strptime(end_date, "%Y-%m-%d") if end_date else datetime.max
    
    # Adjust for Timezone aware comparison
    # simple comparison
    
    for tx in all_tx:
        # Update Balance
        masuk = 0
        keluar = 0
        
        if tx['jenis'] in ['MASUK', 'SALDO_AWAL']:
            masuk = tx['jumlah']
            saldo += masuk
        elif tx['jenis'] == 'KELUAR':
            keluar = tx['jumlah']
            saldo -= keluar
        elif tx['jenis'] == 'PENYESUAIAN':
            # This is tricky. Penyesuaian sets the stock absolute.
            # We treat diff.
            # If current saldo = 10, and Penyesuaian = 12. Diff = +2 (Masuk)
            # If current saldo = 10, and Penyesuaian = 8. Diff = -2 (Keluar)
            
            # However, transaction record for 'PENYESUAIAN' usually stores the TARGET quantity in 'jumlah'
            # based on my previous code. 
            # WAIT: In my `transaksi.py` code for OPNAME, I stored `jumlah` as the ACTUAL physical count.
            # And I didn't store the Diff explicitly as a number column, only in Keterangan.
            # This makes running balance calc hard.
            
            # Correction: We should have stored the DIFF in transaction or handle it here.
            # Let's assume for now Penyesuaian `jumlah` IS the new balance.
            target = tx['jumlah']
            diff = target - saldo
            if diff > 0:
                masuk = diff
            else:
                keluar = abs(diff)
            saldo = target
            
        # Add to report if within range
        tx_date = tx['timestamp'].replace(tzinfo=None)
        if sd <= tx_date <= ed:
            report_data.append({
                "tanggal": tx['timestamp'],
                "no_dokumen": tx.get('dokumen_ref', '-'),
                "keterangan": tx.get('keterangan', '-'),
                "masuk": masuk,
                "keluar": keluar,
                "saldo": saldo
            })
            
    return {
        "barang": barang,
        "periode": {"start": start_date, "end": end_date},
        "mutasi": report_data
    }

@router.get("/stok-opname-report")
async def get_opname_report(current_user: str = Depends(get_current_user)):
    """
    Returns data for 'Laporan Hasil Opname'
    """
    # Simple list of Opname logs
    data = await db.opname.find().sort("tanggal", -1).to_list(100)
    return data
