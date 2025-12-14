import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def inspect_database():
    """Inspect the MongoDB database to check collections and data"""
    
    # Connect to MongoDB
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'siman_g')
    
    print(f"🔍 Connecting to MongoDB: {mongo_url}")
    print(f"📊 Database: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    try:
        # List all collections
        collections = await db.list_collection_names()
        print(f"\n📁 Collections found: {collections}")
        
        # Check each collection
        for collection_name in collections:
            collection = db[collection_name]
            count = await collection.count_documents({})
            print(f"   {collection_name}: {count} documents")
            
            # Show sample documents for key collections
            if collection_name in ['kodefikasi', 'barang', 'users'] and count > 0:
                print(f"   Sample documents from {collection_name}:")
                cursor = collection.find({}).limit(3)
                async for doc in cursor:
                    # Remove _id for cleaner output
                    if '_id' in doc:
                        del doc['_id']
                    print(f"     {doc}")
        
        # Specific checks for the collections we're interested in
        print(f"\n🔍 DETAILED ANALYSIS:")
        
        # Check kodefikasi collection
        kodefikasi_count = await db.kodefikasi.count_documents({})
        print(f"📋 Kodefikasi (Referensi) Collection: {kodefikasi_count} documents")
        if kodefikasi_count > 0:
            # Check levels
            pipeline = [{"$group": {"_id": "$level", "count": {"$sum": 1}}}]
            levels = await db.kodefikasi.aggregate(pipeline).to_list(None)
            print(f"   Levels distribution: {levels}")
        
        # Check barang collection
        barang_count = await db.barang.count_documents({})
        print(f"📦 Barang Collection: {barang_count} documents")
        if barang_count > 0:
            # Check some stats
            pipeline = [
                {"$group": {
                    "_id": None,
                    "total_items": {"$sum": 1},
                    "total_stok": {"$sum": "$stok"},
                    "avg_nilai": {"$avg": "$nilai_perolehan"}
                }}
            ]
            stats = await db.barang.aggregate(pipeline).to_list(1)
            if stats:
                print(f"   Stats: {stats[0]}")
        
        # Check users collection
        users_count = await db.users.count_documents({})
        print(f"👥 Users Collection: {users_count} documents")
        if users_count > 0:
            cursor = db.users.find({}, {"email": 1, "role": 1, "_id": 0})
            users = await cursor.to_list(None)
            print(f"   Users: {users}")
            
    except Exception as e:
        print(f"❌ Error inspecting database: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(inspect_database())