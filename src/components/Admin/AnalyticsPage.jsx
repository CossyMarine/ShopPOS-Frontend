import { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp, TrendingDown, Wallet, Users, PackageX, Clock,
    Store, RefreshCw, CircleDollarSign, Award, Layers,
} from 'lucide-react';
import {
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    BarChart, Bar, Legend,
} from 'recharts';
import API from '../../api/axios';

const RANGE_OPTIONS = [
    { id: 'today', label: 'Today' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'last_30_days', label: 'Last 30 Days' },
    { id: 'year', label: 'This Year' },
    { id: 'custom', label: 'Custom' },
];

const money = (n) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const EMPTY = {
    totals: {
        totalRevenue: 0, totalProfit: 0, unitsSold: 0,
        salaryPayments: 0, profitAfterSalary: 0, estNextPayroll: 0,
    },
    profitTrend: [],
    topItems: [],
    stuckItems: [],
    slowMovingItems: [],
    branchPerformance: [],
    topBranch: null,
    salary: { totalPaid: 0, payoutCount: 0, upcomingPayouts: [], staffSalaryDetail: [] },
};

function StatCard({ label, value, icon: Icon, tone = 'text-gray-900', bg = 'bg-gray-50', sub = null }) {
    return (
        <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon size={16} className={tone} />
                </div>
            </div>
            <p className={`text-2xl font-extrabold ${tone}`}>{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
    );
}

export default function AnalyticsPage({ branch } = {}) {
    const [range, setRange] = useState('today');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [data, setData] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [staffModalOpen, setStaffModalOpen] = useState(false);

    // Category margin and dead stock are fetched independently — margin
    // follows the same range filter as everything else, dead stock is
    // deliberately its own thing (all-time last-sale, not range-bound).
    const [categoryMargin, setCategoryMargin] = useState({ categories: [], totals: {} });
    const [deadStock, setDeadStock] = useState({ items: [], totalValueTiedUp: 0, thresholdDays: 30 });
    const [deadStockDays, setDeadStockDays] = useState(30);

    const fetchAnalytics = useCallback(async () => {
        if (range === 'custom' && (!customFrom || !customTo)) return;
        setLoading(true);
        setError(null);
        try {
            const params = { range };
            if (branch) params.branch = branch;
            if (range === 'custom') {
                params.from = customFrom;
                params.to = customTo;
            }
            const [overviewRes, marginRes] = await Promise.all([
                API.get('/analytics/overview', { params }),
                API.get('/analytics/category-margin', { params }),
            ]);
            setData(overviewRes.data);
            setCategoryMargin(marginRes.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [range, branch, customFrom, customTo]);

    const fetchDeadStock = useCallback(async () => {
        try {
            const params = { days: deadStockDays };
            if (branch) params.branch = branch;
            const res = await API.get('/analytics/dead-stock', { params });
            setDeadStock(res.data);
        } catch {
            // Non-critical — the rest of the page still works without it.
        }
    }, [branch, deadStockDays]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
    useEffect(() => { fetchDeadStock(); }, [fetchDeadStock]);

    const { totals, profitTrend, topItems, stuckItems, slowMovingItems, branchPerformance, topBranch, salary } = data;
    const profitPositive = totals.profitAfterSalary >= 0;

    return (
        <div className="space-y-6">
            {/* Header + filters */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-extrabold text-gray-900">Analytics</h1>
                    <p className="text-sm text-gray-500">Sales, profit, item performance and salary breakdown</p>
                </div>
                <button
                    onClick={fetchAnalytics}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-brand-orange hover:text-brand-orange transition self-start"
                >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                {RANGE_OPTIONS.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => setRange(opt.id)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            range === opt.id
                                ? 'bg-brand-orange text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-brand-orange-light hover:text-brand-orange'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
                {range === 'custom' && (
                    <div className="flex items-center gap-2 ml-1">
                        <input
                            type="date"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-orange"
                        />
                        <span className="text-xs text-gray-400">to</span>
                        <input
                            type="date"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-orange"
                        />
                    </div>
                )}
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-lg">
                    {error}
                </div>
            )}

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <StatCard label="Total Revenue" value={money(totals.totalRevenue)} icon={Wallet} tone="text-blue-600" bg="bg-blue-50" />
                <StatCard label="Total Profit" value={money(totals.totalProfit)} icon={TrendingUp} tone="text-emerald-600" bg="bg-emerald-50" />
                <StatCard label="Salary Payments" value={money(salary.totalPaid)} icon={Users} tone="text-amber-600" bg="bg-amber-50" sub={`${salary.payoutCount} payslip(s)`} />
                <StatCard
                    label="Profit After Salary"
                    value={money(totals.profitAfterSalary)}
                    icon={profitPositive ? TrendingUp : TrendingDown}
                    tone={profitPositive ? 'text-emerald-600' : 'text-red-600'}
                    bg={profitPositive ? 'bg-emerald-50' : 'bg-red-50'}
                />
                <StatCard label="Est. Next Payroll" value={money(totals.estNextPayroll)} icon={CircleDollarSign} tone="text-indigo-600" bg="bg-indigo-50" />
                {topBranch ? (
                    <StatCard label="Top Branch" value={topBranch.branchName} icon={Award} tone="text-brand-orange" bg="bg-brand-orange-light" sub={money(topBranch.revenue)} />
                ) : (
                    <StatCard label="Units Sold" value={totals.unitsSold} icon={Store} tone="text-gray-700" bg="bg-gray-100" />
                )}
            </div>

            {/* Profit zigzag chart */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <h2 className="text-sm font-extrabold text-gray-900 mb-4">Profit Trend</h2>
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={profitTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => money(v)} />
                        <Legend />
                        <Line type="linear" dataKey="revenue" name="Revenue" stroke="#94A3B8" strokeWidth={2} dot={{ r: 2 }} />
                        <Line type="linear" dataKey="profit" name="Profit" stroke="#FF5722" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Top items + Branch performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <h2 className="text-sm font-extrabold text-gray-900 mb-4">Most Performing Items</h2>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={topItems} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="productName" width={110} tick={{ fontSize: 10 }} />
                            <Tooltip formatter={(v) => money(v)} />
                            <Bar dataKey="revenue" fill="#FF5722" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {branchPerformance.length > 0 && (
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <h2 className="text-sm font-extrabold text-gray-900 mb-4">Branch Performance</h2>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={branchPerformance}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="branchName" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip formatter={(v) => money(v)} />
                                <Legend />
                                <Bar dataKey="revenue" name="Revenue" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="profit" name="Profit" fill="#FF5722" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Stuck / slow-moving items */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <PackageX size={16} className="text-red-500" />
                        <h2 className="text-sm font-extrabold text-gray-900">Stuck Items (zero sales)</h2>
                    </div>
                    {stuckItems.length === 0 ? (
                        <p className="text-xs text-gray-400">No stuck items in this range.</p>
                    ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {stuckItems.map((it) => (
                                <div key={it.productId} className="flex items-center justify-between p-2.5 bg-red-50/50 rounded-lg border border-red-100">
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">{it.productName}</p>
                                        <p className="text-[11px] text-gray-500">{it.category}</p>
                                    </div>
                                    <span className="text-xs font-bold text-red-500">{it.currentStock} in stock</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock size={16} className="text-amber-500" />
                        <h2 className="text-sm font-extrabold text-gray-900">Slow-Moving Items</h2>
                    </div>
                    {slowMovingItems.length === 0 ? (
                        <p className="text-xs text-gray-400">No slow-moving items in this range.</p>
                    ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {slowMovingItems.map((it) => (
                                <div key={it.productId} className="flex items-center justify-between p-2.5 bg-amber-50/50 rounded-lg border border-amber-100">
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">{it.productName}</p>
                                        <p className="text-[11px] text-gray-500">{it.category}</p>
                                    </div>
                                    <span className="text-xs font-bold text-amber-600">{it.unitsSold} sold (avg {it.avgUnitsSold})</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Category margin */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <Layers size={16} className="text-brand-orange" />
                    <h2 className="text-sm font-extrabold text-gray-900">Margin by Category</h2>
                </div>
                {categoryMargin.categories.length === 0 ? (
                    <p className="text-xs text-gray-400">No sales in this range yet.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                    <th className="py-2 pr-3">Category</th>
                                    <th className="py-2 pr-3 text-right">Revenue</th>
                                    <th className="py-2 pr-3 text-right">Cost</th>
                                    <th className="py-2 pr-3 text-right">Profit</th>
                                    <th className="py-2 text-right">Margin</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {categoryMargin.categories.map((c) => (
                                    <tr key={c.category}>
                                        <td className="py-2 pr-3 font-bold text-gray-800">{c.category}</td>
                                        <td className="py-2 pr-3 text-right font-mono text-gray-600">{money(c.revenue)}</td>
                                        <td className="py-2 pr-3 text-right font-mono text-gray-400">{money(c.cost)}</td>
                                        <td className={`py-2 pr-3 text-right font-mono font-bold ${c.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{money(c.profit)}</td>
                                        <td className="py-2 text-right">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.marginPct >= 20 ? 'bg-green-50 text-green-600' : c.marginPct >= 0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
                                                {c.marginPct}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-gray-200 font-black text-gray-900">
                                    <td className="py-2 pr-3">Total</td>
                                    <td className="py-2 pr-3 text-right font-mono">{money(categoryMargin.totals.revenue)}</td>
                                    <td className="py-2 pr-3 text-right font-mono">{money(categoryMargin.totals.cost)}</td>
                                    <td className="py-2 pr-3 text-right font-mono">{money(categoryMargin.totals.profit)}</td>
                                    <td className="py-2 text-right">{categoryMargin.totals.marginPct}%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Dead stock */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <PackageX size={16} className="text-red-500" />
                        <h2 className="text-sm font-extrabold text-gray-900">Dead Stock</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-semibold">No sales in</span>
                        <select value={deadStockDays} onChange={(e) => setDeadStockDays(Number(e.target.value))}
                            className="text-[11px] font-bold border border-gray-200 rounded-lg px-2 py-1 bg-gray-50">
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                            <option value={60}>60 days</option>
                            <option value={90}>90 days</option>
                        </select>
                    </div>
                </div>
                {deadStock.items.length === 0 ? (
                    <p className="text-xs text-gray-400">Nothing has been sitting idle past this threshold — good sign.</p>
                ) : (
                    <>
                        <p className="text-xs text-gray-500 mb-3">
                            <span className="font-black text-red-500">{money(deadStock.totalValueTiedUp)}</span> tied up across {deadStock.items.length} product{deadStock.items.length !== 1 ? 's' : ''}
                        </p>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {deadStock.items.map((it) => (
                                <div key={it.productId} className="flex items-center justify-between p-2.5 bg-red-50/50 rounded-lg border border-red-100">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-gray-800 truncate">{it.productName}</p>
                                        <p className="text-[11px] text-gray-500">
                                            {it.category}{it.branchName ? ` · ${it.branchName}` : ''} · {it.currentStock} in stock
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0 pl-2">
                                        <p className="text-xs font-bold text-red-500">{money(it.stockValue)}</p>
                                        <p className="text-[10px] text-gray-400">
                                            {it.daysSinceLastSale === null ? 'Never sold' : `${it.daysSinceLastSale}d since last sale`}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Salary section */}
            <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-extrabold text-gray-900">Salary Payments This Range</h2>
                    <button
                        onClick={() => setStaffModalOpen(true)}
                        className="text-xs font-bold text-brand-orange hover:underline"
                    >
                        View staff breakdown
                    </button>
                </div>
                {salary.upcomingPayouts.length === 0 ? (
                    <p className="text-xs text-gray-400">No upcoming payout dates scheduled.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-left text-gray-500 border-b border-gray-100">
                                    <th className="pb-2 font-bold">Staff</th>
                                    <th className="pb-2 font-bold">Job Title</th>
                                    <th className="pb-2 font-bold">Next Payout</th>
                                    <th className="pb-2 font-bold text-right">Est. Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salary.upcomingPayouts.map((p) => (
                                    <tr key={p.staffId} className="border-b border-gray-50">
                                        <td className="py-2 font-semibold text-gray-800">{p.staffName}</td>
                                        <td className="py-2 text-gray-500">{p.jobTitle || '—'}</td>
                                        <td className="py-2 text-gray-500">
                                            {p.nextPayoutDate ? new Date(p.nextPayoutDate).toLocaleDateString('en-KE') : '—'}
                                        </td>
                                        <td className="py-2 text-right font-bold text-gray-800">{money(p.estimatedAmount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {staffModalOpen && (
                <StaffSalaryModal staff={salary.staffSalaryDetail} onClose={() => setStaffModalOpen(false)} />
            )}
        </div>
    );
}

function StaffSalaryModal({ staff, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
                    <h3 className="text-sm font-extrabold text-gray-900">Staff Salary Breakdown</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm font-bold">✕</button>
                </div>
                <div className="p-5 space-y-3">
                    {staff.length === 0 && <p className="text-xs text-gray-400">No paid salaries in this range.</p>}
                    {staff.map((s, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{s.staffName}</p>
                                    <p className="text-[11px] text-gray-500">{s.jobTitle || s.role} · {s.period} · {s.wageType}</p>
                                </div>
                                <span className="text-sm font-extrabold text-brand-orange">{money(s.netPayable)}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-600 mt-2">
                                <div>Base: <span className="font-bold text-gray-800">{money(s.baseEarnings)}</span></div>
                                <div>Extra: <span className="font-bold text-gray-800">{money(s.extraEarnings)}</span></div>
                                <div>Commission: <span className="font-bold text-gray-800">{money(s.commission)}</span></div>
                                <div>Tax: <span className="font-bold text-gray-800">{money(s.taxDeductions)}</span></div>
                            </div>
                            {s.customDeductions?.length > 0 && (
                                <div className="mt-2 text-[11px] text-gray-500">
                                    Other deductions: {s.customDeductions.map((d) => `${d.name} (${money(d.amount)})`).join(', ')}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
                    }
