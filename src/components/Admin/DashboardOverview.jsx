import { useState, useEffect, useMemo } from 'react';
import { Eye, RefreshCw, ShieldAlert, Wallet, ReceiptText, Users, TrendingUp } from 'lucide-react';
import API from '../../api/axios';
import ViewItemsModal from './ViewItemsModal';
import { kenyanDayBound, formatKenyanDateTime } from '../../utils/formatDate';

export default function DashboardOverview({ branch } = {}) {
    const [revenueToday, setRevenueToday] = useState({ totalRevenue: 0, paidReceiptsCount: 0 });
    const [revenueSummary, setRevenueSummary] = useState({ totalRevenue: 0, totalReceipts: 0 });
    const [staffCount, setStaffCount] = useState(0);
    const [unpaid, setUnpaid] = useState([]);
    const [paid, setPaid] = useState([]);
    const [voidCount, setVoidCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [viewing, setViewing] = useState(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const branchParams = branch ? { branch } : {};
            const [rev, summary, staff, unpaidRes, paidRes, voidsRes] = await Promise.all([
                API.get('/revenue/today', { params: branchParams }),
                API.get('/revenue/summary', { params: branchParams }),
                API.get('/auth/staff-count'),
                API.get('/receipts', { params: branchParams }),
                API.get('/receipts/paid', { params: branchParams }),
                API.get('/void-requests', { params: branchParams }),
            ]);
            setRevenueToday(rev.data);
            setRevenueSummary(summary.data);
            setStaffCount(staff.data.totalStaff || 0);
            setUnpaid(unpaidRes.data);
            setPaid(paidRes.data);
            setVoidCount(voidsRes.data.length);
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
                    <h2 className="text-2xl font-black text-gray-800">Dashboard Overview</h2>
                    <p className="text-sm text-gray-500">Live summary across today's activity</p>
                </div>

                <div className="flex items-center gap-2 bg-white border border-gray-200 p-2 rounded-lg text-sm shadow-sm">
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <span className="text-gray-400">to</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                    <button
                        onClick={fetchAll}
                        className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded font-semibold transition-colors shadow-sm"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* All-time overview */}
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

            {/* Today / filtered */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    icon={Wallet}
                    label={dateFrom || dateTo ? 'Revenue (filtered)' : 'Total Revenue Today'}
                    value={`KES ${filteredRevenue.toLocaleString()}`}
                />
                <MetricCard
                    icon={ReceiptText}
                    label={dateFrom || dateTo ? 'Receipts (filtered)' : 'Total Receipts Today'}
                    value={combined.length}
                />
                <MetricCard
                    icon={ShieldAlert}
                    label="Active Void Requests"
                    value={voidCount}
                    accent
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
                                        <td className="p-3 font-bold text-orange-500">{r.billId}</td>
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
                                                className="inline-flex items-center gap-1 text-gray-400 hover:text-orange-500 text-xs font-semibold transition-colors"
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

function MetricCard({ icon: Icon, label, value, accent }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider font-bold text-gray-400">{label}</p>
                <Icon size={18} className={accent ? 'text-orange-500' : 'text-gray-400'} />
            </div>
            <h3 className={`text-2xl font-black mt-1 ${accent ? 'text-orange-500' : 'text-gray-800'}`}>{value}</h3>
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
