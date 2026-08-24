import { useState, useEffect } from 'react';
import { RefreshCw, ShieldAlert, ImageIcon, History } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ConfirmModal from './ConfirmModal';
import { formatKenyanDateTime } from '../../utils/formatDate';

const REASON_LABEL = {
    damaged: 'Damaged', stolen: 'Stolen', expired: 'Expired',
    spillage: 'Spillage', count_correction: 'Count Correction', other: 'Other',
};

export default function StockAdjustmentsView({ branch } = {}) {
    const [tab, setTab] = useState('pending'); // 'pending' | 'audit'
    const [requests, setRequests] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [pendingAction, setPendingAction] = useState(null); // { request, action }
    const [rejectionNote, setRejectionNote] = useState('');
    const [working, setWorking] = useState(false);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const res = await API.get('/stock-adjustments', { params: branch ? { branch } : {} });
            setRequests(res.data);
        } catch {
            toast.error('Failed to load stock adjustment requests');
        }
        setLoading(false);
    };

    const fetchAudit = async () => {
        setLoading(true);
        try {
            const res = await API.get('/stock-adjustments/audit-log', { params: branch ? { branch } : {} });
            setAuditLogs(res.data);
        } catch {
            toast.error('Failed to load audit log');
        }
        setLoading(false);
    };

    useEffect(() => {
        tab === 'pending' ? fetchPending() : fetchAudit();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branch, tab]);

    const runAction = async () => {
        const { request, action } = pendingAction;
        setWorking(true);
        try {
            await API.patch(`/stock-adjustments/${request._id}/${action}`,
                action === 'reject' ? { rejectionNote } : undefined);
            toast.success(action === 'approve' ? 'Approved — stock updated' : 'Request rejected');
            setPendingAction(null);
            setRejectionNote('');
            fetchPending();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        }
        setWorking(false);
    };

    return (
        <div className="space-y-6 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Stock Loss & Adjustments</h2>
                    <p className="text-sm text-gray-500">Approve write-offs and review the full adjustment history</p>
                </div>
                <button onClick={() => (tab === 'pending' ? fetchPending() : fetchAudit())}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 px-3 py-2 rounded-lg text-sm font-semibold shadow-sm">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
                <button onClick={() => setTab('pending')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition ${tab === 'pending' ? 'bg-red-500 text-white' : 'text-gray-500'}`}>
                    Pending Approval {requests.length ? `(${requests.length})` : ''}
                </button>
                <button onClick={() => setTab('audit')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${tab === 'audit' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}>
                    <History size={13} /> Audit Log
                </button>
            </div>

            {tab === 'pending' ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-400 font-semibold border-b border-gray-100">
                                <th className="p-3">Product</th>
                                <th className="p-3">Qty</th>
                                <th className="p-3">Reason</th>
                                <th className="p-3">Requested By</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Evidence</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-600">
                            {requests.length === 0 ? (
                                <tr><td colSpan={7} className="p-10 text-center text-gray-400 font-medium">No pending requests</td></tr>
                            ) : requests.map((r) => (
                                <tr key={r._id} className="hover:bg-gray-50/70">
                                    <td className="p-3 font-bold text-gray-800">{r.product?.name || '—'}</td>
                                    <td className="p-3 font-mono">{r.quantity} {r.product?.unit?.abbreviation || ''}</td>
                                    <td className="p-3">
                                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">
                                            {REASON_LABEL[r.reason] || r.reason}
                                        </span>
                                        {r.note && <p className="text-xs text-gray-400 italic mt-1 max-w-[160px] truncate" title={r.note}>{r.note}</p>}
                                    </td>
                                    <td className="p-3 font-medium">{r.requestedBy?.fullName || '—'} <span className="text-xs text-gray-400">({r.requestedBy?.role})</span></td>
                                    <td className="p-3 text-xs text-gray-400">{formatKenyanDateTime(r.createdAt)}</td>
                                    <td className="p-3">
                                        {r.photoUrl ? (
                                            <button onClick={() => setPhotoPreview(r.photoUrl)} className="text-blue-500 hover:text-blue-600">
                                                <ImageIcon size={16} />
                                            </button>
                                        ) : <span className="text-xs text-gray-300">none</span>}
                                    </td>
                                    <td className="p-3 text-right space-x-3 whitespace-nowrap">
                                        <button onClick={() => setPendingAction({ request: r, action: 'approve' })}
                                            className="text-green-600 hover:text-green-700 text-xs font-bold">Approve</button>
                                        <button onClick={() => setPendingAction({ request: r, action: 'reject' })}
                                            className="text-gray-400 hover:text-gray-600 text-xs font-bold">Reject</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-400 font-semibold border-b border-gray-100">
                                <th className="p-3">Action</th>
                                <th className="p-3">Product</th>
                                <th className="p-3">Qty</th>
                                <th className="p-3">Reason</th>
                                <th className="p-3">Cost Impact</th>
                                <th className="p-3">By</th>
                                <th className="p-3">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-600">
                            {auditLogs.length === 0 ? (
                                <tr><td colSpan={7} className="p-10 text-center text-gray-400 font-medium">No history yet</td></tr>
                            ) : auditLogs.map((l) => (
                                <tr key={l._id} className="hover:bg-gray-50/70">
                                    <td className="p-3">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                            l.action === 'approved' ? 'bg-green-50 text-green-600' :
                                            l.action === 'rejected' ? 'bg-gray-100 text-gray-500' :
                                            'bg-amber-50 text-amber-600'
                                        }`}>{l.action}</span>
                                    </td>
                                    <td className="p-3 font-semibold text-gray-800">{l.details?.productName || '—'}</td>
                                    <td className="p-3 font-mono">{l.details?.quantity ?? '—'}</td>
                                    <td className="p-3 text-xs">{REASON_LABEL[l.details?.reason] || l.details?.reason || '—'}</td>
                                    <td className="p-3 font-mono text-xs">
                                        {l.details?.costImpact != null ? `KES ${l.details.costImpact.toLocaleString()}` : '—'}
                                    </td>
                                    <td className="p-3 font-medium">{l.performedBy?.fullName || '—'}</td>
                                    <td className="p-3 text-xs text-gray-400">{formatKenyanDateTime(l.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {photoPreview && (
                <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => setPhotoPreview(null)}>
                    <img src={photoPreview} alt="evidence" className="max-w-lg max-h-[80vh] rounded-xl shadow-2xl" />
                </div>
            )}

            <ConfirmModal
                open={!!pendingAction}
                title={pendingAction?.action === 'approve' ? 'Approve this write-off?' : 'Reject this request?'}
                description={
                    pendingAction?.action === 'approve' ? (
                        <>This permanently deducts {pendingAction?.request?.quantity} {pendingAction?.request?.product?.unit?.abbreviation || 'unit(s)'} of {pendingAction?.request?.product?.name} from stock and records the cost impact.</>
                    ) : (
                        <div className="space-y-2">
                            <p>The stock stays as-is. Optionally note why:</p>
                            <textarea value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)} rows={2}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                        </div>
                    )
                }
                confirmLabel={pendingAction?.action === 'approve' ? 'Approve' : 'Reject'}
                tone={pendingAction?.action === 'approve' ? 'danger' : 'default'}
                loading={working}
                onConfirm={runAction}
                onClose={() => { setPendingAction(null); setRejectionNote(''); }}
            />
        </div>
    );
              }
