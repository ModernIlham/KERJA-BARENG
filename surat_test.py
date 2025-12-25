#!/usr/bin/env python3
"""
Surat Template API Testing Script
Tests the Template API, Preview Generation, and Archive Saving functionality
"""

import requests
import sys
import json
import time
from datetime import datetime

class SuratAPITester:
    def __init__(self, base_url="https://inventory-pro-123.preview.emergentagent.com"):
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
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

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
        
        return False

    def test_surat_template_api(self):
        """Test Surat Template API functionality (GET, POST, PUT, DELETE /api/surat/templates)"""
        print("\n=== SURAT TEMPLATE API TEST ===")
        
        timestamp = int(time.time())
        
        # Step 1: Test GET /api/surat/templates (should return templates)
        print("\n📋 Step 1: Testing Template API - GET /api/surat/templates...")
        
        success, response = self.run_test(
            "Get Surat Templates",
            "GET",
            "api/surat/templates",
            200
        )
        
        if not success:
            print("❌ CRITICAL: GET /api/surat/templates endpoint not implemented or failing")
            print("   This endpoint is required by frontend SuratGeneratorModal.js")
            return False
        
        templates = response if isinstance(response, list) else response.get('data', [])
        print(f"✅ Templates endpoint working - Found {len(templates)} templates")
        
        # Step 2: Test POST /api/surat/templates (create template)
        print("\n📝 Step 2: Testing Template Creation - POST /api/surat/templates...")
        
        template_data = {
            "nama_template": f"Test Template BAST {timestamp}",
            "jenis": "BAST",
            "konten": "<h1>BERITA ACARA SERAH TERIMA</h1><p>Nomor: {{nomor_surat}}</p><p>Tanggal: {{tanggal_surat}}</p><p>Barang yang diserahkan:</p><ul>{{#transaksi}}<li>{{nama_barang}} - {{jumlah}} {{satuan}}</li>{{/transaksi}}</ul>",
            "kop_active": True
        }
        
        success, response = self.run_test(
            "Create Surat Template",
            "POST",
            "api/surat/templates",
            200,
            data=template_data
        )
        
        template_id = None
        if success:
            template_id = response.get('_id') or response.get('id')
            print(f"✅ Template created successfully with ID: {template_id}")
        else:
            print("❌ CRITICAL: POST /api/surat/templates endpoint not implemented")
            print("   This endpoint is needed to create templates")
            # Try to use existing template if available
            if len(templates) > 0:
                template_id = templates[0].get('_id') or templates[0].get('id')
                print(f"   Using existing template ID: {template_id}")
            else:
                print("   No existing templates available for testing")
                return False
        
        # Step 3: Test PUT /api/surat/templates/{id} (update template)
        print(f"\n✏️ Step 3: Testing Template Update - PUT /api/surat/templates/{template_id}...")
        
        update_data = {
            "nama_template": f"Updated Test Template BAST {timestamp}",
            "jenis": "BAST",
            "konten": "<h1>BERITA ACARA SERAH TERIMA (UPDATED)</h1><p>Nomor: {{nomor_surat}}</p><p>Tanggal: {{tanggal_surat}}</p><p>Barang yang diserahkan:</p><ul>{{#transaksi}}<li>{{nama_barang}} - {{jumlah}} {{satuan}} - Nilai: {{nilai_satuan}}</li>{{/transaksi}}</ul>",
            "kop_active": False
        }
        
        success, response = self.run_test(
            "Update Surat Template",
            "PUT",
            f"api/surat/templates/{template_id}",
            200,
            data=update_data
        )
        
        if success:
            print("✅ Template updated successfully")
        else:
            print("❌ CRITICAL: PUT /api/surat/templates/{id} endpoint not implemented")
        
        # Step 4: Test DELETE /api/surat/templates/{id}
        print(f"\n🗑️ Step 4: Testing Template Deletion - DELETE /api/surat/templates/{template_id}...")
        
        # First create a template specifically for deletion test
        delete_template_data = {
            "nama_template": f"Delete Test Template {timestamp}",
            "jenis": "SBB",
            "konten": "<h1>SURAT BUKTI BARANG</h1><p>To be deleted</p>",
            "kop_active": True
        }
        
        success, response = self.run_test(
            "Create Template for Deletion Test",
            "POST",
            "api/surat/templates",
            200,
            data=delete_template_data
        )
        
        delete_template_id = None
        if success:
            delete_template_id = response.get('_id') or response.get('id')
            
            # Now test deletion
            success, response = self.run_test(
                "Delete Surat Template",
                "DELETE",
                f"api/surat/templates/{delete_template_id}",
                200
            )
            
            if success:
                print("✅ Template deleted successfully")
            else:
                print("❌ CRITICAL: DELETE /api/surat/templates/{id} endpoint not implemented")
        else:
            print("⚠️ Cannot test deletion - template creation failed")
        
        return True

    def test_surat_preview_generation(self):
        """Test Surat Preview Generation API (POST /api/surat/generate-preview)"""
        print("\n=== SURAT PREVIEW GENERATION TEST ===")
        
        timestamp = int(time.time())
        
        # Step 1: Create test transaction data for preview generation
        print("\n📦 Step 1: Creating test transaction data...")
        
        # Create test persediaan item
        test_item_data = {
            "kode_barang": f"1010301999{timestamp % 1000000:06d}",
            "nama_barang": f"Test Item for Surat Preview {timestamp}",
            "merk": "Test Brand",
            "satuan": "Pcs",
            "kondisi": "Baik",
            "lokasi_fisik": "Test Warehouse",
            "stok": 0,
            "batas_kritis": 5,
            "nilai_satuan": 0
        }
        
        success, response = self.run_test(
            "Create Test Item for Surat Preview",
            "POST",
            "api/persediaan/",
            200,
            data=test_item_data
        )
        
        if not success:
            print("❌ Failed to create test item for preview")
            return False
            
        item_id = response.get('_id') or response.get('id')
        print(f"✅ Test item created with ID: {item_id}")
        
        # Create test transaction
        transaction_data = {
            "jenis": "in",
            "persediaan_id": item_id,
            "jumlah": 10,
            "nilai_satuan": 25000,
            "dokumen_ref": f"DOC-PREVIEW-{timestamp}",
            "keterangan": "Test transaction for surat preview generation"
        }
        
        success, response = self.run_test(
            "Create Test Transaction for Preview",
            "POST",
            "api/persediaan-transaksi/in",
            200,
            data=transaction_data
        )
        
        if not success:
            print("❌ Failed to create test transaction")
            return False
        
        # Get transaction ID from response or fetch from history
        transaction_id = response.get('_id') or response.get('id')
        if not transaction_id:
            # Try to get from transaction history
            success, hist_response = self.run_test(
                "Get Transaction History for ID",
                "GET",
                f"api/persediaan-transaksi/history/{item_id}",
                200
            )
            if success and len(hist_response) > 0:
                transaction_id = hist_response[0].get('_id') or hist_response[0].get('id')
        
        if not transaction_id:
            print("❌ Could not get transaction ID for preview test")
            return False
            
        print(f"✅ Test transaction created with ID: {transaction_id}")
        
        # Step 2: Test POST /api/surat/generate-preview
        print(f"\n🔍 Step 2: Testing Preview Generation - POST /api/surat/generate-preview...")
        
        # First, we need a template ID - try to get from templates endpoint
        success, templates_response = self.run_test(
            "Get Templates for Preview Test",
            "GET",
            "api/surat/templates",
            200
        )
        
        template_id = None
        if success:
            templates = templates_response if isinstance(templates_response, list) else templates_response.get('data', [])
            if len(templates) > 0:
                template_id = templates[0].get('_id') or templates[0].get('id')
                print(f"   Using template ID: {template_id}")
            else:
                print("   No templates available - creating test template")
                # Create a simple template for testing
                template_data = {
                    "nama_template": f"Preview Test Template {timestamp}",
                    "jenis": "BAST",
                    "konten": "<h1>BERITA ACARA SERAH TERIMA</h1><p>Nomor: {{nomor_surat}}</p><p>Tanggal: {{tanggal_surat}}</p><p>Barang:</p><ul>{{#transaksi}}<li>{{nama_barang}} - {{jumlah}} {{satuan}}</li>{{/transaksi}}</ul>",
                    "kop_active": True
                }
                
                success, template_response = self.run_test(
                    "Create Template for Preview Test",
                    "POST",
                    "api/surat/templates",
                    200,
                    data=template_data
                )
                
                if success:
                    template_id = template_response.get('_id') or template_response.get('id')
                    print(f"   Created template ID: {template_id}")
                else:
                    print("❌ Cannot create template for preview test")
                    return False
        else:
            print("❌ Cannot access templates endpoint for preview test")
            return False
        
        # Now test preview generation
        preview_payload = {
            "template_id": template_id,
            "transaksi_ids": [transaction_id],
            "custom_data": {
                "nomor_surat": f"001/BAST/{timestamp}",
                "tanggal_surat": "2024-01-15"
            }
        }
        
        success, response = self.run_test(
            "Generate Surat Preview",
            "POST",
            "api/surat/generate-preview",
            200,
            data=preview_payload
        )
        
        if not success:
            print("❌ CRITICAL: POST /api/surat/generate-preview endpoint not implemented or failing")
            print("   This endpoint is required by frontend SuratGeneratorModal.js")
            print("   Expected payload format:")
            print(f"   {preview_payload}")
            return False
        
        # Verify response contains HTML content
        html_content = response.get('html')
        if html_content:
            print("✅ Preview generation successful")
            print(f"   Generated HTML length: {len(html_content)} characters")
            
            # Basic validation of HTML content
            if "BERITA ACARA" in html_content and str(timestamp) in html_content:
                print("✅ HTML content contains expected template data")
            else:
                print("⚠️ HTML content may not contain expected template data")
                print(f"   Preview: {html_content[:200]}...")
        else:
            print("❌ Preview response missing 'html' field")
            return False
        
        return True

    def test_surat_archive_saving(self):
        """Test Surat Archive Saving API (POST /api/surat/save-generated)"""
        print("\n=== SURAT ARCHIVE SAVING TEST ===")
        
        timestamp = int(time.time())
        
        # Step 1: Test POST /api/surat/save-generated
        print(f"\n💾 Step 1: Testing Archive Saving - POST /api/surat/save-generated...")
        
        # Prepare test data for saving generated surat
        save_payload = {
            "nomor_surat": f"001/BAST/TEST/{timestamp}",
            "tanggal_surat": "2024-01-15",
            "jenis_surat": "BAST",
            "template_id": "test_template_id_123",
            "transaksi_ids": ["test_transaction_id_456"],
            "html_content": f"<html><body><h1>BERITA ACARA SERAH TERIMA</h1><p>Nomor: 001/BAST/TEST/{timestamp}</p><p>Tanggal: 2024-01-15</p><p>Test content for archive saving</p></body></html>"
        }
        
        success, response = self.run_test(
            "Save Generated Surat Archive",
            "POST",
            "api/surat/save-generated",
            200,
            data=save_payload
        )
        
        if not success:
            print("❌ CRITICAL: POST /api/surat/save-generated endpoint not implemented or failing")
            print("   This endpoint is required by frontend SuratGeneratorModal.js")
            print("   Expected payload format:")
            print(f"   {save_payload}")
            return False
        
        # Verify response contains archive ID
        archive_id = response.get('_id') or response.get('id')
        if archive_id:
            print(f"✅ Archive saved successfully with ID: {archive_id}")
            print(f"   Nomor Surat: {response.get('nomor_surat')}")
            print(f"   Jenis Surat: {response.get('jenis_surat')}")
        else:
            print("❌ Archive response missing ID field")
            return False
        
        # Step 2: Verify the saved archive can be retrieved
        print(f"\n🔍 Step 2: Verifying saved archive retrieval...")
        
        # Try to get the saved archive (assuming there's a GET endpoint)
        success, response = self.run_test(
            "Get Saved Archive Details",
            "GET",
            f"api/surat/archives/{archive_id}",
            200
        )
        
        if success:
            print("✅ Archive retrieval successful")
            print(f"   Stored nomor_surat: {response.get('nomor_surat')}")
            print(f"   Stored jenis_surat: {response.get('jenis_surat')}")
            print(f"   HTML content length: {len(response.get('konten_final', ''))}")
        else:
            print("⚠️ Archive retrieval endpoint may not be implemented")
            print("   This is not critical for the save functionality")
        
        # Step 3: Test archive listing (if available)
        print(f"\n📋 Step 3: Testing archive listing...")
        
        success, response = self.run_test(
            "Get Surat Archives List",
            "GET",
            "api/surat/archives",
            200
        )
        
        if success:
            archives = response if isinstance(response, list) else response.get('data', [])
            print(f"✅ Archive listing successful - Found {len(archives)} archives")
            
            # Check if our archive is in the list
            found_our_archive = False
            for archive in archives:
                if archive.get('nomor_surat') == save_payload['nomor_surat']:
                    found_our_archive = True
                    print(f"✅ Our saved archive found in list")
                    break
            
            if not found_our_archive:
                print("⚠️ Our saved archive not found in list (may be pagination issue)")
        else:
            print("⚠️ Archive listing endpoint may not be implemented")
        
        return True

    def run_complete_test_suite(self):
        """Run the complete surat functionality test suite"""
        print("\n" + "="*60)
        print("SURAT FUNCTIONALITY COMPLETE TEST SUITE")
        print("="*60)
        
        # Test all surat-related functionality
        results = []
        
        # 1. Test Template API (GET, POST, PUT, DELETE /api/surat/templates)
        print("\n🔧 Testing Template API endpoints...")
        results.append(self.test_surat_template_api())
        
        # 2. Test Preview Generation (POST /api/surat/generate-preview)
        print("\n🔧 Testing Preview Generation...")
        results.append(self.test_surat_preview_generation())
        
        # 3. Test Archive Saving (POST /api/surat/save-generated)
        print("\n🔧 Testing Archive Saving...")
        results.append(self.test_surat_archive_saving())
        
        # Summary of surat tests
        passed_tests = sum(results)
        total_tests = len(results)
        
        print(f"\n{'='*60}")
        print(f"SURAT FUNCTIONALITY TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Template API Tests: {'✅ PASS' if results[0] else '❌ FAIL'}")
        print(f"Preview Generation Tests: {'✅ PASS' if results[1] else '❌ FAIL'}")
        print(f"Archive Saving Tests: {'✅ PASS' if results[2] else '❌ FAIL'}")
        print(f"\nOverall: {passed_tests}/{total_tests} tests passed ({passed_tests/total_tests*100:.1f}%)")
        
        return all(results)

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*50}")
        print(f"TEST SUMMARY")
        print(f"{'='*50}")
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "No tests run")
        
        # Print failed tests
        failed_tests = [r for r in self.results if not r.get('success', False)]
        if failed_tests:
            print(f"\nFAILED TESTS:")
            for test in failed_tests:
                print(f"❌ {test['test_name']} - {test.get('error', 'Unknown error')}")


def main():
    """Main function to run the surat tests"""
    tester = SuratAPITester()
    
    print("🚀 Starting Surat Template API Backend Testing...")
    print("=" * 60)
    
    # Test login first
    if not tester.test_login():
        print("❌ Login failed - cannot proceed with tests")
        return 1
    
    # Run the Surat functionality test as requested in review
    if not tester.run_complete_test_suite():
        print("❌ Surat functionality test failed")
        return 1
    
    # Print summary
    print("\n" + "=" * 60)
    print(f"🎯 TESTING SUMMARY")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED!")
        return 0
    else:
        print("❌ SOME TESTS FAILED!")
        return 1


if __name__ == "__main__":
    sys.exit(main())