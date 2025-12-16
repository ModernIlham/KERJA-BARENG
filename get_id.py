
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def get_item():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'siman_g')
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    item = await db.persediaan.find_one({})
    if item:
        print(str(item['_id']))

if __name__ == "__main__":
    asyncio.run(get_item())
