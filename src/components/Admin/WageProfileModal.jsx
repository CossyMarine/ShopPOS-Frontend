import { useState, useEffect, useMemo } from 'react';
import { Wallet, X } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { buildDeductionOptions } from '../../utils/payroll';

const empty = {
    wageType: 'hourly',
    hourlyRate: '', overtimeMultiplier: '1.5',
    dailyRateWeekday: '', dailyRateWeekend: '',
    monthlySalary: '', commissionRate: '',
    paymentMethod: 'mpesa', applyStatutoryDeductions: true,
    selectedDeductions: [],
    noSalary: false,
};

export default function WageProfileModal({ user, onClose, onSaved }) {
    const [form, setForm] = useState(empty);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deductions, setDeductions] = useState([]);
    const [deductionsLoading, setDeductionsLoading] = useState(false);

    useEffect(() => {
        if (!user) return;

        setLoading(true);
        API.get(`/wages/${user.id}`)
            .then((res) => setForm(res.data ? { ...empty, ...res.data } : empty))
            .catch(() => toast.error('Failed to load wage profile'))
            .finally(() => setLoading(false));

        setDeductionsLoading(true);
        API.get('/deductions')
            .then((res) => setDeductions(res.data || []))
            .catch(() => {})
            .finally(() => setDeductionsLoading(false));
    }, [user]);

    const deductionOptions = useMemo(
        () => buildDeductionOptions(deductions, user?.id),
        [deductions, user]
    );

    if (!user) return null;

    // Empty array = "apply all available deductions" (matches backend default).
    const isAllSelected = !form.selectedDeductions || form.selectedDeductions.length === 0;
    const checkedIds = isAllSelected ? deductionOptions.map((o) => o._id) : form.selectedDeductions;

    const toggleDeduction = (id) => {
        const current = isAllSelected ? deductionOptions.map((o) => o._id) : form.selectedDeductions;
        const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
        const allIds = deductionOptions.map((o) => o._id);
        const isNowAll = next.length === allIds.length && allIds.every((x) => next.includes(x));
        setForm((f) => ({ ...f, selectedDeductions: isNowAll ? [] : next }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await API.put(`/wages/${user.id}`, form);
            toast.success(`Wage profile saved for ${user.fullName}`);
            onSaved?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save wage profile');
        }
        setSaving(false);
    };

    const commissionNote = user.role === 'cashier'
        ? "Cashiers ring up their own sales, so this is where commission actually pays out — it's a % of everything this person personally sold this period."
        : `Commission only ever pays out for cashiers, since only cashiers ring up sales. ${user.jobTitle || (user.role === 'branchManager' ? 'Branch managers' : 'This role')} won't have any attributed sales, so a rate here will calculate to 0 KES — safe to leave at 0.`;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                    <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                        <Wallet size={18} className="text-orange-500" /> Wage — {user.fullName}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
                ) : (
                    <div className="space-y-3">
                        <label className="flex items-center justify-between bg-orange-50 border border-orange-200 p-3 rounded-xl">
                            <div>
                                <span className="text-xs font-bold text-gray-900 block">No Salary (Unpaid Staff)</span>
                                <span className="text-[10px] text-gray-500">e.g. family member, attachment/intern — excluded from payroll entirely</span>
                            </div>
                            <input type="checkbox" checked={form.noSalary}
                                onChange={(e) => setForm({ ...form, noSalary: e.target.checked })}
                                className="w-4 h-4 accent-orange-500 shrink-0 ml-3" />
                        </label>

                        <div className={form.noSalary ? 'opacity-40 pointer-events-none space-y-3' : 'space-y-3'}>
                            <div>
                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">How they're paid</span>
                                <div className="grid grid-cols-3 gap-2">
                                    {['hourly', 'daily', 'monthly'].map((t) => (
                                        <button key={t} onClick={() => setForm({ ...form, wageType: t })}
                                            className={`py-2 rounded-xl text-xs font-extrabold border transition ${form.wageType === t ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-orange-300'}`}>
                                            {t[0].toUpperCase() + t.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {form.wageType === 'hourly' && (
                                <div className="space-y-1.5">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" placeholder="Rate per hour (KES)" value={form.hourlyRate}
                                            onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} className="input" />
                                        <input type="number" step="0.1" placeholder="Overtime multiplier" value={form.overtimeMultiplier}
                                            onChange={(e) => setForm({ ...form, overtimeMultiplier: e.target.value })} className="input" />
                                    </div>
                                    <p className="text-[10px] text-gray-400 px-0.5">
                                        Paid on shift/attendance hours actually logged. Overtime kicks in automatically past 8 hours in a single shift, at the multiplier above.
                                    </p>
                                </div>
                            )}
                            {form.wageType === 'daily' && (
                                <div className="space-y-1.5">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" placeholder="Weekday rate (KES)" value={form.dailyRateWeekday}
                                            onChange={(e) => setForm({ ...form, dailyRateWeekday: e.target.value })} className="input" />
                                        <input type="number" placeholder="Weekend rate (KES)" value={form.dailyRateWeekend}
                                            onChange={(e) => setForm({ ...form, dailyRateWeekend: e.target.value })} className="input" />
                                    </div>
                                    <p className="text-[10px] text-gray-400 px-0.5">
                                        Paid per day attended, using whichever rate matches the day of the week.
                                    </p>
                                </div>
                            )}
                            {form.wageType === 'monthly' && (
                                <div className="space-y-1.5">
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" placeholder="Monthly gross (KES)" value={form.monthlySalary}
                                            onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })} className="input" />
                                        <input type="number" step="0.1" placeholder="Commission % (cashiers only)" value={form.commissionRate}
                                            onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} className="input" />
                                    </div>
                                    <p className="text-[10px] text-gray-400 leading-snug px-0.5">{commissionNote}</p>
                                </div>
                            )}

                            <div>
                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">Payment method</span>
                                <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="input w-full">
                                    <option value="mpesa">M-Pesa</option>
                                    <option value="bank">Bank Transfer</option>
                                    <option value="cash">Cash</option>
                                </select>
                            </div>

                            <label className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-xl">
                                <div>
                                    <span className="text-xs font-bold text-gray-800 block">Apply statutory deductions</span>
                                    <span className="text-[10px] text-gray-500">Turn off to pay full gross with nothing withheld</span>
                                </div>
                                <input type="checkbox" checked={form.applyStatutoryDeductions}
                                    onChange={(e) => setForm({ ...form, applyStatutoryDeductions: e.target.checked })}
                                    className="w-4 h-4 accent-green-600 shrink-0 ml-3" />
                            </label>

                            {form.applyStatutoryDeductions && (
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Which deductions apply</span>
                                        {!isAllSelected && (
                                            <button type="button" onClick={() => setForm((f) => ({ ...f, selectedDeductions: [] }))}
                                                className="text-[10px] font-bold text-orange-500 hover:text-orange-600">
                                                Select all
                                            </button>
                                        )}
                                    </div>
                                    {deductionsLoading ? (
                                        <p className="text-[11px] text-gray-400">Loading deductions…</p>
                                    ) : (
                                        deductionOptions.map((opt) => (
                                            <label key={opt._id} className="flex items-start gap-2 py-1 cursor-pointer">
                                                <input type="checkbox" checked={checkedIds.includes(opt._id)}
                                                    onChange={() => toggleDeduction(opt._id)}
                                                    className="w-3.5 h-3.5 accent-orange-500 mt-0.5 shrink-0" />
                                                <span className="flex-1">
                                                    <span className="text-xs font-bold text-gray-800 block">{opt.name}</span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {opt.calcType === 'percentage' ? `${opt.amount}%` : `${Number(opt.amount).toLocaleString()} KES flat`}
                                                        {opt.note ? ` · ${opt.note}` : ''}
                                                    </span>
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2 border-t border-gray-100 mt-1">
                            <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold text-sm transition">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm disabled:opacity-50 transition">
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                )}

                <style>{`.input { width: 100%; background: rgb(249 250 251); border: 1px solid rgb(229 231 235); border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; font-weight: 600; color: rgb(17 24 39); } .input:focus { outline: none; border-color: rgb(249 115 22); background: white; } .input::placeholder { color: rgb(156 163 175); font-weight: 500; }`}</style>
            </div>
        </div>
    );
}
