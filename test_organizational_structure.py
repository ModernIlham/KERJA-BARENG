import requests
import sys
from datetime import datetime
import json

class OrganizationalStructureTester:
    def __init__(self, base_url="https://assetmate-4.preview.emergentagent.com"):
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

    def test_enhanced_organizational_structure(self):
        """Test Enhanced Organizational Structure features as requested in review"""
        print("\n=== ENHANCED ORGANIZATIONAL STRUCTURE TEST ===")
        
        import time
        timestamp = int(time.time())
        
        # Step 1: Test Unit Manager - Create Organizational Hierarchy
        print("\n🏢 Step 1: Testing Unit Manager - Creating 5-level organizational hierarchy...")
        
        # Create Eselon I - "Sekretariat Jenderal"
        print("\n📋 Creating Eselon I: Sekretariat Jenderal...")
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
            print("❌ Failed to create Eselon I unit")
            return False
        
        eselon1_id = response.get('id')
        print(f"✅ Eselon I created with ID: {eselon1_id}")
        
        # Create Eselon II - "Biro Umum" under Sekretariat Jenderal
        print("\n📋 Creating Eselon II: Biro Umum...")
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
            print("❌ Failed to create Eselon II unit")
            return False
        
        eselon2_id = response.get('id')
        print(f"✅ Eselon II created with ID: {eselon2_id}")
        
        # Create Eselon III - "Bagian Perlengkapan" under Biro Umum
        print("\n📋 Creating Eselon III: Bagian Perlengkapan...")
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
            print("❌ Failed to create Eselon III unit")
            return False
        
        eselon3_id = response.get('id')
        print(f"✅ Eselon III created with ID: {eselon3_id}")
        
        # Create Eselon IV - "Subbagian Gudang" under Bagian Perlengkapan
        print("\n📋 Creating Eselon IV: Subbagian Gudang...")
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
            print("❌ Failed to create Eselon IV unit")
            return False
        
        eselon4_id = response.get('id')
        print(f"✅ Eselon IV created with ID: {eselon4_id}")
        
        # Create Eselon V - "Ketua Tim Gudang" under Subbagian Gudang
        print("\n📋 Creating Eselon V: Ketua Tim Gudang...")
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
            print("❌ Failed to create Eselon V unit")
            return False
        
        eselon5_id = response.get('id')
        print(f"✅ Eselon V created with ID: {eselon5_id}")
        
        # Step 2: Verify hierarchy is saved correctly
        print("\n🔍 Step 2: Verifying organizational hierarchy is saved correctly...")
        
        success, response = self.run_test(
            "Get All Unit Kerja",
            "GET",
            "api/settings/unit-kerja",
            200
        )
        
        if not success:
            print("❌ Failed to retrieve unit kerja list")
            return False
        
        units = response if isinstance(response, list) else []
        print(f"📊 Found {len(units)} organizational units")
        
        # Verify hierarchy structure
        hierarchy_map = {}
        for unit in units:
            unit_id = unit.get('id')
            parent_id = unit.get('parent_id')
            nama_unit = unit.get('nama_unit')
            eselon = unit.get('eselon')
            
            hierarchy_map[unit_id] = {
                'nama_unit': nama_unit,
                'eselon': eselon,
                'parent_id': parent_id
            }
            
            print(f"   {eselon}: {nama_unit} (ID: {unit_id}, Parent: {parent_id})")
        
        # Verify parent-child relationships
        print("\n🔗 Verifying parent-child relationships...")
        
        # Check Eselon I has no parent
        eselon1_unit = hierarchy_map.get(eselon1_id)
        if eselon1_unit and eselon1_unit['parent_id'] is None:
            print("✅ Eselon I has no parent (correct)")
        else:
            print("❌ Eselon I parent relationship incorrect")
            return False
        
        # Check Eselon II parent is Eselon I
        eselon2_unit = hierarchy_map.get(eselon2_id)
        if eselon2_unit and eselon2_unit['parent_id'] == eselon1_id:
            print("✅ Eselon II parent is Eselon I (correct)")
        else:
            print("❌ Eselon II parent relationship incorrect")
            return False
        
        # Check Eselon III parent is Eselon II
        eselon3_unit = hierarchy_map.get(eselon3_id)
        if eselon3_unit and eselon3_unit['parent_id'] == eselon2_id:
            print("✅ Eselon III parent is Eselon II (correct)")
        else:
            print("❌ Eselon III parent relationship incorrect")
            return False
        
        # Check Eselon IV parent is Eselon III
        eselon4_unit = hierarchy_map.get(eselon4_id)
        if eselon4_unit and eselon4_unit['parent_id'] == eselon3_id:
            print("✅ Eselon IV parent is Eselon III (correct)")
        else:
            print("❌ Eselon IV parent relationship incorrect")
            return False
        
        # Check Eselon V parent is Eselon IV
        eselon5_unit = hierarchy_map.get(eselon5_id)
        if eselon5_unit and eselon5_unit['parent_id'] == eselon4_id:
            print("✅ Eselon V parent is Eselon IV (correct)")
        else:
            print("❌ Eselon V parent relationship incorrect")
            return False
        
        # Step 3: Test Employee Form with Cascading Logic
        print("\n👤 Step 3: Testing Employee Form with full organizational hierarchy...")
        
        # Create employee with full 5-level hierarchy
        employee_data = {
            # Tab Utama
            "nip": f"ORG{timestamp % 10000000:06d}001",
            "nama_lengkap": "Pegawai Test Organisasi",
            "kewarganegaraan": "WNI",
            "nik": f"31010119900{timestamp % 100:02d}001",
            
            # Tab Jabatan - Full hierarchy using unit names
            "jabatan": "Kepala Tim Gudang",
            "eselon1": "Sekretariat Jenderal",
            "eselon2": "Biro Umum", 
            "eselon3": "Bagian Perlengkapan",
            "eselon4": "Subbagian Gudang",
            "eselon5": "Ketua Tim Gudang",
            
            # Tab Status
            "status_kepegawaian": "PNS",
            "status_penempatan": "Definitif",
            "status": "AKTIF",
            
            # Tab Kontak
            "no_telp": "081234567890",
            "email": "pegawai.organisasi@example.com",
            "keterangan": "Test employee with full 5-level organizational hierarchy"
        }
        
        success, response = self.run_test(
            "Create Employee with Full Hierarchy",
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
        
        # Step 4: Verify Data - Check if employee record saved correct unit names
        print("\n📋 Step 4: Verifying employee record saved correct unit names for all 5 levels...")
        
        # Get employee details to verify saved data
        success, employee_details = self.run_test(
            "Get Employee List",
            "GET",
            "api/pegawai",
            200,
            data={"search": "Pegawai Test Organisasi"}
        )
        
        if success and employee_details.get('data'):
            employee_details = employee_details['data'][0]
        else:
            print("❌ Failed to retrieve employee details")
            return False
        
        # Verify all 5 levels are correctly saved
        print("\n🔍 Verifying saved organizational hierarchy:")
        
        saved_eselon1 = employee_details.get('eselon1')
        saved_eselon2 = employee_details.get('eselon2')
        saved_eselon3 = employee_details.get('eselon3')
        saved_eselon4 = employee_details.get('eselon4')
        saved_eselon5 = employee_details.get('eselon5')
        
        print(f"   Eselon I: {saved_eselon1}")
        print(f"   Eselon II: {saved_eselon2}")
        print(f"   Eselon III: {saved_eselon3}")
        print(f"   Eselon IV: {saved_eselon4}")
        print(f"   Eselon V: {saved_eselon5}")
        
        # Verify each level matches expected values
        verification_results = []
        
        if saved_eselon1 == "Sekretariat Jenderal":
            print("✅ Eselon I correctly saved")
            verification_results.append(True)
        else:
            print(f"❌ Eselon I incorrect: expected 'Sekretariat Jenderal', got '{saved_eselon1}'")
            verification_results.append(False)
        
        if saved_eselon2 == "Biro Umum":
            print("✅ Eselon II correctly saved")
            verification_results.append(True)
        else:
            print(f"❌ Eselon II incorrect: expected 'Biro Umum', got '{saved_eselon2}'")
            verification_results.append(False)
        
        if saved_eselon3 == "Bagian Perlengkapan":
            print("✅ Eselon III correctly saved")
            verification_results.append(True)
        else:
            print(f"❌ Eselon III incorrect: expected 'Bagian Perlengkapan', got '{saved_eselon3}'")
            verification_results.append(False)
        
        if saved_eselon4 == "Subbagian Gudang":
            print("✅ Eselon IV correctly saved")
            verification_results.append(True)
        else:
            print(f"❌ Eselon IV incorrect: expected 'Subbagian Gudang', got '{saved_eselon4}'")
            verification_results.append(False)
        
        if saved_eselon5 == "Ketua Tim Gudang":
            print("✅ Eselon V correctly saved")
            verification_results.append(True)
        else:
            print(f"❌ Eselon V incorrect: expected 'Ketua Tim Gudang', got '{saved_eselon5}'")
            verification_results.append(False)
        
        # Final verification
        all_levels_correct = all(verification_results)
        
        if all_levels_correct:
            print("\n🎉 ENHANCED ORGANIZATIONAL STRUCTURE TEST COMPLETED SUCCESSFULLY!")
            print("✅ All verifications passed:")
            print("   - Unit Manager: Successfully created 5-level organizational hierarchy")
            print("   - Hierarchy Verification: All parent-child relationships correct")
            print("   - Employee Form: Successfully created employee with full hierarchy")
            print("   - Data Verification: All 5 organizational levels correctly saved in employee record")
            print("   - Cascading Logic: Backend supports full organizational structure")
            print("   - Hierarchy Depth: 5 levels (Eselon I through V) working correctly")
            return True
        else:
            print("\n❌ ENHANCED ORGANIZATIONAL STRUCTURE TEST FAILED!")
            print("   Some organizational levels were not saved correctly in employee record")
            return False

if __name__ == "__main__":
    tester = OrganizationalStructureTester()
    
    # Test authentication first
    if not tester.test_login():
        print("❌ Authentication failed - stopping tests")
        sys.exit(1)
    
    # Run the specific test for Enhanced Organizational Structure
    print("🚀 Starting Enhanced Organizational Structure testing...")
    success = tester.test_enhanced_organizational_structure()
    
    if success:
        print("\n✅ Enhanced Organizational Structure test completed successfully!")
    else:
        print("\n❌ Enhanced Organizational Structure test failed!")
        sys.exit(1)