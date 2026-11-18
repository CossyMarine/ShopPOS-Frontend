import { useState } from 'react';
import { X, WifiOff, Banknote, Landmark, Layers, Smartphone } from 'lucide-react';
import { toast } from 'react-toastify';

const METHODS = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'till', label: 'Till', icon: Landmark },
    { id: 'both', label: 'Both', icon: Layers },
    { id: 'prompt', label: 'M-Pesa Prompt', icon: Smartphone, needsNet: true },
];

// Offline stand-in for PaymentModal. Cash, Till and Cash+Till can all be
// recorded with no connection (the cashier confirms the money was received).
// M-Pesa Prompt needs a live STK push, so it is shown but disabled.
export default function OfflineCashPaymentModal({ open, onClose, totalDue, onConfirm }) {
    const [method, setMethod] = useState('cash');
    const [till, setTill] = useState('');
    const [confirming, setConfirming] = useState(false);

    if (!open) return null;

    const tillNum = parseFloat(till) || 0;
    const cashLeft = Number((totalDue - tillNum).toFixed(2));

    const submit = async (payment) => {
        setConfirming(true);
        try {
            await onConfirm(payment);
            setTill('');
            setMethod('cash');
        } catch {
            toast.error('Could not save this sale locally — try again');
        }
        setConfirming(false);
    };

    const handleCash = () => submit({ cashAmount: totalDue, tillAmount: 0 });
    const handleTill = () => submit({ cashAmount: 0, tillAmount: totalDue });
    const handleBoth = () => {
        if (!(tillNum > 0)) return toast.error('Enter the amount paid to the till');
        if (tillNum >= totalDue) return toast.error('Till amount must be less than the total — use Till for the full amount');
        submit({ cashAmount: cashLeft, tillAmount: tillNum });
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
                            No connection right now. This sale saves on this device and syncs automatically once you're back online.
                        </p>
                    </div>

                    <div className="text-center">
                        <p className="text-xs text-gray-400 font-semibold">Amount Due</p>
                        <p className="text-3xl font-black text-gray-900">KES {totalDue.toLocaleString()}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {METHODS.map((m) => (
                            <button key={m.id} onClick={() => !m.needsNet && setMethod(m.id)} disabled={m.needsNet}
                                title={m.needsNet ? 'Needs internet' : undefined}
                                className={`p-2.5 rounded-xl border-2 flex flex-col items-center gap-1 text-xs font-bold transition ${
                                    m.needsNet ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                                        : method === m.id ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500'
                                }`}>
                                <m.icon size={18} /> {m.label}
                                {m.needsNet && <span className="text-[9px] font-semibold">needs internet</span>}
                            </button>
                        ))}
                    </div>

                    {method === 'cash' && (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-500 text-center">Confirm cash received in hand for this bill.</p>
                            <button onClick={handleCash} disabled={confirming}
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-extrabold disabled:opacity-50">
                                {confirming ? 'Saving…' : `Confirm Cash Payment · KES ${totalDue.toLocaleString()}`}
                            </button>
                        </div>
                    )}

                    {method === 'till' && (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-500 text-center">Confirm the customer has already paid to the till/paybill in person.</p>
                            <button onClick={handleTill} disabled={confirming}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-extrabold disabled:opacity-50">
                                {confirming ? 'Saving…' : `Confirm Till Payment · KES ${totalDue.toLocaleString()}`}
                            </button>
                        </div>
                    )}

                    {method === 'both' && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Paid to till</label>
                                <input type="number" value={till} onChange={(e) => setTill(e.target.value)} placeholder="0"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-center" />
                            </div>
                            <p className={`text-xs font-bold text-center ${tillNum >= totalDue ? 'text-red-500' : 'text-gray-500'}`}>
                                {tillNum >= totalDue ? 'Till amount must be less than the total' : `Cash to collect: KES ${Math.max(cashLeft, 0).toLocaleString()}`}
                            </p>
                            <button onClick={handleBoth} disabled={confirming || !(tillNum > 0) || tillNum >= totalDue}
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-sm font-extrabold disabled:opacity-50">
                                {confirming ? 'Saving…' : 'Confirm Cash + Till'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
