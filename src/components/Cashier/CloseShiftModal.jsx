import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Lock, X, AlertTriangle } from 'lucide-react';
import API from '../../api/axios';

export default function CloseShiftModal({ open, shiftId, onClose, onClosed }) {
    const [summary, setSummary] = useState(null);
    const [closingCashCount, setClosingCashCount] = useState('');
    const [notes, setNotes] = useState('');
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (open && shiftId) {
            API.get(`/shifts/${shiftId}/summary`).then((res) => setSummary(res.data)).catch(() => {});
        }
    }, [open, shiftId]);

    if (!open) return null;

    const handleClose = async () => {
        if (closingCashCount === '' || isNaN(closingCashCount)) return toast.error('Enter the counted cash amount');
        setClosing(true);
        try {
            await API.post(`/shifts/${shiftId}/close`, { closingCashCount: Number(closingCashCount), notes });
            toast.success('Shift closed');
            onClosed();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to close shift');
        }
        setClosing(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                        <Lock size={18} className="text-orange-500" /> Close Shift (Z-Report)
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                {summary ? (
                    <div className="bg-gray-50 rounded-xl p-3.5 mb-4 space-y-1.5 text-xs">
                        <Row label="Cash Sales" value={summary.cashSales} />
                        <Row label="Till Sales" value={summary.tillSales} />
                        <Row label="Prompt (STK)" value={summary.promptSales} />
                        <Row label="Reward Payments" value={summary.rewardSales} />
                        <Row label="Petty Cash Out" value={-summary.pettyCashOut} />
                        <div className="pt-1.5 border-t border-gray-200 flex justify-between font-black text-gray-900">
                            <span>Expected Cash in Drawer</span>
                            <span>KES {summary.expectedCash.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                            <span>Today's Sales / Voids</span>
                            <span>{summary.ordersCount} / {summary.voidCount}</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-xs text-gray-400 mb-4">Loading summary…</p>
                )}

                <label className="text-xs font-semibold text-gray-400 mb-1 block">Counted Cash (KES)</label>
                <input type="number" autoFocus value={closingCashCount} onChange={(e) => setClosingCashCount(e.target.value)}
                    placeholder="Physically count the drawer" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-center focus:outline-none focus:border-orange-500 mb-3" />

                {summary && closingCashCount !== '' && !isNaN(closingCashCount) && Number(closingCashCount) !== summary.expectedCash && (
                    <p className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg mb-3">
                        <AlertTriangle size={13} />
                        Variance: KES {(Number(closingCashCount) - summary.expectedCash).toLocaleString()}
                    </p>
                )}

                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs mb-4" rows={2} />

                <button onClick={handleClose} disabled={closing}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                    {closing ? 'Closing…' : 'Close Shift & Print Z-Report'}
                </button>
            </div>
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex justify-between text-gray-600">
            <span>{label}</span>
            <span className="font-bold text-gray-800">KES {Number(value).toLocaleString()}</span>
        </div>
    );
}
