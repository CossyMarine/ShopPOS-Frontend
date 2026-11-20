import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import API from '../../../api/axios';
import { formatKenyanDateTime } from '../../../utils/formatDate';

const fmt = (n) => Number(n || 0).toLocaleString();

const RESULT_STYLE = {
    negative: 'bg-red-50 text-red-600',
    exact: 'bg-emerald-50 text-emerald-600',
    extra: 'bg-blue-50 text-blue-600',
    open: 'bg-gray-100 text-gray-500',
};

function ResultBadge({ result, difference }) {
    const label =
        result === 'negative' ? `Negative (${fmt(difference)})`
        : result === 'extra' ? `Extra (+${fmt(difference)})`
        : result === 'exact' ? 'Exact'
        : 'Open';
    return <span className={`px-2 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${RESULT_STYLE[result]}`}>{label}</span>;
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

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
                <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">From</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">To</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                        className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
                <table className="w-full text-sm min-w-[900px]">
                    <thead className="text-xs uppercase text-gray-400 border-b border-gray-100">
                        <tr>
                            <th className="p-3 text-left">Cashier / Shift</th>
                            <th className="p-3 text-right">Total Sales</th>
                            <th className="p-3 text-right">Cash</th>
                            <th className="p-3 text-right">Till</th>
                            <th className="p-3 text-right">M-Pesa</th>
                            <th className="p-3 text-right">Reward</th>
                            <th className="p-3 text-right">Cash Counted</th>
                            <th className="p-3 text-left">Result</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && <tr><td colSpan={8} className="p-6 text-center text-gray-400">Loading…</td></tr>}
                        {!loading && rows.length === 0 && (
                            <tr><td colSpan={8} className="p-6 text-center text-gray-400">No shifts found.</td></tr>
                        )}
                        {!loading && rows.map((s) => (
                            <tr key={s._id} className="hover:bg-gray-50">
                                <td className="p-3">
                                    <p className="font-bold text-gray-800">{s.cashier}</p>
                                    <p className="text-xs text-gray-400">
                                        {formatKenyanDateTime(s.openedAt)}
                                        {s.closedAt ? ` → ${formatKenyanDateTime(s.closedAt)}` : ' → still open'}
                                    </p>
                                    {s.branch && <p className="text-xs text-gray-400">{s.branch}</p>}
                                </td>
                                <td className="p-3 text-right font-black">{fmt(s.totalSales)}</td>
                                <td className="p-3 text-right">{fmt(s.cash)}</td>
                                <td className="p-3 text-right">{fmt(s.till)}</td>
                                <td className="p-3 text-right">{fmt(s.mpesa)}</td>
                                <td className="p-3 text-right">{fmt(s.reward)}</td>
                                <td className="p-3 text-right">
                                    {s.cashCounted === null ? '—' : (
                                        <>
                                            <span className="font-bold">{fmt(s.cashCounted)}</span>
                                            <p className="text-xs text-gray-400">Expected {fmt(s.expectedCash)}</p>
                                        </>
                                    )}
                                </td>
                                <td className="p-3"><ResultBadge result={s.result} difference={s.difference} /></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-3 text-sm">
                    <button disabled={page <= 1} onClick={() => load(page - 1)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40">Prev</button>
                    <span className="text-gray-500">Page {page} of {totalPages}</span>
                    <button disabled={page >= totalPages} onClick={() => load(page + 1)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white disabled:opacity-40">Next</button>
                </div>
            )}
        </div>
    );
              }
