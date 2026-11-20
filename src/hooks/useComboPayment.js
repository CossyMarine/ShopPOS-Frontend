// src/hooks/useComboPayment.js
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import API from '../api/axios';

export default function useComboPayment({ receipt, onClose, onPaid }) {
    const [paymentMethod, setPaymentMethod] = useState(''); // 'cash' | 'prompt' | 'both' | 'till' | 'reward'
    const [amountPaid, setAmountPaid] = useState('');
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [tillAmount, setTillAmount] = useState('');
    const [rewardAmount, setRewardAmount] = useState('');
    const [rewardIdentifier, setRewardIdentifier] = useState('');
    const [processing, setProcessing] = useState(false);

    const [giveReward, setGiveReward] = useState(false);
    const [giveRewardIdentifier, setGiveRewardIdentifier] = useState('');

    const [mpesaState, setMpesaState] = useState('idle'); // idle | pending | failed
    const [mpesaMessage, setMpesaMessage] = useState('');
    const [remaining, setRemaining] = useState(0);

    const [allowPrinting, setAllowPrinting] = useState(false);
    const [printTarget, setPrintTarget] = useState(null);

    const [comboCash, setComboCash] = useState('');
    const [comboTill, setComboTill] = useState('');
    const [comboPromptPhone, setComboPromptPhone] = useState('');
    const [comboApplying, setComboApplying] = useState(false);
    const [comboSendingPrompt, setComboSendingPrompt] = useState(false);

    // Load the global "allow printing during payment" setting once.
    useEffect(() => {
        API.get('/settings')
            .then((res) => setAllowPrinting(!!res.data.allowPrintingDuringPayment))
            .catch(() => setAllowPrinting(false));
    }, []);

    const reset = () => {
        setPaymentMethod('');
        setAmountPaid('');
        setMpesaPhone('');
        setTillAmount('');
        setRewardAmount('');
        setRewardIdentifier('');
        setGiveReward(false);
        setGiveRewardIdentifier('');
        setMpesaState('idle');
        setMpesaMessage('');
        setComboCash('');
        setComboTill('');
        setComboPromptPhone('');
    };

    const handleClose = () => { reset(); onClose(); };

    const refreshAfterPayment = () => onPaid?.();

    // Fires the manual "Give Reward" cashback for a walk-in payer identified by
    // email/phone. Never blocks the payment flow — failures here are surfaced
    // but the payment itself has already succeeded.
    const submitGiveReward = async (amountJustPaid) => {
        if (!giveReward || !giveRewardIdentifier.trim() || !amountJustPaid || amountJustPaid <= 0) return;
        try {
            const res = await API.post('/wallet/admin/add-reward', {
                identifier: giveRewardIdentifier.trim(),
                amountSpent: amountJustPaid,
            });
            toast.success(res.data.message || 'Reward credited');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment recorded, but the reward could not be credited');
        }
    };

    // Prints the receipt once a bill is fully settled, gated by the admin's
    // "allow printing during payment" toggle. printTarget is rendered outside
    // the receipt-gated part of the tree so it survives the modal closing.
    const printPaidReceipt = (paidReceipt) => {
        if (!allowPrinting || !paidReceipt) return;
        setPrintTarget(paidReceipt);
        setTimeout(() => {
            window.print();
            API.patch(`/receipts/${paidReceipt._id}/print`).catch(() => {});
            setPrintTarget(null);
        }, 150);
    };

    useEffect(() => {
        if (receipt) {
            // totalDue = what the customer owes (VAT included); subtotal is
            // net-of-VAT. Falls back to subtotal for pre-totalDue receipts.
            const owed = receipt.totalDue ?? receipt.subtotal;
            setRemaining(Number((owed - (receipt.amountPaid || 0)).toFixed(2)));
        }
        reset();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [receipt?._id]);

    const cashChange = paymentMethod === 'cash' && amountPaid
        ? parseFloat(amountPaid) - remaining
        : null;

    const rewardRemainder = paymentMethod === 'reward'
        ? Math.max(Number((remaining - (parseFloat(rewardAmount) || 0)).toFixed(2)), 0)
        : remaining;

    const comboEntered = (parseFloat(comboCash) || 0) + (parseFloat(comboTill) || 0);
    const comboAfterApply = receipt ? Number((remaining - comboEntered).toFixed(2)) : 0;

    const handleCashPay = async () => {
        const received = parseFloat(amountPaid);
        if (isNaN(received) || received < remaining) {
            toast.error('Amount received cannot be less than the balance due');
            return;
        }
        setProcessing(true);
        try {
            const res = await API.patch(`/receipts/${receipt._id}/pay`, { amountPaid: received });
            toast.success('Payment recorded');
            await submitGiveReward(remaining);
            printPaidReceipt(res.data.receipt);
            reset();
            onPaid?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
        }
        setProcessing(false);
    };

    const handleTillPay = async () => {
        const amt = parseFloat(tillAmount);
        if (isNaN(amt) || amt <= 0 || amt > remaining) {
            toast.error(`Enter an amount between 1 and ${remaining}`);
            return;
        }
        setProcessing(true);
        try {
            const res = await API.post('/wallet/pay/manual', { receiptId: receipt._id, amount: amt });
            toast.success('Payment recorded');
            await submitGiveReward(amt);
            const newRemaining = Number((remaining - amt).toFixed(2));
            if (newRemaining <= 0) {
                printPaidReceipt(res.data.receipt);
                reset();
                onPaid?.();
                onClose();
            } else {
                setRemaining(newRemaining);
                setTillAmount('');
                setPaymentMethod('');
                refreshAfterPayment();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
        }
        setProcessing(false);
    };

    const handleSendStk = async () => {
        if (!mpesaPhone.trim()) {
            toast.error('Enter the M-Pesa phone number');
            return;
        }
        setProcessing(true);
        setMpesaState('pending');
        setMpesaMessage('');
        try {
            const res = await API.post(`/receipts/${receipt._id}/mpesa/initiate`, {
                phone: mpesaPhone.trim(),
                cashAmount: 0,
            });
            setMpesaMessage(res.data.message || 'STK push sent. Ask the customer to enter their M-Pesa PIN.');
        } catch (err) {
            setMpesaState('failed');
            setMpesaMessage(err.response?.data?.message || 'Failed to send STK push');
        }
        setProcessing(false);
    };

    const handleRetryMpesa = async () => {
        try {
            await API.post(`/receipts/${receipt._id}/mpesa/cancel`);
        } catch (err) {
            console.error('Failed to reset M-Pesa state', err);
        }
        setMpesaState('idle');
        setMpesaMessage('');
    };

    const handleRewardPay = async () => {
        const amt = parseFloat(rewardAmount);
        if (isNaN(amt) || amt <= 0 || amt > remaining) {
            toast.error(`Enter an amount between 1 and ${remaining}`);
            return;
        }
        if (!rewardIdentifier.trim()) {
            toast.error("Enter the customer's registered email or phone");
            return;
        }
        setProcessing(true);
        try {
            const res = await API.patch(`/receipts/${receipt._id}/pay/combo`, {
                cashAmount: 0,
                tillAmount: 0,
                rewardAmount: amt,
                rewardIdentifier: rewardIdentifier.trim(),
            });
            toast.success(res.data.message);
            const newRemaining = res.data.balanceRemaining ?? Number((remaining - amt).toFixed(2));
            if (newRemaining <= 0) {
                printPaidReceipt(res.data.receipt);
                reset();
                onPaid?.();
                onClose();
            } else {
                setRemaining(newRemaining);
                setRewardAmount('');
                setRewardIdentifier('');
                setPaymentMethod('');
                refreshAfterPayment();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
        }
        setProcessing(false);
    };

    const handleComboApply = async () => {
        if (comboEntered <= 0) { toast.error('Enter at least one amount'); return; }
        if (comboAfterApply < -0.01) { toast.error('That adds up to more than the balance due'); return; }
        setComboApplying(true);
        try {
            const res = await API.patch(`/receipts/${receipt._id}/pay/combo`, {
                cashAmount: parseFloat(comboCash) || 0,
                tillAmount: parseFloat(comboTill) || 0,
                rewardAmount: 0,
            });
            toast.success(res.data.message);
            await submitGiveReward(comboEntered);
            const newRemaining = res.data.balanceRemaining ?? 0;
            setRemaining(newRemaining);
            setComboCash('');
            setComboTill('');
            if (newRemaining <= 0) {
                printPaidReceipt(res.data.receipt);
                reset();
                onPaid?.();
                onClose();
            } else {
                refreshAfterPayment();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment failed');
        }
        setComboApplying(false);
    };

    const handleComboSendPrompt = async () => {
        if (!comboPromptPhone.trim()) { toast.error("Enter the customer's M-Pesa number"); return; }
        setComboSendingPrompt(true);
        setMpesaState('pending');
        setMpesaMessage('');
        try {
            const res = await API.post(`/receipts/${receipt._id}/mpesa/initiate`, {
                phone: comboPromptPhone.trim(),
                cashAmount: 0,
            });
            setMpesaMessage(res.data.message || 'STK push sent. Ask the customer to enter their M-Pesa PIN.');
        } catch (err) {
            setMpesaState('failed');
            setMpesaMessage(err.response?.data?.message || 'Failed to send STK push');
        }
        setComboSendingPrompt(false);
    };

    return {
        paymentMethod, setPaymentMethod,
        amountPaid, setAmountPaid,
        mpesaPhone, setMpesaPhone,
        tillAmount, setTillAmount,
        rewardAmount, setRewardAmount,
        rewardIdentifier, setRewardIdentifier,
        processing,
        giveReward, setGiveReward,
        giveRewardIdentifier, setGiveRewardIdentifier,
        mpesaState, mpesaMessage,
        remaining, printTarget,
        comboCash, setComboCash,
        comboTill, setComboTill,
        comboPromptPhone, setComboPromptPhone,
        comboApplying, comboSendingPrompt,
        cashChange, rewardRemainder, comboEntered, comboAfterApply,
        handleClose,
        handleCashPay, handleTillPay, handleSendStk, handleRetryMpesa,
        handleRewardPay, handleComboApply, handleComboSendPrompt,
    };
                        }
