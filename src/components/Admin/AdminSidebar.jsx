import {
    LayoutDashboard, Boxes, ReceiptText, CreditCard,
    ShieldAlert, Users, Store, Settings, ClipboardList, LogOut, X, Brain, BarChart3,ArrowRightLeft, Tag,
    
} from 'lucide-react';

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

export default function AdminSidebar({
    activeView, onNavigate, user, onLogout, pendingPaymentsCount = 0,
    navItems = ADMIN_NAV_ITEMS, title = 'Management Console', extra = null,
    isOpen = false, onClose = () => {},
}) {
    const initials = (user?.fullName || 'A')
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

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
                className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white h-screen md:sticky md:top-0 flex flex-col justify-between shrink-0 border-r border-gray-200 shadow-sm transform transition-transform duration-200 ease-in-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                } md:translate-x-0`}
            >
                <div>
                    {/* Brand header */}
                    <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-brand-orange flex items-center justify-center font-bold text-lg text-white shadow-md">
                                B
                            </div>
                            <div>
                                <h1 className="font-extrabold text-base leading-none text-gray-900">
                                    Babylon<span className="text-brand-orange">POS</span>
                                </h1>
                                <span className="text-[11px] uppercase tracking-wider font-bold text-gray-500">
                                    {title}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="md:hidden text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {extra && <div className="px-4 pt-4">{extra}</div>}

                    <nav className="px-4 py-4 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
                        {navItems.map(({ id, label, icon: Icon }) => {
                            const active = activeView === id;
                            const badge = id === 'payments' ? pendingPaymentsCount : 0;
                            return (
                                <button
                                    key={id}
                                    onClick={() => handleNavigate(id)}
                                    className={`w-full text-left flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                                        active
                                            ? 'bg-brand-orange text-white shadow-sm'
                                            : 'text-gray-600 hover:bg-brand-orange-light hover:text-brand-orange'
                                    }`}
                                >
                                    <Icon size={16} className="w-5" />
                                    <span className="flex-1">{label}</span>
                                    {badge > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                                            {badge > 9 ? '9+' : badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* User profile / footer */}
                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center space-x-3 p-2 rounded-lg bg-orange-50/60 border border-orange-100">
                        <div className="w-9 h-9 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold border border-brand-orange-hover shrink-0">
                            {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate">
                                {user?.fullName || 'Authorized User'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                                {user?.isAdmin ? 'Store Owner (SuperAdmin)' : (user?.role || 'Staff')}
                            </p>
                        </div>
                        <button
                            title="Logout"
                            onClick={onLogout}
                            className="text-gray-400 hover:text-brand-orange transition shrink-0"
                        >
                            <LogOut size={16} />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
                }
