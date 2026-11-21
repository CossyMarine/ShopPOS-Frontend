import { useState } from 'react';
import useFetch from './useFetch';
import { fmtStamp } from './utils';

const TYPES = ['All', 'Stock loss', 'Void', 'Below-cost sale', 'Till difference'];

export default function AuditTrail({ params, onPickDay }) {
    const [type, setType] = useState('All');
    const { data, loading, error } = useFetch('/analytics/audit', { ...params, type, limit: 15 });
    const events = data?.events || [];
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-5 pb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="text-sm font-extrabold text-gray-900">Record of Events</h2>
                    <p className="text-xs text-gray-500">Every loss report, void, below-cost sale and till difference, with who did it. Click a line to open that day.</p>
                </div>
                <select value={type} onChange={(e) => setType(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
                    {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
            </div>
            {error && <p className="text-xs text-red-600 font-bold px-5">{error}</p>}
            {!data && loading && <p className="text-xs text-gray-400 px-5 pb-5">Loading…</p>}
            {data && events.length === 0 && <p className="text-xs text-gray-400 px-5 pb-5">No records in this range.</p>}
            {events.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead><tr className="text-[10px] font-black uppercase text-gray-400 tracking-wider border-b border-gray-100">
                            <th className="px-5 py-2">When</th><th className="py-2 pr-3">Type</th><th className="py-2 pr-3">What happened</th><th className="py-2 pr-3">Done by</th><th className="py-2 pr-5">Reference</th>
                        </tr></thead>
                        <tbody>
                            {events.map((e, i) => (
                                <tr key={`${e.ref}-${i}`} onClick={() => e.date && onPickDay(e.date)} className="border-b border-gray-50 cursor-pointer hover:bg-gray-50">
                                    <td className="px-5 py-2 whitespace-nowrap">{fmtStamp(e.ts)}</td><td className="py-2 pr-3 whitespace-nowrap">{e.type}</td>
                                    <td className="py-2 pr-3">{e.what}</td><td className="py-2 pr-3 whitespace-nowrap">{e.by}</td><td className="py-2 pr-5 whitespace-nowrap">{e.ref}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {data && <p className="text-[11px] text-gray-400 p-5 pt-3">Showing the latest {events.length} of {data.total} records in this period.</p>}
        </div>
    );
}
