#!/usr/bin/env python3

import sys
sys.path.append('/app')

try:
    from backend_test import APITester
    
    tester = APITester()
    
    # Check if method exists
    if hasattr(tester, 'test_new_transaction_types'):
        print("✅ Method test_new_transaction_types exists")
        
        # Try to call it
        try:
            result = tester.test_new_transaction_types()
            print(f"✅ Method executed successfully: {result}")
        except Exception as e:
            print(f"❌ Method execution failed: {e}")
    else:
        print("❌ Method test_new_transaction_types does not exist")
        print("Available test methods:")
        for attr in dir(tester):
            if attr.startswith('test_'):
                print(f"  - {attr}")
                
except Exception as e:
    print(f"❌ Import failed: {e}")