import { Barcode, Lock, ShieldAlert, History, UserCircle2, LogOut } from 'lucide-react';
import { formatKenyanDate, formatKenyanTime } from '../../utils/formatDate';
import useNow from './hooks/useNow';
import { initialsOf } from './utils';

export default function CashierHeader({
    storeName,
    user,
    onOpenHistory,
    onOpenVoid,
    onGoToDashboard,
    onLogout,
    onOpenCloseShift,
}) {
    const now = useNow();

    return (
        <header className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-brand-orange flex items-center justify-center font-extrabold text-lg text-white shadow-md shrink-0">
                    {(storeName || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <h1 className="font-extrabold text-sm sm:text-base leading-none text-gray-900 truncate">{storeName || 'Point of Sale'}</h1>
                    <span className="text-[11px] font-semibold text-brand-orange">
                        {formatKenyanDate(now, { weekday: 'short', day: '2-digit', month: 'short' })} · {formatKenyanTime(now)} EAT
                    </span>
                </div>
                <div className="h-6 w-px bg-gray-200 hidden md:block" />
                <div className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-lg shrink-0">
                    <Barcode size={13} className="text-brand-orange" />
                    Register #1
                </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button onClick={onOpenHistory} title="Bill history & voids"
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                    <History size={14} />
                    <span className="hidden sm:inline">History</span>
                </button>

                <button onClick={onOpenVoid} title="Request void on a specific bill"
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition">
                    <ShieldAlert size={14} />
                    <span className="hidden sm:inline">Void</span>
                </button>

                <button onClick={onGoToDashboard} title="Customer Dashboard"
                    className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                    <UserCircle2 size={14} />
                    <span className="hidden sm:inline">Customer Dashboard</span>
                </button>

                <div className="flex items-center gap-2 bg-orange-50/80 px-2 py-1.5 rounded-lg border border-orange-100 shrink-0">
                    <div className="w-7 h-7 rounded-full bg-brand-orange text-white text-xs flex items-center justify-center font-bold shrink-0">
                        {initialsOf(user.fullName)}
                    </div>
                    <div className="text-left hidden md:block">
                        <p className="text-xs font-bold text-gray-900 leading-none truncate max-w-[100px]">{user.fullName}</p>
                        <span className="text-[10px] text-gray-500 font-medium">Shift Active</span>
                    </div>
                </div>

                <button onClick={onLogout} title="Log out"
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <LogOut size={16} />
                </button>

                <button onClick={onOpenCloseShift} title="Close register / lock shift"
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Lock size={16} />
                </button>
            </div>
        </header>
    );
}
