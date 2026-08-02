import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { X, Banknote, Smartphone, Landmark, Layers, Gift, CheckCircle2, Printer } from 'lucide-react';
import API from '../../api/axios';

const METHODS = [
    { id: 'cash', label: 'Cash', icon: Banknote, color: 'gray' },
    { id: 'till', label: 'Till (Manual)', icon: Landmark, color: 'blue' },
    { id: 'both', label: 'Cash + Till', icon: Layers, color: 'purple' },
    { id: 'prompt', label: 'M-Pesa Prompt', icon: Smartphone, color: 'green' },
];

export default function PaymentModal({ receipt, onClose, onComplete }) {
    const [method, setMethod] = useState('cash');
    const [comboCash, setComboCash] = useState('');
    const [phone, setPhone] = useState('');
    const [processing, setProcessing] = useState(false);
    const [stkStatus, setStkStatus] = useState(null); // 'pending' | 'success' | 'failed'
    const pollRef = useRef(null);

    // "Always ask if that customer should be rewarded" — shown after successful payment
    const [askReward, setAskReward] = useState(false);
    const [rewardIdentifier, setRewardIdentifier] = useState('');
    const [awardingReward, setAwardingReward] = useState(false);

    const balanceDue = receipt.subtotal - (receipt.amountPaid || 0);
    const comboCashNum = parseFloat(comboCash) || 0;
    const comboTillPortion = Math.max(balanceDue - comboCashNum, 0);

    useEffect(() => () => clearInterval(pollRef.current), []);

    const finishAndAskReward = () => {
        setProcessing(false);
        setAskReward(true);
    };

    // Till-style confirm — no amount entry, exact balance, no change.
    const handleCash = async () => {
        setProcessing(true);
        try {
            await API.patch(`/receipts/${receipt._id}/pay`, { amountPaid: balanceDue });
            finishAndAskReward();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
            setProcessing(false);
        }
    };

    const handleTill = async () => {
        setProcessing(true);
        try {
            await API.patch(`/receipts/${receipt._id}/pay/combo`, { tillAmount: balanceDue });
            finishAndAskReward();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
            setProcessing(false);
        }
    };

    // Split payment: cash in hand + till auto-covers the rest
    const handleBoth = async () => {
        if (isNaN(comboCashNum) || comboCashNum <= 0) return toast.error('Enter the cash amount received');
        if (comboCashNum >= balanceDue) return toast.error('Cash covers the full balance — use Cash payment instead');
        setProcessing(true);
        try {
            await API.patch(`/receipts/${receipt._id}/pay/cash-till`, { cashAmount: comboCashNum });
            finishAndAskReward();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
            setProcessing(false);
        }
    };

    const handlePrompt = async () => {
        if (!phone.trim()) return toast.error('Enter the customer\'s M-Pesa number');
        setProcessing(true);
        setStkStatus('pending');
        try {
            await API.post(`/receipts/${receipt._id}/mpesa/initiate`, { phone: phone.trim(), cashAmount: 0 });
            pollRef.current = setInterval(async () => {
                try {
                    const res = await API.get(`/receipts/${receipt._id}/mpesa/status`);
                    if (res.data.status === 'success') {
                        clearInterval(pollRef.current);
                        setStkStatus('success');
                        finishAndAskReward();
                    } else if (res.data.status === 'failed') {
                        clearInterval(pollRef.current);
                        setStkStatus('failed');
                        setProcessing(false);
                        toast.error(res.data.message || 'M-Pesa payment failed');
                    }
                } catch { /* keep polling */ }
            }, 3000);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send STK push');
            setProcessing(false);
            setStkStatus(null);
        }
    };

    const handleAwardReward = async () => {
        if (!rewardIdentifier.trim()) return toast.error("Enter the customer's email or phone");
        setAwardingReward(true);
        try {
            await API.post('/wallet/admin/add-reward', { identifier: rewardIdentifier.trim(), amountSpent: receipt.subtotal });
            toast.success('Reward points added');
            onComplete();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add reward — closing anyway');
            onComplete();
        }
        setAwardingReward(false);
    };

    // ---- Post-payment: ask if the customer should be rewarded ----
    if (askReward) {
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-xs w-full p-6 shadow-2xl border border-gray-200 text-center">
                    <CheckCircle2 size={36} className="text-green-500 mx-auto mb-2" />
                    <h3 className="text-base font-black text-gray-800 mb-1">Payment Complete</h3>
                    <p className="text-xs text-gray-500 mb-4">Should this customer earn reward points?</p>

                    <input value={rewardIdentifier} onChange={(e) => setRewardIdentifier(e.target.value)}
                        placeholder="Customer email or phone (optional)"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm mb-3" />

                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <button onClick={handleAwardReward} disabled={awardingReward}
                            className="flex items-center justify-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-xs font-bold disabled:opacity-50">
                            <Gift size={14} /> {awardingReward ? 'Adding…' : 'Award Points'}
                        </button>
                        <button onClick={onComplete} className="bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold">
                            Skip
                        </button>
                    </div>
                    <button onClick={() => toast.info('Printing receipt…')} className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mt-2">
                        <Printer size={13} /> Print Receipt
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                    <div>
                        <h3 className="text-base font-black text-gray-800">{receipt.billId}</h3>
                        <p className="text-xs text-gray-500">Balance due: <span className="font-bold text-orange-500">KES {balanceDue.toLocaleString()}</span></p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                    {METHODS.map((m) => (
                        <button key={m.id} onClick={() => setMethod(m.id)}
                            className={`p-2.5 rounded-xl border-2 flex flex-col items-center gap-1 text-xs font-bold transition ${
                                method === m.id ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500'
                            }`}>
                            <m.icon size={18} /> {m.label}
                        </button>
                    ))}
                </div>

                {method === 'cash' && (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-500 text-center">Confirm cash received in hand for this bill.</p>
                        <button onClick={handleCash} disabled={processing}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-extrabold disabled:opacity-50">
                            {processing ? 'Processing…' : `Confirm Cash Payment · KES ${balanceDue.toLocaleString()}`}
                        </button>
                    </div>
                )}

                {method === 'till' && (
                    <div className="space-y-3">
                        <p className="text-xs text-gray-500">Confirm the customer has already paid to the till/paybill in person.</p>
                        <button onClick={handleTill} disabled={processing}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-extrabold disabled:opacity-50">
                            {processing ? 'Processing…' : `Confirm Till Payment · KES ${balanceDue.toLocaleString()}`}
                        </button>
                    </div>
                )}

                {method === 'both' && (
                    <div className="space-y-3">
                        <input type="number" autoFocus value={comboCash} onChange={(e) => setComboCash(e.target.value)}
                            placeholder="Cash amount received (KES)"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-center" />
                        <p className="text-xs text-gray-500 text-center">
                            Till covers the rest: <span className="font-bold text-gray-700">KES {comboTillPortion.toLocaleString()}</span>
                        </p>
                        <button onClick={handleBoth} disabled={processing}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl text-sm font-extrabold disabled:opacity-50">
                            {processing ? 'Processing…' : 'Confirm Split Payment'}
                        </button>
                    </div>
                )}

                {method === 'prompt' && (
                    <div className="space-y-3">
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="254712345678"
                            disabled={stkStatus === 'pending'}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-center disabled:opacity-60" />
                        <button onClick={handlePrompt} disabled={processing}
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-extrabold disabled:opacity-50">
                            {stkStatus === 'pending' ? 'Waiting for customer PIN…' : `Send Prompt · KES ${balanceDue.toLocaleString()}`}
                        </button>
                        {stkStatus === 'pending' && <p className="text-center text-[11px] text-gray-400">Ask the customer to check their phone</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
