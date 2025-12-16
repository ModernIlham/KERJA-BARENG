import requests
import sys
from datetime import datetime
import json

class APITester:
    def __init__(self, base_url="https://assetmate-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []

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
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            result = {
                "test_name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_size": len(response.text) if response.text else 0
            }

            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict):
                        if 'data' in response_data:
                            print(f"   Response has 'data' field with {len(response_data['data'])} items")
                            result["data_count"] = len(response_data['data'])
                        if 'total' in response_data:
                            print(f"   Total items: {response_data['total']}")
                            result["total_items"] = response_data['total']
                    elif isinstance(response_data, list):
                        print(f"   Response is list with {len(response_data)} items")
                        result["data_count"] = len(response_data)
                except:
                    print(f"   Response size: {len(response.text)} chars")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                    result["error"] = error_data
                except:
                    print(f"   Raw response: {response.text[:200]}...")
                    result["raw_response"] = response.text[:200]

            self.results.append(result)
            return success, response.json() if success else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            result = {
                "test_name": name,
                "method": method,
                "endpoint": endpoint,
                "success": False,
                "error": str(e)
            }
            self.results.append(result)
            return False, {}

    def test_login(self):
        """Test login and get token"""
        print("\n=== AUTHENTICATION TEST ===")
        
        # Try common admin credentials
        credentials = [
            {"email": "admin@example.com", "password": "admin"},
            {"email": "admin@example.com", "password": "admin123"},
            {"email": "admin", "password": "admin123"},
            {"email": "test@example.com", "password": "test123"}
        ]
        
        for cred in credentials:
            print(f"Trying login with: {cred['email']}")
            success, response = self.run_test(
                f"Login with {cred['email']}",
                "POST",
                "api/auth/login",
                200,
                data=cred
            )
            if success and 'access_token' in response:
                self.token = response['access_token']
                print(f"✅ Token obtained: {self.token[:20]}...")
                return True
        
        # If no login works, try to register a test user
        print("No existing credentials work, trying to register test user...")
        success, response = self.run_test(
            "Register Test User",
            "POST",
            "api/auth/register",
            200,
            data={
                "email": "test@example.com",
                "password": "test123",
                "full_name": "Test User",
                "role": "admin"
            }
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Token obtained via registration: {self.token[:20]}...")
            return True
            
        return False

    def test_referensi_api(self):
        """Test referensi endpoints"""
        print("\n=== REFERENSI API TESTS ===")
        
        # Test GET /api/referensi
        success, response = self.run_test(
            "Get Referensi List",
            "GET",
            "api/referensi",
            200
        )
        
        # Test with pagination
        self.run_test(
            "Get Referensi with Pagination",
            "GET",
            "api/referensi",
            200,
            data={"page": 1, "limit": 5}
        )
        
        # Test with search
        self.run_test(
            "Get Referensi with Search",
            "GET",
            "api/referensi",
            200,
            data={"search": "3", "page": 1, "limit": 5}
        )

    def test_barang_api(self):
        """Test barang endpoints"""
        print("\n=== BARANG API TESTS ===")
        
        # Test GET /api/barang
        success, response = self.run_test(
            "Get Barang List",
            "GET",
            "api/barang",
            200
        )
        
        # Test with pagination
        self.run_test(
            "Get Barang with Pagination",
            "GET",
            "api/barang",
            200,
            data={"page": 1, "limit": 5}
        )
        
        # Test with search
        self.run_test(
            "Get Barang with Search",
            "GET",
            "api/barang",
            200,
            data={"search": "test", "page": 1, "limit": 5}
        )

    def test_database_state(self):
        """Check if database has data by testing API responses"""
        print("\n=== DATABASE STATE CHECK ===")
        
        # Check referensi data
        success, response = self.run_test(
            "Check Referensi Data Count",
            "GET",
            "api/referensi",
            200,
            data={"page": 1, "limit": 1}
        )
        
        if success:
            total = response.get('total', 0)
            data_count = len(response.get('data', []))
            print(f"📊 Referensi Database: {total} total records, {data_count} in current page")
            
        # Check barang data
        success, response = self.run_test(
            "Check Barang Data Count",
            "GET",
            "api/barang",
            200,
            data={"page": 1, "limit": 1}
        )
        
        if success:
            total = response.get('total', 0)
            data_count = len(response.get('data', []))
            print(f"📊 Barang Database: {total} total records, {data_count} in current page")

    def test_fifo_inventory_system(self):
        """Comprehensive test of FIFO inventory system as requested"""
        print("\n=== FIFO INVENTORY SYSTEM TEST ===")
        
        # Step 1: Create a new inventory item "Test FIFO Item"
        print("\n🔧 Step 1: Creating Test FIFO Item...")
        test_item_data = {
            "kode_barang": "1010301999000001",  # 16-digit code for persediaan
            "nama_barang": "Test FIFO Item",
            "merk": "Test Brand",
            "satuan": "Pcs",
            "kondisi": "Baik",
            "lokasi_fisik": "Testing Warehouse",
            "stok": 0,
            "batas_kritis": 5,
            "nilai_satuan": 0
        }
        
        success, response = self.run_test(
            "Create Test FIFO Item",
            "POST",
            "api/persediaan/",
            200,
            data=test_item_data
        )
        
        if not success:
            print("❌ Failed to create test item, stopping FIFO test")
            return False
            
        item_id = response.get('_id') or response.get('id')
        if not item_id:
            print("❌ No item ID returned, stopping FIFO test")
            return False
            
        print(f"✅ Test item created with ID: {item_id}")
        
        # Step 2: Add Stock (IN) Batch 1: 10 units @ 10,000 IDR
        print("\n📦 Step 2: Adding Batch 1 - 10 units @ 10,000 IDR...")
        batch1_data = {
            "jenis": "in",
            "persediaan_id": item_id,
            "jumlah": 10,
            "nilai_satuan": 10000,
            "dokumen_ref": "BATCH-001",
            "keterangan": "First batch for FIFO test"
        }
        
        success, response = self.run_test(
            "Stock IN - Batch 1",
            "POST",
            "api/persediaan-transaksi/in",
            200,
            data=batch1_data
        )
        
        if not success:
            print("❌ Failed to add Batch 1")
            return False
            
        print(f"✅ Batch 1 added. New stock: {response.get('new_stok', 'N/A')}")
        
        # Step 3: Add Stock (IN) Batch 2: 10 units @ 20,000 IDR  
        print("\n📦 Step 3: Adding Batch 2 - 10 units @ 20,000 IDR...")
        batch2_data = {
            "jenis": "in", 
            "persediaan_id": item_id,
            "jumlah": 10,
            "nilai_satuan": 20000,
            "dokumen_ref": "BATCH-002",
            "keterangan": "Second batch for FIFO test"
        }
        
        success, response = self.run_test(
            "Stock IN - Batch 2",
            "POST", 
            "api/persediaan-transaksi/in",
            200,
            data=batch2_data
        )
        
        if not success:
            print("❌ Failed to add Batch 2")
            return False
            
        print(f"✅ Batch 2 added. New stock: {response.get('new_stok', 'N/A')}")
        
        # Step 4: Verify total stock is 20
        print("\n🔍 Step 4: Verifying total stock is 20...")
        success, response = self.run_test(
            "Get Item Details",
            "GET",
            f"api/persediaan/detail/{item_id}",
            200
        )
        
        if success:
            current_stock = response.get('stok', 0)
            print(f"📊 Current stock: {current_stock}")
            if current_stock != 20:
                print(f"❌ Expected stock 20, got {current_stock}")
                return False
            print("✅ Stock verification passed: 20 units")
        else:
            print("❌ Failed to get item details")
            return False
            
        # Step 5: Perform Bulk OUT transaction for 15 units
        print("\n📤 Step 5: Performing FIFO OUT transaction - 15 units...")
        out_data = {
            "jenis": "out",
            "persediaan_id": item_id,
            "jumlah": 15,
            "unit_penerima": "Testing Dept",
            "dokumen_ref": "DOC-001",
            "keterangan": "FIFO test bulk out transaction"
        }
        
        success, response = self.run_test(
            "Stock OUT - FIFO Test",
            "POST",
            "api/persediaan-transaksi/out", 
            200,
            data=out_data
        )
        
        if not success:
            print("❌ Failed to perform OUT transaction")
            return False
            
        print(f"✅ OUT transaction completed. New stock: {response.get('new_stok', 'N/A')}")
        
        # Step 6: Verify remaining stock is 5
        print("\n🔍 Step 6: Verifying remaining stock is 5...")
        success, response = self.run_test(
            "Verify Final Stock",
            "GET",
            f"api/persediaan/detail/{item_id}",
            200
        )
        
        if success:
            final_stock = response.get('stok', 0)
            print(f"📊 Final stock: {final_stock}")
            if final_stock != 5:
                print(f"❌ Expected final stock 5, got {final_stock}")
                return False
            print("✅ Final stock verification passed: 5 units")
        else:
            print("❌ Failed to verify final stock")
            return False
            
        # Step 7: Fetch and verify transaction history
        print("\n📋 Step 7: Fetching transaction history...")
        success, response = self.run_test(
            "Get Transaction History",
            "GET",
            f"api/persediaan-transaksi/history/{item_id}",
            200
        )
        
        if not success:
            print("❌ Failed to fetch transaction history")
            return False
            
        history = response if isinstance(response, list) else []
        print(f"📊 Found {len(history)} transactions in history")
        
        # Find the OUT transaction
        out_transaction = None
        for txn in history:
            if txn.get('jenis') == 'out' and txn.get('dokumen_ref') == 'DOC-001':
                out_transaction = txn
                break
                
        if not out_transaction:
            print("❌ OUT transaction not found in history")
            return False
            
        # Step 8: Verify FIFO calculation and transaction details
        print("\n🧮 Step 8: Verifying FIFO calculation and transaction details...")
        
        # Check unit_penerima
        unit_penerima = out_transaction.get('unit_penerima')
        if unit_penerima != "Testing Dept":
            print(f"❌ Expected unit_penerima 'Testing Dept', got '{unit_penerima}'")
            return False
        print("✅ unit_penerima verified: 'Testing Dept'")
        
        # Check dokumen_ref
        dokumen_ref = out_transaction.get('dokumen_ref')
        if dokumen_ref != "DOC-001":
            print(f"❌ Expected dokumen_ref 'DOC-001', got '{dokumen_ref}'")
            return False
        print("✅ dokumen_ref verified: 'DOC-001'")
        
        # Check FIFO total value: (10 * 10,000) + (5 * 20,000) = 200,000
        total_nilai = out_transaction.get('total_nilai', 0)
        expected_total = 200000  # (10 * 10000) + (5 * 20000)
        
        print(f"📊 Transaction total_nilai: {total_nilai}")
        print(f"📊 Expected FIFO total: {expected_total}")
        
        if abs(total_nilai - expected_total) > 0.01:  # Allow small floating point differences
            print(f"❌ FIFO calculation error! Expected {expected_total}, got {total_nilai}")
            return False
        print("✅ FIFO calculation verified: 200,000 IDR")
        
        # Check keterangan contains FIFO details
        keterangan = out_transaction.get('keterangan', '')
        if 'FIFO' not in keterangan:
            print(f"❌ keterangan should contain FIFO details, got: '{keterangan}'")
            return False
        print(f"✅ keterangan contains FIFO details: '{keterangan}'")
        
        print("\n🎉 FIFO INVENTORY SYSTEM TEST COMPLETED SUCCESSFULLY!")
        print("✅ All verifications passed:")
        print("   - Test item created")
        print("   - Two batches added (10@10k, 10@20k)")
        print("   - Total stock verified (20 units)")
        print("   - FIFO OUT transaction (15 units)")
        print("   - Final stock verified (5 units)")
        print("   - FIFO calculation correct (200,000 IDR)")
        print("   - Transaction history accurate")
        print("   - unit_penerima and dokumen_ref correct")
        
        return True

    def save_results(self):
        """Save test results to file"""
        results_data = {
            "timestamp": datetime.now().isoformat(),
            "summary": {
                "tests_run": self.tests_run,
                "tests_passed": self.tests_passed,
                "success_rate": f"{(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%"
            },
            "detailed_results": self.results
        }
        
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump(results_data, f, indent=2)
        
        print(f"\n📄 Results saved to /app/backend_test_results.json")

def main():
    tester = APITester()
    
    # Test authentication first
    if not tester.test_login():
        print("❌ Authentication failed, stopping tests")
        tester.save_results()
        return 1

    # Test APIs
    tester.test_database_state()
    tester.test_referensi_api()
    tester.test_barang_api()
    
    # Test FIFO Inventory System (Main Test)
    fifo_success = tester.test_fifo_inventory_system()

    # Print final results
    print(f"\n📊 FINAL RESULTS:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    print(f"   FIFO Test: {'✅ PASSED' if fifo_success else '❌ FAILED'}")
    
    tester.save_results()
    return 0 if (tester.tests_passed == tester.tests_run and fifo_success) else 1

if __name__ == "__main__":
    sys.exit(main())