import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { useBranch } from '../../context/BranchContext';

const ROLE_OPTIONS = [
    { value: 'admin', label: 'Super Admin' },
    { value: 'branchManager', label: 'Branch Manager' },
    { value: 'cashier', label: 'Cashier' },
    { value: 'storekeeper', label: 'Storekeeper' },
    { value: 'staff', label: 'Staff' },
];

const emptyForm = (defaultBranch) => ({
    fullName: '', method: 'email', contact: '', password: '',
    role: 'cashier', branch: defaultBranch || '', jobTitle: '',
    employmentStartDate: '',
});

export default function AddStaffModal({ open, onClose, onCreated }) {
    const { branches, selectedBranch, isAdmin } = useBranch();
    const [form, setForm] = useState(emptyForm(isAdmin ? '' : selectedBranch));
    const [creating, setCreating] = useState(false);

    if (!open) return null;

    const handleCreate = async () => {
        if (!form.fullName || !form.contact || !form.password) return toast.error('Fill in all fields');
        if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
        if (form.role !== 'admin' && !form.branch) return toast.error('Select a branch for this role');

        setCreating(true);
        try {
            await API.post('/auth/register', {
                fullName: form.fullName,
                method: form.method,
                contact: form.contact,
                password: form.password,
                isAdmin: form.role === 'admin',
                role: form.role === 'admin' ? undefined : form.role,
                branch: form.role === 'admin' ? undefined : form.branch,
                jobTitle: form.role === 'staff' ? form.jobTitle : undefined,
                employmentStartDate: form.employmentStartDate || undefined,
            });
            toast.success('Staff account created');
            setForm(emptyForm(isAdmin ? '' : selectedBranch));
            onCreated?.();
            onClose();
        } catch (err) {
            console.error('Failed to create user', err);
            toast.error(err.response?.data?.message || 'Failed to create account');
        }
        setCreating(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                    <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                        <UserPlus size={18} className="text-orange-500" /> Add New Staff
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
                </div>

                <div className="space-y-3">
                    <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        placeholder="Full name" className="input" />
                    <div className="flex gap-2">
                        <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="input w-28">
                            <option value="email">Email</option>
                            <option value="phone">Phone</option>
                        </select>
                        <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}
                            placeholder={form.method === 'email' ? 'name@store.com' : '2547...'} className="input flex-1" />
                    </div>
                    <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder="Temporary password" className="input" />
                    <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input">
                        {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    {form.role === 'staff' && (
                        <input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                            placeholder="Job title (e.g. Shelf Stocker, Cleaner)" className="input" />
                    )}
                    {form.role !== 'admin' && (
                        <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="input">
                            <option value="">Select branch</option>
                            {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                        </select>
                    )}
                    {form.role !== 'admin' && (
                        <div>
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">Start date</span>
                            <input type="date" value={form.employmentStartDate}
                                onChange={(e) => setForm({ ...form, employmentStartDate: e.target.value })} className="input" />
                            <p className="text-[10px] text-gray-400 mt-1">Defaults to today if left blank — used for daily-interval payday counting.</p>
                        </div>
                    )}
                </div>

                <div className="pt-4 mt-4 flex justify-end gap-2 border-t border-gray-100">
                    <button onClick={onClose} disabled={creating} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition">Cancel</button>
                    <button onClick={handleCreate} disabled={creating}
                        className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold rounded-xl transition shadow-md disabled:opacity-50">
                        {creating ? 'Creating…' : 'Save Staff Record'}
                    </button>
                </div>

                <style>{`.input { width: 100%; background: rgb(249 250 251); border: 1px solid rgb(229 231 235); border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; } .input:focus { outline: none; border-color: rgb(249 115 22); background: white; }`}</style>
            </div>
        </div>
    );
                  }
