import { useState, useEffect } from 'react';
import { Wallet, X } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

const empty = {
    wageType: 'hourly',
    hourlyRate: '', overtimeMultiplier: '1.5',
    dailyRateWeekday: '', dailyRateWeekend: '',
    monthlySalary: '', commissionRate: '',
    paymentMethod: 'mpesa', applyStatutoryDeductions: true,
    noSalary: false,
};

export default function WageProfileModal({ user, onClose, onSaved }) {
    const [form, setForm] = useState(empty);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        API.get(`/wages/${user.id}`)
            .then((res) => { if (res.data) setForm({ ...empty, ...res.data }); else setForm(empty); })
            .catch(() => toast.error('Failed to load wage profile'))
            .finally(() => setLoading(false));
    }, [user]);

    if (!user) return null;

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

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                        <Wallet size={18} className="text-orange-400" /> Wage — {user.fullName}
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-300"><X size={18} /></button>
                </div>

                {loading ? (
                    <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
                ) : (
                    <div className="space-y-3">
                        <label className="flex items-center justify-between bg-purple-500/10 border border-purple-500/30 p-3 rounded-xl">
                            <div>
                                <span className="text-xs font-bold text-gray-200 block">No Salary (Unpaid Staff)</span>
                                <span className="text-[10px] text-gray-500">e.g. family member, attachment/intern — excluded from payroll entirely</span>
                            </div>
                            <input type="checkbox" checked={form.noSalary}
                                onChange={(e) => setForm({ ...form, noSalary: e.target.checked })}
                                className="w-4 h-4 accent-purple-500 shrink-0 ml-3" />
                        </label>

                        <div className={form.noSalary ? 'opacity-40 pointer-events-none space-y-3' : 'space-y-3'}>
                            <div className="grid grid-cols-3 gap-2">
                                {['hourly', 'daily', 'monthly'].map((t) => (
                                    <button key={t} onClick={() => setForm({ ...form, wageType: t })}
                                        className={`py-2 rounded-xl text-xs font-extrabold border transition ${form.wageType === t ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-700 text-gray-400'}`}>
                                        {t[0].toUpperCase() + t.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {form.wageType === 'hourly' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="number" placeholder="Hourly rate (KES)" value={form.hourlyRate}
                                        onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} className="input-dark" />
                                    <input type="number" step="0.1" placeholder="OT multiplier" value={form.overtimeMultiplier}
                                        onChange={(e) => setForm({ ...form, overtimeMultiplier: e.target.value })} className="input-dark" />
                                </div>
                            )}
                            {form.wageType === 'daily' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="number" placeholder="Weekday rate (KES)" value={form.dailyRateWeekday}
                                        onChange={(e) => setForm({ ...form, dailyRateWeekday: e.target.value })} className="input-dark" />
                                    <input type="number" placeholder="Weekend rate (KES)" value={form.dailyRateWeekend}
                                        onChange={(e) => setForm({ ...form, dailyRateWeekend: e.target.value })} className="input-dark" />
                                </div>
                            )}
                            {form.wageType === 'monthly' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <input type="number" placeholder="Monthly gross (KES)" value={form.monthlySalary}
                                        onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })} className="input-dark" />
                                    <input type="number" step="0.1" placeholder="Commission %" value={form.commissionRate}
                                        onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} className="input-dark" />
                                </div>
                            )}

                            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="input-dark w-full">
                                <option value="mpesa">M-Pesa</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="cash">Cash</option>
                            </select>

                            <label className="flex items-center justify-between bg-orange-500/10 border border-orange-500/30 p-3 rounded-xl">
                                <span className="text-xs font-bold text-gray-200">Apply statutory deductions</span>
                                <input type="checkbox" checked={form.applyStatutoryDeductions}
                                    onChange={(e) => setForm({ ...form, applyStatutoryDeductions: e.target.checked })}
                                    className="w-4 h-4 accent-orange-500" />
                            </label>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 font-semibold text-sm">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm disabled:opacity-50">
                                {saving ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`.input-dark { background: rgb(31 41 55); border: 1px solid rgb(55 65 81); border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; color: white; width: 100%; } .input-dark::placeholder { color: rgb(107 114 128); }`}</style>
        </div>
    );
              }
