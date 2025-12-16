
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check_db():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'simang_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("--- Transaksi Persediaan (Inventory History) ---")
    count_tp = await db.transaksi_persediaan.count_documents({})
    print(f"Count: {count_tp}")

    print("\n--- Transaksi (Fixed Asset History) ---")
    count_t = await db.transaksi.count_documents({})
    print(f"Count: {count_t}")
    
    print("\n--- Persediaan (Inventory Items) ---")
    count_p = await db.persediaan.count_documents({})
    print(f"Count: {count_p}")
    if count_p > 0:
        cursor = db.persediaan.find({}).limit(3)
        items = await cursor.to_list(length=3)
        for item in items:
            print(f"Item: {item.get('nama_barang')} | Stok: {item.get('stok')} | Batches: {len(item.get('batches', []))}")

if __name__ == "__main__":
    asyncio.run(check_db())
