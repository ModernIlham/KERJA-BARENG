#!/usr/bin/env python3

import requests
import sys
import time
import json

class OrganizationalStructureTester:
    def __init__(self, base_url="https://siman-g-1.preview.emergentagent.com"):
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
        
        # Try admin credentials
        credentials = [
            {"email": "admin@example.com", "password": "admin"},
            {"email": "admin@example.com", "password": "admin123"}
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

    def test_enhanced_organizational_structure(self):
        """Test Enhanced Organizational Structure features as requested in review"""
        print("\n=== ENHANCED ORGANIZATIONAL STRUCTURE TEST ===")
        
        timestamp = int(time.time())
        
        # Step 1: Test Unit Manager - Create 5-level organizational hierarchy
        print("\n🏢 Step 1: Testing Unit Manager - Creating 5-level organizational hierarchy...")
        
        # Create Eselon I: "Sekretariat Jenderal"
        eselon1_data = {
            "nama_unit": "Sekretariat Jenderal",
            "eselon": "I",
            "parent_id": None
        }
        
        success, response = self.run_test(
            "Create Eselon I (Sekretariat Jenderal)",
            "POST",
            "api/settings/unit-kerja",
            200,
            data=eselon1_data
        )
        
        if not success:
            print("❌ Failed to create Eselon I")
            return False
            
        eselon1_id = response.get('id')
        print(f"✅ Eselon I created with ID: {eselon1_id}")
        
        # Create Eselon II: "Biro Umum" -> Parent: "Sekretariat Jenderal"
        eselon2_data = {
            "nama_unit": "Biro Umum",
            "eselon": "II",
            "parent_id": eselon1_id
        }
        
        success, response = self.run_test(
            "Create Eselon II (Biro Umum)",
            "POST",
            "api/settings/unit-kerja",
            200,
            data=eselon2_data
        )
        
        if not success:
            print("❌ Failed to create Eselon II")
            return False
            
        eselon2_id = response.get('id')
        print(f"✅ Eselon II created with ID: {eselon2_id}")
        
        # Create Eselon III: "Bagian Perlengkapan" -> Parent: "Biro Umum"
        eselon3_data = {
            "nama_unit": "Bagian Perlengkapan",
            "eselon": "III",
            "parent_id": eselon2_id
        }
        
        success, response = self.run_test(
            "Create Eselon III (Bagian Perlengkapan)",
            "POST",
            "api/settings/unit-kerja",
            200,
            data=eselon3_data
        )
        
        if not success:
            print("❌ Failed to create Eselon III")
            return False
            
        eselon3_id = response.get('id')
        print(f"✅ Eselon III created with ID: {eselon3_id}")
        
        # Create Eselon IV: "Subbagian Gudang" -> Parent: "Bagian Perlengkapan"
        eselon4_data = {
            "nama_unit": "Subbagian Gudang",
            "eselon": "IV",
            "parent_id": eselon3_id
        }
        
        success, response = self.run_test(
            "Create Eselon IV (Subbagian Gudang)",
            "POST",
            "api/settings/unit-kerja",
            200,
            data=eselon4_data
        )
        
        if not success:
            print("❌ Failed to create Eselon IV")
            return False
            
        eselon4_id = response.get('id')
        print(f"✅ Eselon IV created with ID: {eselon4_id}")
        
        # Create Eselon V: "Ketua Tim Gudang" -> Parent: "Subbagian Gudang"
        eselon5_data = {
            "nama_unit": "Ketua Tim Gudang",
            "eselon": "V",
            "parent_id": eselon4_id
        }
        
        success, response = self.run_test(
            "Create Eselon V (Ketua Tim Gudang)",
            "POST",
            "api/settings/unit-kerja",
            200,
            data=eselon5_data
        )
        
        if not success:
            print("❌ Failed to create Eselon V")
            return False
            
        eselon5_id = response.get('id')
        print(f"✅ Eselon V created with ID: {eselon5_id}")
        
        # Step 2: Verify hierarchy is saved correctly
        print("\n🔍 Step 2: Verifying organizational hierarchy...")
        
        success, response = self.run_test(
            "Get All Unit Kerja",
            "GET",
            "api/settings/unit-kerja",
            200
        )
        
        if not success:
            print("❌ Failed to get unit kerja list")
            return False
            
        units = response if isinstance(response, list) else []
        print(f"📊 Found {len(units)} organizational units")
        
        # Verify hierarchy relationships
        hierarchy_verified = True
        unit_map = {unit['id']: unit for unit in units}
        
        # Check Eselon I (no parent)
        eselon1_unit = unit_map.get(eselon1_id)
        if not eselon1_unit or eselon1_unit.get('parent_id') is not None:
            print("❌ Eselon I hierarchy verification failed")
            hierarchy_verified = False
        else:
            print(f"✅ Eselon I verified: {eselon1_unit['nama_unit']} (no parent)")
        
        # Check Eselon II (parent: Eselon I)
        eselon2_unit = unit_map.get(eselon2_id)
        if not eselon2_unit or eselon2_unit.get('parent_id') != eselon1_id:
            print("❌ Eselon II hierarchy verification failed")
            hierarchy_verified = False
        else:
            print(f"✅ Eselon II verified: {eselon2_unit['nama_unit']} -> {eselon1_unit['nama_unit']}")
        
        # Check Eselon III (parent: Eselon II)
        eselon3_unit = unit_map.get(eselon3_id)
        if not eselon3_unit or eselon3_unit.get('parent_id') != eselon2_id:
            print("❌ Eselon III hierarchy verification failed")
            hierarchy_verified = False
        else:
            print(f"✅ Eselon III verified: {eselon3_unit['nama_unit']} -> {eselon2_unit['nama_unit']}")
        
        # Check Eselon IV (parent: Eselon III)
        eselon4_unit = unit_map.get(eselon4_id)
        if not eselon4_unit or eselon4_unit.get('parent_id') != eselon3_id:
            print("❌ Eselon IV hierarchy verification failed")
            hierarchy_verified = False
        else:
            print(f"✅ Eselon IV verified: {eselon4_unit['nama_unit']} -> {eselon3_unit['nama_unit']}")
        
        # Check Eselon V (parent: Eselon IV)
        eselon5_unit = unit_map.get(eselon5_id)
        if not eselon5_unit or eselon5_unit.get('parent_id') != eselon4_id:
            print("❌ Eselon V hierarchy verification failed")
            hierarchy_verified = False
        else:
            print(f"✅ Eselon V verified: {eselon5_unit['nama_unit']} -> {eselon4_unit['nama_unit']}")
        
        if not hierarchy_verified:
            print("❌ Organizational hierarchy verification failed")
            return False
        
        print("✅ All organizational hierarchy relationships verified correctly")
        
        # Step 3: Test Employee Form (Cascading) - Create employee with full 5-level hierarchy
        print("\n👤 Step 3: Testing Employee Form with full 5-level hierarchy...")
        
        employee_data = {
            # Tab Utama
            "nip": f"ORG{timestamp % 10000000:07d}001",
            "nama_lengkap": "Pegawai Test Organisasi",
            "kewarganegaraan": "WNI",
            "nik": f"31010119900{timestamp % 100:02d}001",
            
            # Tab Jabatan - Full 5-level hierarchy
            "jabatan": "Staff Gudang",
            "eselon1": "Sekretariat Jenderal",
            "eselon2": "Biro Umum", 
            "eselon3": "Bagian Perlengkapan",
            "eselon4": "Subbagian Gudang",
            "eselon5": "Ketua Tim Gudang",
            
            # Tab Status
            "status_kepegawaian": "PNS",
            "pangkat_golongan": "Pengatur (II/c)",
            "status_penempatan": "Definitif",
            "status": "AKTIF",
            
            # Tab Kontak
            "no_telp": "081234567890",
            "email": "pegawai.organisasi@example.com",
            "keterangan": "Test employee for organizational structure verification"
        }
        
        success, response = self.run_test(
            "Create Employee with Full 5-Level Hierarchy",
            "POST",
            "api/pegawai",
            200,
            data=employee_data
        )
        
        if not success:
            print("❌ Failed to create employee with organizational hierarchy")
            return False
            
        employee_id = response.get('_id') or response.get('id')
        print(f"✅ Employee created successfully with ID: {employee_id}")
        print(f"   Name: {response.get('nama_lengkap')}")
        print(f"   Position: {response.get('jabatan')}")
        
        # Step 4: Verify Data - Check if employee record saved correct unit names for all 5 levels
        print("\n🔍 Step 4: Verifying employee data contains all organizational levels...")
        
        success, employee_details = self.run_test(
            "Get Employee Details",
            "GET",
            f"api/pegawai?search={employee_data['nip']}",
            200
        )
        
        if not success:
            print("❌ Failed to get employee details")
            return False
            
        employees = employee_details.get('data', [])
        if not employees:
            print("❌ Employee not found in search results")
            return False
            
        employee = employees[0]
        
        # Verify all 5 organizational levels are saved correctly
        organizational_levels = {
            'eselon1': 'Sekretariat Jenderal',
            'eselon2': 'Biro Umum',
            'eselon3': 'Bagian Perlengkapan', 
            'eselon4': 'Subbagian Gudang',
            'eselon5': 'Ketua Tim Gudang'
        }
        
        data_verification_passed = True
        
        for level, expected_name in organizational_levels.items():
            actual_name = employee.get(level)
            if actual_name != expected_name:
                print(f"❌ {level} verification failed: expected '{expected_name}', got '{actual_name}'")
                data_verification_passed = False
            else:
                print(f"✅ {level} verified: '{actual_name}'")
        
        if not data_verification_passed:
            print("❌ Employee organizational data verification failed")
            return False
        
        print("✅ All organizational levels correctly saved in employee record")
        
        # Step 5: Test cascading logic by verifying backend supports organizational structure
        print("\n🔄 Step 5: Verifying backend supports cascading logic...")
        
        success, all_units = self.run_test(
            "Verify Unit Kerja Structure for Cascading",
            "GET",
            "api/settings/unit-kerja",
            200
        )
        
        if not success:
            print("❌ Failed to get unit kerja for cascading verification")
            return False
        
        # Check if we can build a proper hierarchy tree from the data
        units_by_eselon = {}
        for unit in all_units:
            eselon = unit.get('eselon')
            if eselon not in units_by_eselon:
                units_by_eselon[eselon] = []
            units_by_eselon[eselon].append(unit)
        
        # Verify we have units at all 5 levels
        required_eselons = ['I', 'II', 'III', 'IV', 'V']
        cascading_structure_valid = True
        
        for eselon in required_eselons:
            if eselon not in units_by_eselon:
                print(f"❌ Missing units at Eselon {eselon}")
                cascading_structure_valid = False
            else:
                count = len(units_by_eselon[eselon])
                print(f"✅ Eselon {eselon}: {count} units available")
        
        if not cascading_structure_valid:
            print("❌ Cascading structure validation failed")
            return False
        
        # Verify parent-child relationships exist for cascading
        parent_child_relationships = {}
        for unit in all_units:
            parent_id = unit.get('parent_id')
            if parent_id:
                if parent_id not in parent_child_relationships:
                    parent_child_relationships[parent_id] = []
                parent_child_relationships[parent_id].append(unit)
        
        print(f"📊 Found {len(parent_child_relationships)} parent units with children")
        
        # Verify our test hierarchy has proper parent-child relationships
        test_hierarchy_valid = True
        
        # Eselon I should have children (Eselon II)
        if eselon1_id not in parent_child_relationships:
            print("❌ Eselon I has no children")
            test_hierarchy_valid = False
        else:
            children = parent_child_relationships[eselon1_id]
            print(f"✅ Eselon I has {len(children)} children: {[c['nama_unit'] for c in children]}")
        
        # Eselon II should have children (Eselon III)
        if eselon2_id not in parent_child_relationships:
            print("❌ Eselon II has no children")
            test_hierarchy_valid = False
        else:
            children = parent_child_relationships[eselon2_id]
            print(f"✅ Eselon II has {len(children)} children: {[c['nama_unit'] for c in children]}")
        
        if not test_hierarchy_valid:
            print("❌ Test hierarchy validation failed")
            return False
        
        print("✅ Cascading logic backend support verified - hierarchy depth of 5 levels working correctly")
        
        print("\n🎉 ENHANCED ORGANIZATIONAL STRUCTURE TEST COMPLETED SUCCESSFULLY!")
        print("✅ All verifications passed:")
        print("   1. Unit Manager: Successfully created 5-level organizational hierarchy")
        print("      - Sekretariat Jenderal (Eselon I)")
        print("      - Biro Umum (Eselon II)")
        print("      - Bagian Perlengkapan (Eselon III)")
        print("      - Subbagian Gudang (Eselon IV)")
        print("      - Ketua Tim Gudang (Eselon V)")
        print("   2. Hierarchy Verification: All parent-child relationships correct")
        print("   3. Employee Form: Successfully created employee with full 5-level hierarchy")
        print("   4. Data Verification: All organizational levels correctly saved in employee record")
        print("   5. Cascading Logic: Backend supports full organizational structure")
        print("   6. Hierarchy Depth: 5 levels working correctly")
        print("   → Frontend cascading dropdowns can be implemented using this backend structure")
        
        return True

def main():
    tester = OrganizationalStructureTester()
    
    # Test login first
    if not tester.test_login():
        print("❌ Login failed, cannot proceed with tests")
        return 1
    
    # Run Enhanced Organizational Structure test
    organizational_success = tester.test_enhanced_organizational_structure()
    
    print(f"\n📊 ENHANCED ORGANIZATIONAL STRUCTURE TEST RESULTS:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    print(f"   Enhanced Organizational Structure Test: {'✅ PASSED' if organizational_success else '❌ FAILED'}")
    
    return 0 if organizational_success else 1

if __name__ == "__main__":
    sys.exit(main())