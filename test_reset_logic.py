
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def test_reset():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'siman_g')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print("--- Before Reset ---")
    print(f"Transaksi Aset: {await db.transaksi.count_documents({})}")
    print(f"Transaksi Persediaan: {await db.transaksi_persediaan.count_documents({})}")
    
    # Simulate Logic I will implement
    # Asset Type: Persediaan Only
    # Txn Type: Out Only
    
    # await db.transaksi_persediaan.delete_many({"jenis": "out"})
    
    # print("--- After Simulated Reset (Persediaan Out Only) ---")
    # print(f"Transaksi Aset: {await db.transaksi.count_documents({})}")
    # print(f"Transaksi Persediaan: {await db.transaksi_persediaan.count_documents({})}")

if __name__ == "__main__":
    asyncio.run(test_reset())
