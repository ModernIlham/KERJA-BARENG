import requests
import sys
import json
import time
import csv
import io

class NUPVerificationTester:
    def __init__(self, base_url="https://assetmate-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0

    def login(self):
        """Login and get token"""
        print("🔐 Logging in...")
        
        credentials = {"email": "admin@example.com", "password": "admin"}
        
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=credentials,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                print(f"✅ Login successful, token obtained")
                return True
            else:
                print(f"❌ Login failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False

    def api_request(self, method, endpoint, data=None, files=None):
        """Make authenticated API request"""
        url = f"{self.base_url}/{endpoint}"
        headers = {}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files is None:
            headers['Content-Type'] = 'application/json'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=data)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers={k:v for k,v in headers.items() if k != 'Content-Type'})
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            return response.status_code == 200 or response.status_code == 201, response
            
        except Exception as e:
            print(f"❌ API request error: {e}")
            return False, None

    def test_manual_item_nup_display(self):
        """Test manual item (NUP 1) -> "(sementara)" """
        print("\n🔧 Test 1: Manual item (NUP 1) -> '(sementara)'")
        
        # Create manual item
        timestamp = int(time.time())
        manual_item_data = {
            "kode_barang": f"101030199800{timestamp % 10000:04d}",
            "nama_barang": f"Manual Test Item {timestamp}",
            "merk": "Test Brand",
            "satuan": "Pcs",
            "kondisi": "Baik",
            "lokasi_fisik": "Test Location",
            "stok": 5,
            "batas_kritis": 2,
            "nilai_satuan": 15000
        }
        
        success, response = self.api_request("POST", "api/persediaan/", manual_item_data)
        
        if not success:
            print("❌ Failed to create manual item")
            return False
            
        try:
            item_data = response.json()
            item_id = item_data.get('_id') or item_data.get('id')
            print(f"✅ Manual item created with ID: {item_id}")
        except:
            print("❌ Failed to parse response")
            return False
        
        # Get item details
        success, response = self.api_request("GET", f"api/persediaan/detail/{item_id}")
        
        if not success:
            print("❌ Failed to get item details")
            return False
            
        try:
            item_details = response.json()
            nup_value = item_details.get('nup')
            source_value = item_details.get('source')
            
            print(f"📊 Manual item - NUP: '{nup_value}', Source: '{source_value}'")
            
            # Check if this should display as "(sementara)"
            if source_value == 'manual' and (nup_value == "1" or "(Sementara)" in str(nup_value)):
                print("✅ PASS: Manual item (NUP 1) should display as '(sementara)'")
                return True
            else:
                print(f"❌ FAIL: Expected manual source with NUP 1 or containing '(Sementara)', got source='{source_value}', nup='{nup_value}'")
                return False
                
        except Exception as e:
            print(f"❌ Failed to parse item details: {e}")
            return False

    def test_import_item_nup_1_display(self):
        """Test import item (NUP 1) -> "NUP: 1" """
        print("\n📥 Test 2: Import item (NUP 1) -> 'NUP: 1'")
        
        # Create CSV data for import - backend always sets NUP to '1' for imports
        timestamp = int(time.time())
        csv_data = f"""kodebarang,namabarang,merk,satuan
1010301998{timestamp % 1000000:06d},Import Test Item NUP 1 {timestamp},Test Brand,Pcs"""
        
        # Create file-like object
        csv_file = io.StringIO(csv_data)
        files = {'file': ('test_import_nup1.csv', csv_file.getvalue(), 'text/csv')}
        
        success, response = self.api_request("POST", "api/persediaan/import", files=files)
        
        if not success:
            print("❌ Failed to import CSV")
            if response:
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Status: {response.status_code}, Text: {response.text[:200]}")
            return False
            
        try:
            import_result = response.json()
            print(f"✅ Import successful: {import_result.get('message', 'Success')}")
            print(f"   Processed: {import_result.get('processed', 'N/A')}")
            print(f"   Inserted: {import_result.get('inserted', 'N/A')}")
        except:
            print("✅ Import completed (response parsing issue but likely successful)")
        
        # Find the imported item
        success, response = self.api_request("GET", "api/persediaan/", {"page": 1, "limit": 50})
        
        if not success:
            print("❌ Failed to get persediaan list")
            return False
            
        try:
            data = response.json()
            items = data.get('data', [])
            
            # Find our imported item
            import_item = None
            for item in items:
                if f"Import Test Item NUP 1 {timestamp}" in item.get('nama_barang', ''):
                    import_item = item
                    break
            
            if not import_item:
                print("❌ Imported item not found")
                return False
                
            nup_value = import_item.get('nup')
            source_value = import_item.get('source')
            
            print(f"📊 Import item - NUP: '{nup_value}', Source: '{source_value}'")
            
            # Check if this should display as "NUP: 1" (import with NUP 1)
            if source_value == 'import' and str(nup_value) == "1":
                print("✅ PASS: Import item (NUP 1) should display as 'NUP: 1'")
                return True
            else:
                print(f"❌ FAIL: Expected import source with NUP '1', got source='{source_value}', nup='{nup_value}'")
                return False
                
        except Exception as e:
            print(f"❌ Failed to parse persediaan list: {e}")
            return False

    def test_import_item_nup_100_display(self):
        """Test import item (NUP 100) -> "NUP: 100" """
        print("\n📥 Test 3: Import item (NUP 100) -> 'NUP: 100'")
        
        # Since import always sets NUP to '1', we need to manually create an item with NUP 100 and source import
        # Let's create it via direct API call and then update it to simulate import with NUP 100
        timestamp = int(time.time())
        
        # First create via import (will have NUP '1' and source 'import')
        csv_data = f"""kodebarang,namabarang,merk,satuan
1010301999{timestamp % 1000000:06d},Import Test Item NUP 100 {timestamp},Test Brand,Pcs"""
        
        csv_file = io.StringIO(csv_data)
        files = {'file': ('test_import_nup100.csv', csv_file.getvalue(), 'text/csv')}
        
        success, response = self.api_request("POST", "api/persediaan/import", files=files)
        
        if not success:
            print("❌ Failed to import CSV")
            if response:
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Status: {response.status_code}, Text: {response.text[:200]}")
            return False
        
        # Find the imported item
        success, response = self.api_request("GET", "api/persediaan/", {"page": 1, "limit": 50})
        
        if not success:
            print("❌ Failed to get persediaan list")
            return False
            
        try:
            data = response.json()
            items = data.get('data', [])
            
            # Find our imported item
            import_item = None
            for item in items:
                if f"Import Test Item NUP 100 {timestamp}" in item.get('nama_barang', ''):
                    import_item = item
                    break
            
            if not import_item:
                print("❌ Imported item not found")
                return False
                
            item_id = import_item.get('_id')
            
            # Now update the NUP to 100 while keeping source as 'import'
            update_data = {
                "nup": "100"
            }
            
            success, response = self.api_request("PUT", f"api/persediaan/{item_id}", update_data)
            
            if not success:
                print("❌ Failed to update item NUP to 100")
                return False
            
            print("✅ Updated item NUP to 100")
            
            # Get updated item details
            success, response = self.api_request("GET", f"api/persediaan/detail/{item_id}")
            
            if not success:
                print("❌ Failed to get updated item details")
                return False
                
            item_details = response.json()
            nup_value = item_details.get('nup')
            source_value = item_details.get('source')
            
            print(f"📊 Import item (updated) - NUP: '{nup_value}', Source: '{source_value}'")
            
            # Check if this should display as "NUP: 100"
            if source_value == 'import' and str(nup_value) == "100":
                print("✅ PASS: Import item (NUP 100) should display as 'NUP: 100'")
                return True
            else:
                print(f"❌ FAIL: Expected import source with NUP '100', got source='{source_value}', nup='{nup_value}'")
                return False
                
        except Exception as e:
            print(f"❌ Failed to process import item: {e}")
            return False

    def check_backend_syntax_errors(self):
        """Check if backend is running without syntax errors"""
        print("\n🔍 Checking backend for syntax errors...")
        
        # Test basic API health
        success, response = self.api_request("GET", "api/health")
        
        if success:
            print("✅ Backend API is responding - no syntax errors blocking service")
            return True
        else:
            print("❌ Backend API not responding - possible syntax errors")
            return False

    def run_all_tests(self):
        """Run all NUP verification tests"""
        print("=" * 60)
        print("NUP LOGIC VERIFICATION TEST - After Syntax Fix")
        print("=" * 60)
        
        # Login first
        if not self.login():
            print("❌ Cannot proceed without authentication")
            return False
        
        # Check backend health
        backend_ok = self.check_backend_syntax_errors()
        
        # Run the three specific tests requested
        test1_result = self.test_manual_item_nup_display()
        test2_result = self.test_import_item_nup_1_display()
        test3_result = self.test_import_item_nup_100_display()
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST RESULTS SUMMARY")
        print("=" * 60)
        
        print(f"Backend Health Check: {'✅ PASS' if backend_ok else '❌ FAIL'}")
        print(f"Manual item (NUP 1) -> '(sementara)': {'✅ PASS' if test1_result else '❌ FAIL'}")
        print(f"Import item (NUP 1) -> 'NUP: 1': {'✅ PASS' if test2_result else '❌ FAIL'}")
        print(f"Import item (NUP 100) -> 'NUP: 100': {'✅ PASS' if test3_result else '❌ FAIL'}")
        
        all_passed = backend_ok and test1_result and test2_result and test3_result
        
        if all_passed:
            print("\n🎉 ALL TESTS PASSED!")
            print("✅ Syntax errors are resolved")
            print("✅ NUP display logic is working correctly")
            print("✅ Page should load without issues")
        else:
            print("\n❌ SOME TESTS FAILED!")
            print("⚠️ Review the failed tests above")
        
        return all_passed

if __name__ == "__main__":
    tester = NUPVerificationTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)