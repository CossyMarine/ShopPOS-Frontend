import { PROFIT_BASIS } from './constants';

export const money = (n) => {
    const v = Number(n || 0);
    return `${v < 0 ? '-' : ''}KES ${Math.abs(v).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
};

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const labelFromDate = (iso) => {
    const [, m, d] = iso.split('-').map(Number);
    return `${d} ${MON[m - 1]}`;
};

// Long ranges (This Year) would be hundreds of bars, so roll them up by month.
function groupByMonth(trend) {
    const by = {};
    trend.forEach((t) => {
        const k = t.date.slice(0, 7);
        const o = (by[k] ||= { date: k, label: MON[Number(k.slice(5)) - 1], sales: 0, profit: 0 });
        o.sales += t.sales;
        o.profit += t.profit;
    });
    return Object.values(by).sort((a, b) => a.date.localeCompare(b.date));
}

// Turns the raw API responses into the numbers the page shows.
//   VAT switch OFF (Admin Settings): overview figures only, no VAT anywhere.
//   VAT switch ON: /analytics/vat figures, covering ALL receipts, including
//   the ones sold while the switch was off.
export function buildView(overview, vat) {
    const vOn = !!vat?.enabled && !!vat.totals;
    const t = overview.totals;
    const salary = overview.salary?.totalPaid || 0;
    const exVat = PROFIT_BASIS === 'exVat';

    let revenue, profit, cost, trend;
    if (vOn) {
        const v = vat.totals;
        revenue = v.paid;
        profit = exVat ? v.profitExVat : v.profitInclVat;
        cost = v.cost;
        trend = (vat.daily || []).map((x) => ({
            date: x.date,
            label: labelFromDate(x.date),
            sales: x.paid,
            profit: (exVat ? x.net : x.paid) - x.cost,
        }));
    } else {
        revenue = t.totalRevenue;
        profit = t.totalProfit;
        cost = t.totalRevenue - t.totalProfit;
        trend = (overview.profitTrend || []).map((x) => ({ date: x.date, label: x.label, sales: x.revenue, profit: x.profit }));
    }

    return {
        vOn,
        vatShare: vOn && exVat, // VAT is its own slice of the "where KES 100 went" bar
        revenue,
        profit,
        cost,
        salary,
        kept: profit - salary,
        vatCollected: vOn ? vat.totals.vat : 0,
        revenueLabel: vOn ? 'Revenue (incl. VAT)' : 'Total Revenue',
        profitLabel: vOn ? (exVat ? 'Profit (excl. VAT)' : 'Profit (incl. VAT)') : 'Total Profit',
        trend: trend.length > 45 ? groupByMonth(trend) : trend,
    };
          }
