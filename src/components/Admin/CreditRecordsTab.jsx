import { useState, useEffect, useCallback } from 'react';
import { createSocket } from '../../lib/socket';
import { Search, Eye, HandCoins, X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import PaymentDetailsModal from './PaymentDetailsModal';


const STATUS_STYLE = {
    open:    'text-rose-600 bg-rose-50 border-rose-200',
    partial: 'text-amber-600 bg-amber-50 border-amber-200',
    settled: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    voided:  'text-gray-500 bg-gray-50 border-gray-200',
};

const fmt = (n) => `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}`;
const isOverdue = (c) =>
    ['open', 'partial'].includes(c.status) && c.dueDate && new Date(c.dueDate) < new Date();

export default function CreditRecordsTab({ onChanged }) {
    const [summary, setSummary] = useState({});
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('outstanding');
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [search, setSearch] = useState('');

    const [settling, setSettling] = useState(null); // credit record being paid
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');
    const [reference, setReference] = useState('');
    const [saving, setSaving] = useState(false);
    const [viewing, setViewing] = useState(null);

    const fetchSummary = useCallback(async () => {
        try {
            const res = await API.get('/credits/summary');
            setSummary(res.data);
        } catch { /* cards are secondary */ }
    }, []);

    const fetchRows = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const params = { page: p, limit: 15, status };
            if (overdueOnly) params.overdue = 'true';
            if (search) params.q = search;
            const res = await API.get('/credits', { params });
            setRows(res.data.credits);
            setPage(res.data.page);
            setTotalPages(res.data.totalPages);
            setTotal(res.data.total);
        } catch {
            toast.error('Failed to load credit records');
        }
        setLoading(false);
    }, [status, overdueOnly, search]);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    useEffect(() => {
        const t = setTimeout(() => fetchRows(1), 300);
        return () => clearTimeout(t);
    }, [fetchRows]);

    useEffect(() => {
        const socket = createSocket();
        const refresh = () => { fetchRows(1); fetchSummary(); };
        socket.on('credit:created', refresh);
        socket.on('credit:updated', refresh);
        return () => socket.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openSettle = (c) => {
        setSettling(c);
        setAmount(String(c.balance));
        setMethod('cash');
        setReference('');
    };

    const submitSettle = async () => {
        const n = parseFloat(amount);
        if (!(n > 0)) return toast.error('Enter a valid amount');
        if (n > settling.balance + 0.001) return toast.error(`Maximum is ${fmt(settling.balance)}`);
        setSaving(true);
        try {
            const res = await API.post(`/credits/${settling._id}/settle`, {
                amount: n, method, reference: reference.trim() || undefined,
            });
            toast.success(res.data.message);
            setSettling(null);
            fetchRows(page);
            fetchSummary();
            onChanged?.();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not record payment');
        }
        setSaving(false);
    };

    const openViewer = async (receiptId) => {
        try {
            const res = await API.get(`/receipts/${receiptId}`);
            setViewing(res.data);
        } catch {
            toast.error('Could not load bill details');
        }
    };

    const cards = [
        { title: 'Credit given today', value: fmt(summary.givenToday), sub: `${summary.givenTodayCount || 0} bills`, color: 'text-blue-600' },
        { title: 'Outstanding credit', value: fmt(summary.outstanding), sub: `${summary.outstandingCount || 0} bills`, color: 'text-rose-600' },
        { title: 'Overdue', value: fmt(summary.overdue), sub: `${summary.overdueCount || 0} bills`, color: 'text-amber-600' },
    ];

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {cards.map((c) => (
                    <div key={c.title} className="p-5 bg-white rounded-xl shadow-sm border border-gray-100">
                        <p className="text-sm font-medium text-gray-500">{c.title}</p>
                        <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center shadow-sm">
                <div className="relative flex-1 min-w-[220px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search customer, phone or bill ID…"
                        className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs bg-gray-50 font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                </div>
                <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 font-semibold text-gray-700"
                >
                    <option value="outstanding">Outstanding</option>
                    <option value="settled">Settled</option>
                    <option value="voided">Voided</option>
                    <option value="all">All</option>
                </select>
                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                    <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
                    Overdue only
                </label>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-400 font-semibold border-b border-gray-100">
                                <th className="p-3">Customer</th>
                                <th className="p-3">Bill</th>
                                <th className="p-3">Branch</th>
                                <th className="p-3 text-right">Amount</th>
                                <th className="p-3 text-right">Paid</th>
                                <th className="p-3 text-right">Balance</th>
                                <th className="p-3">Pay date</th>
                                <th className="p-3">Status</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-600">
                            {loading ? (
                                <tr><td colSpan={9} className="p-10 text-center text-gray-400">Loading…</td></tr>
                            ) : rows.length === 0 ? (
                                <tr><td colSpan={9} className="p-10 text-center text-gray-400">No credit records</td></tr>
                            ) : rows.map((c) => (
                                <tr key={c._id} className={isOverdue(c) ? 'bg-red-50/40' : 'hover:bg-gray-50/70'}>
                                    <td className="p-3">
                                        <p className="font-bold text-gray-800">{c.customerName}</p>
                                        {c.customerPhone && <p className="text-xs text-gray-400">{c.customerPhone}</p>}
                                    </td>
                                    <td className="p-3 font-bold text-orange-500">{c.billId}</td>
                                    <td className="p-3">{c.branch?.name || '—'}</td>
                                    <td className="p-3 text-right">{fmt(c.amount)}</td>
                                    <td className="p-3 text-right">{fmt(c.amountPaid)}</td>
                                    <td className="p-3 text-right font-bold text-gray-800">{fmt(c.balance)}</td>
                                    <td className="p-3 text-xs">
                                        {c.dueDate ? (
                                            <span className={isOverdue(c) ? 'text-red-600 font-bold inline-flex items-center gap-1' : ''}>
                                                {isOverdue(c) && <AlertTriangle size={12} />}
                                                {new Date(c.dueDate).toLocaleDateString()}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td className="p-3">
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase border ${STATUS_STYLE[c.status]}`}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-right space-x-3 whitespace-nowrap">
                                        <button onClick={() => openViewer(c.receipt)}
                                            className="inline-flex items-center gap-1 text-gray-400 hover:text-orange-500 text-xs font-semibold">
                                            <Eye size={14} /> View
                                        </button>
                                        {['open', 'partial'].includes(c.status) && (
                                            <button onClick={() => openSettle(c)}
                                                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-bold">
                                                <HandCoins size={14} /> Record payment
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                        <button onClick={() => fetchRows(Math.max(1, page - 1))} disabled={page <= 1}
                            className="flex items-center gap-1 text-xs font-bold text-gray-500 disabled:opacity-30 hover:text-orange-500">
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <span className="text-xs font-semibold text-gray-500">Page {page} of {totalPages} · {total} records</span>
                        <button onClick={() => fetchRows(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
                            className="flex items-center gap-1 text-xs font-bold text-gray-500 disabled:opacity-30 hover:text-orange-500">
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Record payment modal */}
            {settling && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-lg font-black text-gray-900">Record payment</h3>
                                <p className="text-sm text-gray-500">{settling.customerName} · {settling.billId}</p>
                                <p className="text-sm font-bold text-rose-600 mt-1">Balance: {fmt(settling.balance)}</p>
                            </div>
                            <button onClick={() => setSettling(null)} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200">
                                <X size={16} />
                            </button>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Amount received</label>
                            <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-orange-500" />
                            <button type="button" onClick={() => setAmount(String(settling.balance))}
                                className="text-xs font-bold text-orange-500 mt-1">Pay full balance</button>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Paid via</label>
                            <select value={method} onChange={(e) => setMethod(e.target.value)}
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold">
                                <option value="cash">Cash</option>
                                <option value="manual_till">Till</option>
                                <option value="mpesa_till">M-Pesa</option>
                            </select>
                        </div>

                        {method !== 'cash' && (
                            <input value={reference} onChange={(e) => setReference(e.target.value)}
                                placeholder="M-Pesa code (optional)"
                                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm" />
                        )}

                        <button onClick={submitSettle} disabled={saving}
                            className="w-full py-3.5 rounded-xl font-extrabold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50">
                            {saving ? 'Saving…' : 'Save payment'}
                        </button>
                    </div>
                </div>
            )}

            <PaymentDetailsModal open={!!viewing} onClose={() => setViewing(null)} receipt={viewing} />
        </div>
    );
                        }
