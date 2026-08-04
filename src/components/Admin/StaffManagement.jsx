import { useState, useEffect } from 'react';
import { UserPlus, Ban, CheckCircle2, RefreshCw, Users2, Wallet, Percent, FileText, Search, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ConfirmModal from './ConfirmModal';
import WageProfileModal from './WageProfileModal';
import AddStaffModal from './AddStaffModal';
import DeductionsModal from './DeductionsModal';
import PayslipModal from './PayslipModal';
import LeaveApprovals from './LeaveApprovals';
import StaffDetailView from './StaffDetailView';
import GlobalPayoutModal from './GlobalPayoutModal';
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

export default function StaffManagement() {
    const { branches, selectedBranch, isAdmin } = useBranch();
    const [users, setUsers] = useState([]);
    const [wageProfiles, setWageProfiles] = useState([]);
    const [deductions, setDeductions] = useState([]);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const [addStaffOpen, setAddStaffOpen] = useState(false);
    const [deductionsOpen, setDeductionsOpen] = useState(false);
    const [globalPayoutOpen, setGlobalPayoutOpen] = useState(false);
    const [payslipUser, setPayslipUser] = useState(null);
    const [roleChange, setRoleChange] = useState(null);
    const [statusChange, setStatusChange] = useState(null);
    const [working, setWorking] = useState(false);
    const [wageEditUser, setWageEditUser] = useState(null);
    const [selectedStaffId, setSelectedStaffId] = useState(null); // tap-to-open detail page

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

    const fetchWageProfiles = async () => {
        try {
            const res = await API.get('/wages');
            setWageProfiles(res.data);
        } catch (err) {
            console.error('Failed to fetch wage profiles', err);
        }
    };

    const fetchDeductions = async () => {
        try {
            const res = await API.get('/deductions');
            setDeductions(res.data);
        } catch (err) {
            console.error('Failed to fetch deductions', err);
        }
    };

    useEffect(() => { fetchUsers(); fetchWageProfiles(); fetchDeductions(); }, []);

    const wageByUser = wageProfiles.reduce((acc, p) => {
        const uid = p.user?._id || p.user;
        if (uid) acc[String(uid)] = p;
        return acc;
    }, {});

    const roleLabel = (u) => {
        if (u.isAdmin) return 'Super Admin';
        return ROLE_OPTIONS.find((r) => r.value === u.role)?.label || u.role;
    };
    const currentRoleValue = (u) => (u.isAdmin ? 'admin' : u.role);
    const branchName = (u) => branches.find((b) => b._id === (u.branch?._id || u.branch))?.name;

    const visibleUsers = users.filter((u) => {
        if (selectedBranch && String(u.branch?._id || u.branch) !== String(selectedBranch) && !u.isAdmin) return false;
        if (filter === 'staff' && !(u.isAdmin || u.role !== 'customer')) return false;
        if (filter === 'customer' && !(!u.isAdmin && u.role === 'customer')) return false;
        if (search) {
            const q = search.toLowerCase();
            const haystack = `${u.fullName} ${u.email || ''} ${u.phone || ''} ${u.jobTitle || ''} ${roleLabel(u)}`.toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        return true;
    });

    const staffUsers = users.filter((u) => u.isAdmin || u.role !== 'customer');
    const configuredCount = staffUsers.filter((u) => wageByUser[u.id]).length;
    const noSalaryCount = staffUsers.filter((u) => wageByUser[u.id]?.noSalary).length;
    const activeDeductionsCount = deductions.filter((d) => d.isActive).length;

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

    const wageBadge = (u) => {
        const profile = wageByUser[u.id];
        if (!profile) return <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Not set</span>;
        if (profile.noSalary) return <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">Unpaid</span>;
        if (profile.wageType === 'hourly') return <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{profile.hourlyRate} KES/hr</span>;
        if (profile.wageType === 'daily') return <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">{profile.dailyRateWeekday} KES/day</span>;
        return <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{Number(profile.monthlySalary || 0).toLocaleString()} KES/mo</span>;
    };

    // Tap-to-open: staff/admin rows open the detail page; customer rows don't have one.
    if (selectedStaffId) {
        return (
            <StaffDetailView
                userId={selectedStaffId}
                onBack={() => setSelectedStaffId(null)}
                onChanged={() => { fetchUsers(); fetchWageProfiles(); }}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Staff</h2>
                    <p className="text-sm text-gray-500">Cashiers, storekeepers, branch managers, and general staff across your stores</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setDeductionsOpen(true)}
                        className="flex items-center gap-2 px-3.5 py-2.5 bg-white border border-gray-200 hover:border-orange-400 text-gray-700 text-xs font-extrabold rounded-xl shadow-sm transition">
                        <Percent size={15} className="text-orange-500" /> Deductions
                    </button>
                    <button onClick={() => setGlobalPayoutOpen(true)}
                        className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-extrabold rounded-xl shadow-sm transition">
                        <Send size={15} /> Global Payout
                    </button>
                    {isAdmin && (
                        <button onClick={() => setAddStaffOpen(true)}
                            className="flex items-center gap-2 px-3.5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-extrabold rounded-xl shadow-sm transition">
                            <UserPlus size={15} /> Add Staff
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Total Staff</span>
                        <p className="text-xl font-black text-gray-900 mt-0.5">{staffUsers.length}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center text-lg">
                        <Users2 size={18} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Wage Configured</span>
                        <p className="text-xl font-black text-indigo-600 mt-0.5">{configuredCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
                        <Wallet size={18} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Unpaid / No Salary</span>
                        <p className="text-xl font-black text-purple-600 mt-0.5">{noSalaryCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-lg">
                        <Users2 size={18} />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Active Deductions</span>
                        <p className="text-xl font-black text-green-600 mt-0.5">{activeDeductionsCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-lg">
                        <Percent size={18} />
                    </div>
                </div>
            </div>

            <LeaveApprovals />

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
                <div className="relative w-full md:w-80">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <Search size={13} />
                    </span>
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search staff, role, email…"
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-orange-400 transition" />
                </div>

                <div className="flex items-center gap-2">
                    {FILTER_TABS.map((t) => (
                        <button key={t.value} onClick={() => setFilter(t.value)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                                filter === t.value ? 'bg-orange-500 text-white' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-orange-400'
                            }`}>
                            {t.label}
                        </button>
                    ))}
                    <button onClick={() => { fetchUsers(); fetchWageProfiles(); }} className="text-gray-400 hover:text-orange-500 p-1.5" title="Refresh">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                {visibleUsers.length === 0 ? (
                    <div className="py-14 text-center text-gray-400">
                        <Users2 size={28} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm font-medium">No users found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left">Employee Info</th>
                                    <th className="px-4 py-3 text-left">Role</th>
                                    <th className="px-4 py-3 text-left">Branch</th>
                                    <th className="px-4 py-3 text-left">Wage Configuration</th>
                                    <th className="px-4 py-3 text-left">Status</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {visibleUsers.map((u) => {
                                    const canOpenDetail = u.role !== 'customer';
                                    return (
                                        <tr key={u.id}
                                            onClick={() => canOpenDetail && setSelectedStaffId(u.id)}
                                            className={`hover:bg-gray-50 ${canOpenDetail ? 'cursor-pointer' : ''}`}
                                            title={canOpenDetail ? 'View staff details' : undefined}>
                                            <td className="px-4 py-3 font-bold text-gray-800">
                                                {u.fullName}
                                                <p className="text-[11px] text-gray-400 font-normal">{u.email || u.phone}</p>
                                            </td>
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                                            <td className="px-4 py-3">{u.role !== 'customer' ? wageBadge(u) : <span className="text-[10px] text-gray-300">—</span>}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                    {u.isActive ? 'Active' : 'Deactivated'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                                                {u.role !== 'customer' && !u.isAdmin && (
                                                    <>
                                                        <button onClick={() => setWageEditUser(u)} className="text-gray-400 hover:text-orange-500 p-1.5" title="Wage settings">
                                                            <Wallet size={15} />
                                                        </button>
                                                        <button onClick={() => setPayslipUser(u)} className="text-gray-400 hover:text-green-600 p-1.5" title="Run payroll">
                                                            <FileText size={15} />
                                                        </button>
                                                    </>
                                                )}
                                                {u.role !== 'customer' || u.isAdmin ? (
                                                    <button onClick={() => setStatusChange(u)} className="text-gray-400 hover:text-red-500 p-1.5" title={u.isActive ? 'Deactivate' : 'Reactivate'}>
                                                        {u.isActive ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                                                    </button>
                                                ) : null}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <AddStaffModal open={addStaffOpen} onClose={() => setAddStaffOpen(false)} onCreated={fetchUsers} />

            <DeductionsModal open={deductionsOpen} onClose={() => { setDeductionsOpen(false); fetchDeductions(); }} staffList={staffUsers} />

            <GlobalPayoutModal
                open={globalPayoutOpen}
                onClose={() => setGlobalPayoutOpen(false)}
                staffUsers={staffUsers}
                onCompleted={() => { fetchWageProfiles(); }}
            />

            <PayslipModal employee={payslipUser} onClose={() => setPayslipUser(null)} />

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

            <WageProfileModal user={wageEditUser} onClose={() => setWageEditUser(null)} onSaved={fetchWageProfiles} />

            <style>{`
                .input { width: 100%; background: rgb(249 250 251); border: 1px solid rgb(229 231 235); border-radius: 0.75rem; padding: 0.55rem 0.75rem; font-size: 0.8rem; }
                .input:focus { outline: none; border-color: rgb(249 115 22); background: white; }
            `}</style>
        </div>
    );
                        }
