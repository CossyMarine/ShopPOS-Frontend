// src/utils/payroll.js
// Shared helpers used by the wage profile modal and the global payout screen.

export const STATUTORY_DEDUCTION_ID = 'statutory_tax';

// Builds the same "menu" of deductions the backend applies: the built-in
// statutory levy first, then every active custom deduction that could
// apply. Pass `userId` to scope "individual" deductions to one person
// (wage profile editing). Leave it null for an org-wide view (global
// payout screen), where "individual" deductions are still shown since
// *someone* in a bulk run may be targeted by them.
export function buildDeductionOptions(deductions = [], userId = null) {
  const custom = (deductions || [])
    .filter((d) => d.isActive)
    .filter((d) => {
      if (d.appliesTo !== 'individual') return true;
      if (!userId) return true;
      return (d.users || []).some((u) => String(u._id || u) === String(userId));
    })
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  return [
    {
      _id: STATUTORY_DEDUCTION_ID,
      name: 'Statutory Tax (PAYE / NHIF / NSSF)',
      calcType: 'percentage',
      amount: 12,
      synthetic: true,
      note: 'Applied automatically once gross pay for the period exceeds 24,000 KES',
    },
    ...custom.map((d) => ({
      _id: String(d._id),
      name: d.name,
      calcType: d.calcType,
      amount: d.amount,
      synthetic: false,
    })),
  ];
}

export const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const money = (n) => `${Math.round(n || 0).toLocaleString()} KES`;

export const PAYROLL_ROLE_OPTIONS = [
  { value: 'all', label: 'All Roles' },
  { value: 'cashier', label: 'Cashiers' },
  { value: 'storekeeper', label: 'Storekeepers' },
  { value: 'branchManager', label: 'Branch Managers' },
  { value: 'staff', label: 'Staff' },
];
