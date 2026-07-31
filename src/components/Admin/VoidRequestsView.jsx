import { useState, useEffect } from 'react';
import { Eye, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ConfirmModal from './ConfirmModal';
import ViewItemsModal from './ViewItemsModal';
import { formatKenyanDateTime } from '../../utils/formatDate';

export default function VoidRequestsView({ branch } = {}) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [viewing, setViewing] = useState(null);
    const [pendingAction, setPendingAction] = useState(null); // { request, action }
    const [working, setWorking] = useState(false);

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await API.get('/void-requests', { params: branch ? { branch } : {} });
            setRequests(res.data);
        } catch (err) {
            console.error('Failed to fetch void requests', err);
            toast.error('Failed to load void requests');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchRequests();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branch]);

    const runAction = async () => {
        const { request, action } = pendingAction;
        setWorking(true);
        try {
            await API.patch(`/void-requests/${request._id}/${action}`);
            toast.success(action === 'approve' ? 'Void approved — receipt voided and stock restored' : 'Void request rejected');
            setPendingAction(null);
            fetchRequests();
        } catch (err) {
            console.error('Failed to update void request', err);
            toast.error('Action failed');
        }
        setWorking(false);
    };

    return (
        <div className="space-y-8 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Void Authorization Requests</h2>
                    <p className="text-sm text-gray-500">Approve or reject requests to void a receipt</p>
                </div>
                <button
                    onClick={fetchRequests}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="text-gray-400 font-semibold border-b border-gray-100">
                                <th className="p-3">Bill ID</th>
                                <th className="p-3">Branch</th>
                                <th className="p-3">Requested By</th>
                                <th className="p-3">Date</th>
                                <th className="p-3">Reason</th>
                                <th className="p-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-gray-600">
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-10 text-center text-gray-400 font-medium">
                                        No pending void requests
                                    </td>
                                </tr>
                            ) : (
                                requests.map((v) => (
                                    <tr key={v._id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="p-3 font-bold text-orange-500">{v.receipt?.billId}</td>
                                        <td className="p-3 font-semibold text-gray-800">{v.receipt?.branch?.name || '—'}</td>
                                        <td className="p-3 font-medium">{v.requestedBy?.fullName || '—'}</td>
                                        <td className="p-3 text-xs text-gray-400">
                                            {formatKenyanDateTime(v.createdAt)}
                                        </td>
                                        <td className="p-3 text-xs italic text-amber-700 max-w-xs truncate" title={v.reason}>
                                            {v.reason}
                                        </td>
                                        <td className="p-3 text-right space-x-3 whitespace-nowrap">
                                            <button
                                                onClick={() => setViewing(v.receipt)}
                                                className="inline-flex items-center gap-1 text-gray-400 hover:text-orange-500 text-xs font-semibold transition-colors"
                                            >
                                                <Eye size={14} /> View
                                            </button>
                                            <button
                                                onClick={() => setPendingAction({ request: v, action: 'approve' })}
                                                className="text-red-500 hover:text-red-600 text-xs font-bold transition-colors"
                                            >
                                                Approve Void
                                            </button>
                                            <button
                                                onClick={() => setPendingAction({ request: v, action: 'reject' })}
                                                className="text-gray-400 hover:text-gray-600 text-xs font-bold transition-colors"
                                            >
                                                Reject
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
                subtitle={viewing ? `${viewing.branch?.name || ''}` : ''}
                items={(viewing?.items || []).map((i) => ({ name: i.productName, qty: i.quantity, price: i.unitPrice }))}
                total={viewing?.subtotal}
            />

            <ConfirmModal
                open={!!pendingAction}
                title={pendingAction?.action === 'approve' ? 'Approve void?' : 'Reject void request?'}
                description={
                    pendingAction?.action === 'approve'
                        ? `This permanently voids receipt ${pendingAction?.request?.receipt?.billId} and restocks its items back into inventory. Revenue for this bill will no longer count.`
                        : `The receipt stays active and returns to the ledger.`
                }
                confirmLabel={pendingAction?.action === 'approve' ? 'Approve & Void' : 'Reject'}
                tone={pendingAction?.action === 'approve' ? 'danger' : 'default'}
                loading={working}
                onConfirm={runAction}
                onClose={() => setPendingAction(null)}
            />
        </div>
    );
                                        }
