import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { Menu } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { BranchProvider, useBranch } from '../context/BranchContext';
import API from '../api/axios';
import AdminSidebar, { ADMIN_NAV_ITEMS } from '../components/Admin/AdminSidebar';
import BranchSelector from '../components/Admin/BranchSelector';
import DashboardOverview from '../components/Admin/DashboardOverview';
import ProductManagement from '../components/Storekeeper/ProductManagement';
import OrdersLedger from '../components/Admin/OrdersLedger';
import PaymentsView from '../components/Admin/PaymentsView';
import VoidRequestsView from '../components/Admin/VoidRequestsView';
import StaffManagement from '../components/Admin/StaffManagement';
import BranchesManagement from '../components/Admin/BranchesManagement';
import SettingsManagement from '../components/Admin/SettingsManagement';
import AiInsights from '../components/Admin/AiInsights';
import AnalyticsPage from '../components/Admin/AnalyticsPage';
import StockAdjustmentsView from '../components/Admin/StockAdjustmentsView';


const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

const VIEWS = {
    dashboard: DashboardOverview,
    analytics: AnalyticsPage,
    products: ProductManagement,
    orders: OrdersLedger,
    payments: PaymentsView,
    voids: VoidRequestsView,
    'stock-adjustments': StockAdjustmentsView,
    staff: StaffManagement,
    'ai-insights': AiInsights,
    branches: BranchesManagement,
    settings: SettingsManagement,
};

function AdminInner() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { selectedBranch } = useBranch();
    const [activeView, setActiveView] = useState('dashboard');
    const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const activeViewRef = useRef(activeView);
    activeViewRef.current = activeView;

    const fetchPendingCount = useCallback(() => {
        const params = selectedBranch ? { branch: selectedBranch } : {};
        API.get('/payments/pending/count', { params })
            .then((res) => setPendingPaymentsCount(res.data.count || 0))
            .catch(() => {});
    }, [selectedBranch]);

    useEffect(() => {
        fetchPendingCount();
    }, [fetchPendingCount]);

    useEffect(() => {
        const socket = io(SOCKET_URL);
        if (selectedBranch) socket.emit('join_room', `branch:${selectedBranch}`);

        socket.on('receipt:manualPending', (payload) => {
            fetchPendingCount();
            if (activeViewRef.current !== 'payments') {
                const latest = payload?.receipt?.pendingManualPayments?.slice(-1)[0];
                toast.info(
                    `New pending payment on ${payload?.receipt?.billId || 'a bill'}${
                        latest ? ` — KES ${Number(latest.amount).toLocaleString()}` : ''
                    }`
                );
            }
        });
        socket.on('receipt:manualPaymentResolved', () => fetchPendingCount());
        return () => socket.disconnect();
    }, [fetchPendingCount, selectedBranch]);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const navItems = user?.isAdmin
        ? ADMIN_NAV_ITEMS
        : ADMIN_NAV_ITEMS.filter((item) => item.id !== 'branches');

    const ActiveComponent = VIEWS[activeView] || DashboardOverview;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 flex">
            <AdminSidebar
                activeView={activeView}
                onNavigate={setActiveView}
                user={user}
                onLogout={handleLogout}
                pendingPaymentsCount={pendingPaymentsCount}
                navItems={navItems}
                title={user?.isAdmin ? 'Super Admin' : 'Branch Manager'}
                extra={<BranchSelector />}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile topbar */}
                <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-gray-600 hover:text-brand-orange"
                    >
                        <Menu size={22} />
                    </button>
                    <span className="font-extrabold text-sm text-gray-900">
                        Babylon<span className="text-brand-orange">POS</span>
                    </span>
                    <div className="w-6" /> {/* spacer for centering */}
                </div>

                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <ActiveComponent onPendingChange={fetchPendingCount} branch={selectedBranch} />
                </main>
            </div>
        </div>
    );
}

export default function Admin() {
    return (
        <BranchProvider>
            <AdminInner />
        </BranchProvider>
    );
}
