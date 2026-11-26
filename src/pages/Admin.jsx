import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createSocket } from '../lib/socket';
import { toast } from 'react-toastify';
import { Menu } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import useStoreInfo from '../hooks/useStoreInfo';
import { BranchProvider, useBranch } from '../context/BranchContext';
import API from '../api/axios';
import AdminSidebar, { ADMIN_NAV_ITEMS } from '../components/Admin/AdminSidebar';
import BranchSelector from '../components/Admin/BranchSelector';
import ViewSwitcher from '../components/Admin/ViewSwitcher';
import DashboardOverview from '../components/Admin/DashboardOverview';
import Reminders from '../components/Admin/Reminders';
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
import StockTransfers from '../components/Storekeeper/StockTransfers';
import PricingPromotions from '../components/Admin/PricingPromotions';


const VIEWS = {
    dashboard: DashboardOverview,
    analytics: AnalyticsPage,
    products: ProductManagement,
    transfers: StockTransfers,
    pricing: PricingPromotions,
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
    const { storeName, currency } = useStoreInfo();
    const [activeView, setActiveView] = useState('dashboard');
    const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Reminders live here (not inside the dashboard) so their due-checks,
    // toasts and browser notifications keep running on every tab.
    const [rmOpen, setRmOpen] = useState(false);
    const [rmDue, setRmDue] = useState(0);

    // Refs so the socket listener always sees the latest values without reconnecting
    const activeViewRef = useRef(activeView);
    activeViewRef.current = activeView;
    const currencyRef = useRef(currency);
    currencyRef.current = currency;

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
        const socket = createSocket();
        if (selectedBranch) socket.emit('join_room', `branch:${selectedBranch}`);

        socket.on('receipt:manualPending', (payload) => {
            fetchPendingCount();
            if (activeViewRef.current !== 'payments') {
                const latest = payload?.receipt?.pendingManualPayments?.slice(-1)[0];
                toast.info(
                    `New pending payment on ${payload?.receipt?.billId || 'a bill'}${
                        latest ? ` — ${currencyRef.current} ${Number(latest.amount).toLocaleString()}` : ''
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

    // Same theme the sidebar uses, so the reminders button and panel pick up
    // the user's accent colour outside the dashboard too.
    const theme = user?.dashboardPrefs?.theme || 'classic';

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
                extra={
                    <div className="space-y-2">
                        <BranchSelector />
                        {user?.isAdmin && <ViewSwitcher />}
                    </div>
                }
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile topbar */}
                <div className="md:hidden flex items-center justify-between gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open menu"
                        className="text-gray-600 hover:text-gray-900"
                    >
                        <Menu size={22} />
                    </button>
                    <span className="font-hand text-2xl font-bold leading-none text-gray-900 truncate">
                        {storeName || 'Point of Sale'}
                    </span>
                    <div className="w-6 shrink-0" /> {/* spacer for centering */}
                </div>

                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <ActiveComponent
                        onPendingChange={fetchPendingCount}
                        branch={selectedBranch}
                        rmDue={rmDue}
                        onOpenReminders={() => setRmOpen(true)}
                    />
                </main>
            </div>

            {/* `contents` keeps this wrapper out of the flex layout; it only supplies the theme colours */}
            <div className="dtheme contents" data-theme={theme}>
                <Reminders
                    open={rmOpen}
                    onOpen={() => setRmOpen(true)}
                    onClose={() => setRmOpen(false)}
                    onDue={setRmDue}
                />
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
