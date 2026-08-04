import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, UserCircle2, Receipt } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import API from '../api/axios';
import ClockWidget from '../components/Staff/ClockWidget';
import LeavePanel from '../components/Staff/LeavePanel';

export default function StaffPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [payslips, setPayslips] = useState([]);

    useEffect(() => {
        API.get('/payroll/mine')
            .then((res) => setPayslips(res.data))
            .catch((err) => console.error('Failed to load payslips', err));
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-sm">
                <div>
                    <h1 className="font-extrabold text-sm sm:text-base text-gray-900">
                        {user?.jobTitle || 'Staff'} Dashboard
                    </h1>
                    <span className="text-[10px] font-bold text-gray-400">{user?.fullName}</span>
                </div>

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

            <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto">
                <ClockWidget />
                <LeavePanel />

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                    <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2 mb-3">
                        <Receipt size={16} className="text-brand-orange" /> My Payslips
                    </h3>
                    {payslips.length === 0 ? (
                        <p className="text-xs text-gray-400">No paid payslips yet</p>
                    ) : (
                        payslips.map((p) => (
                            <div key={p._id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                                <span className="text-xs font-bold text-gray-700">{p.period}</span>
                                <span className="text-xs font-black text-brand-orange">
                                    {Math.round(p.netPayable).toLocaleString()} KES
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
