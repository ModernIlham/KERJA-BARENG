import requests
import json

BASE_URL = "http://localhost:8001/api"
EMAIL = "admin@example.com"
PASSWORD = "admin"

def test_transactions():
    # Login
    print("Logging in...")
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
    token = res.json()['access_token']
    headers = {"Authorization": f"Bearer {token}"}
    
    # Create Item
    print("Creating Test Item...")
    item_data = {
        "kode_barang": "TEST-TRX-001",
        "nama_barang": "Test Transaction Item",
        "stok": 10,
        "nilai_satuan": 10000,
        "kondisi": "Baik"
    }
    # Check delete existing
    # Skipping delete logic for brevity, just create
    
    res = requests.post(f"{BASE_URL}/persediaan/", json=item_data, headers=headers)
    if res.status_code not in [200, 201]:
        print(f"Create failed: {res.text}")
        return
    
    item = res.json()
    item_id = item['_id']
    print(f"Item Created: {item_id}, Stok: {item['stok']}, Harga: {item['nilai_satuan']}")
    
    # 1. Stock In (Different Price to test Avg)
    # Current: 10 * 10000 = 100,000
    # In: 10 * 20000 = 200,000
    # New Total: 300,000 / 20 = 15,000
    print("\nTesting Stock In...")
    in_data = {
        "jenis": "in",
        "persediaan_id": item_id,
        "jumlah": 10,
        "nilai_satuan": 20000,
        "keterangan": "Test In"
    }
    res = requests.post(f"{BASE_URL}/persediaan-transaksi/in", json=in_data, headers=headers)
    if res.status_code == 200:
        print(f"Stock In Success: {res.json()}")
        if res.json()['new_nilai'] == 15000:
            print(">> Avg Price Calculation CORRECT (15000)")
        else:
            print(f">> Avg Price WRONG: {res.json()['new_nilai']}")
    else:
        print(f"Stock In Failed: {res.text}")
        
    # 2. Stock Out
    print("\nTesting Stock Out...")
    out_data = {
        "jenis": "out",
        "persediaan_id": item_id,
        "jumlah": 5,
        "unit_penerima": "Unit Test",
        "keterangan": "Test Out"
    }
    res = requests.post(f"{BASE_URL}/persediaan-transaksi/out", json=out_data, headers=headers)
    if res.status_code == 200:
        print(f"Stock Out Success: {res.json()}")
    else:
        print(f"Stock Out Failed: {res.text}")

    # 3. Stock Out (Fail - Not enough stock)
    print("\nTesting Stock Out (Over limit)...")
    out_data['jumlah'] = 100
    res = requests.post(f"{BASE_URL}/persediaan-transaksi/out", json=out_data, headers=headers)
    if res.status_code == 400:
        print(">> Validation CORRECT (Insufficient stock blocked)")
    else:
        print(f">> Validation FAILED: {res.status_code}")

if __name__ == "__main__":
    test_transactions()
