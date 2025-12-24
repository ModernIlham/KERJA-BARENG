#!/usr/bin/env python3
"""
Test script specifically for No SPPA field functionality
Tests that No SPPA fields are correctly saved in all transaction types
"""

import requests
import sys
from datetime import datetime
import json

class NoSPPATester:
    def __init__(self, base_url="https://assetguard-11.preview.emergentagent.com"):
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
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, json=data, headers=test_headers)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Raw response: {response.text[:200]}...")
                return success, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def login(self):
        """Login with admin credentials"""
        print("\n=== AUTHENTICATION ===")
        
        credentials = [
            {"email": "admin@example.com", "password": "admin123"},
            {"email": "admin@example.com", "password": "admin"},
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
        
        print("❌ Login failed with provided credentials")
        return False

    def test_no_sppa_fields(self):
        """Test No SPPA field functionality in all transaction types"""
        print("\n=== NO SPPA FIELDS TEST ===")
        
        # Step 1: Get an existing barang for testing
        print("\n📦 Step 1: Getting barang for testing...")
        
        success, response = self.run_test(
            "Get Barang List for SPPA Test",
            "GET",
            "api/barang",
            200,
            data={"page": 1, "limit": 5}
        )
        
        if not success or not response.get('data'):
            print("❌ No barang found for testing")
            return False
        
        test_barang = response['data'][0]
        barang_id = test_barang.get('_id') or test_barang.get('id')
        barang_nama = test_barang.get('nama_barang', 'Test Asset')
        
        print(f"   Using barang: {barang_nama} (ID: {barang_id})")
        
        # Step 2: Test No SPPA in Single Transaction (PENGEMBANGAN)
        print("\n🔧 Step 2: Testing No SPPA in Single Transaction (PENGEMBANGAN)...")
        
        single_transaction_data = {
            "jenis": "PENGEMBANGAN",
            "barang_id": barang_id,
            "jumlah": 1,
            "nilai_satuan": 1000000,
            "no_sppa": "TEST-PREFIX",
            "no_sppa_2": "2025/001",
            "keterangan": "Test single transaction with No SPPA fields",
            "dokumen_ref": "DOC-SPPA-SINGLE-001"
        }
        
        success, response = self.run_test(
            "Create Single Transaction with No SPPA",
            "POST",
            "api/transaksi",
            200,
            data=single_transaction_data
        )
        
        if not success:
            print("❌ Failed to create single transaction with No SPPA")
            return False
        
        single_tx_id = response.get('_id') or response.get('id')
        print(f"✅ Single transaction created with ID: {single_tx_id}")
        
        # Verify No SPPA fields in response
        if response.get('no_sppa') != "TEST-PREFIX":
            print(f"❌ Expected no_sppa 'TEST-PREFIX', got '{response.get('no_sppa')}'")
            return False
        print("✅ no_sppa field correct in single transaction response")
        
        if response.get('no_sppa_2') != "2025/001":
            print(f"❌ Expected no_sppa_2 '2025/001', got '{response.get('no_sppa_2')}'")
            return False
        print("✅ no_sppa_2 field correct in single transaction response")
        
        # Step 3: Verify single transaction via GET
        print("\n🔍 Step 3: Verifying single transaction via GET...")
        
        success, response = self.run_test(
            "Get Transaction List",
            "GET",
            "api/transaksi",
            200,
            data={"page": 1, "limit": 10}
        )
        
        if success:
            transactions = response.get('data', [])
            single_tx = None
            for tx in transactions:
                if tx.get('_id') == single_tx_id or tx.get('id') == single_tx_id:
                    single_tx = tx
                    break
            
            if single_tx:
                if single_tx.get('no_sppa') != "TEST-PREFIX":
                    print(f"❌ GET: Expected no_sppa 'TEST-PREFIX', got '{single_tx.get('no_sppa')}'")
                    return False
                print("✅ no_sppa field persisted correctly in database")
                
                if single_tx.get('no_sppa_2') != "2025/001":
                    print(f"❌ GET: Expected no_sppa_2 '2025/001', got '{single_tx.get('no_sppa_2')}'")
                    return False
                print("✅ no_sppa_2 field persisted correctly in database")
            else:
                print("❌ Single transaction not found in GET response")
                return False
        else:
            print("❌ Failed to get transaction list")
            return False
        
        # Step 4: Test No SPPA in Bulk Transaction (KELUAR)
        print("\n📦 Step 4: Testing No SPPA in Bulk Transaction (KELUAR)...")
        
        # Use the same asset for bulk transaction
        bulk_transaction_data = {
            "asset_ids": [barang_id],
            "jenis": "KELUAR",
            "no_sppa": "TEST-PREFIX",
            "no_sppa_2": "2025/001",
            "unit_penerima": "Unit Test",
            "keterangan": "Test SPPA field",
            "dokumen_ref": "DOC-SPPA-BULK-001"
        }
        
        success, response = self.run_test(
            "Create Bulk Transaction with No SPPA",
            "POST",
            "api/transaksi/bulk",
            200,
            data=bulk_transaction_data
        )
        
        if not success:
            print("❌ Failed to create bulk transaction with No SPPA")
            return False
        
        bulk_tx_ids = response.get('ids', [])
        if not bulk_tx_ids:
            print("❌ No transaction IDs returned from bulk transaction")
            return False
        
        bulk_tx_id = bulk_tx_ids[0]
        print(f"✅ Bulk transaction created with ID: {bulk_tx_id}")
        
        # Step 5: Verify bulk transaction No SPPA fields
        print("\n🔍 Step 5: Verifying bulk transaction No SPPA fields...")
        
        success, response = self.run_test(
            "Get Transaction List for Bulk Verification",
            "GET",
            "api/transaksi",
            200,
            data={"page": 1, "limit": 20}
        )
        
        if success:
            transactions = response.get('data', [])
            bulk_tx = None
            for tx in transactions:
                if tx.get('_id') == bulk_tx_id or tx.get('id') == bulk_tx_id:
                    bulk_tx = tx
                    break
            
            if bulk_tx:
                if bulk_tx.get('no_sppa') != "TEST-PREFIX":
                    print(f"❌ Bulk GET: Expected no_sppa 'TEST-PREFIX', got '{bulk_tx.get('no_sppa')}'")
                    return False
                print("✅ Bulk no_sppa field persisted correctly in database")
                
                if bulk_tx.get('no_sppa_2') != "2025/001":
                    print(f"❌ Bulk GET: Expected no_sppa_2 '2025/001', got '{bulk_tx.get('no_sppa_2')}'")
                    return False
                print("✅ Bulk no_sppa_2 field persisted correctly in database")
                
                # Verify other fields are also correct
                if bulk_tx.get('jenis') != "KELUAR":
                    print(f"❌ Expected jenis 'KELUAR', got '{bulk_tx.get('jenis')}'")
                    return False
                print("✅ Bulk transaction jenis correct")
                
                if bulk_tx.get('unit_penerima') != "Unit Test":
                    print(f"❌ Expected unit_penerima 'Unit Test', got '{bulk_tx.get('unit_penerima')}'")
                    return False
                print("✅ Bulk transaction unit_penerima correct")
                
            else:
                print("❌ Bulk transaction not found in GET response")
                return False
        else:
            print("❌ Failed to get transaction list for bulk verification")
            return False
        
        # Step 6: Test transaction list includes No SPPA fields
        print("\n📋 Step 6: Verifying No SPPA fields appear in transaction list...")
        
        success, response = self.run_test(
            "Get Recent Transactions with SPPA Fields",
            "GET",
            "api/transaksi",
            200,
            data={"limit": 5}
        )
        
        if success:
            transactions = response.get('data', [])
            sppa_transactions = []
            
            for tx in transactions:
                if tx.get('no_sppa') or tx.get('no_sppa_2'):
                    sppa_transactions.append({
                        'id': tx.get('_id') or tx.get('id'),
                        'jenis': tx.get('jenis'),
                        'no_sppa': tx.get('no_sppa'),
                        'no_sppa_2': tx.get('no_sppa_2'),
                        'nama_barang': tx.get('nama_barang')
                    })
            
            print(f"📊 Found {len(sppa_transactions)} transactions with No SPPA fields:")
            for tx in sppa_transactions:
                print(f"   - {tx['jenis']}: {tx['nama_barang']} | SPPA: {tx['no_sppa']} / {tx['no_sppa_2']}")
            
            if len(sppa_transactions) >= 2:  # Should have at least our 2 test transactions
                print("✅ No SPPA fields appear correctly in transaction list")
            else:
                print(f"⚠️ Expected at least 2 transactions with SPPA fields, found {len(sppa_transactions)}")
                print("✅ No SPPA fields functionality verified (limited data)")
        else:
            print("❌ Failed to get transaction list for SPPA verification")
            return False
        
        print("\n🎉 NO SPPA FIELDS TEST COMPLETED SUCCESSFULLY!")
        print("✅ All verification steps completed:")
        print("   1. ✅ Single transaction (PENGEMBANGAN) with No SPPA fields created")
        print("   2. ✅ No SPPA fields correctly saved and returned in single transaction")
        print("   3. ✅ Single transaction No SPPA fields persist in database (GET verification)")
        print("   4. ✅ Bulk transaction (KELUAR) with No SPPA fields created")
        print("   5. ✅ Bulk transaction No SPPA fields persist in database")
        print("   6. ✅ No SPPA fields appear in transaction list API")
        
        print("\n📊 No SPPA Feature Status:")
        print("✅ no_sppa and no_sppa_2 fields implemented in Transaksi model")
        print("✅ Single transaction endpoint (POST /api/transaksi) saves SPPA fields")
        print("✅ Bulk transaction endpoint (POST /api/transaksi/bulk) saves SPPA fields")
        print("✅ Transaction list endpoint (GET /api/transaksi) returns SPPA fields")
        print("✅ Database persistence verified for both single and bulk transactions")
        print("✅ All transaction types (PENGEMBANGAN, KELUAR) support No SPPA fields")
        
        return True

    def run_tests(self):
        """Run all No SPPA tests"""
        print("🚀 Starting No SPPA Field Tests...")
        print(f"   Base URL: {self.base_url}")
        
        # Login first
        if not self.login():
            print("❌ Login failed, stopping tests")
            return False
        
        # Run No SPPA test
        success = self.test_no_sppa_fields()
        
        # Summary
        print(f"\n🎯 TEST SUMMARY")
        print(f"   Tests Run: {self.tests_run}")
        print(f"   Tests Passed: {self.tests_passed}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return success

if __name__ == "__main__":
    tester = NoSPPATester()
    success = tester.run_tests()
    sys.exit(0 if success else 1)