// src/components/Cashier/HistoryModal.jsx
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
    X, Search, Eye, Printer, ShieldAlert, ChevronLeft, ChevronRight,
    ShoppingBag, TrendingUp, Clock, CheckSquare, Square,
} from 'lucide-react';
import API from '../../api/axios';
import { formatKenyanDateTime } from '../../utils/formatDate';
import PrintReceipt from '../PrintReceipt';

const STATUS_STYLE = {
    unpaid: 'bg-amber-100 text-amber-700',
    partial: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    voided: 'bg-red-100 text-red-700',
};

export default function HistoryModal({ open, onClose, branch }) {
    const [receipts, setReceipts] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [q, setQ] = useState('');
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);

    const [viewing, setViewing] = useState(null);       // receipt shown in "view items"
    const [voiding, setVoiding] = useState(null);        // receipt shown in "void" panel
    const [selected, setSelected] = useState(new Set()); // selected item indices for partial void
    const [voidAll, setVoidAll] = useState(true);
    const [reason, setReason] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [printReceipt, setPrintReceipt] = useState(null);
    const [printingId, setPrintingId] = useState(null);

    const loadSummary = useCallback(() => {
        API.get('/receipts/summary/today', { params: { branch } })
            .then((res) => setSummary(res.data))
            .catch(() => {});
    }, [branch]);

    const loadHistory = useCallback((targetPage = 1, query = q) => {
        setLoading(true);
        API.get('/receipts/history', { params: { branch, page: targetPage, limit: 10, q: query || undefined } })
            .then((res) => {
                setReceipts(res.data.receipts);
                setPage(res.data.page);
                setTotalPages(res.data.totalPages);
            })
            .catch(() => toast.error("Couldn't load bill history"))
            .finally(() => setLoading(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branch]);

    useEffect(() => {
        if (!open) return;
        loadSummary();
        loadHistory(1, '');
        setQ('');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (!printReceipt) return;
        const t = setTimeout(() => window.print(), 150);
        const done = () => setPrintReceipt(null);
        window.addEventListener('afterprint', done);
        return () => { clearTimeout(t); window.removeEventListener('afterprint', done); };
    }, [printReceipt]);

    if (!open) return null;

    const handleSearch = (e) => {
        e.preventDefault();
        loadHistory(1, q);
    };

    const openVoidPanel = (receipt) => {
        setVoiding(receipt);
        setVoidAll(true);
        setSelected(new Set());
        setReason('');
    };

    const toggleItem = (idx) => {
        setVoidAll(false);
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(idx) ? next.delete(idx) : next.add(idx);
            return next;
        });
    };

    const submitVoid = async () => {
        if (!voiding) return;
        if (!reason.trim()) return toast.error('Enter a reason for the void');
        if (!voidAll && selected.size === 0) return toast.error('Select at least one item, or choose "Void entire sale"');

        setSubmitting(true);
        try {
            const body = { receiptId: voiding._id, reason: reason.trim() };
            if (!voidAll) body.items = [...selected];
            await API.post('/void-requests', body);
            toast.success('Void request sent — awaiting manager approval');
            setVoiding(null);
            loadHistory(page, q);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit void request');
        }
        setSubmitting(false);
    };

    const reprint = async (receipt) => {
        setPrintingId(receipt._id);
        try {
            const res = await API.get(`/receipts/${receipt._id}`);
            setPrintReceipt(res.data);
            API.patch(`/receipts/${receipt._id}/print`).catch(() => {});
        } catch {
            toast.error('Could not load receipt for printing');
        }
        setPrintingId(null);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
            <div className="bg-white rounded-2xl w-full max-w-3xl h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">

                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/60">
                    <h3 className="font-black text-base sm:text-lg text-gray-900 flex items-center gap-2">
                        <Clock size={19} className="text-brand-orange" /> Bill History
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
                </div>

                {/* Today's totals */}
                <div className="px-4 sm:px-5 pt-4 grid grid-cols-2 gap-3 shrink-0">
                    <div className="bg-brand-orange-light border border-orange-100 rounded-xl p-3">
                        <p className="text-[11px] font-bold text-brand-orange flex items-center gap-1">
                            <TrendingUp size={12} /> Total Sales Today
                        </p>
                        <p className="text-lg font-black text-gray-900">
                            KES {(summary?.paidToday ?? 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-500 font-semibold">{summary?.paidTodayCount ?? 0} paid bills</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <p className="text-[11px] font-bold text-gray-500">Unpaid / Partial Today</p>
                        <p className="text-lg font-black text-gray-900">
                            KES {(summary?.unpaidToday ?? 0).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-500 font-semibold">{summary?.unpaidTodayCount ?? 0} bill(s)</p>
                    </div>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} className="px-4 sm:px-5 pt-3 shrink-0">
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Search by Bill ID or cashier name…"
                            className="w-full pl-9 pr-16 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-orange"
                        />
                        <button type="submit" className="absolute right-1 top-1 bottom-1 bg-brand-orange hover:bg-brand-orange-hover text-white px-3 rounded-lg text-[11px] font-bold">
                            Find
                        </button>
                    </div>
                </form>

                {/* List */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 space-y-2">
                    {loading && <p className="text-center text-gray-400 text-xs py-8">Loading…</p>}
                    {!loading && receipts.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            <ShoppingBag size={26} className="mx-auto mb-2 text-gray-300" />
                            <p className="text-xs font-semibold">No bills found</p>
                        </div>
                    )}
                    {receipts.map((r) => (
                        <div key={r._id} className="border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-sm font-black text-gray-900">{r.billId}</p>
                                <p className="text-[11px] text-gray-500 font-medium">
                                    {formatKenyanDateTime(r.createdAt)} · {r.cashierName || 'Unknown cashier'}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                                        {r.status}
                                    </span>
                                    <span className="text-[11px] font-bold text-brand-orange">KES {Number(r.subtotal).toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5 shrink-0">
                                <button onClick={() => setViewing(r)} className="flex items-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg">
                                    <Eye size={12} /> Items
                                </button>
                                <button onClick={() => reprint(r)} disabled={printingId === r._id} className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg disabled:opacity-50">
                                    <Printer size={12} /> {printingId === r._id ? '…' : 'Reprint'}
                                </button>
                                {r.status !== 'voided' && (
                                    <button onClick={() => openVoidPanel(r)} className="flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg">
                                        <ShieldAlert size={12} /> Void
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 shrink-0">
                        <button onClick={() => loadHistory(Math.max(1, page - 1), q)} disabled={page <= 1}
                            className="flex items-center gap-1 text-xs font-bold text-gray-500 disabled:opacity-30">
                            <ChevronLeft size={14} /> Prev
                        </button>
                        <span className="text-xs font-semibold text-gray-500">Page {page} of {totalPages}</span>
                        <button onClick={() => loadHistory(Math.min(totalPages, page + 1), q)} disabled={page >= totalPages}
                            className="flex items-center gap-1 text-xs font-bold text-gray-500 disabled:opacity-30">
                            Next <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* View items modal */}
            {viewing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full max-h-[80vh] overflow-y-auto shadow-2xl">
                        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
                            <div>
                                <p className="font-black text-gray-900 text-sm">{viewing.billId}</p>
                                <p className="text-[11px] text-gray-400">{formatKenyanDateTime(viewing.createdAt)}</p>
                            </div>
                            <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                        </div>
                        <div className="p-4 space-y-2.5">
                            {viewing.items.map((it, idx) => (
                                <div key={idx} className="flex justify-between text-xs">
                                    <div>
                                        <p className="font-bold text-gray-800">{it.productName}</p>
                                        <p className="text-gray-400">Qty {it.quantity} × KES {it.unitPrice}</p>
                                    </div>
                                    <p className="font-bold text-gray-900">KES {it.lineTotal.toLocaleString()}</p>
                                </div>
                            ))}
                            <div className="border-t border-gray-100 pt-2.5 flex justify-between font-black text-sm text-gray-900">
                                <span>Total</span>
                                <span>KES {Number(viewing.subtotal).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Void panel */}
            {voiding && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full max-h-[85vh] overflow-y-auto shadow-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
                                <ShieldAlert size={16} className="text-red-500" /> Void {voiding.billId}
                            </h4>
                            <button onClick={() => setVoiding(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        </div>

                        <button
                            onClick={() => { setVoidAll(true); setSelected(new Set()); }}
                            className={`w-full flex items-center gap-2 text-xs font-bold p-2.5 rounded-xl border mb-2 ${voidAll ? 'bg-red-50 border-red-300 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}
                        >
                            {voidAll ? <CheckSquare size={14} /> : <Square size={14} />}
                            Void entire sale (all {voiding.items.length} item(s))
                        </button>

                        <p className="text-[11px] font-bold text-gray-400 mt-3 mb-1.5">Or select individual items to void:</p>
                        <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
                            {voiding.items.map((it, idx) => {
                                const isSelected = !voidAll && selected.has(idx);
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => toggleItem(idx)}
                                        className={`w-full flex items-center justify-between gap-2 text-xs p-2 rounded-lg border ${isSelected ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200'}`}
                                    >
                                        <span className="flex items-center gap-2 font-semibold text-gray-700 text-left">
                                            {isSelected ? <CheckSquare size={13} className="text-red-500 shrink-0" /> : <Square size={13} className="text-gray-300 shrink-0" />}
                                            {it.productName} × {it.quantity}
                                        </span>
                                        <span className="font-bold text-gray-800 shrink-0">KES {it.lineTotal.toLocaleString()}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <label className="text-[11px] font-bold text-gray-400 mb-1 block">Reason for void</label>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                            placeholder="e.g. Customer changed their mind, wrong item scanned…"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs mb-3" />

                        <button onClick={submitVoid} disabled={submitting}
                            className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                            {submitting ? 'Submitting…' : 'Submit for Manager Approval'}
                        </button>
                    </div>
                </div>
            )}

            <PrintReceipt receipt={printReceipt} />
        </div>
    );
}
