#!/usr/bin/env python3
"""
Test existing surat endpoints to see what's currently working
"""

import requests
import sys
import json
import time

class ExistingSuratTester:
    def __init__(self, base_url="https://siman-g.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None

    def test_login(self):
        """Test login and get token"""
        print("=== AUTHENTICATION TEST ===")
        
        credentials = {"email": "admin@example.com", "password": "admin"}
        
        try:
            response = requests.post(f"{self.base_url}/api/auth/login", json=credentials)
            if response.status_code == 200:
                data = response.json()
                self.token = data['access_token']
                print(f"✅ Login successful: {self.token[:20]}...")
                return True
            else:
                print(f"❌ Login failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False

    def test_existing_endpoints(self):
        """Test the existing surat endpoints"""
        print("\n=== TESTING EXISTING SURAT ENDPOINTS ===")
        
        headers = {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
        
        # Test GET /api/surat/ (list surat)
        print("\n1. Testing GET /api/surat/ (list surat)...")
        try:
            response = requests.get(f"{self.base_url}/api/surat/", headers=headers)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Found {len(data)} surat documents")
            else:
                print(f"   ❌ Error: {response.text}")
        except Exception as e:
            print(f"   ❌ Exception: {e}")
        
        # Test POST /api/surat/ (create surat)
        print("\n2. Testing POST /api/surat/ (create surat)...")
        timestamp = int(time.time())
        surat_data = {
            "nomor_surat": f"TEST-{timestamp}",
            "tanggal_surat": "2024-01-15",
            "jenis_surat": "Masuk",
            "perihal": "Test surat creation",
            "related_ref": "test_ref"
        }
        
        try:
            response = requests.post(f"{self.base_url}/api/surat/", json=surat_data, headers=headers)
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                surat_id = data.get('_id')
                print(f"   ✅ Surat created with ID: {surat_id}")
                
                # Test DELETE /api/surat/{id}
                print(f"\n3. Testing DELETE /api/surat/{surat_id}...")
                try:
                    response = requests.delete(f"{self.base_url}/api/surat/{surat_id}", headers=headers)
                    print(f"   Status: {response.status_code}")
                    if response.status_code == 200:
                        print(f"   ✅ Surat deleted successfully")
                    else:
                        print(f"   ❌ Delete error: {response.text}")
                except Exception as e:
                    print(f"   ❌ Delete exception: {e}")
            else:
                print(f"   ❌ Create error: {response.text}")
        except Exception as e:
            print(f"   ❌ Create exception: {e}")
        
        # Test the missing template endpoints
        print("\n=== TESTING MISSING TEMPLATE ENDPOINTS ===")
        
        missing_endpoints = [
            ("GET", "/api/surat/templates", "List templates"),
            ("POST", "/api/surat/templates", "Create template"),
            ("POST", "/api/surat/generate-preview", "Generate preview"),
            ("POST", "/api/surat/save-generated", "Save generated")
        ]
        
        for method, endpoint, description in missing_endpoints:
            print(f"\n4. Testing {method} {endpoint} ({description})...")
            try:
                if method == "GET":
                    response = requests.get(f"{self.base_url}{endpoint}", headers=headers)
                else:
                    response = requests.post(f"{self.base_url}{endpoint}", json={}, headers=headers)
                
                print(f"   Status: {response.status_code}")
                if response.status_code == 405:
                    print(f"   ❌ MISSING: {endpoint} endpoint not implemented")
                elif response.status_code == 404:
                    print(f"   ❌ NOT FOUND: {endpoint} endpoint not found")
                else:
                    print(f"   Response: {response.text[:100]}...")
            except Exception as e:
                print(f"   ❌ Exception: {e}")

def main():
    tester = ExistingSuratTester()
    
    if not tester.test_login():
        return 1
    
    tester.test_existing_endpoints()
    return 0

if __name__ == "__main__":
    sys.exit(main())