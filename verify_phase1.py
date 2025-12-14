import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8001/api"
EMAIL = "admin@example.com"
PASSWORD = "admin"

def login():
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    if res.status_code != 200:
        print(f"Login failed: {res.text}")
        return None
    return res.json()['access_token']

def verify():
    token = login()
    if not token: return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Create Dummy Item (Expired)
    expired_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    item_data = {
        "kode_barang": "TEST-EXP-001",
        "nama_barang": "Test Barang Expired",
        "stok": 10,
        "nilai_satuan": 50000,
        "expired_date": expired_date,
        "kondisi": "Baik",
        "status_aset": "Aktif"
    }
    
    # Check if exists, delete first
    # (Optional, skipping for simplicity, API upserts or I can just ignore)
    
    print("Creating item...")
    res = requests.post(f"{BASE_URL}/persediaan/", json=item_data, headers=headers)
    if res.status_code not in [200, 201]:
        print(f"Create failed: {res.text}")
        return
    
    item_id = res.json()['_id']
    print(f"Item created: {item_id}")
    
    # 2. Generate Nota Dinas
    print("Generating Nota Dinas (Expired)...")
    res = requests.get(f"{BASE_URL}/persediaan/nota-dinas-expired?filter_type=expired", headers=headers)
    if res.status_code == 200:
        print("Nota Dinas Generated (PDF received)")
    else:
        print(f"Nota Dinas Failed: {res.text}")
        
    # 3. Check Status Update
    print("Checking Status Update...")
    res = requests.get(f"{BASE_URL}/persediaan/detail/{item_id}", headers=headers)
    item = res.json()
    print(f"Item JSON: {item}")
    status = item.get('kondisi', 'Unknown')
    print(f"Current Kondisi: {status}")
    
    if status == "Barang Rusak":
        print("SUCCESS: Kondisi updated to 'Barang Rusak'")
    else:
        print(f"FAILURE: Kondisi is {status}, expected 'Barang Rusak'")
        
    # 4. Export Excel
    print("Testing Export Excel...")
    res = requests.post(f"{BASE_URL}/persediaan/export-excel", json={"ids": [item_id]}, headers=headers)
    if res.status_code == 200:
        print("Export Excel Success")
    else:
        print(f"Export Excel Failed: {res.text}")

if __name__ == "__main__":
    verify()
