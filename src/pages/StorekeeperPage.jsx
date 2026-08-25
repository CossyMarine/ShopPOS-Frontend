import { useNavigate } from 'react-router-dom';
import { LogOut, UserCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import ProductManagement from "../components/Storekeeper/ProductManagement";
import ClockWidget from "../components/Staff/ClockWidget";
import LeavePanel from "../components/Staff/LeavePanel";
import StockTransfers from "../components/Storekeeper/StockTransfers";

export default function StorekeeperPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-sm">
        <h1 className="font-extrabold text-sm sm:text-base text-gray-900">Storekeeper</h1>

        <div className="flex items-center gap-1.5 sm:gap-2">
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
        <ClockWidget />
        <LeavePanel />
        <ProductManagement />
        <StockTransfers />
      </div>
    </div>
  );
}
