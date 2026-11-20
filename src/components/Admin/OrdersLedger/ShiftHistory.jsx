// src/components/Admin/OrdersLedger/ShiftHistory.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-toastify';
import { ChevronLeft, ChevronRight, Clock, Building2, CalendarX2 } from 'lucide-react';
import API from '../../../api/axios';
import { formatKenyanDateTime } from '../../../utils/formatDate';

const fmt = (n) => Number(n || 0).toLocaleString();

const initials = (name = '') =>
    name
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '—';

const duration = (from, to) => {
    if (!from) return '';
    const ms = (to ? new Date(to) : new Date()) - new Date(from);
    if (ms < 0) return '';
    const mins = Math.floor(ms / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const RESULT_STYLE = {
    negative: 'bg-red-50 text-red-700 border-red-200',
    exact: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    extra: 'bg-blue-50 text-blue-700 border-blue-200',
    open: 'bg-gray-100 text-gray-700 border-gray-200',
};

function ResultBadge({ result, difference }) {
    const label =
        result === 'negative' ? `Short by ${fmt(Math.abs(difference))}`
        : result === 'extra' ? `Extra +${fmt(difference)}`
        : result === 'exact' ? 'Balanced'
        : 'Open';
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${RESULT_STYLE[result] || RESULT_STYLE.open}`}>
            {label}
        </span>
    );
}

function StatusPill({ closed }) {
    return closed ? (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            Closed
        </span>
    ) : (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Open now
        </span>
    );
}

const PAY_TILES = [
    { key: 'cash', label: 'Cash', dot: 'bg-emerald-500' },
    { key: 'till', label: 'Till', dot: 'bg-sky-500' },
    { key: 'mpesa', label: 'M-Pesa', dot: 'bg-green-600' },
    { key: 'reward', label: 'Reward', dot: 'bg-purple-500' },
];

function PayTile({ label, value, dot }) {
    return (
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dot}`} />
                <p className="text-xs font-semibold text-gray-600">{label}</p>
            </div>
            <p className="mt-1 text-base font-extrabold text-gray-900 tabular-nums">{fmt(value)}</p>
        </div>
    );
}

function ShiftCard({ s }) {
    const closed = s.status === 'closed' || !!s.closedAt;
    const hasCount = s.cashCounted !== null && s.cashCounted !== undefined;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md shadow-gray-200/70 hover:shadow-lg hover:shadow-gray-300/60 transition-shadow p-5 space-y-4">
            {/* Header: who + status + total */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 shrink-0 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-black">
                        {initials(s.cashier)}
                    </div>
                    <div className="min-w-0">
                        <p className="text-base font-extrabold text-gray-900 truncate">{s.cashier}</p>
                        {s.branch && (
                            <p className="flex items-center gap-1 text-sm text-gray-600">
                                <Building2 size={13} className="text-gray-400" />
                                {s.branch}
                            </p>
                        )}
                    </div>
                </div>

                <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Total sales</p>
                    <p className="text-2xl font-black text-gray-900 tabular-nums">
                        <span className="text-sm font-bold text-gray-500 mr-1">KES</span>
                        {fmt(s.totalSales)}
                    </p>
                </div>
            </div>

            {/* Time range + status */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700">
                <StatusPill closed={closed} />
                <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-gray-400" />
                    {formatKenyanDateTime(s.openedAt)}
                    <span className="text-gray-400">→</span>
                    {s.closedAt ? formatKenyanDateTime(s.closedAt) : 'still open'}
                </span>
                {duration(s.openedAt, s.closedAt) && (
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-bold">
                        {duration(s.openedAt, s.closedAt)}
                    </span>
                )}
            </div>

            {/* Payment breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PAY_TILES.map((t) => (
                    <PayTile key={t.key} label={t.label} value={s[t.key]} dot={t.dot} />
                ))}
            </div>

            {/* Cash reconciliation (only when a count was recorded) */}
            {hasCount && (
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
                    <div className="flex gap-6 text-sm">
                        <div>
                            <p className="text-xs font-semibold text-gray-500">Expected cash</p>
                            <p className="font-bold text-gray-900 tabular-nums">{fmt(s.expectedCash)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-500">Cash counted</p>
                            <p className="font-bold text-gray-900 tabular-nums">{fmt(s.cashCounted)}</p>
                        </div>
                    </div>
                    <ResultBadge result={s.result} difference={s.difference} />
                </div>
            )}
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-md shadow-gray-200/70 p-5 animate-pulse space-y-4">
            <div className="flex justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gray-200" />
                    <div className="space-y-2">
                        <div className="h-4 w-32 bg-gray-200 rounded" />
                        <div className="h-3 w-24 bg-gray-100 rounded" />
                    </div>
                </div>
                <div className="h-8 w-28 bg-gray-200 rounded" />
            </div>
            <div className="h-4 w-64 bg-gray-100 rounded" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
            </div>
        </div>
    );
}

export default function ShiftHistory({ branch }) {
    const [rows, setRows] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const load = useCallback(async (p = 1) => {
        setLoading(true);
        try {
            const params = { page: p, limit: 15, ...(branch ? { branch } : {}) };
            if (dateFrom) params.from = new Date(dateFrom).toISOString();
            if (dateTo) params.to = new Date(`${dateTo}T23:59:59`).toISOString();
            const res = await API.get('/shifts', { params });
            setRows(res.data.shifts);
            setPage(res.data.page);
            setTotalPages(res.data.totalPages);
        } catch {
            toast.error('Failed to load shift history');
        }
        setLoading(false);
    }, [branch, dateFrom, dateTo]);

    useEffect(() => { load(1); }, [load]);

    // Totals for the shifts currently loaded on this page
    const totals = useMemo(
        () =>
            rows.reduce(
                (a, s) => ({
                    sales: a.sales + (s.totalSales || 0),
                    cash: a.cash + (s.cash || 0),
                    till: a.till + (s.till || 0),
                    mpesa: a.mpesa + (s.mpesa || 0),
                    reward: a.reward + (s.reward || 0),
                }),
                { sales: 0, cash: 0, till: 0, mpesa: 0, reward: 0 }
            ),
        [rows]
    );

    return (
        <div className="space-y-5">
            {/* Filters */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-wrap gap-4 items-end">
                <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">From</label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                    />
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">To</label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
                    />
                </div>
                {(dateFrom || dateTo) && (
                    <button
                        onClick={() => { setDateFrom(''); setDateTo(''); }}
                        className="text-sm font-bold text-gray-600 hover:text-red-600 pb-2"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Totals for this page */}
            {!loading && rows.length > 0 && (
                <div className="bg-gray-900 rounded-2xl p-5 text-white shadow-md">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-gray-300">
                                Sales on this page · {rows.length} shift{rows.length === 1 ? '' : 's'}
                            </p>
                            <p className="text-3xl font-black tabular-nums">
                                <span className="text-base font-bold text-gray-300 mr-1">KES</span>
                                {fmt(totals.sales)}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                            {[
                                ['Cash', totals.cash],
                                ['Till', totals.till],
                                ['M-Pesa', totals.mpesa],
                                ['Reward', totals.reward],
                            ].map(([label, v]) => (
                                <div key={label}>
                                    <p className="text-xs font-semibold text-gray-300">{label}</p>
                                    <p className="font-bold tabular-nums">{fmt(v)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Shift cards */}
            <div className="space-y-4">
                {loading && [0, 1, 2].map((i) => <SkeletonCard key={i} />)}

                {!loading && rows.length === 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 text-center">
                        <CalendarX2 size={32} className="mx-auto text-gray-400 mb-3" />
                        <p className="font-bold text-gray-800">No shifts found</p>
                        <p className="text-sm text-gray-600 mt-1">Try a different date range.</p>
                    </div>
                )}

                {!loading && rows.map((s) => <ShiftCard key={s._id} s={s} />)}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 text-sm">
                    <button
                        disabled={page <= 1}
                        onClick={() => load(page - 1)}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 bg-white font-semibold text-gray-800 shadow-sm disabled:opacity-40"
                    >
                        <ChevronLeft size={14} /> Prev
                    </button>
                    <span className="font-semibold text-gray-700">Page {page} of {totalPages}</span>
                    <button
                        disabled={page >= totalPages}
                        onClick={() => load(page + 1)}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 bg-white font-semibold text-gray-800 shadow-sm disabled:opacity-40"
                    >
                        Next <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
            }
