import { PROFIT_BASIS } from './constants';

export const money = (n) => {
    const v = Number(n || 0);
    return `${v < 0 ? '-' : ''}KES ${Math.abs(v).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
};

export const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
export const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
export const niceReason = (r) => String(r || '').replace(/_/g, ' ');

const TZ = 'Africa/Nairobi';
export const fmtTime = (d) => new Date(d).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
export const fmtStamp = (d) => new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ });
export const fmtLongDay = (iso) => new Date(`${iso}T12:00:00+03:00`).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const labelFromDate = (iso) => {
    const [, m, d] = iso.split('-').map(Number);
    return `${d} ${MON[m - 1]}`;
};

// Long ranges (This Year) would be hundreds of bars, so roll them up by month.
function groupByMonth(days) {
    const by = {};
    days.forEach((t) => {
        const k = t.date.slice(0, 7);
        const o = (by[k] ||= { date: k, label: MON[Number(k.slice(5)) - 1], sales: 0, gross: 0, stockLoss: 0, pettyCash: 0, profit: 0 });
        ['sales', 'gross', 'stockLoss', 'pettyCash', 'profit'].forEach((f) => { o[f] += t[f]; });
    });
    return Object.values(by).sort((a, b) => a.date.localeCompare(b.date));
}

// Per-day rows: sales, gross profit, then losses and petty cash taken off.
// Salaries are not in here: payslips are paid monthly, not daily.
function mergeDaily(base, costDaily) {
    const by = {};
    base.forEach((b) => { by[b.date] = { ...b, stockLoss: 0, pettyCash: 0 }; });
    costDaily.forEach((c) => {
        const o = (by[c.date] ||= { date: c.date, label: labelFromDate(c.date), sales: 0, gross: 0, stockLoss: 0, pettyCash: 0 });
        o.stockLoss += c.stockLoss;
        o.pettyCash += c.pettyCash;
    });
    return Object.values(by)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((d) => ({ ...d, profit: d.gross - d.stockLoss - d.pettyCash }));
}

// Turns the raw API responses into the numbers the page shows.
//   VAT switch OFF (Admin Settings): overview figures only, no VAT anywhere.
//   VAT switch ON: /analytics/vat figures, covering ALL receipts, including
//   the ones sold while the switch was off.
export function buildView(overview, vat, costs) {
    const vOn = !!vat?.enabled && !!vat.totals;
    const exVat = PROFIT_BASIS === 'exVat';
    const t = overview.totals;
    const salary = overview.salary?.totalPaid || 0;
    const stockLoss = costs?.totals?.stockLoss || 0;
    const pettyCash = costs?.totals?.pettyCash || 0;

    let revenue, netSales, grossProfit, cost, base;
    if (vOn) {
        const v = vat.totals;
        revenue = v.paid;
        netSales = v.net;
        grossProfit = exVat ? v.profitExVat : v.profitInclVat;
        cost = v.cost;
        base = (vat.daily || []).map((x) => ({
            date: x.date, label: labelFromDate(x.date), sales: x.paid, gross: (exVat ? x.net : x.paid) - x.cost,
        }));
    } else {
        revenue = t.totalRevenue;
        netSales = t.totalRevenue;
        grossProfit = t.totalProfit;
        cost = t.totalRevenue - t.totalProfit;
        base = (overview.profitTrend || []).map((x) => ({ date: x.date, label: x.label, sales: x.revenue, gross: x.profit }));
    }

    const days = mergeDaily(base, costs?.daily || []);
    return {
        vOn,
        vatShare: vOn && exVat, // VAT is its own slice of "where KES 100 went"
        revenue, netSales, grossProfit, cost, salary, stockLoss, pettyCash,
        kept: grossProfit - stockLoss - pettyCash - salary, // the net result
        vatCollected: vOn ? vat.totals.vat : 0,
        revenueLabel: vOn ? 'Revenue (incl. VAT)' : 'Total Revenue',
        profitLabel: vOn ? (exVat ? 'Gross Profit (excl. VAT)' : 'Gross Profit (incl. VAT)') : 'Gross Profit',
        trend: days.length > 45 ? groupByMonth(days) : days,
    };
}

export function downloadCsv(filename, header, rows) {
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const text = [header.map(q).join(','), ...rows.map((r) => r.map((v) => (typeof v === 'number' ? Math.round(v) : q(v))).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}
