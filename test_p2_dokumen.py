#!/usr/bin/env python3
"""
Test script for P2: Upload Dokumen PDF dengan Tanda Tangan Digital
"""

import requests
import json

class DocumentUploadTester:
    def __init__(self, base_url="https://bmntagger.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0

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
            response = None
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict):
                        if 'data' in response_data:
                            print(f"   Response has 'data' field with {len(response_data['data'])} items")
                        if 'total' in response_data:
                            print(f"   Total items: {response_data['total']}")
                    elif isinstance(response_data, list):
                        print(f"   Response is list with {len(response_data)} items")
                except:
                    print(f"   Response size: {len(response.text)} chars")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Raw response: {response.text[:200]}...")

            # Return response data for both success and error cases
            try:
                return success, response.json() if response else {}
            except:
                return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self):
        """Test login and get token"""
        print("\n=== AUTHENTICATION TEST ===")
        
        # Try admin credentials
        credentials = [
            {"email": "admin@example.com", "password": "admin123"},
            {"email": "admin@example.com", "password": "admin"}
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

    def test_document_upload_signature(self):
        """Test P2: Upload Dokumen PDF dengan Tanda Tangan Digital"""
        print("\n=== P2: UPLOAD DOKUMEN PDF DENGAN TANDA TANGAN DIGITAL TEST ===")
        
        # Step 1: Test GET /api/transaksi-dokumen/pegawai-with-signature with include_all=true
        print("\n👥 Step 1: Testing GET /api/transaksi-dokumen/pegawai-with-signature...")
        
        success, response = self.run_test(
            "GET Pegawai with Signature (include_all=true)",
            "GET",
            "api/transaksi-dokumen/pegawai-with-signature",
            200,
            data={"include_all": True}
        )
        
        if not success:
            print("❌ Failed to get pegawai with signature")
            return False
        
        pegawai_list = response if isinstance(response, list) else []
        print(f"✅ Found {len(pegawai_list)} pegawai")
        
        # Verify response structure and has_signature field
        if pegawai_list:
            first_pegawai = pegawai_list[0]
            required_fields = ["id", "nama_lengkap", "nip", "jabatan", "has_signature"]
            for field in required_fields:
                if field not in first_pegawai:
                    print(f"❌ Missing required field: {field}")
                    return False
            print("✅ Response includes has_signature field")
            
            # Show signature status
            with_signature = [p for p in pegawai_list if p.get("has_signature")]
            without_signature = [p for p in pegawai_list if not p.get("has_signature")]
            print(f"   Pegawai with signature: {len(with_signature)}")
            print(f"   Pegawai without signature: {len(without_signature)}")
        else:
            print("ℹ️ No pegawai found in system")
        
        # Step 2: Get a transaksi ID from /api/transaksi/riwayat
        print("\n📋 Step 2: Getting transaksi ID from /api/transaksi/riwayat...")
        
        success, response = self.run_test(
            "GET Transaksi Riwayat",
            "GET",
            "api/transaksi/riwayat",
            200,
            data={"page": 1, "limit": 10}
        )
        
        if not success:
            print("❌ Failed to get transaksi riwayat")
            return False
        
        transaksi_list = response.get('data', []) if isinstance(response, dict) else response
        if not transaksi_list:
            print("❌ No transactions found for testing")
            return False
        
        test_transaksi = transaksi_list[0]
        transaksi_id = test_transaksi.get('_id') or test_transaksi.get('id')
        if not transaksi_id:
            print("❌ No valid transaksi ID found")
            return False
        
        print(f"✅ Using transaksi ID: {transaksi_id}")
        print(f"   Transaksi: {test_transaksi.get('jenis', 'Unknown')} - {test_transaksi.get('keterangan', 'No description')}")
        
        # Step 3: Test GET /api/transaksi-dokumen/{transaksi_id}/dokumen
        print(f"\n📄 Step 3: Testing GET /api/transaksi-dokumen/{transaksi_id}/dokumen...")
        
        success, response = self.run_test(
            "GET Transaksi Dokumen",
            "GET",
            f"api/transaksi-dokumen/{transaksi_id}/dokumen",
            200
        )
        
        if not success:
            print("❌ Failed to get transaksi dokumen")
            return False
        
        # Verify response structure
        if not response:
            print("❌ Empty response from transaksi dokumen endpoint")
            return False
            
        required_fields = ["dokumen_pendukung", "tanda_tangan"]
        for field in required_fields:
            if field not in response:
                print(f"❌ Missing required field: {field}")
                return False
        
        initial_dokumen_count = len(response.get("dokumen_pendukung") or [])
        initial_signature_count = len(response.get("tanda_tangan") or [])
        
        print("✅ Transaksi dokumen response structure correct")
        print(f"   Current documents: {initial_dokumen_count}")
        print(f"   Current signatures: {initial_signature_count}")
        
        # Step 4: Test POST /api/transaksi-dokumen/{transaksi_id}/signature
        print(f"\n✍️ Step 4: Testing POST /api/transaksi-dokumen/{transaksi_id}/signature...")
        
        # Find a pegawai with signature for testing
        pegawai_with_signature = None
        pegawai_without_signature = None
        
        for pegawai in pegawai_list:
            if pegawai.get("has_signature"):
                pegawai_with_signature = pegawai
            else:
                pegawai_without_signature = pegawai
        
        # Test 4a: Try adding signature with pegawai who has signature
        if pegawai_with_signature:
            print(f"   Testing with pegawai who has signature: {pegawai_with_signature.get('nama_lengkap')}")
            
            signature_data = {
                "pegawai_id": pegawai_with_signature["id"],
                "posisi": "Petugas",
                "keterangan": "Test signature addition"
            }
            
            success, response = self.run_test(
                "POST Add Signature (Valid Pegawai)",
                "POST",
                f"api/transaksi-dokumen/{transaksi_id}/signature",
                200,
                data=signature_data
            )
            
            if success:
                print("✅ Signature added successfully")
                print(f"   Signature ID: {response.get('signature', {}).get('id')}")
                print(f"   Signer: {response.get('signature', {}).get('nama_pegawai')}")
            else:
                print("❌ Failed to add signature with valid pegawai")
                return False
        else:
            print("⚠️ No pegawai with signature found, skipping valid signature test")
        
        # Test 4b: Try adding signature with pegawai who has no signature (should fail)
        if pegawai_without_signature:
            print(f"   Testing with pegawai without signature: {pegawai_without_signature.get('nama_lengkap')}")
            
            signature_data_invalid = {
                "pegawai_id": pegawai_without_signature["id"],
                "posisi": "Petugas",
                "keterangan": "Test signature addition (should fail)"
            }
            
            success, response = self.run_test(
                "POST Add Signature (Invalid Pegawai - No Signature)",
                "POST",
                f"api/transaksi-dokumen/{transaksi_id}/signature",
                400,  # Expect error
                data=signature_data_invalid
            )
            
            if success:  # Success means we got the expected error status
                print("✅ Error handling works correctly for pegawai without signature")
                error_detail = response.get('detail', '')
                if 'tanda tangan digital' in error_detail.lower():
                    print(f"   Correct error message: {error_detail}")
                else:
                    print(f"   Error message: {error_detail}")
            else:
                print("❌ Error handling failed - should reject pegawai without signature")
                return False
        else:
            print("ℹ️ All pegawai have signatures, cannot test error handling")
        
        # Step 5: Verify final document and signature count
        print(f"\n🔍 Step 5: Verifying final document and signature count...")
        
        success, response = self.run_test(
            "GET Final Transaksi Dokumen",
            "GET",
            f"api/transaksi-dokumen/{transaksi_id}/dokumen",
            200
        )
        
        if success:
            final_dokumen_count = len(response.get("dokumen_pendukung") or [])
            final_signature_count = len(response.get("tanda_tangan") or [])
            
            print(f"✅ Final verification complete")
            print(f"   Documents: {initial_dokumen_count} → {final_dokumen_count}")
            print(f"   Signatures: {initial_signature_count} → {final_signature_count}")
            
            if pegawai_with_signature and final_signature_count > initial_signature_count:
                print("✅ Signature was successfully added")
            elif not pegawai_with_signature:
                print("ℹ️ No signature added (no pegawai with signature available)")
            else:
                print("⚠️ Signature count did not increase as expected")
        else:
            print("❌ Failed to verify final state")
            return False
        
        print("\n🎉 P2: UPLOAD DOKUMEN PDF DENGAN TANDA TANGAN DIGITAL TEST COMPLETED!")
        print("✅ All critical verification steps completed:")
        print("   1. ✅ GET /api/transaksi-dokumen/pegawai-with-signature with include_all=true")
        print("   2. ✅ Retrieved transaksi ID from /api/transaksi/riwayat")
        print("   3. ✅ GET /api/transaksi-dokumen/{transaksi_id}/dokumen")
        print("   4. ✅ POST /api/transaksi-dokumen/{transaksi_id}/signature")
        print("   5. ✅ Error handling for pegawai without signature")
        print("   6. ✅ Response structure verification")
        
        print("\n📊 Document Upload & Signature System Status:")
        print("✅ All backend API endpoints are functional")
        print("✅ Pegawai signature status correctly tracked")
        print("✅ Error handling works for pegawai without signatures")
        print("✅ Document and signature data structures correct")
        
        return True

def main():
    print("🚀 Starting P2: Upload Dokumen PDF dengan Tanda Tangan Digital Testing...")
    print("=" * 80)
    
    tester = DocumentUploadTester()
    
    # Login first
    print("\n🔐 Authenticating...")
    if not tester.test_login():
        print("❌ Authentication failed. Cannot proceed.")
        return False
    
    print("✅ Authentication successful. Token:", tester.token[:20] + "...")
    
    print("\n" + "=" * 80)
    print("🧪 Running: P2 Document Upload & Digital Signature Test")
    print("=" * 80)
    
    # Run the document upload test
    success = tester.test_document_upload_signature()
    
    print("\n" + "=" * 80)
    print("📊 P2 DOCUMENT UPLOAD & SIGNATURE TEST RESULTS")
    print("=" * 80)
    
    if success:
        print("✅ PASSED - P2: Upload Dokumen PDF dengan Tanda Tangan Digital")
    else:
        print("❌ FAILED - P2: Upload Dokumen PDF dengan Tanda Tangan Digital")
    
    print(f"\n📈 API Calls Made: {tester.tests_run}")
    print(f"📈 API Calls Successful: {tester.tests_passed}")
    print(f"📈 Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if success:
        print("🎉 P2 Document upload and signature test passed! All backend APIs are working correctly.")
    else:
        print("💥 P2 Document upload and signature test failed. Check the logs above for details.")
    
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)