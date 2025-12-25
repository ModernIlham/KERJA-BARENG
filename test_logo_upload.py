#!/usr/bin/env python3

import requests
import sys
import base64
import io
from datetime import datetime

class LogoUploadTester:
    def __init__(self, base_url="https://asset-flow-15.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {}
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
                if files:
                    response = requests.post(url, files=files, headers=test_headers)
                else:
                    test_headers['Content-Type'] = 'application/json'
                    response = requests.post(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return True, response_data
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
        
        # Try common admin credentials
        credentials = [
            {"email": "admin@example.com", "password": "admin"},
            {"email": "admin@example.com", "password": "admin123"},
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
        
        return False

    def test_agency_logo_upload(self):
        """Test Agency Logo Upload functionality as requested in review"""
        print("\n=== AGENCY LOGO UPLOAD FUNCTIONALITY TEST ===")
        
        # Step 1: Test Logo Upload
        print("\n📤 Step 1: Testing logo upload...")
        
        # Create a simple test image file (1x1 pixel PNG)
        # This is a minimal valid PNG file in base64
        png_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8'
            'lAAAAAElFTkSuQmCC'
        )
        
        # Create file-like object
        test_file = io.BytesIO(png_data)
        
        # Prepare multipart form data for file upload
        files = {'file': ('test_logo.png', test_file, 'image/png')}
        
        # Test logo upload
        success, response = self.run_test(
            "Upload Agency Logo",
            "POST",
            "api/settings/instansi/logo",
            200,
            files=files
        )
        
        if not success:
            print("❌ Logo upload failed")
            return False
        
        logo_url = response.get('url')
        if logo_url:
            print(f"✅ Logo URL received: {logo_url}")
        else:
            print("❌ No logo URL in response")
            return False
        
        # Step 2: Test Persistence - Get instansi settings
        print("\n🔍 Step 2: Testing persistence - verifying logo_url in settings...")
        
        success, response = self.run_test(
            "Get Instansi Settings",
            "GET",
            "api/settings/instansi",
            200
        )
        
        if not success:
            print("❌ Failed to get instansi settings")
            return False
        
        # Verify logo_url field is present and correct
        stored_logo_url = response.get('logo_url')
        if stored_logo_url:
            print(f"✅ logo_url field found in settings: {stored_logo_url}")
            
            # Verify it matches what we got from upload
            if stored_logo_url == logo_url:
                print("✅ Stored logo_url matches upload response")
            else:
                print(f"⚠️ Stored logo_url differs from upload response")
                print(f"   Upload: {logo_url}")
                print(f"   Stored: {stored_logo_url}")
        else:
            print("❌ logo_url field not found in instansi settings")
            return False
        
        # Step 3: Test Delete Logo
        print("\n🗑️ Step 3: Testing logo deletion...")
        
        success, response = self.run_test(
            "Delete Logo",
            "DELETE",
            "api/settings/instansi/logo",
            200
        )
        
        if not success:
            print("❌ Failed to delete logo")
            return False
        
        print(f"✅ Delete response: {response.get('message', 'Success')}")
        
        # Step 4: Verify logo_url becomes null after deletion
        print("\n🔍 Step 4: Verifying logo_url becomes null after deletion...")
        
        success, response = self.run_test(
            "Get Instansi Settings After Delete",
            "GET",
            "api/settings/instansi",
            200
        )
        
        if not success:
            print("❌ Failed to get instansi settings after delete")
            return False
        
        # Verify logo_url is null or not present
        deleted_logo_url = response.get('logo_url')
        if deleted_logo_url is None:
            print("✅ logo_url is null after deletion - CORRECT")
        else:
            print(f"❌ logo_url should be null after deletion, got: {deleted_logo_url}")
            return False
        
        print("\n🎉 AGENCY LOGO UPLOAD FUNCTIONALITY TEST COMPLETED SUCCESSFULLY!")
        print("✅ All verifications passed:")
        print("   - Logo upload works with test image file")
        print("   - Upload returns success response with URL")
        print("   - logo_url field persists in instansi settings")
        print("   - Delete functionality works correctly")
        print("   - logo_url becomes null after deletion")
        
        return True

def main():
    tester = LogoUploadTester()
    
    # Test login first
    if not tester.test_login():
        print("❌ Login failed, cannot proceed with tests")
        return 1
    
    # Run logo upload test
    logo_success = tester.test_agency_logo_upload()
    
    print(f"\n📊 LOGO UPLOAD TEST RESULTS:")
    print(f"   Tests run: {tester.tests_run}")
    print(f"   Tests passed: {tester.tests_passed}")
    print(f"   Logo Upload Test: {'✅ PASSED' if logo_success else '❌ FAILED'}")
    
    return 0 if logo_success else 1

if __name__ == "__main__":
    sys.exit(main())