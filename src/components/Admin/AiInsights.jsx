import { useState } from 'react';
import {
    Brain, Sparkles, AlertTriangle, PackageSearch, Fingerprint,
    Wallet, Loader2, CheckCircle2,
} from 'lucide-react';
import API from '../../api/axios';

const SECTIONS = [
    { key: 'alerts', title: 'Critical Operational Alerts', subtitle: 'Stockouts & transaction anomalies', icon: AlertTriangle, tint: 'bg-red-50 text-red-600', bullet: 'text-red-500' },
    { key: 'inventory', title: 'Stock & Margin Recommendations', subtitle: 'Automated reordering & bulk breakdowns', icon: PackageSearch, tint: 'bg-brand-orange-light text-brand-orange', bullet: 'text-brand-orange' },
    { key: 'workforce', title: 'Attendance & Overtime Insights', subtitle: 'Automated shift audit from clock-in data', icon: Fingerprint, tint: 'bg-green-50 text-green-600', bullet: 'text-green-600' },
    { key: 'payroll', title: 'Payroll & Wage Risk', subtitle: 'Payout scheduling and wage-profile flags', icon: Wallet, tint: 'bg-blue-50 text-blue-600', bullet: 'text-blue-600' },
];

export default function AiInsights({ branch } = {}) {
    const [status, setStatus] = useState('idle'); // idle | loading | done | error
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');

    const runAudit = async () => {
        setStatus('loading');
        setError('');
        try {
            const params = branch ? { branch } : {};
            const res = await API.get('/ai-insights/audit', { params });
            setResult(res.data);
            setStatus('done');
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to run AI store audit');
            setStatus('error');
        }
    };

    const metrics = result?.metrics || { criticalReorders: 0, overtimeHours: 0, pendingVoids: 0, bulkOpportunities: 0 };

    return (
        <div className="space-y-8">
            {/* Page heading */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">AI Store Insights & Diagnostics</h2>
                    <p className="text-sm text-gray-500">
                        Real-time analysis of stock risk, void anomalies, attendance, and payroll.
                    </p>
                </div>
                <button
                    onClick={runAudit}
                    disabled={status === 'loading'}
                    className="bg-brand-orange text-white hover:bg-brand-orange-hover disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold px-4 py-2.5 rounded-lg transition flex items-center gap-2 shadow-sm shrink-0"
                >
                    {status === 'loading' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    <span>{status === 'loading' ? 'Running audit...' : 'Run Store AI Audit'}</span>
                </button>
            </div>

            {/* Hero banner */}
            <div className="bg-brand-dark text-white rounded-xl shadow-md p-6 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-orange/20 rounded-full blur-2xl" />
                <div className="flex items-start gap-4 relative z-10">
                    <div className="w-12 h-12 bg-brand-orange rounded-xl flex items-center justify-center text-2xl shadow-md shrink-0">
                        <Brain size={22} />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white">Babylon AI Analytics Engine</h3>
                        <p className="text-xs text-brand-orange mt-0.5">Live audit across inventory, attendance, and payroll</p>
                        <p className="text-xs text-gray-400 mt-2 max-w-xl">
                            Pulls directly from your product, attendance, void-request, and wage-profile
                            records to surface reorder risk, overtime, and payout issues.
                        </p>
                    </div>
                </div>
            </div>

            {/* Metric cards — populated from the last audit run */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <MetricCard label="Critical Reorders" value={`${metrics.criticalReorders} Products`} tint="bg-amber-50 text-amber-600" icon={PackageSearch} note="Low stock risk" />
                <MetricCard label="Overtime Today" value={`${metrics.overtimeHours} Hours`} tint="bg-brand-orange-light text-brand-orange" icon={Fingerprint} note="Across all clocked staff" />
                <MetricCard label="Bulk-Break Opportunities" value={`${metrics.bulkOpportunities} Products`} tint="bg-green-50 text-green-600" icon={Sparkles} note="Carton/sack breakdown" />
                <MetricCard label="Pending Void Requests" value={String(metrics.pendingVoids)} tint="bg-red-50 text-red-600" icon={AlertTriangle} note="Requires review" danger={metrics.pendingVoids > 0} />
            </section>

            {/* Diagnostics output */}
            {status === 'idle' && (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-4 shadow-sm">
                    <div className="w-12 h-12 bg-brand-orange-light text-brand-orange rounded-xl flex items-center justify-center mx-auto">
                        <Brain size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">AI Diagnostic Engine Idle</h3>
                    <p className="text-gray-500 text-sm max-w-md mx-auto">
                        Click "Run Store AI Audit" to analyze current stock levels, void requests, attendance, and payroll.
                    </p>
                </div>
            )}

            {status === 'loading' && (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center space-y-4 shadow-sm">
                    <Loader2 size={28} className="animate-spin text-brand-orange mx-auto" />
                    <p className="text-gray-700 font-medium">Running store diagnostic & attendance analysis...</p>
                </div>
            )}

            {status === 'error' && (
                <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-2 shadow-sm">
                    <AlertTriangle className="text-red-500 mx-auto" size={24} />
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
            )}

            {status === 'done' && result && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {SECTIONS.map(({ key, title, subtitle, icon: Icon, tint, bullet }) => {
                        const items = result.insights?.[key] || [];
                        return (
                            <div key={key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
                                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tint}`}>
                                        <Icon size={15} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">{title}</h3>
                                        <p className="text-xs text-gray-500">{subtitle}</p>
                                    </div>
                                </div>
                                {items.length === 0 ? (
                                    <p className="text-xs text-gray-400 flex items-center gap-2">
                                        <CheckCircle2 size={14} className="text-green-500" /> Nothing to flag right now.
                                    </p>
                                ) : (
                                    <ul className="space-y-3">
                                        {items.map((item, i) => (
                                            <li key={i} className="flex items-start gap-3 bg-gray-50 p-3.5 rounded-lg border border-gray-200 text-sm text-gray-700">
                                                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${bullet.replace('text-', 'bg-')}`} />
                                                <span className="leading-relaxed font-medium">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function MetricCard({ label, value, note, tint, icon: Icon, danger = false }) {
    return (
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
                <p className={`text-xs mt-1 font-medium ${danger ? 'text-red-500' : 'text-gray-500'}`}>{note}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tint}`}>
                <Icon size={18} />
            </div>
        </div>
    );
              }
