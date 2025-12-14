#!/usr/bin/env python3
"""
SIMAN-G Backend API Testing Suite
Tests all endpoints for the inventory management system
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class SIMANGAPITester:
    def __init__(self, base_url: str = "https://state-asset-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_items = {}  # Track created items for cleanup

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_api_health(self):
        """Test API health endpoint"""
        print("\n🔍 Testing API Health...")
        success, response = self.make_request('GET', '')
        self.log_test("API Health Check", success, 
                     "" if success else f"Response: {response}")
        return success

    def test_login(self):
        """Test login with admin credentials"""
        print("\n🔍 Testing Login...")
        login_data = {
            "email": "admin@example.com",
            "password": "password123"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log_test("Admin Login", True)
            return True
        else:
            self.log_test("Admin Login", False, f"Response: {response}")
            return False

    def test_barang_operations(self):
        """Test Barang (Items) CRUD operations"""
        print("\n🔍 Testing Barang Operations...")
        
        # Test GET barang list (empty initially)
        success, response = self.make_request('GET', 'barang/')
        self.log_test("Get Barang List", success, 
                     "" if success else f"Response: {response}")

        # Test CREATE barang
        barang_data = {
            "kode_barang": "LPT-001",
            "nama_barang": "Laptop Dell",
            "kategori": "Elektronik",
            "satuan": "Unit",
            "nilai_per_unit": 15000000,
            "lokasi": "Gudang A"
        }
        
        success, response = self.make_request('POST', 'barang/', barang_data, 200)
        if success and '_id' in response:
            self.created_items['barang_id'] = response['_id']
            self.log_test("Create Barang", True)
        else:
            self.log_test("Create Barang", False, f"Response: {response}")
            return False

        # Test GET barang list (should have 1 item now)
        success, response = self.make_request('GET', 'barang')
        if success and len(response) >= 1:
            self.log_test("Get Barang List After Create", True)
        else:
            self.log_test("Get Barang List After Create", False, 
                         f"Expected at least 1 item, got: {len(response) if success else 'error'}")

        # Test barang stats
        success, response = self.make_request('GET', 'barang/summary/stats')
        self.log_test("Get Barang Stats", success, 
                     "" if success else f"Response: {response}")

        return True

    def test_pegawai_operations(self):
        """Test Pegawai (Employee) CRUD operations"""
        print("\n🔍 Testing Pegawai Operations...")
        
        # Test GET pegawai list
        success, response = self.make_request('GET', 'pegawai')
        self.log_test("Get Pegawai List", success, 
                     "" if success else f"Response: {response}")

        # Test CREATE pegawai
        pegawai_data = {
            "nip": "19900101",
            "nama_lengkap": "Budi Santoso",
            "jabatan": "Staff IT",
            "unit_kerja": "IT Department"
        }
        
        success, response = self.make_request('POST', 'pegawai', pegawai_data, 200)
        if success and '_id' in response:
            self.created_items['pegawai_id'] = response['_id']
            self.log_test("Create Pegawai", True)
        else:
            self.log_test("Create Pegawai", False, f"Response: {response}")

        return True

    def test_transaksi_operations(self):
        """Test Transaksi (Transaction) operations"""
        print("\n🔍 Testing Transaksi Operations...")
        
        if 'barang_id' not in self.created_items:
            self.log_test("Transaksi Test Setup", False, "No barang_id available for transaction")
            return False

        # Test GET transaksi list
        success, response = self.make_request('GET', 'transaksi')
        self.log_test("Get Transaksi List", success, 
                     "" if success else f"Response: {response}")

        # Test CREATE transaksi MASUK
        transaksi_masuk = {
            "jenis": "MASUK",
            "barang_id": self.created_items['barang_id'],
            "jumlah": 10,
            "keterangan": "Pembelian awal"
        }
        
        success, response = self.make_request('POST', 'transaksi', transaksi_masuk, 200)
        if success:
            self.log_test("Create Transaksi MASUK", True)
        else:
            self.log_test("Create Transaksi MASUK", False, f"Response: {response}")

        # Test CREATE transaksi KELUAR
        transaksi_keluar = {
            "jenis": "KELUAR",
            "barang_id": self.created_items['barang_id'],
            "jumlah": 2,
            "pegawai_id": self.created_items.get('pegawai_id'),
            "keterangan": "Penggunaan operasional"
        }
        
        success, response = self.make_request('POST', 'transaksi', transaksi_keluar, 200)
        if success:
            self.log_test("Create Transaksi KELUAR", True)
        else:
            self.log_test("Create Transaksi KELUAR", False, f"Response: {response}")

        return True

    def test_dashboard_operations(self):
        """Test Dashboard statistics"""
        print("\n🔍 Testing Dashboard Operations...")
        
        # Test dashboard summary (correct endpoint)
        success, response = self.make_request('GET', 'dashboard/summary')
        self.log_test("Get Dashboard Summary", success, 
                     "" if success else f"Response: {response}")

        return True

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting SIMAN-G Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible, stopping tests")
            return False

        # Test authentication
        if not self.test_login():
            print("❌ Authentication failed, stopping tests")
            return False

        # Test all modules
        self.test_barang_operations()
        self.test_pegawai_operations()
        self.test_transaksi_operations()
        self.test_dashboard_operations()

        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    """Main test execution"""
    tester = SIMANGAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            "summary": {
                "tests_run": tester.tests_run,
                "tests_passed": tester.tests_passed,
                "success_rate": (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0
            },
            "results": tester.test_results,
            "created_items": tester.created_items
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())