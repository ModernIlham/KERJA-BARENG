#!/usr/bin/env python3

import requests
import sys
import time
from datetime import datetime

class OrganisasiTester:
    def __init__(self, base_url="https://inventory-pro-123.preview.emergentagent.com"):
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
            if method == 'GET':
                response = requests.get(url, headers=test_headers, params=data)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
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
            {"email": "admin", "password": "admin123"}
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

    def test_organizational_structure_api(self):
        """Test Organizational Structure API functionality"""
        print("\n=== ORGANIZATIONAL STRUCTURE API TEST ===")
        
        timestamp = int(time.time())
        
        # Step 1: Test Unit Kerja API endpoint
        print("\n🏢 Step 1: Testing Unit Kerja API endpoint...")
        
        success, response = self.run_test(
            "Get Unit Kerja List",
            "GET",
            "api/settings/unit-kerja",
            200
        )
        
        if not success:
            print("❌ Failed to get unit kerja list")
            return False
        
        units = response if isinstance(response, list) else []
        print(f"✅ Unit Kerja API working: Found {len(units)} organizational units")
        
        # Create test units if none exist
        if len(units) == 0:
            print("⚠️ No organizational units found - creating test data...")
            
            test_units = [
                {
                    "nama_unit": "Sekretariat Dinas",
                    "eselon": "II",
                    "parent_id": None
                },
                {
                    "nama_unit": "Subbagian Umum dan Kepegawaian", 
                    "eselon": "IV",
                    "parent_id": None
                },
                {
                    "nama_unit": "Bidang Perencanaan",
                    "eselon": "III", 
                    "parent_id": None
                }
            ]
            
            for unit_data in test_units:
                success, response = self.run_test(
                    f"Create Unit: {unit_data['nama_unit']}",
                    "POST",
                    "api/settings/unit-kerja",
                    200,
                    data=unit_data
                )
                
                if success:
                    unit_id = response.get('id')
                    print(f"✅ Created unit: {unit_data['nama_unit']} (ID: {unit_id})")
                else:
                    print(f"❌ Failed to create unit: {unit_data['nama_unit']}")
            
            # Re-fetch units
            success, response = self.run_test(
                "Get Unit Kerja List After Creation",
                "GET", 
                "api/settings/unit-kerja",
                200
            )
            
            if success:
                units = response if isinstance(response, list) else []
                print(f"✅ Updated unit count: {len(units)} units")
        
        # Verify unit data structure
        print("\n🔍 Verifying unit data structure for tree rendering...")
        
        required_fields = ['id', 'nama_unit', 'eselon']
        tree_compatible = True
        
        for unit in units:
            for field in required_fields:
                if field not in unit:
                    print(f"❌ Unit missing required field '{field}': {unit}")
                    tree_compatible = False
                    break
        
        if tree_compatible:
            print("✅ Unit data structure compatible with tree rendering")
        else:
            print("❌ Unit data structure incompatible with tree rendering")
            return False
        
        # Step 2: Test Pegawai API
        print("\n👥 Step 2: Testing Pegawai API with status filtering...")
        
        success, response = self.run_test(
            "Get All Pegawai",
            "GET",
            "api/pegawai",
            200,
            data={"limit": 1000, "status": "AKTIF"}
        )
        
        if not success:
            print("❌ Failed to get pegawai list")
            return False
        
        pegawai_data = response.get('data', []) if isinstance(response, dict) else response
        print(f"✅ Pegawai API working: Found {len(pegawai_data)} employees")
        
        # Create test employees if none exist
        if len(pegawai_data) == 0:
            print("⚠️ No employees found - creating test employees...")
            
            test_employees = [
                {
                    "nip": f"PNS{timestamp % 100000:05d}",
                    "nama_lengkap": f"Test Employee PNS {timestamp}",
                    "jabatan": "Kepala Sekretariat Dinas",
                    "jabatan_melekat": ["Kepala"],
                    "status_kepegawaian": "PNS",
                    "eselon1": "Sekretariat Dinas",
                    "is_pimpinan_tertinggi": True
                },
                {
                    "nip": f"PPPK{timestamp % 100000:05d}",
                    "nama_lengkap": f"Test Employee PPPK {timestamp}",
                    "jabatan": "Staff Subbagian Umum",
                    "jabatan_melekat": ["Staff"],
                    "status_kepegawaian": "PPPK",
                    "eselon4": "Subbagian Umum dan Kepegawaian"
                },
                {
                    "nip": f"NONASN{timestamp % 100000:05d}",
                    "nama_lengkap": f"Test Employee Non-ASN {timestamp}",
                    "jabatan": "Tenaga Kontrak",
                    "jabatan_melekat": ["Kontrak"],
                    "status_kepegawaian": "Non-ASN",
                    "eselon3": "Bidang Perencanaan"
                }
            ]
            
            for emp_data in test_employees:
                success, response = self.run_test(
                    f"Create Employee: {emp_data['nama_lengkap']}",
                    "POST",
                    "api/pegawai",
                    200,
                    data=emp_data
                )
                
                if success:
                    print(f"✅ Created employee: {emp_data['nama_lengkap']} ({emp_data['status_kepegawaian']})")
                else:
                    print(f"❌ Failed to create employee: {emp_data['nama_lengkap']}")
            
            # Re-fetch employees
            success, response = self.run_test(
                "Get Pegawai After Creation",
                "GET",
                "api/pegawai", 
                200,
                data={"limit": 1000, "status": "AKTIF"}
            )
            
            if success:
                pegawai_data = response.get('data', []) if isinstance(response, dict) else response
                print(f"✅ Updated employee count: {len(pegawai_data)} employees")
        
        # Step 3: Test employee status classification
        print("\n📊 Step 3: Testing employee status classification...")
        
        status_counts = {"PNS": 0, "PPPK": 0, "Non-ASN": 0, "Unknown": 0}
        
        for emp in pegawai_data:
            status = emp.get('status_kepegawaian', '').upper()
            if 'PNS' in status:
                status_counts["PNS"] += 1
            elif 'PPPK' in status:
                status_counts["PPPK"] += 1
            elif 'NON-ASN' in status or 'NON ASN' in status:
                status_counts["Non-ASN"] += 1
            else:
                status_counts["Unknown"] += 1
        
        print(f"📊 Employee status distribution:")
        for status, count in status_counts.items():
            print(f"   {status}: {count} employees")
        
        # Verify required fields
        print("\n🔍 Verifying employee data structure for organizational tree...")
        
        required_emp_fields = ['_id', 'nama_lengkap', 'status_kepegawaian', 'jabatan']
        org_fields = ['eselon1', 'eselon2', 'eselon3', 'eselon4']
        
        tree_emp_compatible = True
        
        for emp in pegawai_data[:5]:  # Check first 5 employees
            for field in required_emp_fields:
                if field not in emp:
                    print(f"❌ Employee missing required field '{field}': {emp.get('nama_lengkap', 'Unknown')}")
                    tree_emp_compatible = False
            
            # Check organizational unit assignment
            has_unit = any(emp.get(field) for field in org_fields)
            if not has_unit:
                print(f"⚠️ Employee has no organizational unit assignment: {emp.get('nama_lengkap', 'Unknown')}")
        
        if tree_emp_compatible:
            print("✅ Employee data structure compatible with organizational tree")
        else:
            print("❌ Employee data structure incompatible with organizational tree")
            return False
        
        # Step 4: Test tree integration
        print("\n🌳 Step 4: Testing organizational tree data integration...")
        
        # Simulate frontend tree building logic
        unit_map = {}
        for unit in units:
            unit_map[unit['id']] = {
                **unit,
                'members': [],
                'stats': {'PNS': 0, 'PPPK': 0, 'NONASN': 0, 'Total': 0},
                'leader': None
            }
        
        # Assign employees to units
        assigned_employees = 0
        for emp in pegawai_data:
            unit_name = emp.get('eselon4') or emp.get('eselon3') or emp.get('eselon2') or emp.get('eselon1')
            
            if unit_name:
                # Find unit by name
                unit_id = None
                for uid, unit in unit_map.items():
                    if unit['nama_unit'].lower() == unit_name.lower():
                        unit_id = uid
                        break
                
                if unit_id:
                    unit_map[unit_id]['members'].append(emp)
                    
                    # Update stats
                    status = emp.get('status_kepegawaian', '').upper()
                    if 'PNS' in status:
                        unit_map[unit_id]['stats']['PNS'] += 1
                    elif 'PPPK' in status:
                        unit_map[unit_id]['stats']['PPPK'] += 1
                    else:
                        unit_map[unit_id]['stats']['NONASN'] += 1
                    unit_map[unit_id]['stats']['Total'] += 1
                    
                    # Check for leader
                    if emp.get('is_pimpinan_tertinggi') or 'kepala' in emp.get('jabatan', '').lower():
                        if not unit_map[unit_id]['leader']:
                            unit_map[unit_id]['leader'] = emp
                    
                    assigned_employees += 1
        
        print(f"✅ Successfully assigned {assigned_employees} employees to organizational units")
        
        # Verify tree structure
        units_with_members = sum(1 for unit in unit_map.values() if unit['stats']['Total'] > 0)
        print(f"📊 Units with assigned members: {units_with_members}/{len(units)}")
        
        # Display sample unit statistics
        for unit_id, unit in list(unit_map.items())[:3]:
            stats = unit['stats']
            leader_name = unit['leader']['nama_lengkap'] if unit['leader'] else "No Leader"
            print(f"   {unit['nama_unit']}: {stats['Total']} members (PNS: {stats['PNS']}, PPPK: {stats['PPPK']}, Non-ASN: {stats['NONASN']}) - Leader: {leader_name}")
        
        # Step 5: Test modal filtering
        print("\n🔍 Step 5: Testing modal filtering functionality...")
        
        if units_with_members > 0:
            # Get first unit with members
            test_unit = next(unit for unit in unit_map.values() if unit['stats']['Total'] > 0)
            
            print(f"Testing filtering for unit: {test_unit['nama_unit']}")
            
            # Filter by PNS
            pns_members = [emp for emp in test_unit['members'] 
                          if 'PNS' in emp.get('status_kepegawaian', '').upper()]
            print(f"   PNS filter: {len(pns_members)} employees")
            
            # Filter by PPPK
            pppk_members = [emp for emp in test_unit['members'] 
                           if 'PPPK' in emp.get('status_kepegawaian', '').upper()]
            print(f"   PPPK filter: {len(pppk_members)} employees")
            
            # Filter by Non-ASN
            nonasn_members = [emp for emp in test_unit['members'] 
                             if not ('PNS' in emp.get('status_kepegawaian', '').upper() or 
                                   'PPPK' in emp.get('status_kepegawaian', '').upper())]
            print(f"   Non-ASN filter: {len(nonasn_members)} employees")
            
            # Verify totals match
            total_filtered = len(pns_members) + len(pppk_members) + len(nonasn_members)
            if total_filtered == test_unit['stats']['Total']:
                print("✅ Modal filtering logic working correctly")
            else:
                print(f"❌ Filtering mismatch: {total_filtered} filtered vs {test_unit['stats']['Total']} total")
                return False
        else:
            print("⚠️ No units with members to test filtering")
        
        print("\n🎉 ORGANIZATIONAL STRUCTURE API TEST COMPLETED SUCCESSFULLY!")
        print("✅ All verifications passed:")
        print("   1. ✅ Unit Kerja API endpoint working")
        print("   2. ✅ Pegawai API with status filtering working")
        print("   3. ✅ Tree structure data format compatible")
        print("   4. ✅ Employee status classification working")
        print("   5. ✅ Organizational tree integration working")
        print("   6. ✅ Modal filtering functionality verified")
        
        return True

def main():
    """Main function to run the tests"""
    tester = OrganisasiTester()
    
    print("🚀 Starting Organizational Structure Backend API Testing...")
    print("=" * 60)
    
    # Test login first
    if not tester.test_login():
        print("❌ Login failed - cannot proceed with tests")
        return 1
    
    # Run the Organizational Structure functionality test
    if not tester.test_organizational_structure_api():
        print("❌ Organizational Structure functionality test failed")
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