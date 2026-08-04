import { useState, useEffect } from 'react';
import { Clock, LogIn, LogOut } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

// Live clock-in/out widget. Reused on StaffPage and StorekeeperPage —
// attendance is generic across any non-cashier role.
export default function ClockWidget() {
    const [current, setCurrent] = useState(null); // open Attendance record or null
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [elapsed, setElapsed] = useState('00:00:00');

    const fetchCurrent = async () => {
        try {
            const res = await API.get('/attendance/current');
            setCurrent(res.data);
        } catch (err) {
            console.error('Failed to fetch attendance status', err);
        }
        setLoading(false);
    };

    useEffect(() => { fetchCurrent(); }, []);

    // Live-ticking elapsed time while clocked in
    useEffect(() => {
        if (!current) return;
        const tick = () => {
            const ms = Date.now() - new Date(current.createdAt).getTime();
            const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
            const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
            const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
            setElapsed(`${h}:${m}:${s}`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [current]);

    const handleClockIn = async () => {
        setWorking(true);
        try {
            const res = await API.post('/attendance/clock-in');
            setCurrent(res.data);
            toast.success('Clocked in');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to clock in');
        }
        setWorking(false);
    };

    const handleClockOut = async () => {
        setWorking(true);
        try {
            await API.post('/attendance/clock-out');
            setCurrent(null);
            toast.success('Clocked out');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to clock out');
        }
        setWorking(false);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 animate-pulse h-24" />
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${current ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Clock size={18} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                        {current ? 'Clocked in since' : 'Not clocked in'}
                    </p>
                    <p className="text-sm font-extrabold text-gray-900">
                        {current
                            ? `${new Date(current.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${elapsed}`
                            : 'Tap to start your shift'}
                    </p>
                </div>
            </div>

            {current ? (
                <button
                    onClick={handleClockOut}
                    disabled={working}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-600 hover:text-white text-red-600 text-xs font-extrabold rounded-xl transition disabled:opacity-50"
                >
                    <LogOut size={14} /> Clock Out
                </button>
            ) : (
                <button
                    onClick={handleClockIn}
                    disabled={working}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-extrabold rounded-xl transition disabled:opacity-50"
                >
                    <LogIn size={14} /> Clock In
                </button>
            )}
        </div>
    );
                        }
