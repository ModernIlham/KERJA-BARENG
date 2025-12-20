import requests
import sys
import json
from datetime import datetime
import time

class DeleteFunctionalityTester:
    def __init__(self, base_url="https://taskflow-wms-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.results = []
        self.created_items = {"barang": [], "referensi": []}

    def log_result(self, test_name, success, details=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name}")
        
        if details:
            print(f"   {details}")
        
        self.results.append({
            "test_name": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def make_request(self, method, endpoint, data=None, expected_status=None):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            
            print(f"   {method} {url} -> {response.status_code}")
            
            if expected_status and response.status_code != expected_status:
                print(f"   Expected {expected_status}, got {response.status_code}")
                if response.text:
                    print(f"   Response: {response.text[:200]}")
                return False, {}
            
            try:
                return True, response.json()
            except:
                return True, {"status_code": response.status_code, "text": response.text}
                
        except Exception as e:
            print(f"   Request failed: {str(e)}")
            return False, {"error": str(e)}

    def test_authentication(self):
        """Test authentication and get token"""
        print("\n=== AUTHENTICATION TEST ===")
        
        # Try to login with existing credentials
        credentials = [
            {"email": "admin@example.com", "password": "admin123"},
            {"email": "test@example.com", "password": "test123"}
        ]
        
        for cred in credentials:
            success, response = self.make_request(
                "POST", "api/auth/login", cred, 200
            )
            if success and 'access_token' in response:
                self.token = response['access_token']
                self.log_result(f"Login with {cred['email']}", True, f"Token: {self.token[:20]}...")
                return True
        
        # Try to register if login fails
        success, response = self.make_request(
            "POST", "api/auth/register", {
                "email": "test@example.com",
                "password": "test123",
                "full_name": "Test User",
                "role": "admin"
            }, 200
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.log_result("Register test user", True, f"Token: {self.token[:20]}...")
            return True
        
        self.log_result("Authentication", False, "Could not login or register")
        return False

    def test_create_dummy_barang(self):
        """Create a dummy barang for testing delete"""
        print("\n=== CREATE DUMMY BARANG ===")
        
        dummy_barang = {
            "kode_barang": f"TEST{int(time.time())}",
            "nup": f"NUP{int(time.time())}",
            "nama_barang": "Test Barang for Delete",
            "merk": "Test Merk",
            "tipe": "Test Type",
            "kondisi": "Baik",
            "nilai_perolehan": 1000000,
            "nilai_satuan": 1000000,
            "lokasi_fisik": "Test Location",
            "stok": 1
        }
        
        success, response = self.make_request(
            "POST", "api/barang", dummy_barang, 200
        )
        
        if success and '_id' in response:
            barang_id = str(response['_id'])
            self.created_items["barang"].append(barang_id)
            self.log_result("Create dummy barang", True, f"ID: {barang_id}")
            return barang_id
        else:
            self.log_result("Create dummy barang", False, f"Response: {response}")
            return None

    def test_create_dummy_referensi(self):
        """Create a dummy referensi for testing delete"""
        print("\n=== CREATE DUMMY REFERENSI ===")
        
        dummy_referensi = {
            "kode": f"9999{int(time.time()) % 10000}",
            "uraian": "Test Referensi for Delete",
            "level": 5
        }
        
        success, response = self.make_request(
            "POST", "api/referensi", dummy_referensi, 200
        )
        
        if success and '_id' in response:
            referensi_id = str(response['_id'])
            self.created_items["referensi"].append(referensi_id)
            self.log_result("Create dummy referensi", True, f"ID: {referensi_id}")
            return referensi_id
        else:
            self.log_result("Create dummy referensi", False, f"Response: {response}")
            return None

    def test_delete_barang(self, barang_id):
        """Test deleting barang via API"""
        print(f"\n=== DELETE BARANG {barang_id} ===")
        
        # Skip verification step and directly test delete
        # (The search might not work with ID, let's test the delete directly)
        
        # Delete the barang
        success, response = self.make_request(
            "DELETE", f"api/barang/{barang_id}", None, 200
        )
        
        if success:
            self.log_result(f"Delete barang API call", True, f"Response: {response}")
            
            # Try to delete the same item again (should return 404)
            time.sleep(1)  # Give DB time to process
            success2, response2 = self.make_request(
                "DELETE", f"api/barang/{barang_id}", None, 404
            )
            
            if success2:
                self.log_result(f"Verify barang deleted (second delete returns 404)", True, "Correctly returned 404 on second delete")
                return True
            else:
                self.log_result(f"Verify barang deleted (second delete returns 404)", False, f"Second delete response: {response2}")
                return False
        else:
            self.log_result(f"Delete barang API call", False, f"Response: {response}")
            return False

    def test_delete_referensi(self, referensi_id):
        """Test deleting referensi via API"""
        print(f"\n=== DELETE REFERENSI {referensi_id} ===")
        
        # Skip verification step and directly test delete
        # (The search might not work with ID, let's test the delete directly)
        
        # Delete the referensi
        success, response = self.make_request(
            "DELETE", f"api/referensi/{referensi_id}", None, 200
        )
        
        if success:
            self.log_result(f"Delete referensi API call", True, f"Response: {response}")
            
            # Try to delete the same item again (should return 404)
            time.sleep(1)  # Give DB time to process
            success2, response2 = self.make_request(
                "DELETE", f"api/referensi/{referensi_id}", None, 404
            )
            
            if success2:
                self.log_result(f"Verify referensi deleted (second delete returns 404)", True, "Correctly returned 404 on second delete")
                return True
            else:
                self.log_result(f"Verify referensi deleted (second delete returns 404)", False, f"Second delete response: {response2}")
                # This is expected to fail based on our earlier test - referensi delete doesn't properly check if item exists
                return False
        else:
            self.log_result(f"Delete referensi API call", False, f"Response: {response}")
            return False

    def test_delete_nonexistent_items(self):
        """Test deleting non-existent items (should return 404)"""
        print("\n=== DELETE NON-EXISTENT ITEMS ===")
        
        # Test delete non-existent barang
        fake_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but doesn't exist
        success, response = self.make_request(
            "DELETE", f"api/barang/{fake_id}", None, 404
        )
        
        if success:
            self.log_result("Delete non-existent barang returns 404", True, "Correctly returned 404")
        else:
            self.log_result("Delete non-existent barang returns 404", False, f"Response: {response}")
        
        # Test delete non-existent referensi
        success, response = self.make_request(
            "DELETE", f"api/referensi/{fake_id}", None, 404
        )
        
        if success:
            self.log_result("Delete non-existent referensi returns 404", True, "Correctly returned 404")
        else:
            self.log_result("Delete non-existent referensi returns 404", False, f"Response: {response}")

    def test_delete_invalid_id_format(self):
        """Test deleting with invalid ID format (should return 400)"""
        print("\n=== DELETE INVALID ID FORMAT ===")
        
        # Test delete barang with invalid ID
        invalid_id = "invalid_id_format"
        success, response = self.make_request(
            "DELETE", f"api/barang/{invalid_id}", None, 400
        )
        
        if success:
            self.log_result("Delete barang with invalid ID returns 400", True, "Correctly returned 400")
        else:
            self.log_result("Delete barang with invalid ID returns 400", False, f"Response: {response}")
        
        # Test delete referensi with invalid ID
        success, response = self.make_request(
            "DELETE", f"api/referensi/{invalid_id}", None, 400
        )
        
        if success:
            self.log_result("Delete referensi with invalid ID returns 400", True, "Correctly returned 400")
        else:
            self.log_result("Delete referensi with invalid ID returns 400", False, f"Response: {response}")

    def test_frontend_id_validation(self):
        """Test if IDs returned by GET list are valid string IDs"""
        print("\n=== FRONTEND ID VALIDATION ===")
        
        # Test barang list IDs
        success, response = self.make_request(
            "GET", "api/barang", {"page": 1, "limit": 5}, 200
        )
        
        if success and 'data' in response:
            valid_ids = True
            for item in response['data']:
                item_id = item.get('_id')
                if not isinstance(item_id, str) or len(item_id) != 24:
                    valid_ids = False
                    break
            
            if valid_ids:
                self.log_result("Barang list returns valid string IDs", True, f"Checked {len(response['data'])} items")
            else:
                self.log_result("Barang list returns valid string IDs", False, "Found invalid ID format")
        else:
            self.log_result("Barang list returns valid string IDs", False, "Could not get barang list")
        
        # Test referensi list IDs
        success, response = self.make_request(
            "GET", "api/referensi", {"page": 1, "limit": 5}, 200
        )
        
        if success and 'data' in response:
            valid_ids = True
            for item in response['data']:
                item_id = item.get('_id')
                if not isinstance(item_id, str) or len(item_id) != 24:
                    valid_ids = False
                    break
            
            if valid_ids:
                self.log_result("Referensi list returns valid string IDs", True, f"Checked {len(response['data'])} items")
            else:
                self.log_result("Referensi list returns valid string IDs", False, "Found invalid ID format")
        else:
            self.log_result("Referensi list returns valid string IDs", False, "Could not get referensi list")

    def save_results(self):
        """Save test results to file"""
        results_data = {
            "timestamp": datetime.now().isoformat(),
            "test_type": "Delete Functionality Test",
            "summary": {
                "tests_run": self.tests_run,
                "tests_passed": self.tests_passed,
                "success_rate": f"{(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%"
            },
            "created_items": self.created_items,
            "detailed_results": self.results
        }
        
        with open('/app/delete_test_results.json', 'w') as f:
            json.dump(results_data, f, indent=2)
        
        print(f"\n📄 Results saved to /app/delete_test_results.json")

    def run_all_tests(self):
        """Run all delete functionality tests"""
        print("🧪 STARTING DELETE FUNCTIONALITY TESTS")
        print("=" * 50)
        
        # 1. Authentication
        if not self.test_authentication():
            print("❌ Authentication failed, stopping tests")
            return False
        
        # 2. Frontend ID validation
        self.test_frontend_id_validation()
        
        # 3. Create and delete barang
        barang_id = self.test_create_dummy_barang()
        if barang_id:
            self.test_delete_barang(barang_id)
        
        # 4. Create and delete referensi
        referensi_id = self.test_create_dummy_referensi()
        if referensi_id:
            self.test_delete_referensi(referensi_id)
        
        # 5. Error handling tests
        self.test_delete_nonexistent_items()
        self.test_delete_invalid_id_format()
        
        # Print final results
        print(f"\n📊 FINAL RESULTS:")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        self.save_results()
        return self.tests_passed == self.tests_run

def main():
    tester = DeleteFunctionalityTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())