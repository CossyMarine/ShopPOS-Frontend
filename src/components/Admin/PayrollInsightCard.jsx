// components/Admin/PayrollInsightCard.jsx
import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import API from '../../api/axios';

export default function PayrollInsightCard({ userId }) {
    const [insight, setInsight] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchInsight = async () => {
        setLoading(true);
        try {
            const res = await API.get('/payroll/insight', { params: userId ? { userId } : {} });
            setInsight(res.data);
        } catch {
            setInsight({ summary: "Couldn't generate an insight right now.", notes: [] });
        }
        setLoading(false);
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-extrabold text-gray-700 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-500" /> AI Payroll Read
                </h4>
                <button onClick={fetchInsight} disabled={loading} className="text-gray-400 hover:text-purple-500">
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>
            {!insight && !loading && <p className="text-[11px] text-gray-400">Tap refresh to get a quick read on this.</p>}
            {insight && (
                <div className="space-y-1.5">
                    <p className="text-xs text-gray-700 font-semibold">{insight.summary}</p>
                    {(insight.notes || []).map((n, i) => <p key={i} className="text-[11px] text-gray-500">• {n}</p>)}
                </div>
            )}
        </div>
    );
}
