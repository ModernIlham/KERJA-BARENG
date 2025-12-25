#!/usr/bin/env python3

import requests
import sys
import base64
import io

class LogoUploadTester:
    def __init__(self, base_url="https://inventory-pro-123.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None

    def login(self):
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
            try:
                url = f"{self.base_url}/api/auth/login"
                response = requests.post(url, json=cred)
                
                if response.status_code == 200:
                    data = response.json()
                    if 'access_token' in data:
                        self.token = data['access_token']
                        print(f"✅ Login successful with {cred['email']}")
                        print(f"   Token: {self.token[:20]}...")
                        return True
                else:
                    print(f"   Failed: {response.status_code}")
            except Exception as e:
                print(f"   Error: {e}")
        
        print("❌ All login attempts failed")
        return False

    def test_agency_logo_upload(self):
        """Test Agency Logo Upload functionality as requested in review"""
        print("\n=== AGENCY LOGO UPLOAD FUNCTIONALITY TEST ===")
        
        if not self.token:
            print("❌ No authentication token available")
            return False
        
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
        test_file.name = "test_logo.png"
        
        # Prepare multipart form data for file upload
        files = {'file': ('test_logo.png', test_file, 'image/png')}
        
        # Test logo upload
        url = f"{self.base_url}/api/settings/instansi/logo"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        print(f"   Uploading to: {url}")
        
        try:
            response = requests.post(url, files=files, headers=headers)
            
            print(f"   Upload response status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    response_data = response.json()
                    print(f"✅ Logo upload successful!")
                    print(f"   Message: {response_data.get('message', 'N/A')}")
                    print(f"   URL: {response_data.get('url', 'N/A')}")
                    
                    logo_url = response_data.get('url')
                    if logo_url:
                        print(f"✅ Logo URL received: {logo_url}")
                    else:
                        print("❌ No logo URL in response")
                        return False
                        
                except Exception as e:
                    print(f"❌ Failed to parse upload response: {e}")
                    return False
            else:
                try:
                    error_data = response.json()
                    print(f"❌ Upload failed: {error_data}")
                except:
                    print(f"❌ Upload failed with status {response.status_code}: {response.text[:200]}")
                return False
                
        except Exception as e:
            print(f"❌ Upload request failed: {e}")
            return False
        
        # Step 2: Test Persistence - Get instansi settings
        print("\n🔍 Step 2: Testing persistence - verifying logo_url in settings...")
        
        try:
            url = f"{self.base_url}/api/settings/instansi"
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                settings_data = response.json()
                print(f"✅ Got instansi settings successfully")
                
                # Verify logo_url field is present and correct
                stored_logo_url = settings_data.get('logo_url')
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
            else:
                print(f"❌ Failed to get instansi settings: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Failed to get instansi settings: {e}")
            return False
        
        # Step 3: Test Delete Logo
        print("\n🗑️ Step 3: Testing logo deletion...")
        
        try:
            url = f"{self.base_url}/api/settings/instansi/logo"
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.delete(url, headers=headers)
            
            if response.status_code == 200:
                delete_data = response.json()
                print(f"✅ Delete response: {delete_data.get('message', 'Success')}")
            else:
                print(f"❌ Failed to delete logo: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Failed to delete logo: {e}")
            return False
        
        # Step 4: Verify logo_url becomes null after deletion
        print("\n🔍 Step 4: Verifying logo_url becomes null after deletion...")
        
        try:
            url = f"{self.base_url}/api/settings/instansi"
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                settings_data = response.json()
                
                # Verify logo_url is null or not present
                deleted_logo_url = settings_data.get('logo_url')
                if deleted_logo_url is None:
                    print("✅ logo_url is null after deletion - CORRECT")
                else:
                    print(f"❌ logo_url should be null after deletion, got: {deleted_logo_url}")
                    return False
            else:
                print(f"❌ Failed to get instansi settings after delete: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Failed to get instansi settings after delete: {e}")
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
    if not tester.login():
        print("❌ Login failed, cannot proceed with tests")
        return 1
    
    # Run Agency Logo Upload test
    logo_success = tester.test_agency_logo_upload()
    
    print(f"\n📊 AGENCY LOGO UPLOAD TEST RESULTS:")
    print(f"   Test Results: {'✅ PASSED (5/5 tests)' if logo_success else '❌ FAILED'}")
    
    return 0 if logo_success else 1

if __name__ == "__main__":
    sys.exit(main())