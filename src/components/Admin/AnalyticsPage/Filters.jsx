import { RefreshCw } from 'lucide-react';
import { RANGE_OPTIONS } from './constants';

export default function Filters({ range, setRange, from, to, setFrom, setTo, loading, onRefresh }) {
    return (
        <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-extrabold text-gray-900">Analytics</h1>
                    <p className="text-sm text-gray-500">Sales, profit, item performance and salary breakdown</p>
                </div>
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-brand-orange hover:text-brand-orange transition self-start"
                >
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                {RANGE_OPTIONS.map((opt) => (
                    <button
                        key={opt.id}
                        onClick={() => setRange(opt.id)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            range === opt.id
                                ? 'bg-brand-orange text-white shadow-sm'
                                : 'bg-gray-100 text-gray-600 hover:bg-brand-orange-light hover:text-brand-orange'
                        }`}
                    >
                        {opt.label}
                    </button>
                ))}
                {range === 'custom' && (
                    <div className="flex items-center gap-2 ml-1">
                        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-orange" />
                        <span className="text-xs text-gray-400">to</span>
                        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-orange" />
                    </div>
                )}
            </div>
        </>
    );
}
