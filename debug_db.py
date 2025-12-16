
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check_db():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'simang_db')
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    count = await db.transaksi_persediaan.count_documents({})
    print(f"Total Transactions: {count}")
    
    if count > 0:
        cursor = db.transaksi_persediaan.find({}).sort("timestamp", -1).limit(2)
        items = await cursor.to_list(length=2)
        for item in items:
            # Convert ObjectId to str for printing
            item['_id'] = str(item['_id'])
            print(f"Sample Item: {item}")
    else:
        print("Collection is empty!")

if __name__ == "__main__":
    asyncio.run(check_db())
