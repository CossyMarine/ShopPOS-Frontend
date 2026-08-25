import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { ArrowRightLeft, Plus, RefreshCw, Truck, PackageCheck, XCircle, Store } from 'lucide-react';
import API from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { formatKenyanDateTime } from '../../utils/formatDate';
import ConfirmModal from '../Admin/ConfirmModal';
import NewTransferModal from './NewTransferModal';
import ReceiveTransferModal from './ReceiveTransferModal';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

const STATUS_STYLE = {
    draft: 'bg-gray-100 text-gray-600',
    in_transit: 'bg-blue-50 text-blue-600 border border-blue-100',
    completed: 'bg-green-50 text-green-600 border border-green-100',
    cancelled: 'bg-red-50 text-red-500 border border-red-100',
};

// Works for both a single-branch storekeeper/manager (branch is fixed to
// their own) and Super Admin at HQ (branch follows whatever's selected in
// BranchSelector, or shows every branch's transfers when "All Branches").
// `branch` here means "the branch whose perspective we're viewing from" —
// outgoing transfers FROM it, incoming transfers TO it.
export default function StockTransfers({ branch }) {
    const { user } = useAuth();
    const effectiveBranch = branch || user.branch;
    const canManage = user.isAdmin || user.role === 'branchManager';

    const [branches, setBranches] = useState([]);
    const [tab, setTab] = useState('open'); // 'open' | 'history'
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [receivingTransfer, setReceivingTransfer] = useState(null);
    const [pendingAction, setPendingAction] = useState(null); // { transfer, action: 'dispatch' | 'cancel' }
    const [working, setWorking] = useState(false);

    const fetchBranches = useCallback(() => {
        API.get('/branches').then((res) => setBranches(res.data)).catch(() => {});
    }, []);

    const fetchTransfers = useCallback(async () => {
        setLoading(true);
        try {
            const params = effectiveBranch ? { branch: effectiveBranch } : {};
            if (tab === 'history') params.status = 'completed';
            const res = await API.get('/stock-transfers', { params });
            setTransfers(tab === 'history' ? res.data : res.data.filter((t) => ['draft', 'in_transit'].includes(t.status)));
        } catch {
            toast.error('Failed to load stock transfers');
        }
        setLoading(false);
    }, [effectiveBranch, tab]);

    useEffect(() => { fetchBranches(); }, [fetchBranches]);
    useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

    // Live refresh when either side of a transfer dispatches/receives/cancels
    useEffect(() => {
        if (!effectiveBranch) return;
        const socket = io(SOCKET_URL);
        socket.emit('join_room', `branch:${effectiveBranch}`);
        const refresh = () => fetchTransfers();
        socket.on('stockTransfer:created', refresh);
        socket.on('stockTransfer:dispatched', refresh);
        socket.on('stockTransfer:completed', refresh);
        socket.on('stockTransfer:cancelled', refresh);
        return () => socket.disconnect();
    }, [effectiveBranch, fetchTransfers]);

    const runAction = async () => {
        const { transfer, action } = pendingAction;
        setWorking(true);
        try {
            await API.patch(`/stock-transfers/${transfer._id}/${action}`);
            toast.success(action === 'dispatch' ? 'Transfer dispatched' : 'Transfer cancelled');
            setPendingAction(null);
            fetchTransfers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Action failed');
        }
        setWorking(false);
    };

    const branchName = (id) => branches.find((b) => b._id === id)?.name || '—';

    return (
        <div className="space-y-6 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                        <ArrowRightLeft size={22} className="text-orange-500" /> Stock Transfers
                    </h2>
                    <p className="text-sm text-gray-500">Move stock between branches and track it in transit</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={fetchTransfers}
                        className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 px-3 py-2 rounded-lg text-sm font-semibold shadow-sm">
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                    {effectiveBranch && (
                        <button onClick={() => setShowNew(true)}
                            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                            <Plus size={14} /> New Transfer
                        </button>
                    )}
                </div>
            </div>

            {!effectiveBranch && (
                <p className="text-xs text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-3">
                    Viewing "All Branches" — select a specific branch to create a new transfer from it.
                </p>
            )}

            <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
                <button onClick={() => setTab('open')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition ${tab === 'open' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>
                    Open Transfers
                </button>
                <button onClick={() => setTab('history')}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition ${tab === 'history' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}>
                    History
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                <th className="p-3.5">Route</th>
                                <th className="p-3.5">Items</th>
                                <th className="p-3.5">Status</th>
                                <th className="p-3.5">Initiated</th>
                                <th className="p-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs font-medium">
                            {transfers.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-10 text-gray-400 font-bold">
                                    {tab === 'open' ? 'No transfers in progress' : 'No completed transfers yet'}
                                </td></tr>
                            ) : transfers.map((t) => {
                                const isSource = String(t.fromBranch?._id || t.fromBranch) === String(effectiveBranch);
                                const isDest = String(t.toBranch?._id || t.toBranch) === String(effectiveBranch);
                                const totalUnits = t.lines.reduce((s, l) => s + l.quantitySent, 0);
                                const anyDiscrepancy = t.status === 'completed' && t.lines.some((l) => l.quantityReceived !== l.quantitySent);

                                return (
                                    <tr key={t._id} className="hover:bg-gray-50/70">
                                        <td className="p-3.5">
                                            <p className="font-extrabold text-gray-900 flex items-center gap-1.5">
                                                {t.fromBranch?.name || branchName(t.fromBranch)}
                                                <ArrowRightLeft size={11} className="text-gray-300" />
                                                {t.toBranch?.name || branchName(t.toBranch)}
                                                {t.toBranch?.isWarehouse === false && t.fromBranch?.isWarehouse && (
                                                    <span className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-black flex items-center gap-0.5">
                                                        <Store size={9} /> Replenishment
                                                    </span>
                                                )}
                                            </p>
                                            {t.note && <p className="text-[10px] text-gray-400 mt-0.5 italic truncate max-w-[200px]" title={t.note}>{t.note}</p>}
                                        </td>
                                        <td className="p-3.5 font-mono">
                                            {t.lines.length} line{t.lines.length !== 1 ? 's' : ''} · {totalUnits.toLocaleString()} units
                                            {anyDiscrepancy && (
                                                <span className="block text-[10px] text-amber-600 font-bold mt-0.5">⚠ Discrepancy recorded</span>
                                            )}
                                        </td>
                                        <td className="p-3.5">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full capitalize ${STATUS_STYLE[t.status]}`}>
                                                {t.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-3.5 text-[10px] text-gray-400">
                                            {formatKenyanDateTime(t.createdAt)}
                                            <br />by {t.initiatedBy?.fullName || '—'}
                                        </td>
                                        <td className="p-3.5 text-right whitespace-nowrap space-x-3">
                                            {t.status === 'draft' && isSource && (
                                                <button onClick={() => setPendingAction({ transfer: t, action: 'dispatch' })}
                                                    className="text-blue-600 hover:text-blue-700 text-xs font-bold inline-flex items-center gap-1">
                                                    <Truck size={12} /> Dispatch
                                                </button>
                                            )}
                                            {t.status === 'in_transit' && isDest && (
                                                <button onClick={() => setReceivingTransfer(t)}
                                                    className="text-green-600 hover:text-green-700 text-xs font-bold inline-flex items-center gap-1">
                                                    <PackageCheck size={12} /> Receive
                                                </button>
                                            )}
                                            {['draft', 'in_transit'].includes(t.status) && canManage && (isSource || isDest) && (
                                                <button onClick={() => setPendingAction({ transfer: t, action: 'cancel' })}
                                                    className="text-gray-400 hover:text-red-500 text-xs font-bold inline-flex items-center gap-1">
                                                    <XCircle size={12} /> Cancel
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <NewTransferModal
                open={showNew}
                onClose={() => setShowNew(false)}
                fromBranch={effectiveBranch}
                branches={branches}
                onCreated={fetchTransfers}
            />

            <ReceiveTransferModal
                transfer={receivingTransfer}
                onClose={() => setReceivingTransfer(null)}
                onReceived={fetchTransfers}
            />

            <ConfirmModal
                open={!!pendingAction}
                title={pendingAction?.action === 'dispatch' ? 'Dispatch this transfer?' : 'Cancel this transfer?'}
                description={
                    pendingAction?.action === 'dispatch'
                        ? 'This deducts the stock from your branch right now. The destination branch will see it as in transit until they receive it.'
                        : pendingAction?.transfer?.status === 'in_transit'
                            ? 'This restocks your branch with everything that was sent, since it never arrived at the destination.'
                            : 'This draft will be discarded. Nothing was ever deducted.'
                }
                confirmLabel={pendingAction?.action === 'dispatch' ? 'Dispatch' : 'Cancel Transfer'}
                tone={pendingAction?.action === 'cancel' ? 'danger' : 'default'}
                loading={working}
                onConfirm={runAction}
                onClose={() => setPendingAction(null)}
            />
        </div>
    );
                        }
