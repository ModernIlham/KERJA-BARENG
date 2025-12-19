export const RATE_ASN = {
  "I": 10000,
  "II": 15000,
  "III": 20000,
  "IV": 25000
};

export const RATE_NON_ASN = {
  "Junior": 15000,
  "Senior": 25000,
  "Lead": 35000
};

export const UANG_MAKAN = 35000; // Per day if overtime > 4 hours
export const TAX_RATE_ASN = 0.05; // 5%
export const TAX_RATE_NON_ASN = 0.02; // 2%

export const calculateOvertime = (userType, grade, durationHours) => {
  let rate = 0;
  if (userType === 'ASN') {
    rate = RATE_ASN[grade] || 10000;
  } else {
    rate = RATE_NON_ASN[grade] || 15000;
  }

  const grossPay = rate * durationHours;
  const mealAllowance = durationHours >= 4 ? UANG_MAKAN : 0;
  const totalGross = grossPay + mealAllowance;
  
  const taxRate = userType === 'ASN' ? TAX_RATE_ASN : TAX_RATE_NON_ASN;
  const tax = totalGross * taxRate;
  const netPay = totalGross - tax;

  return {
    rate,
    grossPay,
    mealAllowance,
    totalGross,
    tax,
    netPay
  };
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount);
};
