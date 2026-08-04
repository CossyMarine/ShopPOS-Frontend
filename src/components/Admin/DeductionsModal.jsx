import { useState, useEffect } from 'react';
import { Percent, Trash2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

export default function DeductionsModal({ open, onClose, staffList }) {
    const [deductions, setDeductions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: '', calcType: 'fixed', amount: '', appliesTo: 'all', users: [] });

    const fetchDeductions = async () => {
        setLoading(true);
        try {
            const res = await API.get('/deductions');
            setDeductions(res.data);
        } catch {
            toast.error('Failed to load deductions');
        }
        setLoading(false);
    };

    useEffect(() => { if (open) fetchDeductions(); }, [open]);

    if (!open) return null;

    const resetForm = () => setForm({ name: '', calcType: 'fixed', amount: '', appliesTo: 'all', users: [] });

    const toggleUser = (id) => {
        setForm((f) => ({
            ...f,
            users: f.users.includes(id) ? f.users.filter((u) => u !== id) : [...f.users, id],
        }));
    };

    const handleCreate = async () => {
        if (!form.name || form.amount === '') return toast.error('Name and amount are required');
        if (form.appliesTo === 'individual' && form.users.length === 0) return toast.error('Select at least one staff member');
        setSaving(true);
        try {
            await API.post('/deductions', { ...form, amount: parseFloat(form.amount) });
            toast.success('Deduction created');
            resetForm();
            setShowForm(false);
            fetchDeductions();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create deduction');
        }
        setSaving(false);
    };

    const toggleActive = async (d) => {
        try {
            await API.patch(`/deductions/${d._id}`, { isActive: !d.isActive });
            fetchDeductions();
        } catch {
            toast.error('Failed to update deduction');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Remove this deduction?')) return;
        try {
            await API.delete(`/deductions/${id}`);
            toast.success('Deduction removed');
            fetchDeductions();
        } catch {
            toast.error('Failed to delete deduction');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                    <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                        <Percent size={18} className="text-orange-500" /> Payroll Deductions
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
                </div>

                <div className="space-y-2 mb-4">
                    {loading ? (
                        <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
                    ) : deductions.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-6">No deductions configured yet</p>
                    ) : (
                        deductions.map((d) => (
                            <div key={d._id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
                                <div>
                                    <p className="text-xs font-extrabold text-gray-900">{d.name}</p>
                                    <p className="text-[10px] font-bold text-gray-500">
                                        {d.calcType === 'percentage' ? `${d.amount}% of gross` : `${d.amount.toLocaleString()} KES`}
                                        {' · '}
                                        {d.appliesTo === 'all' ? 'All Staff' : `${d.users?.length || 0} selected`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => toggleActive(d)}
                                        className={`text-[10px] font-extrabold px-2 py-1 rounded-lg ${d.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                                        {d.isActive ? 'Active' : 'Paused'}
                                    </button>
                                    <button onClick={() => handleDelete(d._id)} className="text-gray-400 hover:text-red-500 p-1">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {!showForm ? (
                    <button onClick={() => setShowForm(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-500 text-xs font-bold transition">
                        <Plus size={14} /> New Deduction
                    </button>
                ) : (
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. NHIF, NSSF, Uniform Fee" className="input" />

                        <div className="grid grid-cols-2 gap-2">
                            <select value={form.calcType} onChange={(e) => setForm({ ...form, calcType: e.target.value })} className="input">
                                <option value="fixed">Fixed Amount (KES)</option>
                                <option value="percentage">Percentage of Gross (%)</option>
                            </select>
                            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                placeholder={form.calcType === 'percentage' ? 'e.g. 2.75' : 'e.g. 500'} className="input" />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <label className="border p-2.5 rounded-xl cursor-pointer flex items-center gap-2 bg-white">
                                <input type="radio" name="appliesTo" checked={form.appliesTo === 'all'}
                                    onChange={() => setForm({ ...form, appliesTo: 'all' })} className="accent-orange-500" />
                                <span className="text-xs font-bold text-gray-700">All Staff</span>
                            </label>
                            <label className="border p-2.5 rounded-xl cursor-pointer flex items-center gap-2 bg-white">
                                <input type="radio" name="appliesTo" checked={form.appliesTo === 'individual'}
                                    onChange={() => setForm({ ...form, appliesTo: 'individual' })} className="accent-orange-500" />
                                <span className="text-xs font-bold text-gray-700">Specific Staff</span>
                            </label>
                        </div>

                        {form.appliesTo === 'individual' && (
                            <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl bg-white divide-y divide-gray-100">
                                {staffList.map((u) => (
                                    <label key={u.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                                        <input type="checkbox" checked={form.users.includes(u.id)} onChange={() => toggleUser(u.id)} className="accent-orange-500" />
                                        <span className="text-xs font-semibold text-gray-700">{u.fullName}</span>
                                    </label>
                                ))}
                                {staffList.length === 0 && <p className="text-[10px] text-gray-400 px-3 py-2">No staff available</p>}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => { setShowForm(false); resetForm(); }} className="px-3.5 py-2 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl">Cancel</button>
                            <button onClick={handleCreate} disabled={saving}
                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold rounded-xl disabled:opacity-50">
                                {saving ? 'Saving…' : 'Add Deduction'}
                            </button>
                        </div>
                    </div>
                )}

                <style>{`.input { width: 100%; background: white; border: 1px solid rgb(229 231 235); border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; font-weight: 600; } .input:focus { outline: none; border-color: rgb(249 115 22); }`}</style>
            </div>
        </div>
    );
}
