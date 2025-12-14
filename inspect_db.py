import os
from pymongo import MongoClient
from dotenv import load_dotenv
import json
from bson import ObjectId
from datetime import datetime

# Custom JSON Encoder
class MongoEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

load_dotenv("/app/backend/.env")
mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "test_database")

client = MongoClient(mongo_url)
db = client[db_name]

print(f"--- DATABASE: {db_name} ---")
print(f"URL: {mongo_url}")
print("-" * 30)

collections = db.list_collection_names()
print(f"Collections Found: {len(collections)}")
for col_name in collections:
    print(f"\n[Collection: {col_name}]")
    count = db[col_name].count_documents({})
    print(f"Total Documents: {count}")
    
    sample = db[col_name].find_one()
    if sample:
        print("Sample Document:")
        print(json.dumps(sample, cls=MongoEncoder, indent=2))
    else:
        print("(Empty Collection)")
