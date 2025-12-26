#!/usr/bin/env python3
"""
Barang Management Debug Test
Tests the specific Barang functionality as requested by main agent
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class BarangDebugTester:
    def __init__(self, base_url: str = "https://stickerlab-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_barang_id = None

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
        """Register admin user if not exists"""
        print("\n🔍 Setting up Admin User...")
        
        # Try to login first
        login_data = {
            "email": "admin@example.com",
            "password": "password123"
        }
        
        success, response = self.make_request('POST', 'auth/login', login_data)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log_test("Admin Login (Existing)", True)
            return True
        
        # If login fails, try to register
        print("   Admin user doesn't exist, registering...")
        register_data = {
            "email": "admin@example.com",
            "password": "password123",
            "full_name": "System Administrator",
            "role": "admin"
        }
        
        success, response = self.make_request('POST', 'auth/register', register_data)
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log_test("Admin Registration", True)
            return True
        else:
            self.log_test("Admin Setup", False, f"Response: {response}")
            return False

    def test_create_barang(self):
        """Test Create Barang with specific data from request"""
        print("\n🔍 Testing Create Barang...")
        
        barang_data = {
            "kode_barang": "TEST-001",
            "nup": "1",
            "nama_barang": "Test Item",
            "stok": 1,
            "nilai_satuan": 100000
        }
        
        print(f"   Creating barang with data: {barang_data}")
        success, response = self.make_request('POST', 'barang/', barang_data, 200)
        
        if success and '_id' in response:
            self.created_barang_id = response['_id']
            self.log_test("Create Barang", True, f"Created with ID: {self.created_barang_id}")
            return True
        else:
            self.log_test("Create Barang", False, f"Response: {response}")
            return False

    def test_update_barang(self):
        """Test Update Barang if create worked"""
        if not self.created_barang_id:
            self.log_test("Update Barang", False, "No barang ID available (create failed)")
            return False
            
        print("\n🔍 Testing Update Barang...")
        
        update_data = {
            "kode_barang": "TEST-001",
            "nup": "1", 
            "nama_barang": "Test Item Updated",
            "stok": 1,
            "nilai_satuan": 100000
        }
        
        print(f"   Updating barang {self.created_barang_id} with: {update_data}")
        success, response = self.make_request('PUT', f'barang/{self.created_barang_id}', update_data, 200)
        
        if success:
            self.log_test("Update Barang", True, "Successfully updated name")
            return True
        else:
            self.log_test("Update Barang", False, f"Response: {response}")
            return False

    def test_get_barang_list(self):
        """Test getting barang list"""
        print("\n🔍 Testing Get Barang List...")
        
        success, response = self.make_request('GET', 'barang/')
        
        if success:
            count = len(response) if isinstance(response, list) else 0
            self.log_test("Get Barang List", True, f"Found {count} items")
            return True
        else:
            self.log_test("Get Barang List", False, f"Response: {response}")
            return False

    def check_backend_logs(self):
        """Check backend logs for any errors"""
        print("\n🔍 Checking Backend Logs...")
        try:
            import subprocess
            result = subprocess.run(['tail', '-n', '20', '/var/log/supervisor/backend.out.log'], 
                                  capture_output=True, text=True, timeout=5)
            if result.stdout:
                print("   Recent backend logs:")
                print(result.stdout)
            
            # Check error logs too
            result = subprocess.run(['tail', '-n', '20', '/var/log/supervisor/backend.err.log'], 
                                  capture_output=True, text=True, timeout=5)
            if result.stdout:
                print("   Recent backend errors:")
                print(result.stdout)
                
        except Exception as e:
            print(f"   Could not read logs: {e}")

    def run_debug_tests(self):
        """Run the specific debug tests requested"""
        print("🚀 Starting Barang Management Debug Tests")
        print(f"📍 Testing against: {self.base_url}")
        
        # Step 1: Setup admin user and login
        if not self.setup_admin_user():
            print("❌ Could not setup admin user, stopping tests")
            return False

        # Step 2: Test Create Barang
        create_success = self.test_create_barang()
        
        # Step 3: Test Update Barang (only if create worked)
        if create_success:
            self.test_update_barang()
        
        # Step 4: Test Get Barang List
        self.test_get_barang_list()
        
        # Step 5: Check backend logs
        self.check_backend_logs()

        # Print summary
        print(f"\n📊 Debug Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed > 0

def main():
    """Main test execution"""
    tester = BarangDebugTester()
    success = tester.run_debug_tests()
    
    # Save detailed results
    with open('/app/barang_debug_results.json', 'w') as f:
        json.dump({
            "summary": {
                "tests_run": tester.tests_run,
                "tests_passed": tester.tests_passed,
                "success_rate": (tester.tests_passed/tester.tests_run)*100 if tester.tests_run > 0 else 0,
                "created_barang_id": tester.created_barang_id
            },
            "results": tester.test_results
        }, f, indent=2)
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())