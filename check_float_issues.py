#!/usr/bin/env python3
"""
Check for problematic float values in barang collection
"""
import os
from pymongo import MongoClient
from dotenv import load_dotenv
import json
import math

load_dotenv("/app/backend/.env")
mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
db_name = os.environ.get("DB_NAME", "test_database")

client = MongoClient(mongo_url)
db = client[db_name]

print("🔍 Checking for problematic float values in barang collection...")

# Get all barang documents
barang_docs = list(db.barang.find())
print(f"Total barang documents: {len(barang_docs)}")

problematic_docs = []
float_fields = [
    'nilai_satuan', 'nilai_perolehan_pertama', 'nilai_perolehan', 
    'nilai_buku', 'nilai_penyusutan', 'nilai_mutasi'
]

for i, doc in enumerate(barang_docs):
    doc_issues = []
    
    for field in float_fields:
        if field in doc and doc[field] is not None:
            value = doc[field]
            if isinstance(value, (int, float)):
                # Check for NaN, infinity, or extremely large values
                if math.isnan(value):
                    doc_issues.append(f"{field}: NaN")
                elif math.isinf(value):
                    doc_issues.append(f"{field}: Infinity")
                elif abs(value) > 1e308:  # Close to float max
                    doc_issues.append(f"{field}: Too large ({value})")
    
    if doc_issues:
        problematic_docs.append({
            'doc_id': str(doc['_id']),
            'kode_barang': doc.get('kode_barang', 'N/A'),
            'nup': doc.get('nup', 'N/A'),
            'issues': doc_issues
        })

if problematic_docs:
    print(f"\n❌ Found {len(problematic_docs)} documents with float issues:")
    for doc in problematic_docs:
        print(f"  ID: {doc['doc_id']}")
        print(f"  Kode: {doc['kode_barang']}, NUP: {doc['nup']}")
        print(f"  Issues: {', '.join(doc['issues'])}")
        print()
else:
    print("✅ No problematic float values found")

# Test JSON serialization of a few documents
print("\n🔍 Testing JSON serialization...")
try:
    for i, doc in enumerate(barang_docs[:5]):  # Test first 5 docs
        # Remove ObjectId and datetime for JSON test
        test_doc = {k: v for k, v in doc.items() if k not in ['_id', 'updated_at']}
        json.dumps(test_doc)
        print(f"✅ Document {i+1} serializes OK")
except Exception as e:
    print(f"❌ JSON serialization error: {e}")
    print(f"Problematic document: {doc}")