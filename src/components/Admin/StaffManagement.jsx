import { useState, useEffect } from 'react';
import { UserPlus, ShieldCheck, Ban, CheckCircle2, RefreshCw, Users2, Wallet } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ConfirmModal from './ConfirmModal';
import WageProfileModal from './WageProfileModal';
import LeaveApprovals from './LeaveApprovals';
import { useBranch } from '../../context/BranchContext';

const ROLE_OPTIONS = [
    { value: 'admin', label: 'Super Admin' },
    { value: 'branchManager', label: 'Branch Manager' },
    { value: 'cashier', label: 'Cashier' },
    { value: 'storekeeper', label: 'Storekeeper' },
    { value: 'staff', label: 'Staff' },
];

const FILTER_TABS = [
    { value: 'all', label: 'All Users' },
    { value: 'staff', label: 'Staff & Admin' },
    { value: 'customer', label: 'Customers' },
];

const emptyForm = (defaultBranch) => ({
    fullName: '',
    method: 'email',
    contact: '',
    password: '',
    role: 'cashier',
    branch: defaultBranch || '',
    jobTitle: '',
});

export default function StaffManagement() {
    // `branch` here is the Admin page's selected-branch filter (null = All Branches)
    const { branches, selectedBranch, isAdmin } = useBranch();
    const [users, setUsers] = useState([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState(emptyForm(isAdmin ? '' : selectedBranch));
    const [creating, setCreating] = useState(false);
    const [roleChange, setRoleChange] = useState(null); // { user, newRole, branch }
    const [statusChange, setStatusChange] = useState(null); // user
    const [working, setWorking] = useState(false);
    const [wageEditUser, setWageEditUser] = useState(null); // user whose wage profile is being edited

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await API.get('/auth/users/all');
            setUsers(res.data);
        } catch (err) {
            console.error('Failed to fetch users', err);
            toast.error('Failed to load users');
        }
        setLoading(false);
    };

    useEffect(() => { fetchUsers(); }, []);
    useEffect(() => { setForm(emptyForm(isAdmin ? '' : selectedBranch)); }, [isAdmin, selectedBranch]);

    const roleLabel = (u) => {
        if (u.isAdmin) return 'Super Admin';
        return ROLE_OPTIONS.find((r) => r.value === u.role)?.label || u.role;
    };
    const currentRoleValue = (u) => (u.isAdmin ? 'admin' : u.role);
    const branchName = (u) => branches.find((b) => b._id === (u.branch?._id || u.branch))?.name;

    // Branch Manager view is filtered to their own branch's staff (selectedBranch
    // is always their own branch for a non-admin, see BranchContext); Super
    // Admin sees everyone unless they've picked one branch from the selector.
    const visibleUsers = users.filter((u) => {
        if (selectedBranch && String(u.branch?._id || u.branch) !== String(selectedBranch) && !u.isAdmin) return false;
        if (filter === 'staff') return u.isAdmin || u.role !== 'customer';
        if (filter === 'customer') return !u.isAdmin && u.role === 'customer';
        return true;
    });

    const handleCreate = async () => {
        if (!form.fullName || !form.contact || !form.password) {
            return toast.error('Fill in all fields');
        }
        if (form.password.length < 6) {
            return toast.error('Password must be at least 6 characters');
        }
        if (form.role !== 'admin' && !form.branch) {
            return toast.error('Select a branch for this role');
        }

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
            });
            toast.success('Staff account created');
            setForm(emptyForm(isAdmin ? '' : selectedBranch));
            fetchUsers();
        } catch (err) {
            console.error('Failed to create user', err);
            toast.error(err.response?.data?.message || 'Failed to create account');
        }
        setCreating(false);
    };

    const confirmRoleChange = async () => {
        const { user, newRole, branch, jobTitle } = roleChange;
        if (newRole !== 'admin' && !branch) return toast.error('Select a branch for this role');
        setWorking(true);
        try {
            const payload =
                newRole === 'admin'
                    ? { isAdmin: true }
                    : { isAdmin: false, role: newRole, branch, jobTitle: newRole === 'staff' ? jobTitle : undefined };
            await API.patch(`/auth/users/${user.id}/role`, payload);
            toast.success(`${user.fullName} is now ${ROLE_OPTIONS.find((r) => r.value === newRole)?.label}`);
            setRoleChange(null);
            fetchUsers();
        } catch (err) {
            console.error('Failed to update role', err);
            toast.error(err.response?.data?.message || 'Failed to update role');
        }
        setWorking(false);
    };

    const confirmStatusChange = async () => {
        setWorking(true);
        try {
            await API.patch(`/auth/users/${statusChange.id}/status`);
            toast.success(statusChange.isActive ? 'Account deactivated' : 'Account reactivated');
            setStatusChange(null);
            fetchUsers();
        } catch (err) {
            console.error('Failed to update status', err);
            toast.error(err.response?.data?.message || 'Failed to update status');
        }
        setWorking(false);
    };

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-black text-gray-800">Staff</h2>
                <p className="text-sm text-gray-500">Cashiers, storekeepers, branch managers, and general staff across your stores</p>
            </div>

            <LeaveApprovals />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* CREATE FORM — Super Admin only; a Branch Manager isn't allowed to mint new staff */}
                {isAdmin && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 h-fit shadow-sm">
                        <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                            <UserPlus size={18} className="text-orange-500" /> Add Staff
                        </h3>
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
                            <button onClick={handleCreate} disabled={creating}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                                {creating ? 'Creating…' : 'Create Account'}
                            </button>
                        </div>
                    </div>
                )}

                {/* LIST */}
                <div className={isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'}>
                    <div className="flex items-center gap-2 mb-4">
                        {FILTER_TABS.map((t) => (
                            <button key={t.value} onClick={() => setFilter(t.value)}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                                    filter === t.value ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-400'
                                }`}>
                                {t.label}
                            </button>
                        ))}
                        <button onClick={fetchUsers} className="ml-auto text-gray-400 hover:text-orange-500 p-1.5" title="Refresh">
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        {visibleUsers.length === 0 ? (
                            <div className="py-14 text-center text-gray-400">
                                <Users2 size={28} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm font-medium">No users found</p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-200">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Name</th>
                                        <th className="px-4 py-3 text-left">Role</th>
                                        <th className="px-4 py-3 text-left">Branch</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {visibleUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-bold text-gray-800">{u.fullName}
                                                <p className="text-[11px] text-gray-400 font-normal">{u.email || u.phone}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {isAdmin && u.role !== 'customer' ? (
                                                    <select
                                                        value={currentRoleValue(u)}
                                                        onChange={(e) => setRoleChange({ user: u, newRole: e.target.value, branch: u.branch?._id || u.branch || '', jobTitle: u.jobTitle || '' })}
                                                        className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1"
                                                    >
                                                        {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                                    </select>
                                                ) : (
                                                    <span className="text-xs font-bold text-gray-600">
                                                        {roleLabel(u)}{u.role === 'staff' && u.jobTitle ? ` · ${u.jobTitle}` : ''}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500">{u.isAdmin ? 'All Branches' : branchName(u) || '—'}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                    {u.isActive ? 'Active' : 'Deactivated'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right space-x-1">
                                                {u.role !== 'customer' && !u.isAdmin && (
                                                    <button onClick={() => setWageEditUser(u)} className="text-gray-400 hover:text-orange-500 p-1.5" title="Wage settings">
                                                        <Wallet size={15} />
                                                    </button>
                                                )}
                                                {u.role !== 'customer' || u.isAdmin ? (
                                                    <button onClick={() => setStatusChange(u)} className="text-gray-400 hover:text-red-500 p-1.5" title={u.isActive ? 'Deactivate' : 'Reactivate'}>
                                                        {u.isActive ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                                                    </button>
                                                ) : null}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmModal
                open={!!roleChange}
                title="Change role?"
                description={
                    roleChange && (
                        <div className="space-y-3 text-left">
                            <p>{`Set ${roleChange.user.fullName}'s role to ${ROLE_OPTIONS.find((r) => r.value === roleChange.newRole)?.label}?`}</p>
                            {roleChange.newRole === 'staff' && (
                                <input value={roleChange.jobTitle} onChange={(e) => setRoleChange({ ...roleChange, jobTitle: e.target.value })}
                                    placeholder="Job title (e.g. Shelf Stocker, Cleaner)" className="input" />
                            )}
                            {roleChange.newRole !== 'admin' && (
                                <select value={roleChange.branch} onChange={(e) => setRoleChange({ ...roleChange, branch: e.target.value })}
                                    className="input">
                                    <option value="">Select branch</option>
                                    {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                                </select>
                            )}
                        </div>
                    )
                }
                confirmLabel="Confirm"
                loading={working}
                onConfirm={confirmRoleChange}
                onClose={() => setRoleChange(null)}
            />

            <ConfirmModal
                open={!!statusChange}
                title={statusChange?.isActive ? 'Deactivate account?' : 'Reactivate account?'}
                description={`${statusChange?.fullName} will ${statusChange?.isActive ? 'no longer be able to log in' : 'regain access'}.`}
                confirmLabel={statusChange?.isActive ? 'Deactivate' : 'Reactivate'}
                tone={statusChange?.isActive ? 'danger' : 'default'}
                loading={working}
                onConfirm={confirmStatusChange}
                onClose={() => setStatusChange(null)}
            />

            <WageProfileModal user={wageEditUser} onClose={() => setWageEditUser(null)} />

            <style>{`
                .input { width: 100%; background: rgb(249 250 251); border: 1px solid rgb(229 231 235); border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; }
                .input:focus { outline: none; border-color: rgb(249 115 22); background: white; }
            `}</style>
        </div>
    );
    }
