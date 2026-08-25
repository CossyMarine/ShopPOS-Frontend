import { useState, useEffect } from 'react';
import { X, PackageCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

// Confirms what actually arrived, line by line. Defaults every line to the
// quantity that was sent — the common case is a clean receipt — but staff
// can edit any line down (or up) if what showed up doesn't match, and the
// difference is recorded as a discrepancy automatically, not left as a
// silent gap between what left and what arrived.
export default function ReceiveTransferModal({ transfer, onClose, onReceived }) {
    const [rows, setRows] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!transfer) return;
        setRows(transfer.lines.map((l) => ({
            product: l.product,
            productName: l.productName,
            quantitySent: l.quantitySent,
            quantityReceived: l.quantitySent,
            discrepancyNote: '',
        })));
    }, [transfer]);

    if (!transfer) return null;

    const updateRow = (product, field, value) => {
        setRows((prev) => prev.map((r) => (r.product === product ? { ...r, [field]: value } : r)));
    };

    const hasAnyDiscrepancy = rows.some((r) => Number(r.quantityReceived) !== r.quantitySent);

    const submit = async () => {
        for (const r of rows) {
            if (r.quantityReceived === '' || Number(r.quantityReceived) < 0) {
                return toast.error(`Enter a valid received quantity for ${r.productName}`);
            }
        }
        setSubmitting(true);
        try {
            await API.patch(`/stock-transfers/${transfer._id}/receive`, {
                lines: rows.map((r) => ({
                    product: r.product,
                    quantityReceived: Number(r.quantityReceived),
                    discrepancyNote: r.discrepancyNote.trim() || undefined,
                })),
            });
            toast.success(hasAnyDiscrepancy ? 'Received — discrepancy recorded' : 'Received in full');
            onReceived?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to receive transfer');
        }
        setSubmitting(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
                    <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                        <PackageCheck size={18} className="text-green-600" /> Receive Transfer
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-3 overflow-y-auto flex-1">
                    <p className="text-xs text-gray-500">
                        Confirm what actually arrived for each item. Anything short or over will be flagged automatically.
                    </p>
                    {rows.map((r) => {
                        const mismatch = Number(r.quantityReceived) !== r.quantitySent;
                        return (
                            <div key={r.product} className={`border rounded-xl p-3 ${mismatch ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-bold text-gray-800">{r.productName}</p>
                                    <span className="text-[10px] text-gray-400">Sent: {r.quantitySent}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-gray-400 font-semibold w-20 shrink-0">Received</label>
                                    <input type="number" value={r.quantityReceived}
                                        onChange={(e) => updateRow(r.product, 'quantityReceived', e.target.value)}
                                        className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold" />
                                </div>
                                {mismatch && (
                                    <input value={r.discrepancyNote}
                                        onChange={(e) => updateRow(r.product, 'discrepancyNote', e.target.value)}
                                        placeholder="Why the difference? (optional)"
                                        className="w-full mt-2 border border-amber-200 rounded-lg px-2 py-1.5 text-xs bg-white" />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="p-6 pt-4 border-t border-gray-100 shrink-0">
                    <button onClick={submit} disabled={submitting}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                        {submitting ? 'Confirming…' : hasAnyDiscrepancy ? 'Confirm With Discrepancy' : 'Confirm Received in Full'}
                    </button>
                </div>
            </div>
        </div>
    );
}
