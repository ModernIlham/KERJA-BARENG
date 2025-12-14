import requests
import sys
from datetime import datetime
import json

class APITester:
    def __init__(self, base_url="https://state-asset-app.preview.emergentagent.com"):
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
        success, response = self.run_test(
            "Login",
            "POST",
            "api/auth/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Token obtained: {self.token[:20]}...")
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

    # Print final results
    print(f"\n📊 FINAL RESULTS:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    tester.save_results()
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())