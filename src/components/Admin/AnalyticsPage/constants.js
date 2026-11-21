export const RANGE_OPTIONS = [
    { id: 'today', label: 'Today' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'last_30_days', label: 'Last 30 Days' },
    { id: 'year', label: 'This Year' },
    { id: 'custom', label: 'Custom' },
];

// With VAT on, profit is shown WITHOUT VAT ('exVat'): VAT collected is owed to
// the tax authority, not kept by the shop. Set 'inclVat' to show it included.
export const PROFIT_BASIS = 'exVat';

export const EMPTY_OVERVIEW = {
    totals: { totalRevenue: 0, totalProfit: 0, unitsSold: 0, salaryPayments: 0, profitAfterSalary: 0, estNextPayroll: 0 },
    profitTrend: [],
    topItems: [],
    stuckItems: [],
    slowMovingItems: [],
    branchPerformance: [],
    topBranch: null,
    salary: { totalPaid: 0, payoutCount: 0, upcomingPayouts: [], staffSalaryDetail: [] },
};
export const EMPTY_MARGIN = { categories: [], totals: {} };
export const EMPTY_DEAD = { items: [], totalValueTiedUp: 0, thresholdDays: 30 };
export const EMPTY_VAT = { enabled: false };
