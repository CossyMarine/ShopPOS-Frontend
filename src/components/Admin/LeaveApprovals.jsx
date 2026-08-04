import { useState, useEffect } from 'react';
import { CalendarCheck, Check, X } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

export default function LeaveApprovals() {
    const [leaves, setLeaves] = useState([]);
    const [working, setWorking] = useState(null);

    const fetchPending = () => API.get('/leave/pending').then((res) => setLeaves(res.data)).catch(() => {});
    useEffect(() => { fetchPending(); }, []);

    const decide = async (id, decision) => {
        setWorking(id);
        try {
            await API.patch(`/leave/${id}/decide`, { decision });
            toast.success(`Leave ${decision}`);
            fetchPending();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to decide');
        }
        setWorking(null);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
                <CalendarCheck size={18} className="text-orange-500" /> Pending Leave ({leaves.length})
            </h3>
            {leaves.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">Nothing pending</p>
            ) : leaves.map((lv) => (
                <div key={lv._id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <div>
                        <p className="text-sm font-bold text-gray-800">{lv.user.fullName} <span className="text-gray-400 font-normal">· {lv.user.jobTitle || lv.user.role}</span></p>
                        <p className="text-xs text-gray-500">{lv.type} · {new Date(lv.from).toLocaleDateString()} – {new Date(lv.to).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1.5">
                        <button disabled={working === lv._id} onClick={() => decide(lv._id, 'approved')}
                            className="p-2 bg-green-50 hover:bg-green-600 hover:text-white text-green-700 rounded-lg transition"><Check size={15} /></button>
                        <button disabled={working === lv._id} onClick={() => decide(lv._id, 'rejected')}
                            className="p-2 bg-red-50 hover:bg-red-600 hover:text-white text-red-700 rounded-lg transition"><X size={15} /></button>
                    </div>
                </div>
            ))}
        </div>
    );
}
