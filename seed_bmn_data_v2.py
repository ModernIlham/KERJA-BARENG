import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import random
import os

# --- CONFIG ---
MONGO_URL = os.environ.get('MONGO_URL', "mongodb://localhost:27017")
DB_NAME = os.environ.get('DB_NAME', "siman_g_db")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def seed_data():
    print("🧹 Cleaning old data...")
    # Don't delete everything, just seed specific test data if needed or clear if requested.
    # The previous run said "Inserted 0 assets". Why?
    # Because items loop was empty?
    # Ah, I see the previous file text had `items = [...]`.
    
    # Let's verify if db is connected.
    try:
        await db.command("ping")
        print("Connected to MongoDB.")
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    # Delete previous seed data
    await db.barang.delete_many({"source": "seeder"})
    await db.transaksi.delete_many({"source": "seeder"})
    
    print("🌱 Seeding Barang (Aset Tetap)...")
    
    items = [
        # Tanah (3.01...)
        {"kode": "3.01.01.01.001", "nama": "Tanah Kantor Pusat", "nilai": 15000000000, "kondisi": "Baik", "gol": "3.01 - Tanah"},
        {"kode": "3.01.01.01.002", "nama": "Tanah Rumah Dinas", "nilai": 5000000000, "kondisi": "Baik", "gol": "3.01 - Tanah"},
        
        # Gedung (3.03...)
        {"kode": "3.03.01.01.001", "nama": "Gedung Kantor Utama", "nilai": 8500000000, "kondisi": "Baik", "gol": "3.03 - Gedung"},
        {"kode": "3.03.01.02.001", "nama": "Gedung Gudang Arsip", "nilai": 2500000000, "kondisi": "Rusak Ringan", "gol": "3.03 - Gedung"},
        {"kode": "3.03.02.01.001", "nama": "Rumah Negara Golongan I", "nilai": 1200000000, "kondisi": "Baik", "gol": "3.03 - Gedung"},
        
        # Peralatan & Mesin (3.02...) - Vehicles
        {"kode": "3.02.01.01.001", "nama": "Mobil Dinas Toyota Innova", "nilai": 450000000, "kondisi": "Baik", "merk": "Toyota", "tipe": "Innova", "gol": "3.02 - Peralatan"},
        {"kode": "3.02.01.01.002", "nama": "Mobil Dinas Mitsubishi Avanza", "nilai": 300000000, "kondisi": "Baik", "merk": "Mitsubishi", "tipe": "Avanza", "gol": "3.02 - Peralatan"},
        {"kode": "3.02.01.04.001", "nama": "Sepeda Motor Honda Vario", "nilai": 25000000, "kondisi": "Baik", "merk": "Honda", "tipe": "Vario", "gol": "3.02 - Peralatan"},
        {"kode": "3.02.01.04.002", "nama": "Sepeda Motor Yamaha Beat", "nilai": 22000000, "kondisi": "Rusak Berat", "merk": "Yamaha", "tipe": "Beat", "gol": "3.02 - Peralatan"},
        
        # Peralatan IT
        {"kode": "3.02.03.01.001", "nama": "Laptop Lenovo Thinkpad", "nilai": 18000000, "kondisi": "Baik", "merk": "Lenovo", "tipe": "X1 Carbon", "gol": "3.02 - Peralatan"},
        {"kode": "3.02.03.01.002", "nama": "Laptop Dell Latitude", "nilai": 15000000, "kondisi": "Baik", "merk": "Dell", "tipe": "Latitude", "gol": "3.02 - Peralatan"},
        {"kode": "3.02.03.01.003", "nama": "PC All-in-One HP", "nilai": 12000000, "kondisi": "Baik", "merk": "HP", "tipe": "ProOne", "gol": "3.02 - Peralatan"},
        {"kode": "3.02.03.04.001", "nama": "Printer Epson L3110", "nilai": 3500000, "kondisi": "Rusak Ringan", "merk": "Epson", "tipe": "L3110", "gol": "3.02 - Peralatan"},
        
        # Furniture
        {"kode": "3.02.04.01.001", "nama": "Meja Kerja Pejabat", "nilai": 5000000, "kondisi": "Baik", "merk": "Informa", "gol": "3.02 - Peralatan"},
        {"kode": "3.02.04.01.002", "nama": "Kursi Kerja Staff", "nilai": 1500000, "kondisi": "Baik", "merk": "Chitose", "gol": "3.02 - Peralatan"},
        {"kode": "3.02.04.01.003", "nama": "Lemari Besi Arsip", "nilai": 2500000, "kondisi": "Rusak Berat", "merk": "Lion", "gol": "3.02 - Peralatan"},
    ]
    
    barang_docs = []
    transaksi_docs = []
    
    for i, item in enumerate(items):
        # Calculate Depreciation (Random 10-40%)
        depr_pct = random.uniform(0.1, 0.4)
        penyusutan = int(item['nilai'] * depr_pct)
        if 'Tanah' in item['gol']: penyusutan = 0 # Land no depr
        
        nilai_buku = item['nilai'] - penyusutan
        
        doc = {
            "source": "seeder",
            "kode_barang": item['kode'],
            "nup": f"{i+1}",
            "nama_barang": item['nama'],
            "golongan_barang": item['gol'],
            "merk": item.get('merk', '-'),
            "tipe": item.get('tipe', '-'),
            "kondisi": item['kondisi'],
            "nilai_perolehan": item['nilai'],
            "nilai_penyusutan": penyusutan,
            "nilai_buku": nilai_buku,
            "nilai_satuan": item['nilai'],
            "stok": 1,
            "tahun_anggaran": "2023",
            "tgl_perolehan": "2023-01-15",
            "status_aset": "Aktif",
            "lokasi_fisik": "Kantor Pusat",
            "updated_at": datetime.now(timezone.utc)
        }
        
        res = await db.barang.insert_one(doc)
        item_id = str(res.inserted_id)
        barang_docs.append(item_id)
        
        # Create Transaction History
        # 1. Pengadaan (Masuk)
        transaksi_docs.append({
            "source": "seeder",
            "jenis": "MASUK",
            "barang_id": item_id,
            "kode_barang": item['kode'],
            "nama_barang": item['nama'],
            "jumlah": 1,
            "total_nilai": item['nilai'],
            "timestamp": datetime(2023, 1, 15),
            "keterangan": "Pengadaan Baru"
        })
        
        # 2. Random Mutasi (Keluar) if Condition is Rusak Berat
        if item['kondisi'] == 'Rusak Berat':
            transaksi_docs.append({
                "source": "seeder",
                "jenis": "KELUAR",
                "barang_id": item_id,
                "kode_barang": item['kode'],
                "nama_barang": item['nama'],
                "jumlah": 1,
                "total_nilai": item['nilai'],
                "timestamp": datetime(2024, 6, 20),
                "keterangan": "Penghapusan karena Rusak Berat"
            })
            
    await db.transaksi.insert_many(transaksi_docs)
    print(f"✅ Inserted {len(barang_docs)} assets and {len(transaksi_docs)} transactions.")

if __name__ == "__main__":
    asyncio.run(seed_data())
