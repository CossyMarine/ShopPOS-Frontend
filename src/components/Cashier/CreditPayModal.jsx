// src/components/Cashier/CreditPayModal.jsx
import { useState } from 'react';
import { toast } from 'react-toastify';
import { X, Banknote, Landmark, Smartphone } from 'lucide-react';
import API from '../../api/axios';

const METHODS = [
    { id: 'cash', label: 'Cash', icon: Banknote },
    { id: 'manual_till', label: 'Till', icon: Landmark },
    { id: 'mpesa_till', label: 'M-Pesa', icon: Smartphone },
];

const round2 = (n) => Number(Number(n).toFixed(2));
const bal = (r) => round2(r.amount - r.amountPaid);

// Pay one bill (`single`) or all of a customer's bills (`records`, oldest first).
// Partial amounts are fine; money clears the oldest bills first.
export default function CreditPayModal({ customerName, records, single, onClose, onDone }) {
    const targets = single ? [single] : records;
    const owing = round2(targets.reduce((s, r) => s + bal(r), 0));

    const [amounts, setAmounts] = useState({ cash: '', manual_till: '', mpesa_till: '' });
    const [refs, setRefs] = useState({ manual_till: '', mpesa_till: '' });
    const [saving, setSaving] = useState(false);

    const num = (m) => Number(amounts[m]) || 0;
    const paying = round2(METHODS.reduce((s, m) => s + num(m.id), 0));
    const remaining = round2(owing - paying);
    const over = remaining < -0.001;

    // Live preview of which bills this payment clears
    let pool = paying;
    let clears = 0;
    let partialBill = null;
    for (const r of targets) {
        if (pool <= 0.004) break;
        if (pool >= bal(r) - 0.004) { pool = round2(pool - bal(r)); clears += 1; }
        else { partialBill = r.billId; pool = 0; }
    }

    const fillRest = (id) => {
        const others = paying - num(id);
        const rest = round2(owing - others);
        if (rest > 0) setAmounts((a) => ({ ...a, [id]: String(rest) }));
    };

    const submit = async () => {
        if (!(paying > 0)) return toast.error('Enter an amount');
        if (over) return toast.error(`Amount is more than the balance (KES ${owing.toLocaleString()})`);
        const payments = METHODS
            .filter((m) => num(m.id) > 0)
            .map((m) => ({ method: m.id, amount: num(m.id), reference: refs[m.id]?.trim() || undefined }));

        setSaving(true);
        try {
            const body = single ? { creditId: single._id, payments } : { customerName, payments };
            const res = await API.post('/credits/mine/settle', body);
            toast.success(res.data.message);
            onDone();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Could not record payment');
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-3">
            <div className="bg-white rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl">
                <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-start justify-between">
                    <div>
                        <p className="font-black text-gray-900">
                            {single ? `Pay ${single.billId}` : `Pay all — ${customerName}`}
                        </p>
                        <p className="text-xs font-semibold text-gray-500">
                            Owing KES {owing.toLocaleString()}
                            {!single && ` · ${targets.length} bill(s)`}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>

                <div className="p-4 space-y-3">
                    {METHODS.map(({ id, label, icon: Icon }) => (
                        <div key={id} className="border-2 border-gray-200 rounded-xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Icon size={16} className="text-brand-orange" />
                                <span className="text-sm font-black text-gray-800">{label}</span>
                                <button
                                    type="button"
                                    onClick={() => fillRest(id)}
                                    className="ml-auto text-[11px] font-bold text-brand-orange bg-brand-orange-light px-2 py-1 rounded-lg"
                                >
                                    Rest
                                </button>
                            </div>
                            <input
                                type="number"
                                inputMode="decimal"
                                min="0"
                                value={amounts[id]}
                                onChange={(e) => setAmounts((a) => ({ ...a, [id]: e.target.value }))}
                                placeholder="0"
                                className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-lg font-bold text-center focus:outline-none focus:border-orange-500"
                            />
                            {id !== 'cash' && num(id) > 0 && (
                                <input
                                    value={refs[id]}
                                    onChange={(e) => setRefs((r) => ({ ...r, [id]: e.target.value }))}
                                    placeholder={id === 'mpesa_till' ? 'M-Pesa code (optional)' : 'Till reference (optional)'}
                                    className="w-full mt-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold"
                                />
                            )}
                        </div>
                    ))}

                    <div className={`rounded-xl p-3 text-sm font-bold ${over ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-800'}`}>
                        <div className="flex justify-between">
                            <span>Paying now</span><span>KES {paying.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>{over ? 'Over by' : 'Still owing after'}</span>
                            <span>KES {Math.abs(remaining).toLocaleString()}</span>
                        </div>
                        {!single && paying > 0 && !over && (
                            <p className="text-[11px] font-semibold text-gray-500 mt-1.5">
                                {clears} bill(s) cleared{partialBill ? `, ${partialBill} part-paid` : ''}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={submit}
                        disabled={saving || !(paying > 0) || over}
                        className="w-full py-3.5 rounded-xl text-base font-extrabold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : `Record Payment · KES ${paying.toLocaleString()}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
