#!/usr/bin/env python3
"""
Test script for P2: Upload Dokumen PDF dengan Tanda Tangan Digital
"""

import sys
import os
sys.path.append('/app')

from backend_test import APITester

def main():
    print("🚀 Starting P2: Upload Dokumen PDF dengan Tanda Tangan Digital Testing...")
    print("=" * 80)
    
    tester = APITester()
    
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
    success = tester.test_transaksi_dokumen_upload_signature()
    
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
    sys.exit(0 if success else 1)