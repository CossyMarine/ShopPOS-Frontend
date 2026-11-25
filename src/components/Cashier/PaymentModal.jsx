import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { X, Banknote, Smartphone, Landmark, Layers, Gift, CheckCircle2, Printer, BookOpen } from 'lucide-react';
import API from '../../api/axios';
import useConfirm from '../Storekeeper/useConfirm';
import PrintReceipt from '../PrintReceipt';

const METHODS = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'till', label: 'Till', icon: Landmark },
    { id: 'both', label: 'Both', icon: Layers },
    { id: 'reward', label: 'Reward', icon: Gift },
    { id: 'prompt', label: 'M-Pesa', icon: Smartphone },
];

const NOTES = [100, 200, 500, 1000, 2000, 5000];

const CREDIT_METHOD = { id: 'credit', label: 'Credit', icon: BookOpen };

// Shared sizing so every screen feels consistent and easy to tap
const LABEL = 'text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5 block';
const INPUT = 'w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3.5 text-lg font-bold text-gray-900 text-center focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 disabled:opacity-60';
const INPUT_SM = 'w-full bg-white border-2 border-purple-200 rounded-xl px-4 py-3 text-base font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10';
const BTN = 'w-full py-4 rounded-xl text-base font-extrabold text-white shadow-sm transition disabled:opacity-50';
const CHIP = 'px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-800 transition';

export default function PaymentModal({ receipt, onClose, onComplete }) {
    const [method, setMethod] = useState('cash');
    const [phone, setPhone] = useState('');
    const [processing, setProcessing] = useState(false);
    const [stkStatus, setStkStatus] = useState(null); // 'pending' | 'success' | 'failed'
    const [closing, setClosing] = useState(false);

    // ---- Credit ----
    const [creditAllowed, setCreditAllowed] = useState(false);
    const [creditName, setCreditName] = useState('');
    const [creditPhone, setCreditPhone] = useState('');
    const [creditDue, setCreditDue] = useState('');
    const [creditSaving, setCreditSaving] = useState(false);
    const [paidOnCredit, setPaidOnCredit] = useState(false);

    useEffect(() => {
        API.get('/branches/mine')
            .then((r) => setCreditAllowed(!!r.data?.allowCredit))
            .catch(() => {});
    }, []);

    const methods = creditAllowed ? [...METHODS, CREDIT_METHOD] : METHODS;

    const [ask, confirmDialog] = useConfirm();
    const pollRef = useRef(null);

    // ---- Cash: amount received + live change ----
    const [cashReceived, setCashReceived] = useState('');

    // ---- Reward (stand-alone method) ----
    const [rewardAmt, setRewardAmt] = useState('');
    const [rewardId, setRewardId] = useState('');
    const [rewardApplying, setRewardApplying] = useState(false);

    // ---- "Both" combo: cash / till / reward together ----
    const [comboCash, setComboCash] = useState('');
    const [comboTill, setComboTill] = useState('');
    const [comboReward, setComboReward] = useState('');
    const [comboRewardIdentifier, setComboRewardIdentifier] = useState('');
    const [comboApplying, setComboApplying] = useState(false);
    const [comboRemaining, setComboRemaining] = useState(null); // shared by Both + Reward
    const [comboPromptPhone, setComboPromptPhone] = useState('');
    const [comboSendingPrompt, setComboSendingPrompt] = useState(false);

    // ---- Post-payment confirm screen ----
    const [paymentDone, setPaymentDone] = useState(false);
    const [changeDue, setChangeDue] = useState(0);
    const [rewardIdentifier, setRewardIdentifier] = useState('');
    const [confirming, setConfirming] = useState(false);
    const [printTarget, setPrintTarget] = useState(null);

    const balanceDue = Number((receipt.totalDue - (receipt.amountPaid || 0)).toFixed(2));

    const cashNum = parseFloat(cashReceived) || 0;
    const cashChange = Number((cashNum - balanceDue).toFixed(2));
    const cashValid = cashNum > 0 && cashChange >= 0; // never allow a short / negative sale

    const rewardNum = rewardAmt === '' ? balanceDue : parseFloat(rewardAmt) || 0;
    const rewardAfter = Number((balanceDue - rewardNum).toFixed(2));
    const rewardValid = rewardNum > 0 && rewardAfter >= -0.01;

    const comboCashNum = parseFloat(comboCash) || 0;
    const comboTillNum = parseFloat(comboTill) || 0;
    const comboRewardNum = parseFloat(comboReward) || 0;
    const comboEntered = comboCashNum + comboTillNum + comboRewardNum;
    const comboAfterApply = Number((balanceDue - comboEntered).toFixed(2));

    useEffect(() => () => clearInterval(pollRef.current), []);

    const finishPayment = (change = 0) => {
        setProcessing(false);
        setComboApplying(false);
        setComboSendingPrompt(false);
        setRewardApplying(false);
        setChangeDue(change > 0 ? change : 0);
        setPaymentDone(true);
    };

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
                        finishPayment();
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

    // ---- CASH: amount received, change calculated, never negative ----
    const handleCash = async () => {
        if (cashNum <= 0) return toast.error('Enter the cash received');
        if (cashChange < 0) return toast.error(`Cash received is short by KES ${Math.abs(cashChange).toLocaleString()}`);
        setProcessing(true);
        try {
            const res = await API.patch(`/receipts/${receipt._id}/pay`, { amountPaid: cashNum });
            finishPayment(res.data.receipt?.changeGiven ?? cashChange);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
            setProcessing(false);
        }
    };

    const handleTill = async () => {
        setProcessing(true);
        try {
            await API.patch(`/receipts/${receipt._id}/pay/combo`, { tillAmount: balanceDue });
            finishPayment();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
            setProcessing(false);
        }
    };

    const handlePrompt = () => sendMpesaPrompt(phone, balanceDue, setProcessing);

    // ---- REWARD (stand-alone): redeem points, partial or full ----
    const handleRewardPay = async () => {
        if (!rewardValid) return toast.error(`Enter an amount between 1 and ${balanceDue.toLocaleString()}`);
        if (!rewardId.trim()) return toast.error("Enter the customer's registered email or phone");
        setRewardApplying(true);
        try {
            const res = await API.patch(`/receipts/${receipt._id}/pay/combo`, {
                cashAmount: 0,
                tillAmount: 0,
                rewardAmount: Math.min(rewardNum, balanceDue),
                rewardIdentifier: rewardId.trim(),
            });
            const remaining = res.data.balanceRemaining ?? 0;
            if (remaining <= 0) {
                finishPayment();
            } else {
                setComboRemaining(remaining);
                setRewardApplying(false);
                toast.info(`KES ${remaining.toLocaleString()} still due — finish it on M-Pesa prompt below`);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Reward payment failed');
            setRewardApplying(false);
        }
    };

    // ---- BOTH: any mix of cash / till / reward ----
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
                finishPayment();
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

    // ---- CREDIT: customer name required, pay date optional ----
    const handleCredit = async () => {
        if (!creditName.trim()) return toast.error("Enter the customer's name");
        setCreditSaving(true);
        try {
            await API.patch(`/receipts/${receipt._id}/pay/credit`, {
                customerName: creditName.trim(),
                customerPhone: creditPhone.trim() || undefined,
                dueDate: creditDue || undefined,
            });
            setPaidOnCredit(true);
            finishPayment();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not record credit');
        }
        setCreditSaving(false);
    };

    // ---- CONFIRM: award points (if a customer was entered) then print directly ----
    const handleConfirm = async () => {
        setConfirming(true);

        if (rewardIdentifier.trim()) {
            try {
                const res = await API.post('/wallet/admin/add-reward', {
                    identifier: rewardIdentifier.trim(),
                    amountSpent: receipt.totalDue,
                });
                toast.success(res.data?.message || 'Reward points added');
            } catch (err) {
                toast.error(err.response?.data?.message || 'Could not add reward points');
            }
        }

        try {
            // Fetch the paid receipt so the printout has the final amounts / change
            const res = await API.get(`/receipts/${receipt._id}`);
            setPrintTarget(res.data);
            await new Promise((r) => setTimeout(r, 200)); // let <PrintReceipt> mount

            await new Promise((resolve) => {
                const done = () => { window.removeEventListener('afterprint', done); resolve(); };
                window.addEventListener('afterprint', done);
                window.print();
                setTimeout(done, 4000); // fallback for browsers that never fire afterprint
            });
            API.patch(`/receipts/${receipt._id}/print`).catch(() => {});
        } catch {
            toast.error('Could not print the receipt — sale is still complete');
        }

        setPrintTarget(null);
        setConfirming(false);
        onComplete();
    };

    // ---- Closing before payment ----
    const handleCloseClick = async () => {
        if (receipt.amountPaid > 0) {
            toast.error('This bill already has a partial payment — use a void request to cancel it, not close.');
            return;
        }
        const ok = await ask({
            title: 'Cancel this sale?',
            description: 'Items will be released back to stock.',
            confirmLabel: 'Cancel sale',
            cancelLabel: 'Keep sale',
            tone: 'danger',
        });
        if (!ok) return;

        setClosing(true);
        clearInterval(pollRef.current);
        try {
            if (stkStatus === 'pending') {
                await API.post(`/receipts/${receipt._id}/mpesa/cancel`);
            }
        } catch {
            // best-effort
        }
        setClosing(false);
        onClose();
    };

    // ================= Post-payment: Confirm only =================
    if (paymentDone) {
        return (
            <>
                <PrintReceipt receipt={printTarget} />
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-200 text-center">
                        <CheckCircle2 size={56} className="text-green-500 mx-auto mb-3" />
                        <h3 className="text-2xl font-black text-gray-900 mb-1">{paidOnCredit ? 'Credit Recorded' : 'Payment Complete'}</h3>
                        <p className="text-sm text-gray-600">{receipt.billId}</p>
                        {paidOnCredit && (
                            <p className="text-sm font-bold text-amber-600 mt-2">
                                KES {balanceDue.toLocaleString()} owed by {creditName}
                            </p>
                        )}

                        {changeDue > 0 && (
                            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl py-4 my-5">
                                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Change to give</p>
                                <p className="text-4xl font-black text-emerald-600 mt-1">KES {changeDue.toLocaleString()}</p>
                            </div>
                        )}

                        {!paidOnCredit && (
                            <input
                                value={rewardIdentifier}
                                onChange={(e) => setRewardIdentifier(e.target.value)}
                                placeholder="Customer email or phone for reward points (optional)"
                                disabled={confirming}
                                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 my-4 focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10"
                            />
                        )}

                        <button
                            onClick={handleConfirm}
                            disabled={confirming}
                            className={`${BTN} flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700`}
                        >
                            <Printer size={18} /> {confirming ? 'Printing…' : 'Confirm'}
                        </button>
                    </div>
                </div>
            </>
        );
    }

    // ================= Payment screen =================
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6">
            <div className="bg-white rounded-3xl w-full max-w-2xl p-5 sm:p-8 shadow-2xl border border-gray-200 max-h-[95vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-start gap-4 mb-5">
                    <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-600">{receipt.billId}</p>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mt-2">Amount due</p>
                        <p className="text-4xl sm:text-5xl font-black text-orange-500 leading-tight">
                            <span className="text-lg sm:text-xl font-bold text-gray-500 mr-2">KES</span>
                            {balanceDue.toLocaleString()}
                        </p>
                        {receipt.vatEnabled && (
                            <p className="text-sm text-gray-600 mt-1">
                                Subtotal {receipt.subtotal.toLocaleString()} + VAT {receipt.vatAmount.toLocaleString()}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleCloseClick}
                        disabled={closing}
                        aria-label="Close"
                        className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
                    >
                        <X size={22} />
                    </button>
                </div>

                <div className="border-t border-gray-100 mb-5" />

                {/* Method tabs are hidden once a partial amount is applied and only the M-Pesa remainder is left */}
                {comboRemaining === null && (
                    <div className={`grid grid-cols-3 ${creditAllowed ? 'sm:grid-cols-6' : 'sm:grid-cols-5'} gap-2.5 mb-6`}>
                        {methods.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setMethod(m.id)}
                                className={`py-4 rounded-2xl border-2 flex flex-col items-center gap-1.5 text-sm font-bold transition ${
                                    method === m.id
                                        ? 'border-orange-500 bg-orange-50 text-orange-600 shadow-sm'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                <m.icon size={26} /> {m.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Remainder step — shared by Both and Reward */}
                {comboRemaining !== null && (
                    <div className="space-y-4">
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 text-center">
                            <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Still due</p>
                            <p className="text-3xl font-black text-amber-600">KES {comboRemaining.toLocaleString()}</p>
                            <p className="text-sm text-gray-700 mt-1">Finish it with an M-Pesa prompt</p>
                        </div>
                        <input
                            value={comboPromptPhone}
                            onChange={(e) => setComboPromptPhone(e.target.value)}
                            placeholder="254712345678"
                            disabled={stkStatus === 'pending'}
                            className={`${INPUT} font-mono`}
                        />
                        <button
                            onClick={handleComboPrompt}
                            disabled={comboSendingPrompt}
                            className={`${BTN} bg-slate-800 hover:bg-slate-900`}
                        >
                            {stkStatus === 'pending' ? 'Waiting for customer PIN…' : `Send KES ${comboRemaining.toLocaleString()}`}
                        </button>
                    </div>
                )}

                {/* CASH */}
                {comboRemaining === null && method === 'cash' && (
                    <div className="space-y-4">
                        <div>
                            <label className={LABEL}>Cash received</label>
                            <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                autoFocus
                                value={cashReceived}
                                onChange={(e) => setCashReceived(e.target.value.startsWith('-') ? '' : e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && cashValid && !processing) handleCash(); }}
                                placeholder={String(balanceDue)}
                                className={`${INPUT} !text-3xl !py-5`}
                            />
                        </div>

                        <div className="flex flex-wrap gap-2.5 justify-center">
                            <button type="button" onClick={() => setCashReceived(String(balanceDue))} className={CHIP}>
                                Exact
                            </button>
                            {NOTES.filter((n) => n >= balanceDue).slice(0, 3).map((n) => (
                                <button key={n} type="button" onClick={() => setCashReceived(String(n))} className={CHIP}>
                                    {n.toLocaleString()}
                                </button>
                            ))}
                        </div>

                        <div
                            className={`rounded-2xl border-2 py-4 text-center ${
                                cashNum <= 0
                                    ? 'bg-gray-50 border-gray-200'
                                    : cashChange < 0
                                    ? 'bg-red-50 border-red-200'
                                    : 'bg-emerald-50 border-emerald-200'
                            }`}
                        >
                            <p
                                className={`text-lg font-black ${
                                    cashNum <= 0 ? 'text-gray-600' : cashChange < 0 ? 'text-red-600' : 'text-emerald-600'
                                }`}
                            >
                                {cashNum <= 0
                                    ? 'Enter the amount the customer gave'
                                    : cashChange < 0
                                    ? `Short by KES ${Math.abs(cashChange).toLocaleString()}`
                                    : `Change: KES ${cashChange.toLocaleString()}`}
                            </p>
                        </div>

                        <button
                            onClick={handleCash}
                            disabled={processing || !cashValid}
                            className={`${BTN} bg-green-600 hover:bg-green-700`}
                        >
                            {processing ? 'Processing…' : `Confirm Cash Payment · KES ${balanceDue.toLocaleString()}`}
                        </button>
                    </div>
                )}

                {/* TILL */}
                {comboRemaining === null && method === 'till' && (
                    <div className="space-y-4">
                        <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 text-center">
                            <Landmark size={30} className="text-blue-600 mx-auto mb-2" />
                            <p className="text-base text-gray-800 font-medium">
                                Confirm the customer has already paid to the till / paybill in person.
                            </p>
                        </div>
                        <button
                            onClick={handleTill}
                            disabled={processing}
                            className={`${BTN} bg-blue-600 hover:bg-blue-700`}
                        >
                            {processing ? 'Processing…' : `Confirm Till Payment · KES ${balanceDue.toLocaleString()}`}
                        </button>
                    </div>
                )}

                {/* REWARD */}
                {comboRemaining === null && method === 'reward' && (
                    <div className="space-y-4">
                        <div className="border-2 border-purple-100 bg-purple-50/60 rounded-2xl p-4 space-y-3">
                            <div>
                                <label className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-1.5 block">
                                    Reward amount (KES value) — partial or full
                                </label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    min="0"
                                    value={rewardAmt}
                                    onChange={(e) => setRewardAmt(e.target.value.startsWith('-') ? '' : e.target.value)}
                                    placeholder={String(balanceDue)}
                                    className={`${INPUT_SM} !text-xl !font-black text-center`}
                                />
                            </div>
                            <input
                                value={rewardId}
                                onChange={(e) => setRewardId(e.target.value)}
                                placeholder="Customer registered email or phone"
                                className={INPUT_SM}
                            />
                        </div>

                        <p
                            className={`text-base font-bold text-center ${
                                rewardAfter < -0.01 ? 'text-red-600' : rewardAfter === 0 ? 'text-emerald-600' : 'text-gray-700'
                            }`}
                        >
                            {rewardAfter < -0.01
                                ? `Over by KES ${Math.abs(rewardAfter).toLocaleString()}`
                                : `Remaining after this: KES ${Math.max(rewardAfter, 0).toLocaleString()}`}
                        </p>

                        <button
                            onClick={handleRewardPay}
                            disabled={rewardApplying || !rewardValid}
                            className={`${BTN} bg-purple-600 hover:bg-purple-700`}
                        >
                            {rewardApplying ? 'Applying…' : `Pay with Reward · KES ${Math.min(rewardNum, balanceDue).toLocaleString()}`}
                        </button>
                    </div>
                )}

                {/* BOTH */}
                {comboRemaining === null && method === 'both' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={LABEL}>Cash</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={comboCash}
                                    onChange={(e) => setComboCash(e.target.value)}
                                    placeholder="0"
                                    className={INPUT}
                                />
                            </div>
                            <div>
                                <label className={LABEL}>Till</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={comboTill}
                                    onChange={(e) => setComboTill(e.target.value)}
                                    placeholder="0"
                                    className={INPUT}
                                />
                            </div>
                        </div>

                        <div className="border-2 border-purple-100 bg-purple-50/60 rounded-2xl p-4 space-y-3">
                            <label className="text-xs font-bold text-purple-800 uppercase tracking-wide block">
                                Reward Points (KES value)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={comboReward}
                                onChange={(e) => setComboReward(e.target.value)}
                                placeholder="0"
                                className={`${INPUT_SM} !text-lg !font-black text-center`}
                            />
                            <input
                                value={comboRewardIdentifier}
                                onChange={(e) => setComboRewardIdentifier(e.target.value)}
                                placeholder="Customer email or phone"
                                className={INPUT_SM}
                            />
                        </div>

                        <p
                            className={`text-base font-bold text-center ${
                                comboAfterApply < 0 ? 'text-red-600' : comboAfterApply === 0 ? 'text-emerald-600' : 'text-gray-700'
                            }`}
                        >
                            {comboAfterApply < 0
                                ? `Over by KES ${Math.abs(comboAfterApply).toLocaleString()}`
                                : `Remaining after this: KES ${comboAfterApply.toLocaleString()}`}
                        </p>

                        <button
                            onClick={handleComboApply}
                            disabled={comboApplying || comboEntered <= 0 || comboAfterApply < -0.01}
                            className={`${BTN} bg-orange-500 hover:bg-orange-600`}
                        >
                            {comboApplying ? 'Applying…' : 'Apply'}
                        </button>
                    </div>
                )}

                {/* M-PESA PROMPT */}
                {comboRemaining === null && method === 'prompt' && (
                    <div className="space-y-4">
                        <div>
                            <label className={LABEL}>Customer M-Pesa number</label>
                            <input
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="254712345678"
                                disabled={stkStatus === 'pending'}
                                className={`${INPUT} font-mono !text-2xl !py-5`}
                            />
                        </div>
                        <button
                            onClick={handlePrompt}
                            disabled={processing}
                            className={`${BTN} bg-green-600 hover:bg-green-700`}
                        >
                            {stkStatus === 'pending' ? 'Waiting for customer PIN…' : `Send Prompt · KES ${balanceDue.toLocaleString()}`}
                        </button>
                        {stkStatus === 'pending' && (
                            <p className="text-center text-sm text-gray-600 font-medium">Ask the customer to check their phone</p>
                        )}
                    </div>
                )}

                {/* CREDIT */}
                {comboRemaining === null && method === 'credit' && (
                    <div className="space-y-4">
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 text-center">
                            <BookOpen size={30} className="text-amber-600 mx-auto mb-2" />
                            <p className="text-base text-gray-800 font-medium">
                                The customer takes the goods now and pays later. KES {balanceDue.toLocaleString()} will be recorded as owed.
                            </p>
                        </div>
                        <div>
                            <label className={LABEL}>Customer name *</label>
                            <input
                                value={creditName}
                                onChange={(e) => setCreditName(e.target.value)}
                                placeholder="Full name"
                                className={`${INPUT} !text-xl`}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={LABEL}>Phone (optional)</label>
                                <input
                                    value={creditPhone}
                                    onChange={(e) => setCreditPhone(e.target.value)}
                                    placeholder="07…"
                                    inputMode="tel"
                                    className={INPUT}
                                />
                            </div>
                            <div>
                                <label className={LABEL}>Will pay on (optional)</label>
                                <input
                                    type="date"
                                    min={new Date().toISOString().slice(0, 10)}
                                    value={creditDue}
                                    onChange={(e) => setCreditDue(e.target.value)}
                                    className={INPUT}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleCredit}
                            disabled={creditSaving || !creditName.trim()}
                            className={`${BTN} bg-amber-500 hover:bg-amber-600`}
                        >
                            {creditSaving ? 'Saving…' : `Record Credit · KES ${balanceDue.toLocaleString()}`}
                        </button>
                    </div>
                )}
            </div>
            {confirmDialog}
        </div>
    );
        }
