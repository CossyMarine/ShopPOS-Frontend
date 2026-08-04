import { useState, useEffect } from 'react';
import { CalendarPlus, X, Clock3, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

const STATUS_STYLES = {
    pending:  { icon: Clock3, cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { icon: CheckCircle2, cls: 'bg-green-50 text-green-700 border-green-200' },
    rejected: { icon: XCircle, cls: 'bg-red-50 text-red-700 border-red-200' },
};

export default function LeavePanel() {
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ type: 'paid', from: '', to: '', reason: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchLeaves = async () => {
        try {
            const res = await API.get('/leave/mine');
            setLeaves(res.data);
        } catch (err) {
            console.error('Failed to load leave requests', err);
        }
        setLoading(false);
    };

    useEffect(() => { fetchLeaves(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.from || !form.to) return toast.error('Pick both dates');
        setSubmitting(true);
        try {
            await API.post('/leave', form);
            toast.success('Leave request submitted');
            setForm({ type: 'paid', from: '', to: '', reason: '' });
            fetchLeaves();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to submit request');
        }
        setSubmitting(false);
    };

    const handleCancel = async (id) => {
        try {
            await API.delete(`/leave/${id}`);
            toast.success('Request cancelled');
            fetchLeaves();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to cancel');
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
            <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                <CalendarPlus size={16} className="text-brand-orange" /> Request Leave
            </h3>

            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2">
                <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="col-span-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold px-3 py-2"
                >
                    <option value="paid">Paid Leave</option>
                    <option value="unpaid">Unpaid Leave</option>
                </select>
                <input type="date" required value={form.from}
                    onChange={(e) => setForm({ ...form, from: e.target.value })}
                    className="bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold px-3 py-2" />
                <input type="date" required value={form.to}
                    onChange={(e) => setForm({ ...form, to: e.target.value })}
                    className="bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold px-3 py-2" />
                <input type="text" placeholder="Reason (optional)" value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="col-span-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold px-3 py-2" />
                <button type="submit" disabled={submitting}
                    className="col-span-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-extrabold rounded-xl py-2 transition disabled:opacity-50">
                    Submit Request
                </button>
            </form>

            <div className="space-y-2 pt-2 border-t border-gray-100">
                {loading ? (
                    <p className="text-xs text-gray-400">Loading…</p>
                ) : leaves.length === 0 ? (
                    <p className="text-xs text-gray-400">No leave requests yet</p>
                ) : leaves.map((lv) => {
                    const s = STATUS_STYLES[lv.status];
                    const Icon = s.icon;
                    return (
                        <div key={lv._id} className={`flex items-center justify-between border rounded-xl px-3 py-2 ${s.cls}`}>
                            <div className="flex items-center gap-2">
                                <Icon size={14} />
                                <div>
                                    <p className="text-xs font-extrabold">
                                        {lv.type === 'paid' ? 'Paid' : 'Unpaid'} · {new Date(lv.from).toLocaleDateString()} – {new Date(lv.to).toLocaleDateString()}
                                    </p>
                                    {lv.reason && <p className="text-[10px] opacity-75">{lv.reason}</p>}
                                </div>
                            </div>
                            {lv.status === 'pending' && (
                                <button onClick={() => handleCancel(lv._id)} title="Cancel request"
                                    className="p-1 hover:bg-white/50 rounded-lg transition">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
