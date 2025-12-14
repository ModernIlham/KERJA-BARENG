#!/usr/bin/env python3
"""
Fix corrupted barang data with NaN values
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv("/app/backend/.env")
mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "test_database")

client = MongoClient(mongo_url)
db = client[db_name]

print("🔧 Fixing corrupted barang data...")

# Find and delete the corrupted document
corrupted_doc_id = "693e4438c155c6537cecc0fc"

print(f"Deleting corrupted document with ID: {corrupted_doc_id}")
result = db.barang.delete_one({"_id": ObjectId(corrupted_doc_id)})

if result.deleted_count > 0:
    print("✅ Corrupted document deleted successfully")
else:
    print("❌ Document not found or already deleted")

# Verify the collection is now clean
remaining_count = db.barang.count_documents({})
print(f"Remaining barang documents: {remaining_count}")

print("✅ Database cleanup completed")