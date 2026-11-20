import { useNavigate, Navigate } from 'react-router-dom';
import { LogOut, UserCircle2, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import ProductManagement from "../components/Storekeeper/ProductManagement";
import ClockWidget from "../components/Staff/ClockWidget";
import LeavePanel from "../components/Staff/LeavePanel";
import StockTransfers from "../components/Storekeeper/StockTransfers";
import { STORE_NAME } from "../components/Storekeeper/productManagementUtils";

export default function StorekeeperPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isAdmin = !!user?.isAdmin;

  // An admin working as storekeeper uses the branch he selected in the dashboard
  const adminBranch = isAdmin ? user.selectedBranch : null;
  if (isAdmin && !adminBranch) return <Navigate to="/admin" replace />;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-sm">
        <div className="min-w-0">
          <h1 className="font-black text-sm sm:text-base text-gray-900 truncate">{STORE_NAME}</h1>
          <p className="text-[11px] font-semibold text-brand-orange -mt-0.5">
            {isAdmin ? 'Admin · Storekeeper' : 'Storekeeper'}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
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
        {/* Attendance and leave are for employees, not the owner */}
        {!isAdmin && <ClockWidget />}
        {!isAdmin && <LeavePanel />}
        <ProductManagement branch={adminBranch || undefined} />
        <StockTransfers branch={adminBranch || undefined} />
      </div>
    </div>
  );
}
