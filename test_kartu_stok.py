import requests
import json

BASE_URL = "http://localhost:8001/api"
EMAIL = "admin@example.com"
PASSWORD = "admin"

def test_kartu_stok():
    # Login
    print("Logging in...")
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    token = res.json()['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Create a fresh item
    print("Creating Item for Stock Card Test...")
    item_data = {
        "kode_barang": "TEST-CARD-001",
        "nama_barang": "Kartu Stok Item",
        "stok": 0,
        "nilai_satuan": 0,
        "kondisi": "Baik"
    }
    res = requests.post(f"{BASE_URL}/persediaan/", json=item_data, headers=headers)
    item_id = res.json()['_id']
    print(f"Item Created: {item_id}")
    
    # 2. Perform Transactions
    # In: 10 @ 10,000
    requests.post(f"{BASE_URL}/persediaan-transaksi/in", json={
        "jenis": "in", "persediaan_id": item_id, "jumlah": 10, "nilai_satuan": 10000, "keterangan": "Initial Stock"
    }, headers=headers)
    
    # In: 5 @ 13,000 (New Avg: (100k + 65k) / 15 = 11,000)
    requests.post(f"{BASE_URL}/persediaan-transaksi/in", json={
        "jenis": "in", "persediaan_id": item_id, "jumlah": 5, "nilai_satuan": 13000, "keterangan": "Restock"
    }, headers=headers)
    
    # Out: 3 (Price 11,000)
    requests.post(f"{BASE_URL}/persediaan-transaksi/out", json={
        "jenis": "out", "persediaan_id": item_id, "jumlah": 3, "unit_penerima": "Unit X", "keterangan": "Usage"
    }, headers=headers)
    
    # 3. Fetch History (Kartu Stok)
    print("Fetching Stock Card History...")
    res = requests.get(f"{BASE_URL}/persediaan-transaksi/history/{item_id}", headers=headers)
    
    if res.status_code == 200:
        history = res.json()
        print(f"Found {len(history)} transaction records.")
        
        # Verify order (latest first)
        last_txn = history[0]
        first_txn = history[-1]
        
        print(f"Latest Txn: {last_txn['jenis']} - {last_txn['jumlah']} (Stok Sisa: {last_txn['stok_sesudah']})")
        if last_txn['jenis'] == 'out' and last_txn['stok_sesudah'] == 12:
            print("SUCCESS: Latest transaction is correct (Out 3, Balance 12)")
        else:
            print("FAILURE: Latest transaction incorrect")
            
        print(f"First Txn: {first_txn['jenis']} - {first_txn['jumlah']} (Stok Sisa: {first_txn['stok_sesudah']})")
        if first_txn['jenis'] == 'in' and first_txn['stok_sesudah'] == 10:
            print("SUCCESS: First transaction is correct (In 10, Balance 10)")
        else:
            print("FAILURE: First transaction incorrect")
            
    else:
        print(f"Failed to fetch history: {res.text}")

if __name__ == "__main__":
    test_kartu_stok()
