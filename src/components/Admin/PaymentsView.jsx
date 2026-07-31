import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import {
    RefreshCw, Search, ChevronLeft, ChevronRight, Landmark, Smartphone,
    Wallet, Gift, Layers, CheckCircle2, XCircle, Eye, Clock,
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import PaymentDetailsModal from './PaymentDetailsModal';
import ConfirmModal from './ConfirmModal';
import { PaymentSummaryCards } from './PaymentSummaryCards';
import { PaymentFilters } from './PaymentFilters';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

const METHOD_META = {
    cash:          { label: 'Cash',        icon: Wallet,     color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    mpesa_till:    { label: 'M-Pesa Till', icon: Smartphone, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    mpesa_paybill: { label: 'Paybill',     icon: Smartphone, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    mpesa_pochi:   { label: 'Pochi',       icon: Smartphone, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    mpesa_stk:     { label: 'STK Push',    icon: Smartphone, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    manual_till:   { label: 'Manual Till', icon: Landmark,   color: 'text-amber-600 bg-amber-50 border-amber-200' },
    reward:        { label: 'Reward',      icon: Gift,       color: 'text-pink-600 bg-pink-50 border-pink-200' },
    both:          { label: 'Split',       icon: Layers,     color: 'text-slate-600 bg-slate-100 border-slate-200' },
};

function MethodPill({ method }) {
    const meta = METHOD_META[method] || { label: method || '—', icon: Wallet, color: 'text-gray-500 bg-gray-50 border-gray-200' };
    const Icon = meta.icon;
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide border ${meta.color}`}>
            <Icon size={11} /> {meta.label}
        </span>
    );
}

export default function PaymentsView({ onPendingChange }) {
    const [tab, setTab] = useState('all');

    // ---- All transactions ----
    const [transactions, setTransactions] = useState([]);
    const [txPage, setTxPage] = useState(1);
    const [txTotalPages, setTxTotalPages] = useState(1);
    const [txTotal, setTxTotal] = useState(0);
    const [txLoading, setTxLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [methodFilter, setMethodFilter] = useState('');

    // ---- Date range filter (presets are Kenya/EAT-anchored, computed server-side) ----
    const [activePreset, setActivePreset] = useState('today');
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');

    // ---- Summary cards ----
    const [summary, setSummary] = useState({});
    const [summaryLoading, setSummaryLoading] = useState(false);

    // ---- Pending confirmations ----
    const [pending, setPending] = useState([]);
    const [pendingLoading, setPendingLoading] = useState(false);
    const [pendingAction, setPendingAction] = useState(null); // { entry, action }
    const [working, setWorking] = useState(false);

    // ---- View bill modal ----
    const [viewing, setViewing] = useState(null);

    // Turns the active preset / custom calendar range into API params.
    // Presets are resolved server-side against Africa/Nairobi time; a custom
    // range sends explicit ISO from/to based on the picked calendar days.
    const buildRangeParams = useCallback(() => {
        if (activePreset === 'custom') {
            const params = {};
            if (rangeStart) params.from = new Date(`${rangeStart}T00:00:00`).toISOString();
            if (rangeEnd) params.to = new Date(`${rangeEnd}T23:59:59.999`).toISOString();
            return params;
        }
        return { preset: activePreset };
    }, [activePreset, rangeStart, rangeEnd]);

    const fetchTransactions = useCallback(async (page = 1) => {
        setTxLoading(true);
        try {
            const params = { page, limit: 15, ...buildRangeParams() };
            if (search) params.q = search;
            if (methodFilter) params.method = methodFilter;
            const res = await API.get('/payments/transactions', { params });
            setTransactions(res.data.transactions);
            setTxPage(res.data.page);
            setTxTotalPages(res.data.totalPages);
            setTxTotal(res.data.total);
        } catch (err) {
            console.error('Failed to fetch transactions', err);
            toast.error('Failed to load transactions');
        }
        setTxLoading(false);
    }, [search, methodFilter, buildRangeParams]);

    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
        try {
            const res = await API.get('/payments/summary', { params: buildRangeParams() });
            setSummary(res.data);
        } catch (err) {
            console.error('Failed to fetch payment summary', err);
            toast.error('Failed to load payment summary');
        }
        setSummaryLoading(false);
    }, [buildRangeParams]);

    const fetchPending = useCallback(async () => {
        setPendingLoading(true);
        try {
            const res = await API.get('/payments/pending');
            setPending(res.data);
        } catch (err) {
            console.error('Failed to fetch pending payments', err);
            toast.error('Failed to load pending payments');
        }
        setPendingLoading(false);
    }, []);

    useEffect(() => {
        fetchPending();
    }, [fetchPending]);

    useEffect(() => {
        const t = setTimeout(() => fetchTransactions(1), 350);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, methodFilter, activePreset, rangeStart, rangeEnd]);

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    useEffect(() => {
        const socket = io(SOCKET_URL);
        socket.on('receipt:manualPending', () => fetchPending());
        socket.on('receipt:manualPaymentResolved', () => fetchPending());
        socket.on('receipt:paid', () => { fetchTransactions(1); fetchSummary(); });
        socket.on('receipt:updated', () => { fetchTransactions(1); fetchSummary(); });
        return () => socket.disconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const runPendingAction = async () => {
        const { entry, action } = pendingAction;
        setWorking(true);
        try {
            await API.patch(`/payments/pending/${entry.receiptId}/${entry.paymentId}/${action}`);
            toast.success(action === 'confirm' ? 'Payment confirmed' : 'Payment rejected');
            setPendingAction(null);
            fetchPending();
            fetchTransactions(txPage);
            fetchSummary();
            onPendingChange?.();
        } catch (err) {
            console.error('Failed to resolve pending payment', err);
            toast.error(err.response?.data?.message || 'Action failed');
        }
        setWorking(false);
    };

    const openViewer = async (receiptId) => {
        try {
            const res = await API.get(`/receipts/${receiptId}`);
            setViewing(res.data);
        } catch (err) {
            console.error('Failed to load bill', err);
            toast.error('Could not load bill details');
        }
    };

    return (
        <div className="space-y-8 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Payments</h2>
                    <p className="text-sm text-gray-500">All transactions, and till payments waiting confirmation</p>
                </div>
                <button
                    onClick={() => { fetchTransactions(txPage); fetchPending(); fetchSummary(); }}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                    <RefreshCw size={14} className={txLoading || pendingLoading || summaryLoading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <PaymentSummaryCards metrics={summary} />

            <PaymentFilters
                activePreset={activePreset}
                setActivePreset={setActivePreset}
                startDate={rangeStart}
                setStartDate={setRangeStart}
                endDate={rangeEnd}
                setEndDate={setRangeEnd}
                onPresetChange={() => {}}
            />

            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={() => setTab('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        tab === 'all'
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                            : 'bg-white border border-gray-200 text-gray-600 hover:text-orange-500 shadow-sm'
                    }`}
                >
                    All Transactions ({txTotal})
                </button>
                <button
                    onClick={() => setTab('pending')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                        tab === 'pending'
                            ? 'bg-orange-500 text-white shadow-md shadow-orange-500/10'
                            : 'bg-white border border-gray-200 text-gray-600 hover:text-orange-500 shadow-sm'
                    }`}
                >
                    Pending Confirmation ({pending.length})
                    {pending.length > 0 && tab !== 'pending' && (
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                    )}
                </button>
            </div>

            {tab === 'all' && (
                <>
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center shadow-sm">
                        <div className="relative flex-1 min-w-[220px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search Bill ID, table, payer, reference..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs bg-gray-50 font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                            />
                        </div>
                        <select
                            value={methodFilter}
                            onChange={(e) => setMethodFilter(e.target.value)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="">All Methods</option>
                            <option value="cash">Cash</option>
                            <option value="mpesa_till">M-Pesa Till</option>
                            <option value="mpesa_stk">STK Push</option>
                            <option value="manual_till">Manual Till</option>
                            <option value="reward">Reward</option>
                            <option value="both">Split</option>
                        </select>
                        {(search || methodFilter) && (
                            <button
                                onClick={() => { setSearch(''); setMethodFilter(''); }}
                                className="text-xs font-bold text-gray-400 hover:text-red-500"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-gray-400 font-semibold border-b border-gray-100">
                                        <th className="p-3">Bill ID</th>
                                        <th className="p-3">Table</th>
                                        <th className="p-3">Method</th>
                                        <th className="p-3">Paid By</th>
                                        <th className="p-3">Reference</th>
                                        <th className="p-3 text-right">Amount</th>
                                        <th className="p-3">Date</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-600">
                                    {txLoading ? (
                                        <tr><td colSpan={8} className="p-10 text-center text-gray-400 font-medium">Loading…</td></tr>
                                    ) : transactions.length === 0 ? (
                                        <tr><td colSpan={8} className="p-10 text-center text-gray-400 font-medium">No transactions found</td></tr>
                                    ) : (
                                        transactions.map((t) => (
                                            <tr key={`${t.receiptId}-${t.paymentId}`} className="hover:bg-gray-50/70 transition-colors">
                                                <td className="p-3 font-bold text-orange-500">{t.billId}</td>
                                                <td className="p-3 font-semibold text-gray-800">Table {t.branch?.name}</td>
                                                <td className="p-3"><MethodPill method={t.method} /></td>
                                                <td className="p-3 font-medium">{t.payerName || t.cashierName || 'Walk-in'}</td>
                                                <td className="p-3 text-xs text-gray-500">{t.reference || '—'}</td>
                                                <td className="p-3 text-right font-bold text-gray-800">KES {Number(t.amount).toLocaleString()}</td>
                                                <td className="p-3 text-xs text-gray-400">{new Date(t.paidAt).toLocaleString()}</td>
                                                <td className="p-3 text-right">
                                                    <button
                                                        onClick={() => openViewer(t.receiptId)}
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

                        {txTotalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                                <button
                                    onClick={() => fetchTransactions(Math.max(1, txPage - 1))}
                                    disabled={txPage <= 1}
                                    className="flex items-center gap-1 text-xs font-bold text-gray-500 disabled:opacity-30 hover:text-orange-500"
                                >
                                    <ChevronLeft size={14} /> Prev
                                </button>
                                <span className="text-xs font-semibold text-gray-500">
                                    Page {txPage} of {txTotalPages} · {txTotal} transactions
                                </span>
                                <button
                                    onClick={() => fetchTransactions(Math.min(txTotalPages, txPage + 1))}
                                    disabled={txPage >= txTotalPages}
                                    className="flex items-center gap-1 text-xs font-bold text-gray-500 disabled:opacity-30 hover:text-orange-500"
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {tab === 'pending' && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    {pending.length === 0 ? (
                        <div className="text-center py-16">
                            <Clock size={28} className="text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">No payments waiting confirmation</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="text-gray-400 font-semibold border-b border-gray-100">
                                        <th className="p-3">Bill ID</th>
                                        <th className="p-3">Table</th>
                                        <th className="p-3">Submitted By</th>
                                        <th className="p-3">Reference</th>
                                        <th className="p-3 text-right">Amount</th>
                                        <th className="p-3">Submitted</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-600">
                                    {pending.map((p) => (
                                        <tr key={p.paymentId} className="bg-amber-50/40 hover:bg-amber-50/70 transition-colors">
                                            <td className="p-3 font-bold text-orange-500">{p.billId}</td>
                                            <td className="p-3 font-semibold text-gray-800">{p.branch?.name}</td>
                                            <td className="p-3 font-medium">{p.paidByName}</td>
                                            <td className="p-3 text-xs text-gray-500">{p.reference}</td>
                                            <td className="p-3 text-right font-bold text-gray-800">KES {Number(p.amount).toLocaleString()}</td>
                                            <td className="p-3 text-xs text-gray-400">{new Date(p.submittedAt).toLocaleString()}</td>
                                            <td className="p-3 text-right space-x-3 whitespace-nowrap">
                                                <button
                                                    onClick={() => openViewer(p.receiptId)}
                                                    className="inline-flex items-center gap-1 text-gray-400 hover:text-orange-500 text-xs font-semibold transition-colors"
                                                >
                                                    <Eye size={14} /> View
                                                </button>
                                                <button
                                                    onClick={() => setPendingAction({ entry: p, action: 'confirm' })}
                                                    className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 text-xs font-bold transition-colors"
                                                >
                                                    <CheckCircle2 size={14} /> Confirm
                                                </button>
                                                <button
                                                    onClick={() => setPendingAction({ entry: p, action: 'reject' })}
                                                    className="inline-flex items-center gap-1 text-red-500 hover:text-red-600 text-xs font-bold transition-colors"
                                                >
                                                    <XCircle size={14} /> Reject
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <PaymentDetailsModal
                open={!!viewing}
                onClose={() => setViewing(null)}
                receipt={viewing}
            />

            <ConfirmModal
                open={!!pendingAction}
                title={pendingAction?.action === 'confirm' ? 'Confirm this payment?' : 'Reject this payment?'}
                description={
                    pendingAction?.action === 'confirm'
                        ? `This applies KES ${Number(pendingAction?.entry?.amount).toLocaleString()} to ${pendingAction?.entry?.billId}. Make sure you've verified the till/M-Pesa message before confirming.`
                        : `The customer's claimed payment is discarded and the bill stays unpaid. Use this if the till message can't be verified.`
                }
                confirmLabel={pendingAction?.action === 'confirm' ? 'Confirm Payment' : 'Reject'}
                tone={pendingAction?.action === 'confirm' ? 'default' : 'danger'}
                loading={working}
                onConfirm={runPendingAction}
                onClose={() => setPendingAction(null)}
            />
        </div>
    );
                                                            }
