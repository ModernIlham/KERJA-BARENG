#!/usr/bin/env python3
"""
SIMAN-G Referensi API Testing Suite
Tests specifically for Referensi Kodefikasi functionality
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class ReferensiAPITester:
    def __init__(self, base_url: str = "https://invmanage-gov.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_items = {}

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
                    expected_status: int = 200, files: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'
        
        if not files:
            headers['Content-Type'] = 'application/json'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers, timeout=10)
                else:
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

    def test_referensi_list(self):
        """Test GET /api/referensi (List)"""
        print("\n🔍 Testing Referensi List...")
        
        success, response = self.make_request('GET', 'referensi')
        if success:
            self.log_test("Get Referensi List", True, f"Found {len(response)} items")
        else:
            self.log_test("Get Referensi List", False, f"Response: {response}")
        
        return success

    def test_referensi_create(self):
        """Test POST /api/referensi (Create manual code)"""
        print("\n🔍 Testing Referensi Create...")
        
        # Test creating a manual code like "1.01.01"
        timestamp = datetime.now().strftime('%H%M%S')
        referensi_data = {
            "kode": "10101",  # Will be cleaned to remove dots
            "uraian": f"Test Kodefikasi {timestamp}",
            "level": 3
        }
        
        success, response = self.make_request('POST', 'referensi', referensi_data, 200)
        if success and '_id' in response:
            self.created_items['referensi_id'] = response['_id']
            self.log_test("Create Referensi", True, f"Created with ID: {response['_id']}")
        else:
            self.log_test("Create Referensi", False, f"Response: {response}")
        
        return success

    def test_referensi_lookup(self):
        """Test GET /api/referensi/lookup?kode=3010101001 (Check lookup logic)"""
        print("\n🔍 Testing Referensi Lookup...")
        
        # Test lookup with a 10-digit code
        test_kode = "3010101001"
        success, response = self.make_request('GET', f'referensi/lookup?kode={test_kode}')
        
        if success:
            # Check if response has expected structure
            expected_keys = ["golongan", "bidang", "kelompok", "sub_kelompok", "sub_sub_kelompok", "uraian_barang"]
            has_all_keys = all(key in response for key in expected_keys)
            
            if has_all_keys:
                self.log_test("Referensi Lookup Structure", True, f"All expected keys present")
                
                # Check if golongan is properly mapped (should be "3 - Peralatan dan Mesin")
                if response.get("golongan") and "3" in response["golongan"]:
                    self.log_test("Referensi Lookup Golongan", True, f"Golongan: {response['golongan']}")
                else:
                    self.log_test("Referensi Lookup Golongan", False, f"Unexpected golongan: {response.get('golongan')}")
            else:
                self.log_test("Referensi Lookup Structure", False, f"Missing keys. Got: {list(response.keys())}")
        else:
            self.log_test("Referensi Lookup", False, f"Response: {response}")
        
        return success

    def test_referensi_import_endpoint(self):
        """Test if /api/referensi/import endpoint exists"""
        print("\n🔍 Testing Referensi Import Endpoint...")
        
        # Test with empty request to see if endpoint exists
        # This should return 422 (validation error) if endpoint exists but no file provided
        success, response = self.make_request('POST', 'referensi/import', expected_status=422)
        
        if success or (not success and response.get('status_code') == 422):
            self.log_test("Referensi Import Endpoint Exists", True, "Endpoint accessible (validation error expected)")
        else:
            self.log_test("Referensi Import Endpoint Exists", False, f"Response: {response}")
        
        return True  # Don't fail the test suite if import endpoint has issues

    def test_referensi_search(self):
        """Test referensi search functionality"""
        print("\n🔍 Testing Referensi Search...")
        
        # Test search with query parameter
        success, response = self.make_request('GET', 'referensi?search=test')
        if success:
            self.log_test("Referensi Search", True, f"Search returned {len(response)} results")
        else:
            self.log_test("Referensi Search", False, f"Response: {response}")
        
        return success

    def test_referensi_level_filter(self):
        """Test referensi level filtering"""
        print("\n🔍 Testing Referensi Level Filter...")
        
        # Test level filter
        success, response = self.make_request('GET', 'referensi?level=1')
        if success:
            self.log_test("Referensi Level Filter", True, f"Level 1 filter returned {len(response)} results")
        else:
            self.log_test("Referensi Level Filter", False, f"Response: {response}")
        
        return success

    def cleanup_created_items(self):
        """Clean up created test items"""
        print("\n🧹 Cleaning up test data...")
        
        if 'referensi_id' in self.created_items:
            success, response = self.make_request('DELETE', f'referensi/{self.created_items["referensi_id"]}')
            if success:
                self.log_test("Cleanup Referensi", True)
            else:
                self.log_test("Cleanup Referensi", False, f"Response: {response}")

    def run_all_tests(self):
        """Run complete referensi test suite"""
        print("🚀 Starting SIMAN-G Referensi API Tests")
        print(f"📍 Testing against: {self.base_url}")
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible, stopping tests")
            return False

        # Test authentication
        if not self.test_login():
            print("❌ Authentication failed, stopping tests")
            return False

        # Test all referensi operations
        self.test_referensi_list()
        self.test_referensi_create()
        self.test_referensi_lookup()
        self.test_referensi_search()
        self.test_referensi_level_filter()
        self.test_referensi_import_endpoint()
        
        # Cleanup
        self.cleanup_created_items()

        # Print summary
        print(f"\n📊 Referensi Test Summary:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All referensi tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} referensi tests failed")
            return False

def main():
    """Main test execution"""
    tester = ReferensiAPITester()
    success = tester.run_all_tests()
    
    # Save detailed results
    with open('/app/referensi_test_results.json', 'w') as f:
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