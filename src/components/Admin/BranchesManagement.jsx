import { useState, useEffect } from 'react';
import { Store, Plus, UserCog } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { useBranch } from '../../context/BranchContext';

export default function BranchesManagement() {
    const { branches, setSelectedBranch } = useBranch();
    const [localBranches, setLocalBranches] = useState(branches);
    const [form, setForm] = useState({ name: '', address: '', taxRate: 16 });
    const [creating, setCreating] = useState(false);
    const [managers, setManagers] = useState([]); // unassigned/reassignable staff for the picker
    const [assigningFor, setAssigningFor] = useState(null); // branch being assigned

    const fetchBranches = async () => {
        try {
            const res = await API.get('/branches');
            setLocalBranches(res.data);
        } catch (err) {
            toast.error('Failed to load branches');
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await API.get('/branches/staff');
            setManagers(res.data.filter((u) => !u.isAdmin));
        } catch (err) {
            console.error('Failed to fetch staff directory', err);
        }
    };

    useEffect(() => { fetchBranches(); fetchStaff(); }, []);

    const handleCreate = async () => {
        if (!form.name.trim()) return toast.error('Branch name is required');
        setCreating(true);
        try {
            await API.post('/branches', form);
            toast.success('Branch created');
            setForm({ name: '', address: '', taxRate: 16 });
            fetchBranches();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create branch');
        }
        setCreating(false);
    };

    const handleAssign = async (branchId, userId) => {
        try {
            await API.patch(`/branches/${branchId}/assign-manager`, { userId });
            toast.success('Manager assigned');
            setAssigningFor(null);
            fetchBranches();
            fetchStaff();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to assign manager');
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-gray-800">Branches</h2>
                <p className="text-sm text-gray-500">Every store location, its manager, and its tax rate</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 h-fit shadow-sm">
                    <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                        <Plus size={18} className="text-orange-500" /> Add Branch
                    </h3>
                    <div className="space-y-3">
                        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. Westlands Branch" className="input" />
                        <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                            placeholder="Address / location" className="input" />
                        <div>
                            <label className="text-xs font-semibold text-gray-400">Tax Rate (%)</label>
                            <input type="number" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: e.target.value })} className="input" />
                        </div>
                        <button onClick={handleCreate} disabled={creating}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                            {creating ? 'Creating…' : 'Create Branch'}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {localBranches.map((b) => (
                        <div key={b._id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <Store size={16} className="text-orange-500" />
                                    <h4 className="font-black text-gray-800">{b.name}</h4>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {b.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{b.address || 'No address set'}</p>
                            <p className="text-xs text-gray-500 mt-1">Tax rate: <span className="font-bold">{b.taxRate}%</span></p>

                            <div className="mt-3 pt-3 border-t border-gray-100">
                                {assigningFor === b._id ? (
                                    <select autoFocus onChange={(e) => e.target.value && handleAssign(b._id, e.target.value)}
                                        onBlur={() => setAssigningFor(null)} className="input text-xs">
                                        <option value="">Select staff to promote…</option>
                                        {managers.map((m) => (
                                            <option key={m.id} value={m.id}>{m.fullName} ({m.role})</option>
                                        ))}
                                    </select>
                                ) : (
                                    <button onClick={() => setAssigningFor(b._id)}
                                        className="flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700">
                                        <UserCog size={13} />
                                        {b.manager ? `Manager: ${b.manager.fullName}` : 'Assign a manager'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                .input { width: 100%; background: rgb(249 250 251); border: 1px solid rgb(229 231 235); border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; }
                .input:focus { outline: none; border-color: rgb(249 115 22); background: white; }
            `}</style>
        </div>
    );
}
