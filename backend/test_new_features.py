import requests
import json
import os
import sys

# Configuration
API_URL = "http://localhost:8001/api"
MONGO_URL = os.environ.get("MONGO_URL")

# Colors
GREEN = "\033[92m"
RED = "\033[91m"
RESET = "\033[0m"

def print_status(message, success):
    if success:
        print(f"{GREEN}[PASS] {message}{RESET}")
    else:
        print(f"{RED}[FAIL] {message}{RESET}")

def run_tests():
    print("Starting Backend Verification...")
    
    # 1. Login
    try:
        login_res = requests.post(f"{API_URL}/auth/login", json={"email": "admin@example.com", "password": "admin"})
        if login_res.status_code != 200:
            print_status("Login failed", False)
            return
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print_status("Login successful", True)
    except Exception as e:
        print_status(f"Login exception: {e}", False)
        return

    # 2. Setup: Create/Update Pegawai as PPK
    try:
        # First check if any PPK exists
        ppk_res = requests.get(f"{API_URL}/pegawai/pejabat?role=PPK", headers=headers)
        ppk_list = ppk_res.json()
        
        ppk_id = None
        if len(ppk_list) > 0:
            ppk_id = ppk_list[0]["_id"]
            print_status(f"Found existing PPK: {ppk_list[0]['nama_lengkap']}", True)
        else:
            # Create a dummy PPK
            print("Creating dummy PPK...")
            new_ppk = {
                "nip": "199001012020011001",
                "nama_lengkap": "Test PPK Officer",
                "jabatan": "Pejabat Pembuat Komitmen",
                "jabatan_melekat": ["PPK"],
                "status_kepegawaian": "PNS",
                "status": "AKTIF"
            }
            create_res = requests.post(f"{API_URL}/pegawai", json=new_ppk, headers=headers)
            if create_res.status_code == 200:
                ppk_id = create_res.json()["_id"]
                print_status("Created dummy PPK", True)
            else:
                print_status(f"Failed to create PPK: {create_res.text}", False)
                return
                
        # Verify fetching PPK again
        ppk_res_2 = requests.get(f"{API_URL}/pegawai/pejabat?role=PPK", headers=headers)
        if len(ppk_res_2.json()) > 0:
            print_status("PPK Lookup Endpoint Works", True)
        else:
            print_status("PPK Lookup Endpoint Failed", False)
            
    except Exception as e:
        print_status(f"PPK Setup Exception: {e}", False)

    # 3. Setup: Update Instansi Settings (UAKPB)
    try:
        settings = {
            "nama_instansi": "Test Agency",
            "kode_uakpb": "TEST-UAKPB-001"
        }
        res = requests.put(f"{API_URL}/settings/instansi", json=settings, headers=headers)
        if res.status_code == 200:
            print_status("Instansi Settings Updated (UAKPB)", True)
        else:
            print_status(f"Failed to update Instansi Settings: {res.text}", False)
    except Exception as e:
        print_status(f"Settings Exception: {e}", False)

    # 4. Test Asset Creation with New Fields
    try:
        asset_payload = {
            "kode_barang": "3010101001",
            "nama_barang": "Test Asset Logic",
            "nup": "99999",
            "tahun_anggaran": "2024",
            "nilai_satuan": 5000000,
            "stok": 1,
            "kondisi": "Baik",
            "detail_lainnya": {
                "jenis_dokumen": "Kontrak",
                "nomor_dokumen": "DOC-001",
                "tgl_dokumen": "2024-01-01",
                "no_sppa": "SPPA-PRE",
                "no_sppa_2": "SPPA-NUM-001",
                "periode": "14", # Audited
                "nama_ppk": "Test PPK Officer",
                "uakpb": "TEST-UAKPB-001" # Simulating what frontend *should* send if we want to save it
            }
        }
        
        res_asset = requests.post(f"{API_URL}/barang", json=asset_payload, headers=headers)
        if res_asset.status_code == 200:
            asset_data = res_asset.json()
            print_status("Asset Created Successfully", True)
            
            # Verify Fields
            details = asset_data.get("detail_lainnya", {})
            if details.get("periode") == "14" and details.get("no_sppa") == "SPPA-PRE":
                 print_status("New Fields (Periode, SPPA) Saved Correctly", True)
            else:
                 print_status(f"New Fields Missing in Response: {details}", False)
                 
        else:
            print_status(f"Asset Creation Failed: {res_asset.text}", False)

    except Exception as e:
        print_status(f"Asset Test Exception: {e}", False)

if __name__ == "__main__":
    run_tests()
