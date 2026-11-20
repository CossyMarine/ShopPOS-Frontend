import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { LogOut, UserCircle2, LayoutDashboard, Store, ChevronDown } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import ProductManagement from "../components/Storekeeper/ProductManagement";
import ClockWidget from "../components/Staff/ClockWidget";
import LeavePanel from "../components/Staff/LeavePanel";
import StockTransfers from "../components/Storekeeper/StockTransfers";
import { STORE_NAME } from "../components/Storekeeper/productManagementUtils";

// Branch picker for an admin working as storekeeper (BranchProvider only
// wraps the Admin page, so this talks to the API directly).
function AdminBranchPicker({ value, onChange }) {
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    API.get('/branches')
      .then((res) => setBranches(res.data))
      .catch(() => toast.error('Could not load branches'));
  }, []);

  return (
    <div className="relative">
      <Store size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-orange pointer-events-none" />
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="appearance-none bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 pl-7 pr-6 py-1.5 max-w-[150px] sm:max-w-[220px] focus:outline-none focus:bg-white focus:border-brand-orange cursor-pointer"
      >
        <option value="">Select branch…</option>
        {branches.map((b) => (
          <option key={b._id} value={b._id}>{b.name}</option>
        ))}
      </select>
      <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

export default function StorekeeperPage() {
  const navigate = useNavigate();
  const { user, logout, setUser } = useAuth();
  const isAdmin = !!user?.isAdmin;

  // Admin works in the branch he selected; staff use their own branch
  const adminBranch = isAdmin ? (user.selectedBranch || null) : null;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Same call BranchContext uses, so the choice persists and Cashier/Admin stay in sync
  const changeBranch = async (branchId) => {
    try {
      const res = await API.patch('/auth/selected-branch', { branch: branchId });
      setUser?.(res.data.user);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to switch branch');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-sm gap-2">
        <div className="min-w-0">
          <h1 className="font-black text-sm sm:text-base text-gray-900 truncate">{STORE_NAME}</h1>
          <p className="text-[11px] font-semibold text-brand-orange -mt-0.5">
            {isAdmin ? 'Admin · Storekeeper' : 'Storekeeper'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isAdmin && <AdminBranchPicker value={adminBranch} onChange={changeBranch} />}

          {isAdmin && (
            <button onClick={() => navigate('/admin')} title="Back to Admin dashboard"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-gray-900 hover:bg-gray-700 rounded-lg transition">
              <LayoutDashboard size={14} />
              <span className="hidden sm:inline">Admin</span>
            </button>
          )}

          <button onClick={() => navigate('/home')} title="Customer Dashboard"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
            <UserCircle2 size={14} />
            <span className="hidden sm:inline">Customer Dashboard</span>
          </button>

          <button onClick={handleLogout} title="Log out"
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-6 space-y-4">
        {isAdmin && !adminBranch ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-6 text-center">
            <p className="font-bold text-sm">Select a branch to start working as Storekeeper</p>
            <p className="text-xs mt-1">Use the branch dropdown above, or tap Admin to go back to the dashboard.</p>
          </div>
        ) : (
          <>
            {/* Attendance and leave are for employees, not the owner */}
            {!isAdmin && <ClockWidget />}
            {!isAdmin && <LeavePanel />}
            {/* key forces a clean reload of data when the admin switches branch */}
            <ProductManagement key={adminBranch || 'own'} branch={adminBranch || undefined} />
            <StockTransfers key={`t-${adminBranch || 'own'}`} branch={adminBranch || undefined} />
          </>
        )}
      </div>
    </div>
  );
              }
