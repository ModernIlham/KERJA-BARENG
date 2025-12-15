import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get('MONGO_URL', "mongodb://localhost:27017")
DB_NAME = os.environ.get('DB_NAME', "siman_g_db")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def migrate_paths():
    print("Migrating file paths...")
    
    # 1. Barang Fotos
    items = await db.barang.find({"fotos": {"$exists": True}}).to_list(None)
    count = 0
    for item in items:
        updated = False
        new_fotos = []
        for foto in item.get('fotos', []):
            url = foto.get('url', '')
            if url.startswith("/uploads/"):
                foto['url'] = url.replace("/uploads/", "/api/uploads/")
                updated = True
            new_fotos.append(foto)
        
        if updated:
            await db.barang.update_one({"_id": item["_id"]}, {"$set": {"fotos": new_fotos}})
            count += 1
            
    print(f"Updated {count} barang items.")

    # 2. Surat Files
    surats = await db.surat.find({"file_path": {"$regex": "^/uploads/"}}).to_list(None)
    s_count = 0
    for s in surats:
        new_path = s['file_path'].replace("/uploads/", "/api/uploads/")
        await db.surat.update_one({"_id": s["_id"]}, {"$set": {"file_path": new_path}})
        s_count += 1
        
    print(f"Updated {s_count} surat items.")

if __name__ == "__main__":
    asyncio.run(migrate_paths())
