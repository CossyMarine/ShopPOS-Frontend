import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { X, Banknote, Smartphone, Landmark, Layers, Gift, CheckCircle2, Printer } from 'lucide-react';
import API from '../../api/axios';

const METHODS = [
    { id: 'cash', label: 'Cash', icon: Banknote, color: 'gray' },
    { id: 'till', label: 'Till', icon: Landmark, color: 'blue' },
    { id: 'both', label: 'Both', icon: Layers, color: 'purple' },
    { id: 'prompt', label: 'M-Pesa Prompt', icon: Smartphone, color: 'green' },
];

export default function PaymentModal({ receipt, onClose, onComplete }) {
    const [method, setMethod] = useState('cash');
    const [phone, setPhone] = useState('');
    const [processing, setProcessing] = useState(false);
    const [stkStatus, setStkStatus] = useState(null); // 'pending' | 'success' | 'failed'
    const [closing, setClosing] = useState(false);
    const pollRef = useRef(null);

    // ---- "Both" combo: cash / till / reward entered together, any mix,
    // partial or full — mirrors RestoPOS's combo payment panel. If a
    // balance remains after Apply (e.g. rest is going on M-Pesa), a
    // second step opens to finish it via prompt. ----
    const [comboCash, setComboCash] = useState('');
    const [comboTill, setComboTill] = useState('');
    const [comboReward, setComboReward] = useState('');
    const [comboRewardIdentifier, setComboRewardIdentifier] = useState('');
    const [comboApplying, setComboApplying] = useState(false);
    const [comboRemaining, setComboRemaining] = useState(null); // null = not applied yet
    const [comboPromptPhone, setComboPromptPhone] = useState('');
    const [comboSendingPrompt, setComboSendingPrompt] = useState(false);

    // "Always ask if that customer should be rewarded" — shown after successful payment
    const [askReward, setAskReward] = useState(false);
    const [rewardIdentifier, setRewardIdentifier] = useState('');
    const [awardingReward, setAwardingReward] = useState(false);

    const balanceDue = receipt.subtotal - (receipt.amountPaid || 0);

    const comboCashNum = parseFloat(comboCash) || 0;
    const comboTillNum = parseFloat(comboTill) || 0;
    const comboRewardNum = parseFloat(comboReward) || 0;
    const comboEntered = comboCashNum + comboTillNum + comboRewardNum;
    const comboAfterApply = Number((balanceDue - comboEntered).toFixed(2));

    useEffect(() => () => clearInterval(pollRef.current), []);

    const finishAndAskReward = () => {
        setProcessing(false);
        setComboApplying(false);
        setComboSendingPrompt(false);
        setAskReward(true);
    };

    // Shared STK-push + poll, used by both the standalone Prompt method and
    // the "finish remainder on prompt" step at the tail of Both.
    const sendMpesaPrompt = async (phoneNumber, amount, onSending) => {
        if (!phoneNumber.trim()) return toast.error("Enter the customer's M-Pesa number");
        onSending(true);
        setStkStatus('pending');
        try {
            await API.post(`/receipts/${receipt._id}/mpesa/initiate`, { phone: phoneNumber.trim(), cashAmount: 0 });
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
                        onSending(false);
                        toast.error(res.data.message || 'M-Pesa payment failed');
                    }
                } catch { /* keep polling */ }
            }, 3000);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to send STK push');
            onSending(false);
            setStkStatus(null);
        }
    };

    // Confirm-style — no amount entry, exact balance, no change.
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

    const handlePrompt = () => sendMpesaPrompt(phone, balanceDue, setProcessing);

    // ---- Both: apply any mix of cash / till / reward in one call ----
    const handleComboApply = async () => {
        if (comboEntered <= 0) return toast.error('Enter at least one amount');
        if (comboAfterApply < -0.01) return toast.error('Combined amount cannot exceed the balance due');
        if (comboRewardNum > 0 && !comboRewardIdentifier.trim()) {
            return toast.error("Enter the customer's email or phone to redeem reward points");
        }
        setComboApplying(true);
        try {
            const res = await API.patch(`/receipts/${receipt._id}/pay/combo`, {
                cashAmount: comboCashNum,
                tillAmount: comboTillNum,
                rewardAmount: comboRewardNum,
                rewardIdentifier: comboRewardIdentifier.trim() || undefined,
            });
            const remaining = res.data.balanceRemaining ?? 0;
            if (remaining <= 0) {
                finishAndAskReward();
            } else {
                setComboRemaining(remaining);
                setComboApplying(false);
                toast.info(`KES ${remaining.toLocaleString()} still due — finish it on M-Pesa prompt below`);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
            setComboApplying(false);
        }
    };

    const handleComboPrompt = () => sendMpesaPrompt(comboPromptPhone, comboRemaining, setComboSendingPrompt);

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

    // ---- Closing before payment: this is what actually abandons the sale.
    // If any amount was already applied (partial cash/till/reward), the bill
    // is no longer "fully unpaid" — the backend will reject a plain cancel
    // and this must go through the manager-approved void flow instead, so we
    // warn accordingly rather than silently failing. If an M-Pesa prompt is
    // mid-flight, cancel it first so it doesn't resolve into a stray payment
    // after the bill's been voided. ----
    const handleCloseClick = async () => {
        if (receipt.amountPaid > 0) {
            toast.error('This bill already has a partial payment — use a void request to cancel it, not close.');
            return;
        }
        if (!window.confirm('Cancel this sale? Items will be released back to stock.')) return;

        setClosing(true);
        clearInterval(pollRef.current);
        try {
            if (stkStatus === 'pending') {
                await API.post(`/receipts/${receipt._id}/mpesa/cancel`);
            }
        } catch {
            // best-effort — the receipt-level cancel below still runs regardless
        }
        setClosing(false);
        onClose();
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
                    <button onClick={handleCloseClick} disabled={closing} className="text-gray-400 hover:text-gray-600 disabled:opacity-50"><X size={18} /></button>
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
                    comboRemaining === null ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Cash</label>
                                    <input type="number" value={comboCash} onChange={(e) => setComboCash(e.target.value)} placeholder="0"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-center" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1 block">Till</label>
                                    <input type="number" value={comboTill} onChange={(e) => setComboTill(e.target.value)} placeholder="0"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-center" />
                                </div>
                            </div>

                            <div className="border border-purple-100 bg-purple-50/50 rounded-xl p-2.5 space-y-2">
                                <label className="text-[10px] font-bold text-purple-700 uppercase tracking-wide block">Reward Points (KES value)</label>
                                <input type="number" value={comboReward} onChange={(e) => setComboReward(e.target.value)} placeholder="0"
                                    className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-sm font-bold text-center" />
                                <input value={comboRewardIdentifier} onChange={(e) => setComboRewardIdentifier(e.target.value)} placeholder="Customer email or phone"
                                    className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-xs" />
                            </div>

                            <p className={`text-xs font-bold text-center ${comboAfterApply < 0 ? 'text-red-500' : comboAfterApply === 0 ? 'text-emerald-600' : 'text-gray-500'}`}>
                                {comboAfterApply < 0
                                    ? `Over by KES ${Math.abs(comboAfterApply).toLocaleString()}`
                                    : `Remaining after this: KES ${comboAfterApply.toLocaleString()}`}
                            </p>

                            <button onClick={handleComboApply} disabled={comboApplying || comboEntered <= 0 || comboAfterApply < -0.01}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl text-sm font-extrabold disabled:opacity-50">
                                {comboApplying ? 'Applying…' : 'Apply'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs text-gray-500 text-center">
                                KES {comboRemaining.toLocaleString()} still due — finish it on M-Pesa prompt
                            </p>
                            <input value={comboPromptPhone} onChange={(e) => setComboPromptPhone(e.target.value)} placeholder="254712345678"
                                disabled={stkStatus === 'pending'}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono font-bold text-center disabled:opacity-60" />
                            <button onClick={handleComboPrompt} disabled={comboSendingPrompt}
                                className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl text-sm font-extrabold disabled:opacity-50">
                                {stkStatus === 'pending' ? 'Waiting for customer PIN…' : `Send KES ${comboRemaining.toLocaleString()}`}
                            </button>
                        </div>
                    )
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
