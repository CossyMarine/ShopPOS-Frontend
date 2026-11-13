import {
    LayoutDashboard, Boxes, ReceiptText, CreditCard,
    ShieldAlert, Users, Store, Settings, ClipboardList, LogOut, X, Brain, BarChart3, ArrowRightLeft, Tag,
} from 'lucide-react';
import useStoreInfo from '../../hooks/useStoreInfo';

export const ADMIN_NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'products', label: 'Products & Stock', icon: Boxes },
    { id: 'transfers', label: 'Stock Transfers', icon: ArrowRightLeft },
    { id: 'pricing', label: 'Pricing & Promotions', icon: Tag },
    { id: 'orders', label: 'Sales & Receipts', icon: ReceiptText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'voids', label: 'Void Requests', icon: ShieldAlert },
    { id: 'stock-adjustments', label: 'Stock Loss & Audit', icon: ClipboardList },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'ai-insights', label: 'AI Store Insights', icon: Brain },
    { id: 'branches', label: 'Branches', icon: Store },
    { id: 'settings', label: 'Settings', icon: Settings },
];

const ROLE_LABELS = {
    branchManager: 'Branch Manager',
    cashier: 'Cashier',
    storekeeper: 'Storekeeper',
    accountant: 'Accountant',
    staff: 'Staff',
};

export default function AdminSidebar({
    activeView, onNavigate, user, onLogout, pendingPaymentsCount = 0,
    navItems = ADMIN_NAV_ITEMS, title = 'Management console', extra = null,
    isOpen = false, onClose = () => {},
    theme, // optional override; defaults to the theme saved on the user's account
}) {
    const { storeName } = useStoreInfo();
    const activeTheme = theme || user?.dashboardPrefs?.theme || 'classic';

    const initials = (user?.fullName || 'A')
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    const roleLabel = user?.isAdmin
        ? 'Store Owner (SuperAdmin)'
        : (ROLE_LABELS[user?.role] || user?.role || 'Staff');

    const handleNavigate = (id) => {
        onNavigate(id);
        onClose(); // auto-close on mobile after picking a page
    };

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 bg-black/40 z-40 md:hidden"
                />
            )}

            <aside
                className={`fixed md:sticky inset-y-0 left-0 z-50 md:top-0 w-72 h-screen p-2 md:p-4 shrink-0 transform transition-transform duration-200 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                } md:translate-x-0`}
            >
                <div className="dtheme dcard h-full flex flex-col p-5 md:p-6" data-theme={activeTheme}>
                    {/* Brand header */}
                    <div className="pb-5 mb-4 border-b border-slate-100">
                        <div className="flex items-start justify-between gap-2">
                            <h1
                                className="font-hand text-accent text-[2.2rem] leading-[1.05] font-bold break-words"
                                title={storeName || undefined}
                            >
                                {storeName || 'Point of Sale'}
                            </h1>
                            <button
                                onClick={onClose}
                                aria-label="Close menu"
                                className="md:hidden text-slate-400 hover:text-slate-600 mt-1 shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <svg viewBox="0 0 200 10" className="w-36 mt-1" fill="none" aria-hidden="true">
                            <path
                                d="M2 6 C 30 1, 60 9, 95 5 S 160 2, 198 6"
                                stroke="var(--accent)"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                            />
                        </svg>
                        <p className="mt-3 text-[11px] uppercase tracking-[.14em] text-slate-400">{title}</p>
                    </div>

                    {extra && <div className="mb-4">{extra}</div>}

                    <nav className="flex-1 min-h-0 overflow-y-auto space-y-0.5 -mr-2 pr-2">
                        {navItems.map(({ id, label, icon: Icon }) => {
                            const active = activeView === id;
                            const badge = id === 'payments' ? pendingPaymentsCount : 0;
                            return (
                                <button
                                    key={id}
                                    onClick={() => handleNavigate(id)}
                                    aria-current={active ? 'page' : undefined}
                                    className={`w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-[0.84rem] transition-colors ${
                                        active
                                            ? 'bg-accent-soft text-accent font-semibold'
                                            : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    <Icon size={16} className="w-5 shrink-0" />
                                    <span className="flex-1">{label}</span>
                                    {badge > 0 && (
                                        <span className="bg-accent text-white text-[10px] font-semibold min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center">
                                            {badge > 9 ? '9+' : badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* User profile / footer */}
                    <div className="pt-4 mt-4 border-t border-slate-100">
                        <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50">
                            <div className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center text-sm font-semibold shrink-0">
                                {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">
                                    {user?.fullName || 'Authorized User'}
                                </p>
                                <p className="text-xs text-slate-500 truncate">{roleLabel}</p>
                            </div>
                            <button
                                title="Logout"
                                aria-label="Logout"
                                onClick={onLogout}
                                className="text-slate-400 hover:text-accent transition-colors shrink-0"
                            >
                                <LogOut size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
                            }
