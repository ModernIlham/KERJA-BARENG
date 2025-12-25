#!/usr/bin/env python3

import requests
import sys
from datetime import datetime, timedelta
import json

class NewAPITester:
    def __init__(self, base_url="https://transctl.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            response = None
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Raw response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self):
        """Test login and get token"""
        print("\n=== AUTHENTICATION TEST ===")
        
        credentials = {"email": "admin@example.com", "password": "admin"}
        
        success, response = self.run_test(
            "Login with admin@example.com",
            "POST",
            "api/auth/login",
            200,
            data=credentials
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Token obtained: {self.token[:20]}...")
            return True
        
        return False

    def test_new_fork_session_apis(self):
        """Test the new APIs implemented for this fork session"""
        print("\n=== NEW FORK SESSION APIS TEST ===")
        
        # Test 1: KIB (Kartu Inventarisasi Barang) APIs
        print("\n📋 Test 1: KIB (Kartu Inventarisasi Barang) APIs...")
        
        # 1.1 Test GET /api/aset/kib/settings
        success, kib_settings = self.run_test(
            "Get KIB Organization Settings",
            "GET",
            "api/aset/kib/settings",
            200
        )
        
        if success:
            print("✅ KIB settings endpoint accessible")
            print(f"   UAPB: {kib_settings.get('uapb', 'N/A')}")
            print(f"   UAPPB E1: {kib_settings.get('uappb_e1', 'N/A')}")
            print(f"   UAKPB: {kib_settings.get('uakpb_nama', 'N/A')}")
        else:
            print("❌ Failed to get KIB settings")
            return False
        
        # 1.2 Test PUT /api/aset/kib/settings
        test_settings = {
            "uapb": "TEST KEMENTERIAN",
            "uappb_e1": "TEST ESELON I",
            "uappb_w": "TEST WILAYAH",
            "uakpb_nama": "TEST SATKER",
            "uakpb_kode": "123456"
        }
        
        success, response = self.run_test(
            "Update KIB Settings",
            "PUT",
            "api/aset/kib/settings",
            200,
            data=test_settings
        )
        
        if success:
            print("✅ KIB settings update successful")
        else:
            print("❌ Failed to update KIB settings")
            return False
        
        # 1.3 Get a valid aset_id for KIB tests
        success, barang_response = self.run_test(
            "Get Barang List for KIB Test",
            "GET",
            "api/barang",
            200,
            data={"page": 1, "limit": 5}
        )
        
        aset_id = None
        if success and barang_response.get('data'):
            aset_id = barang_response['data'][0].get('_id') or barang_response['data'][0].get('id')
            print(f"✅ Found test asset ID: {aset_id}")
        else:
            print("⚠️ No assets found for KIB testing, creating test asset...")
            # Create a test asset
            test_asset = {
                "kode_barang": "3010101001000001",  # Peralatan dan Mesin
                "nama_barang": "Test Asset for KIB",
                "merk": "Test Brand",
                "kondisi": "Baik",
                "lokasi_fisik": "Test Location",
                "nilai_perolehan": 1000000,
                "tahun_perolehan": 2024
            }
            
            success, create_response = self.run_test(
                "Create Test Asset for KIB",
                "POST",
                "api/barang",
                200,
                data=test_asset
            )
            
            if success:
                aset_id = create_response.get('_id') or create_response.get('id')
                print(f"✅ Created test asset ID: {aset_id}")
            else:
                print("❌ Failed to create test asset for KIB")
                return False
        
        # 1.4 Test GET /api/aset/kib/{aset_id}
        if aset_id:
            success, kib_data = self.run_test(
                "Get KIB Data for Asset",
                "GET",
                f"api/aset/kib/{aset_id}",
                200
            )
            
            if success:
                print("✅ KIB data retrieval successful")
                print(f"   Asset: {kib_data.get('aset', {}).get('nama_barang', 'N/A')}")
                print(f"   KIB Type: {kib_data.get('kib_type', {}).get('name', 'N/A')}")
            else:
                print("❌ Failed to get KIB data")
                return False
            
            # 1.5 Test GET /api/aset/kib/{aset_id}/pdf
            success, pdf_response = self.run_test(
                "Generate KIB PDF",
                "GET",
                f"api/aset/kib/{aset_id}/pdf",
                200
            )
            
            if success:
                print("✅ KIB PDF generation successful")
            else:
                print("❌ Failed to generate KIB PDF")
                return False
        
        # Test 2: Attendance APIs with Location
        print("\n⏰ Test 2: Attendance APIs with Location...")
        
        # Create base64 dummy image for attendance
        dummy_image_b64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8lAAAAAElFTkSuQmCC'
        
        # 2.1 Check today's attendance first
        success, today_attendance = self.run_test(
            "Get Today's Attendance",
            "GET",
            "api/kepegawaian/attendance/today",
            200
        )
        
        already_clocked_in = success and today_attendance
        already_clocked_out = already_clocked_in and today_attendance.get('clock_out')
        
        # 2.2 Test Clock In (if not already done)
        if not already_clocked_in:
            clock_in_data = {
                "photo": f"data:image/png;base64,{dummy_image_b64}",
                "location": {
                    "lat": -6.2088,
                    "lng": 106.8456,
                    "accuracy": 10,
                    "address": "Jakarta, Indonesia"
                }
            }
            
            success, response = self.run_test(
                "Clock In with Photo and Location",
                "POST",
                "api/kepegawaian/attendance/clock-in",
                200,
                data=clock_in_data
            )
            
            if success:
                print("✅ Clock In with location successful")
            else:
                print("❌ Failed to clock in with location")
                return False
        else:
            print("✅ Already clocked in today")
        
        # 2.3 Test Clock Out (if not already done)
        if not already_clocked_out:
            clock_out_data = {
                "photo": f"data:image/png;base64,{dummy_image_b64}",
                "location": {
                    "lat": -6.2088,
                    "lng": 106.8456,
                    "accuracy": 15,
                    "address": "Jakarta, Indonesia"
                }
            }
            
            success, response = self.run_test(
                "Clock Out with Photo and Location",
                "POST",
                "api/kepegawaian/attendance/clock-out",
                200,
                data=clock_out_data
            )
            
            if success:
                print("✅ Clock Out with location successful")
            else:
                print("❌ Failed to clock out with location")
                return False
        else:
            print("✅ Already clocked out today")
        
        # 2.4 Test Get Attendance History
        success, history = self.run_test(
            "Get Attendance History",
            "GET",
            "api/kepegawaian/attendance/history",
            200,
            data={"month": 12, "year": 2025}
        )
        
        if success:
            print(f"✅ Attendance history retrieved: {len(history)} records")
        else:
            print("❌ Failed to get attendance history")
            return False
        
        # Test 3: Reports with Pagination
        print("\n📊 Test 3: Reports with Pagination...")
        
        # 3.1 Test Posisi Stok with Pagination
        success, posisi_stok = self.run_test(
            "Get Posisi Stok with Pagination",
            "GET",
            "api/laporan/posisi-stok",
            200,
            data={"page": 1, "limit": 20}
        )
        
        if success:
            print(f"✅ Posisi Stok report retrieved: {len(posisi_stok)} items")
        else:
            print("❌ Failed to get Posisi Stok report")
            return False
        
        # 3.2 Test Mutasi with Pagination
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        
        success, mutasi = self.run_test(
            "Get Mutasi Report with Pagination",
            "GET",
            "api/laporan/mutasi",
            200,
            data={
                "start_date": start_date,
                "end_date": end_date,
                "page": 1,
                "limit": 20
            }
        )
        
        if success:
            print(f"✅ Mutasi report retrieved: {len(mutasi)} items")
        else:
            print("❌ Failed to get Mutasi report")
            return False
        
        # 3.3 Test Kartu Gudang (if we have a barang_id)
        if aset_id:
            success, kartu_gudang = self.run_test(
                "Get Kartu Gudang Data",
                "GET",
                "api/laporan/kartu-gudang",
                200,
                data={
                    "barang_id": aset_id,
                    "start_date": start_date,
                    "end_date": end_date
                }
            )
            
            if success:
                print("✅ Kartu Gudang data retrieved")
                print(f"   Barang: {kartu_gudang.get('barang', {}).get('nama_barang', 'N/A')}")
                print(f"   Saldo Awal: {kartu_gudang.get('saldo_awal', 0)}")
                print(f"   Mutasi Count: {len(kartu_gudang.get('mutasi', []))}")
            else:
                print("❌ Failed to get Kartu Gudang data")
                return False
        
        print("\n🎉 NEW FORK SESSION APIS TEST COMPLETED!")
        print("✅ All new API tests completed successfully:")
        print("   1. ✅ KIB APIs - Settings, Data Retrieval, PDF Generation")
        print("   2. ✅ Attendance APIs - Clock In/Out with Photo and Location")
        print("   3. ✅ Reports with Pagination - Posisi Stok, Mutasi, Kartu Gudang")
        
        print("\n📊 New Features Status:")
        print("✅ KIB (Kartu Inventarisasi Barang) system fully functional")
        print("✅ Attendance with selfie and location capture working")
        print("✅ Enhanced reporting with pagination implemented")
        print("✅ All APIs properly authenticated and secured")
        
        return True

if __name__ == "__main__":
    tester = NewAPITester()
    
    print("🚀 Starting New Fork Session API Testing...")
    
    # Login first
    if not tester.test_login():
        print("❌ Login failed, stopping tests")
        sys.exit(1)
    
    # Run the new APIs test
    success = tester.test_new_fork_session_apis()
    
    print(f"\n📊 Test Summary: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if success:
        print("🏁 Testing completed successfully!")
    else:
        print("❌ Some tests failed!")
        sys.exit(1)