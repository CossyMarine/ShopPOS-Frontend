import {
    LayoutDashboard, Boxes, ReceiptText, CreditCard,
    ShieldAlert, Users, Store, Settings, LogOut,
    UtensilsCrossed as Logo,
} from 'lucide-react';

export const ADMIN_NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', label: 'Products & Stock', icon: Boxes },
    { id: 'orders', label: 'Sales & Receipts', icon: ReceiptText },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'voids', label: 'Void Requests', icon: ShieldAlert },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'branches', label: 'Branches', icon: Store },
    { id: 'settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar({
    activeView, onNavigate, user, onLogout, pendingPaymentsCount = 0,
    navItems = ADMIN_NAV_ITEMS, title = 'Management Console', extra = null,
}) {
    return (
        <aside className="w-64 bg-slate-900 h-screen sticky top-0 flex flex-col justify-between shrink-0 shadow-lg z-20">
            <div className="p-6">
                <div className="flex items-center gap-2">
                    <Logo size={20} className="text-orange-500" />
                    <span className="font-black text-lg text-white">
                        Babylon<span className="text-orange-500">POS</span>
                    </span>
                </div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-500 mt-0.5">
                    {title}
                </p>

                {extra}

                <nav className="mt-8 space-y-1">
                    {navItems.map(({ id, label, icon: Icon }) => {
                        const active = activeView === id;
                        const badge = id === 'payments' ? pendingPaymentsCount : 0;
                        return (
                            <button
                                key={id}
                                onClick={() => onNavigate(id)}
                                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-3 transition-all ${
                                    active
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-orange-400'
                                }`}
                            >
                                <Icon size={16} />
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

            <div className="p-6 border-t border-slate-800 bg-slate-950/30">
                <p className="text-xs text-slate-500 font-medium truncate mb-3">
                    {user?.fullName || 'Authorized User'}
                </p>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm font-semibold transition-colors"
                >
                    <LogOut size={16} />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
