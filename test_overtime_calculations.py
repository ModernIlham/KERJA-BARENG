#!/usr/bin/env python3
"""
Direct unit test for overtime calculation logic
This tests the calculate_overtime_pay function directly without API calls
"""

import sys
import os
sys.path.append('/app/backend')

# Import the function from kepegawaian.py
from routes.kepegawaian import calculate_overtime_pay

def test_non_asn_regular_overtime():
    """Test Non-ASN regular overtime (3 hours)"""
    print("🧮 Testing Non-ASN Regular Overtime (3 hours)...")
    
    # Expected: Rate = 13000, Calculation = (1*1.5*13000) + (2*2*13000) = 19500 + 52000 = 71500
    # Meal = 30000, Total Gross = 71500 + 30000 = 101500
    # Tax = 101500 * 0.02 = 2030, Net = 101500 - 2030 = 99470
    
    rate, meal, gross, tax, net = calculate_overtime_pay("NON_ASN", "Junior", 3.0, False)
    
    print(f"   Rate: {rate} IDR (Expected: 13000)")
    print(f"   Meal: {meal} IDR (Expected: 30000)")
    print(f"   Gross: {gross} IDR (Expected: 71500)")
    print(f"   Tax: {tax} IDR (Expected: 2030)")
    print(f"   Net: {net} IDR (Expected: 99470)")
    
    # Verify calculations
    expected_rate = 13000
    expected_meal = 30000
    expected_gross = 71500  # (1*1.5*13000) + (2*2*13000)
    expected_tax = 2030     # (71500 + 30000) * 0.02
    expected_net = 99470    # 101500 - 2030
    
    success = True
    if abs(rate - expected_rate) > 0.01:
        print(f"   ❌ Rate mismatch: expected {expected_rate}, got {rate}")
        success = False
    else:
        print(f"   ✅ Rate correct")
        
    if abs(meal - expected_meal) > 0.01:
        print(f"   ❌ Meal mismatch: expected {expected_meal}, got {meal}")
        success = False
    else:
        print(f"   ✅ Meal allowance correct")
        
    if abs(gross - expected_gross) > 0.01:
        print(f"   ❌ Gross mismatch: expected {expected_gross}, got {gross}")
        success = False
    else:
        print(f"   ✅ Gross calculation correct")
        
    if abs(tax - expected_tax) > 0.01:
        print(f"   ❌ Tax mismatch: expected {expected_tax}, got {tax}")
        success = False
    else:
        print(f"   ✅ Tax calculation correct")
        
    if abs(net - expected_net) > 0.01:
        print(f"   ❌ Net mismatch: expected {expected_net}, got {net}")
        success = False
    else:
        print(f"   ✅ Net pay correct")
    
    return success

def test_non_asn_holiday_overtime():
    """Test Non-ASN holiday overtime (8 hours)"""
    print("\n🧮 Testing Non-ASN Holiday Overtime (8 hours)...")
    
    # Expected: Rate = 13000, Calculation = (7*2*13000) + (1*3*13000) = 182000 + 39000 = 221000
    # Meal = 30000, Total Gross = 221000 + 30000 = 251000
    # Tax = 251000 * 0.02 = 5020, Net = 251000 - 5020 = 245980
    
    rate, meal, gross, tax, net = calculate_overtime_pay("NON_ASN", "Junior", 8.0, True)
    
    print(f"   Rate: {rate} IDR (Expected: 13000)")
    print(f"   Meal: {meal} IDR (Expected: 30000)")
    print(f"   Gross: {gross} IDR (Expected: 221000)")
    print(f"   Tax: {tax} IDR (Expected: 5020)")
    print(f"   Net: {net} IDR (Expected: 245980)")
    
    # Verify calculations
    expected_rate = 13000
    expected_meal = 30000
    expected_gross = 221000  # (7*2*13000) + (1*3*13000)
    expected_tax = 5020      # (221000 + 30000) * 0.02
    expected_net = 245980    # 251000 - 5020
    
    success = True
    if abs(rate - expected_rate) > 0.01:
        print(f"   ❌ Rate mismatch: expected {expected_rate}, got {rate}")
        success = False
    else:
        print(f"   ✅ Rate correct")
        
    if abs(meal - expected_meal) > 0.01:
        print(f"   ❌ Meal mismatch: expected {expected_meal}, got {meal}")
        success = False
    else:
        print(f"   ✅ Meal allowance correct")
        
    if abs(gross - expected_gross) > 0.01:
        print(f"   ❌ Gross mismatch: expected {expected_gross}, got {gross}")
        success = False
    else:
        print(f"   ✅ Gross calculation correct")
        
    if abs(tax - expected_tax) > 0.01:
        print(f"   ❌ Tax mismatch: expected {expected_tax}, got {tax}")
        success = False
    else:
        print(f"   ✅ Tax calculation correct")
        
    if abs(net - expected_net) > 0.01:
        print(f"   ❌ Net mismatch: expected {expected_net}, got {net}")
        success = False
    else:
        print(f"   ✅ Net pay correct")
    
    return success

def test_asn_regular_overtime():
    """Test ASN regular overtime (3 hours)"""
    print("\n🧮 Testing ASN Regular Overtime (3 hours, Grade III/a)...")
    
    # Expected: Rate = 30000, Calculation = 30000 * 3 = 90000
    # Meal = 37000, Total Gross = 90000 + 37000 = 127000
    # Tax = 127000 * 0.05 = 6350, Net = 127000 - 6350 = 120650
    
    rate, meal, gross, tax, net = calculate_overtime_pay("ASN", "III/a", 3.0, False)
    
    print(f"   Rate: {rate} IDR (Expected: 30000)")
    print(f"   Meal: {meal} IDR (Expected: 37000)")
    print(f"   Gross: {gross} IDR (Expected: 90000)")
    print(f"   Tax: {tax} IDR (Expected: 6350)")
    print(f"   Net: {net} IDR (Expected: 120650)")
    
    # Verify calculations
    expected_rate = 30000
    expected_meal = 37000
    expected_gross = 90000   # 30000 * 3
    expected_tax = 6350      # (90000 + 37000) * 0.05
    expected_net = 120650    # 127000 - 6350
    
    success = True
    if abs(rate - expected_rate) > 0.01:
        print(f"   ❌ Rate mismatch: expected {expected_rate}, got {rate}")
        success = False
    else:
        print(f"   ✅ Rate correct")
        
    if abs(meal - expected_meal) > 0.01:
        print(f"   ❌ Meal mismatch: expected {expected_meal}, got {meal}")
        success = False
    else:
        print(f"   ✅ Meal allowance correct")
        
    if abs(gross - expected_gross) > 0.01:
        print(f"   ❌ Gross mismatch: expected {expected_gross}, got {gross}")
        success = False
    else:
        print(f"   ✅ Gross calculation correct")
        
    if abs(tax - expected_tax) > 0.01:
        print(f"   ❌ Tax mismatch: expected {expected_tax}, got {tax}")
        success = False
    else:
        print(f"   ✅ Tax calculation correct")
        
    if abs(net - expected_net) > 0.01:
        print(f"   ❌ Net mismatch: expected {expected_net}, got {net}")
        success = False
    else:
        print(f"   ✅ Net pay correct")
    
    return success

def main():
    print("🚀 Starting Direct Overtime Calculation Unit Tests...")
    print("=" * 60)
    
    results = []
    
    # Test Non-ASN regular overtime
    results.append(test_non_asn_regular_overtime())
    
    # Test Non-ASN holiday overtime
    results.append(test_non_asn_holiday_overtime())
    
    # Test ASN regular overtime
    results.append(test_asn_regular_overtime())
    
    print("\n" + "=" * 60)
    print("🎯 UNIT TEST SUMMARY")
    
    passed = sum(results)
    total = len(results)
    
    print(f"   Tests Run: {total}")
    print(f"   Tests Passed: {passed}")
    print(f"   Success Rate: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("🎉 ALL UNIT TESTS PASSED!")
        print("✅ Overtime calculation logic is working correctly according to new rules")
        return 0
    else:
        print("❌ SOME UNIT TESTS FAILED!")
        print("❌ Overtime calculation logic needs further fixes")
        return 1

if __name__ == "__main__":
    sys.exit(main())