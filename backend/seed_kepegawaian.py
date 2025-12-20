import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

# Load env vars manually or assume defaults for script
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "siman_db")

async def seed():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("Seeding Kepegawaian Data...")
    
    # 1. Check/Create Pegawai for Admin
    admin_user = await db.users.find_one({"email": "admin@example.com"})
    if not admin_user:
        print("Admin user not found! Please create it first via Login/Register or initial seed.")
        return

    # Check if already linked
    if admin_user.get('pegawai_id'):
        print(f"Admin already linked to Pegawai ID: {admin_user.get('pegawai_id')}")
        # Verify if pegawai exists
        p = await db.pegawai.find_one({"_id": ObjectId(admin_user.get('pegawai_id'))})
        if p:
            print("Pegawai profile exists.")
            return

    # Create Mock Pegawai
    pegawai_data = {
        "nip": "199001012023011001",
        "nama_lengkap": "Administrator System",
        "jabatan": "Kepala Bagian IT",
        "status_kepegawaian": "ASN", # To test overtime calculation
        "pangkat_golongan": "Penata (III/c)",
        "status": "AKTIF",
        "email": "admin@example.com",
        "created_at": datetime.now()
    }
    
    res = await db.pegawai.insert_one(pegawai_data)
    pegawai_id = res.inserted_id
    print(f"Created Pegawai Profile: {pegawai_id}")
    
    # Link to User
    await db.users.update_one(
        {"_id": admin_user['_id']},
        {"$set": {"pegawai_id": str(pegawai_id), "role": "admin"}}
    )
    print("Linked Admin User to Pegawai Profile.")

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.run_until_complete(seed())
