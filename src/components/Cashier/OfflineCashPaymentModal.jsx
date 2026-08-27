import { useState } from 'react';
import { X, WifiOff, Banknote } from 'lucide-react';
import { toast } from 'react-toastify';

// Stands in for PaymentModal specifically while offline. Every other
// payment method in PaymentModal needs a live network call (M-Pesa STK
// push, till confirmation) that simply can't happen with no connection —
// cash is the only method that's genuinely complete the moment the money
// changes hands, so this is deliberately narrower than PaymentModal: no
// method picker, just a confirm. Matches the existing online cash flow's
// UX exactly (exact balance, single tap, no amount-tendered entry).
export default function OfflineCashPaymentModal({ open, onClose, totalDue, onConfirm }) {
    const [confirming, setConfirming] = useState(false);

    if (!open) return null;

    const handleConfirm = async () => {
        setConfirming(true);
        try {
            await onConfirm();
        } catch (err) {
            toast.error('Could not save this sale locally — try again');
        }
        setConfirming(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-gray-200">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                        <WifiOff size={18} className="text-amber-500" /> Offline Sale
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                        <WifiOff size={14} className="text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-700">
                            No connection right now. This sale will save on this device and sync automatically once you're back online — cash only while offline.
                        </p>
                    </div>

                    <div className="text-center py-2">
                        <p className="text-xs text-gray-400 font-semibold">Amount Due</p>
                        <p className="text-3xl font-black text-gray-900">KES {totalDue.toLocaleString()}</p>
                    </div>

                    <p className="text-xs text-gray-500 text-center">Confirm cash received in hand for this bill.</p>

                    <button onClick={handleConfirm} disabled={confirming}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-extrabold disabled:opacity-50 flex items-center justify-center gap-2">
                        <Banknote size={16} />
                        {confirming ? 'Saving…' : `Confirm Cash Payment · KES ${totalDue.toLocaleString()}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
