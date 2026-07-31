import { useState } from 'react';
import { toast } from 'react-toastify';
import { ShieldAlert, X } from 'lucide-react';
import API from '../../api/axios';

export default function VoidRequestModal({ open, onClose }) {
    const [billId, setBillId] = useState('');
    const [reason, setReason] = useState('');
    const [receipt, setReceipt] = useState(null);
    const [looking, setLooking] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    if (!open) return null;

    const reset = () => { setBillId(''); setReason(''); setReceipt(null); };

    const lookup = async () => {
        if (!billId.trim()) return;
        setLooking(true);
        try {
            const res = await API.get(`/receipts/history`, { params: { q: billId.trim(), limit: 1 } });
            const found = res.data.receipts?.[0];
            if (!found) return toast.error('No receipt found for that Bill ID');
            setReceipt(found);
        } catch {
            toast.error('Lookup failed');
        }
        setLooking(false);
    };

    const submit = async () => {
        if (!receipt) return toast.error('Look up a receipt first');
        if (!reason.trim()) return toast.error('Enter a reason for the void');
        setSubmitting(true);
        try {
            await API.post('/void-requests', { receiptId: receipt._id, reason: reason.trim() });
            toast.success('Void request sent to your manager');
            reset();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit void request');
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                        <ShieldAlert size={18} className="text-red-500" /> Request Void
                    </h3>
                    <button onClick={() => { reset(); onClose(); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                <label className="text-xs font-semibold text-gray-400 mb-1 block">Bill / Receipt ID</label>
                <div className="flex gap-2 mb-3">
                    <input value={billId} onChange={(e) => setBillId(e.target.value)} placeholder="e.g. #B0004"
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono" />
                    <button onClick={lookup} disabled={looking} className="bg-gray-800 text-white px-3 rounded-xl text-xs font-bold">
                        {looking ? '…' : 'Find'}
                    </button>
                </div>

                {receipt && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 text-xs">
                        <p className="font-bold text-gray-800">{receipt.billId} — KES {receipt.subtotal.toLocaleString()}</p>
                        <p className="text-gray-500">{receipt.items?.length} item(s) · {receipt.status}</p>
                    </div>
                )}

                <label className="text-xs font-semibold text-gray-400 mb-1 block">Reason for Void</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                    placeholder="e.g. Customer changed their mind, wrong item scanned…"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm mb-4" />

                <button onClick={submit} disabled={submitting}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                    {submitting ? 'Submitting…' : 'Submit for Manager Approval'}
                </button>
            </div>
        </div>
    );
}
