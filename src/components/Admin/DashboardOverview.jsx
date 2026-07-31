import { useState, useEffect, useMemo } from 'react';
import {
    Eye, RefreshCw, ShieldAlert, Wallet, ReceiptText, Users,
    TrendingUp, TrendingDown, PackageX, CircleDollarSign,
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, Legend,
} from 'recharts';
import API from '../../api/axios';
import ViewItemsModal from './ViewItemsModal';
import { kenyanDayBound, formatKenyanDateTime } from '../../utils/formatDate';

const PAYMENT_LABELS = {
    cash: 'Cash',
    mpesa_till: 'M-Pesa Till',
    mpesa_paybill: 'M-Pesa Paybill',
    mpesa_pochi: 'M-Pesa Pochi',
    mpesa_stk: 'M-Pesa STK',
    manual_till: 'Manual Till',
    reward: 'Reward Points',
    both: 'Cash + Till',
    unknown: 'Unrecorded',
};

const PAYMENT_COLORS = ['#FF5722', '#0A0A0A', '#CBD5E1', '#FF8A65', '#94A3B8', '#FFCCBC', '#64748B'];
const CATEGORY_COLORS = ['#FF5722', '#FF8A65', '#FFCCBC', '#0A0A0A', '#94A3B8', '#64748B', '#FDBA74'];

export default function DashboardOverview({ branch } = {}) {
    const [revenueToday, setRevenueToday] = useState({ totalRevenue: 0, paidReceiptsCount: 0 });
    const [revenueSummary, setRevenueSummary] = useState({ totalRevenue: 0, totalReceipts: 0 });
    const [staffCount, setStaffCount] = useState(0);
    const [unpaid, setUnpaid] = useState([]);
    const [paid, setPaid] = useState([]);
    const [voidCount, setVoidCount] = useState(0);
    const [stats, setStats] = useState({
        hourlyTrend: [],
        paymentBreakdown: [],
        categoryBreakdown: [],
        lowStockCount: 0,
        netProfit: 0,
        netProfitMargin: 0,
        voidedToday: { amount: 0, count: 0 },
    });
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [viewing, setViewing] = useState(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const branchParams = branch ? { branch } : {};
            const [rev, summary, staff, unpaidRes, paidRes, voidsRes, statsRes] = await Promise.all([
                API.get('/revenue/today', { params: branchParams }),
                API.get('/revenue/summary', { params: branchParams }),
                API.get('/auth/staff-count'),
                API.get('/receipts', { params: branchParams }),
                API.get('/receipts/paid', { params: branchParams }),
                API.get('/void-requests', { params: branchParams }),
                API.get('/revenue/dashboard-stats', { params: branchParams }),
            ]);
            setRevenueToday(rev.data);
            setRevenueSummary(summary.data);
            setStaffCount(staff.data.totalStaff || 0);
            setUnpaid(unpaidRes.data);
            setPaid(paidRes.data);
            setVoidCount(voidsRes.data.length);
            setStats(statsRes.data);
        } catch (err) {
            console.error('Failed to load dashboard metrics', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branch]);

    const combined = useMemo(() => {
        const all = [...unpaid, ...paid].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );

        if (!dateFrom && !dateTo) return all.slice(0, 15);

        // Anchored to the Kenyan calendar day the picker value falls on,
        // not the browser's own timezone.
        const from = kenyanDayBound(dateFrom, 'start');
        const to = kenyanDayBound(dateTo, 'end');

        return all.filter((r) => {
            const created = new Date(r.createdAt);
            if (from && created < from) return false;
            if (to && created > to) return false;
            return true;
        });
    }, [unpaid, paid, dateFrom, dateTo]);

    const filteredRevenue = useMemo(() => {
        if (!dateFrom && !dateTo) return revenueToday.totalRevenue;
        return combined
            .filter((r) => r.status === 'paid')
            .reduce((sum, r) => sum + r.subtotal, 0);
    }, [combined, dateFrom, dateTo, revenueToday]);

    // Trim the 24-hour trend down to the active trading window, so the chart
    // doesn't render a wall of empty overnight bars.
    const dailyTrend = useMemo(() => {
        const active = stats.hourlyTrend
            .map((h, i) => (h.revenue > 0 ? i : null))
            .filter((i) => i !== null);
        if (active.length === 0) return stats.hourlyTrend.slice(8, 21); // fallback: 8AM–8PM
        const start = Math.max(0, Math.min(...active) - 1);
        const end = Math.min(23, Math.max(...active) + 1);
        return stats.hourlyTrend.slice(start, end + 1);
    }, [stats.hourlyTrend]);

    const paymentChartData = useMemo(
        () => stats.paymentBreakdown.map((p) => ({
            name: PAYMENT_LABELS[p.method] || p.method,
            value: p.amount,
        })),
        [stats.paymentBreakdown]
    );

    const categoryChartData = useMemo(
        () => stats.categoryBreakdown.map((c) => ({ name: c.category, value: c.amount })),
        [stats.categoryBreakdown]
    );

    const paymentInfo = (r) =>
        r.status === 'paid'
            ? {
                  method: r.paymentMethod,
                  cashAmount: r.cashAmount,
                  tillAmount: r.tillAmount,
                  changeGiven: r.changeGiven,
                  mpesaReceiptNumber: r.mpesaReceiptNumber,
                  paidAt: r.paidAt,
              }
            : null;

    return (
        <div className="space-y-8 bg-gray-50 min-h-screen p-1 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Retail Admin Dashboard</h2>
                    <p className="text-sm text-gray-500">
                        {branch ? 'Monitoring real-time sales for this branch.' : 'Monitoring real-time sales across all branches.'}
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white border border-gray-200 p-2 rounded-lg text-sm shadow-sm">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange"
                    />
                    <button
                        onClick={fetchAll}
                        className="flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white px-3 py-1 rounded font-semibold transition-colors shadow-sm"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* STAT CARDS — matches mockup: Today's Sales / Net Profit / Refunds & Voids / Low Stock */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                    icon={Wallet}
                    iconBg="bg-brand-orange-light text-brand-orange"
                    label={dateFrom || dateTo ? "Sales (filtered)" : "Today's Sales"}
                    value={`KES ${filteredRevenue.toLocaleString()}`}
                    sub={`${combined.length} receipts`}
                    subColor="text-green-600"
                />
                <StatCard
                    icon={TrendingUp}
                    iconBg="bg-green-50 text-green-600"
                    label="Net Profit (est.)"
                    value={`KES ${stats.netProfit.toLocaleString()}`}
                    sub={`${stats.netProfitMargin}% margin`}
                    subColor="text-green-600"
                />
                <StatCard
                    icon={TrendingDown}
                    iconBg="bg-red-50 text-red-600"
                    label="Refunds & Voids"
                    value={`KES ${stats.voidedToday.amount.toLocaleString()}`}
                    sub={`${stats.voidedToday.count} voided today · ${voidCount} pending`}
                    subColor="text-red-500"
                />
                <StatCard
                    icon={PackageX}
                    iconBg="bg-amber-50 text-amber-600"
                    label="Low Stock Warning"
                    value={`${stats.lowStockCount} Products`}
                    sub="Action required"
                    subColor="text-amber-600"
                />
            </section>

            {/* DAILY SALES REVENUE CHART */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <div>
                        <h3 className="font-bold text-gray-900">Daily Sales Revenue</h3>
                        <p className="text-xs text-gray-500">Hourly sales performance for the selected branch</p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-orange-light text-brand-orange">
                        Live Revenue (KES)
                    </span>
                </div>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyTrend}>
                            <CartesianGrid vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#64748B' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={(v) => `${v.toLocaleString()}`}
                            />
                            <Tooltip
                                formatter={(v) => [`KES ${Number(v).toLocaleString()}`, 'Revenue']}
                                cursor={{ fill: '#FFF0EB' }}
                            />
                            <Bar dataKey="revenue" name="Revenue" fill="#FF5722" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* PAYMENT BREAKDOWN + CATEGORY SHARE */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-gray-900">Payment Breakdown</h3>
                            <p className="text-xs text-gray-500">Sales volume by Cash, M-Pesa STK, and Card</p>
                        </div>
                        <span className="text-xs font-medium text-brand-orange bg-brand-orange-light px-3 py-1 rounded-full">
                            Today
                        </span>
                    </div>
                    <div className="h-64 w-full">
                        {paymentChartData.length === 0 ? (
                            <EmptyChartState label="No payments recorded yet today" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={paymentChartData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius="65%"
                                        outerRadius="90%"
                                        paddingAngle={2}
                                    >
                                        {paymentChartData.map((entry, i) => (
                                            <Cell key={entry.name} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => `KES ${Number(v).toLocaleString()}`} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-gray-900">Category Share</h3>
                            <p className="text-xs text-gray-500">Top selling product categories across branches</p>
                        </div>
                        <span className="text-xs font-medium text-brand-orange bg-brand-orange-light px-3 py-1 rounded-full">
                            Today
                        </span>
                    </div>
                    <div className="h-64 w-full">
                        {categoryChartData.length === 0 ? (
                            <EmptyChartState label="No sales recorded yet today" />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryChartData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius="65%"
                                        outerRadius="90%"
                                        paddingAngle={2}
                                    >
                                        {categoryChartData.map((entry, i) => (
                                            <Cell key={entry.name} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => `KES ${Number(v).toLocaleString()}`} />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* LIFETIME TOTALS (existing metrics, kept) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    icon={TrendingUp}
                    label={branch ? 'Total Revenue (Branch)' : 'Total Revenue'}
                    value={`KES ${(revenueSummary.totalRevenue || 0).toLocaleString()}`}
                />
                <MetricCard
                    icon={ReceiptText}
                    label={branch ? 'Total Receipts (Branch)' : 'Total Receipts'}
                    value={(revenueSummary.totalReceipts || 0).toLocaleString()}
                />
                <MetricCard
                    icon={Users}
                    label="Total Staff"
                    value={staffCount}
                />
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm overflow-hidden">
                <h3 className="text-lg font-black text-gray-800 mb-4">Recent Receipts</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-400 font-semibold border-b border-gray-100">
                                <th className="p-3">Bill ID</th>
                                <th className="p-3">Cashier</th>
                                <th className="p-3">Branch</th>
                                <th className="p-3">Amount</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-600">
                            {combined.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-6 text-center text-gray-400 font-medium">
                                        No receipts in this range
                                    </td>
                                </tr>
                            ) : (
                                combined.map((r) => (
                                    <tr key={r._id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="p-3 font-bold text-brand-orange">{r.billId}</td>
                                        <td className="p-3 font-medium">{r.cashierName || '—'}</td>
                                        <td className="p-3 font-semibold">{r.branch?.name || '—'}</td>
                                        <td className="p-3 font-bold text-gray-800">KES {r.subtotal.toLocaleString()}</td>
                                        <td className="p-3 text-xs text-gray-400">
                                            {formatKenyanDateTime(r.createdAt)}
                                        </td>
                                        <td className="p-3">
                                            <StatusPill status={r.status} />
                                        </td>
                                        <td className="p-3 text-right">
                                            <button
                                                onClick={() => setViewing(r)}
                                                className="inline-flex items-center gap-1 text-gray-400 hover:text-brand-orange text-xs font-semibold transition-colors"
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ViewItemsModal
                open={!!viewing}
                onClose={() => setViewing(null)}
                title={viewing?.billId}
                subtitle={viewing ? `${viewing.branch?.name || ''} · ${viewing.cashierName || 'No cashier'}` : ''}
                items={(viewing?.items || []).map((i) => ({ name: i.productName, qty: i.quantity, price: i.unitPrice }))}
                total={viewing?.subtotal}
                payment={viewing ? paymentInfo(viewing) : null}
            />
        </div>
    );
}

function StatCard({ icon: Icon, iconBg, label, value, sub, subColor }) {
    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1 truncate">{value}</h3>
                {sub && <p className={`text-xs mt-1 font-medium ${subColor || 'text-gray-500'}`}>{sub}</p>}
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${iconBg}`}>
                <Icon size={20} />
            </div>
        </div>
    );
}

function MetricCard({ icon: Icon, label, value }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider font-bold text-gray-400">{label}</p>
                <Icon size={18} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-black mt-1 text-gray-800">{value}</h3>
        </div>
    );
}

function StatusPill({ status }) {
    const styles = {
        unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
        paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        voided: 'bg-red-50 text-red-600 border-red-200',
    };
    return (
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${styles[status] || styles.unpaid}`}>
            {status}
        </span>
    );
}

function EmptyChartState({ label }) {
    return (
        <div className="h-full w-full flex items-center justify-center text-center text-xs text-gray-400 font-medium px-6">
            {label}
        </div>
    );
                                    }
