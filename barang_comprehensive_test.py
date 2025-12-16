#!/usr/bin/env python3
"""
Comprehensive Barang API Testing
Tests Create API and Import API as requested by main agent
"""

import requests
import sys
import json
import pandas as pd
import io
from datetime import datetime
from typing import Dict, Any, Optional

class BarangAPITester:
    def __init__(self, base_url: str = "https://assetmate-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

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
                    files: Optional[Dict] = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if files is None:
            headers['Content-Type'] = 'application/json'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers={k: v for k, v in headers.items() if k != 'Content-Type'}, timeout=10)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=10)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            print(f"🔍 {method} {endpoint} -> Status: {response.status_code}")
            
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            if not success:
                print(f"   Response: {response_data}")

            return success, response_data

        except requests.exceptions.RequestException as e:
            print(f"   Request Error: {str(e)}")
            return False, {"error": str(e)}

    def setup_admin_user(self):
        """Setup admin user and get token"""
        print("\n🔍 Setting up Admin User...")
        
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

    def test_create_barang_api(self):
        """Test 1: Create Barang API with specific payload from request"""
        print("\n🔍 Test 1: Create Barang API...")
        
        # Use unique identifier to avoid duplicate error
        timestamp = datetime.now().strftime("%H%M%S")
        barang_data = {
            "kode_barang": f"DEBUG-{timestamp}",
            "nup": "99",
            "nama_barang": "Debug Item",
            "stok": 1
        }
        
        print(f"   Creating barang with data: {barang_data}")
        success, response = self.make_request('POST', 'barang/', barang_data, expected_status=200)
        
        if success and '_id' in response:
            self.log_test("Create Barang API", True, f"Created with ID: {response['_id']}")
            
            # Verify it exists in DB by getting the list
            print("   Verifying creation by fetching barang list...")
            list_success, list_response = self.make_request('GET', 'barang/')
            if list_success:
                found = any(item.get('kode_barang') == barang_data['kode_barang'] for item in list_response)
                if found:
                    self.log_test("Verify Barang in DB", True, "Found in barang list")
                else:
                    self.log_test("Verify Barang in DB", False, "Not found in barang list")
            else:
                self.log_test("Verify Barang in DB", False, f"Could not fetch list: {list_response}")
            
            return True
        else:
            self.log_test("Create Barang API", False, f"Response: {response}")
            return False

    def create_test_excel_file(self):
        """Create a minimal valid Excel file for testing"""
        print("\n🔍 Creating test Excel file...")
        
        # Create test data
        test_data = {
            'Kode Barang': ['EXCEL-001', 'EXCEL-002', 'EXCEL-003'],
            'NUP': ['101', '102', '103'],
            'Nama Barang': ['Excel Test Item 1', 'Excel Test Item 2', 'Excel Test Item 3'],
            'Nilai Perolehan': [100000, 200000, 150000],
            'Kondisi': ['Baik', 'Baik', 'Rusak Ringan'],
            'Lokasi': ['Ruang A', 'Ruang B', 'Ruang C']
        }
        
        df = pd.DataFrame(test_data)
        
        # Save to BytesIO buffer
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False, engine='openpyxl')
        excel_buffer.seek(0)
        
        print(f"   Created Excel with {len(test_data['Kode Barang'])} test items")
        return excel_buffer

    def test_import_excel_api(self):
        """Test 2: Import Excel API"""
        print("\n🔍 Test 2: Import Excel API...")
        
        # Create test Excel file
        excel_file = self.create_test_excel_file()
        
        # Prepare file for upload
        files = {
            'file': ('test_barang.xlsx', excel_file, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        }
        
        print("   Uploading Excel file...")
        success, response = self.make_request('POST', 'barang/import', files=files, expected_status=200)
        
        if success:
            processed = response.get('processed', 0)
            inserted = response.get('inserted', 0)
            updated = response.get('updated', 0)
            
            self.log_test("Import Excel API", True, 
                         f"Processed: {processed}, Inserted: {inserted}, Updated: {updated}")
            
            # Verify imported data exists in DB
            print("   Verifying imported data...")
            list_success, list_response = self.make_request('GET', 'barang/')
            if list_success:
                excel_items = [item for item in list_response if item.get('kode_barang', '').startswith('EXCEL-')]
                if len(excel_items) >= 3:
                    self.log_test("Verify Excel Import in DB", True, f"Found {len(excel_items)} imported items")
                else:
                    self.log_test("Verify Excel Import in DB", False, f"Only found {len(excel_items)} items")
            else:
                self.log_test("Verify Excel Import in DB", False, f"Could not fetch list: {list_response}")
            
            return True
        else:
            self.log_test("Import Excel API", False, f"Response: {response}")
            return False

    def test_get_barang_list_after_fixes(self):
        """Test 3: Verify Get Barang List works after fixing corrupted data"""
        print("\n🔍 Test 3: Get Barang List (after fixes)...")
        
        success, response = self.make_request('GET', 'barang/')
        
        if success:
            count = len(response) if isinstance(response, list) else 0
            self.log_test("Get Barang List", True, f"Retrieved {count} items successfully")
            return True
        else:
            self.log_test("Get Barang List", False, f"Response: {response}")
            return False

    def check_backend_logs(self):
        """Check backend logs for errors"""
        print("\n🔍 Checking Backend Logs...")
        try:
            import subprocess
            
            # Check recent logs
            result = subprocess.run(['tail', '-n', '30', '/var/log/supervisor/backend.out.log'], 
                                  capture_output=True, text=True, timeout=5)
            if result.stdout:
                print("   Recent backend logs:")
                lines = result.stdout.strip().split('\n')[-10:]  # Last 10 lines
                for line in lines:
                    print(f"     {line}")
            
            # Check error logs
            result = subprocess.run(['tail', '-n', '30', '/var/log/supervisor/backend.err.log'], 
                                  capture_output=True, text=True, timeout=5)
            if result.stdout:
                print("   Recent backend errors:")
                lines = result.stdout.strip().split('\n')[-10:]  # Last 10 lines
                for line in lines:
                    if line.strip():  # Only non-empty lines
                        print(f"     {line}")
                        
        except Exception as e:
            print(f"   Could not read logs: {e}")

    def run_comprehensive_tests(self):
        """Run all the tests as requested by main agent"""
        print("🚀 Starting Comprehensive Barang API Tests")
        print(f"📍 Testing against: {self.base_url}")
        
        # Setup
        if not self.setup_admin_user():
            print("❌ Could not setup admin user, stopping tests")
            return False

        # Test 1: Create Barang API
        self.test_create_barang_api()
        
        # Test 2: Import Excel API  
        self.test_import_excel_api()
        
        # Test 3: Get Barang List (should work now)
        self.test_get_barang_list_after_fixes()
        
        # Check backend logs
        self.check_backend_logs()

        # Print summary
        print(f"\n📊 Comprehensive Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed > 0

def main():
    """Main test execution"""
    tester = BarangAPITester()
    success = tester.run_comprehensive_tests()
    
    # Save detailed results
    with open('/app/barang_comprehensive_results.json', 'w') as f:
        json.dump({
            "summary": {
                "tests_run": tester.tests_run,
                "tests_passed": tester.tests_passed,
                "success_rate": (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0
            },
            "results": tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())