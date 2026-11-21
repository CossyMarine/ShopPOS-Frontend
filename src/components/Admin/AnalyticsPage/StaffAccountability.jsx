import useFetch from './useFetch';
import { money } from './utils';

export default function StaffAccountability({ params }) {
    const { data, loading, error } = useFetch('/analytics/staff', params);
    const rows = data?.rows || [];
    const avg = data?.avgVoidRate || 0;
    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-sm font-extrabold text-gray-900">Staff Accountability</h2>
            <p className="text-xs text-gray-500">A staff member whose voids or loss reports are far above the others deserves a conversation, not an assumption.</p>
            {error && <p className="text-xs text-red-600 font-bold mt-2">{error}</p>}
            {!data && loading && <p className="text-xs text-gray-400 mt-3">Loading…</p>}
            {data && rows.length === 0 && <p className="text-xs text-gray-400 mt-3">No staff activity in this range.</p>}
            {rows.length > 0 && (
                <div className="overflow-x-auto mt-3">
                    <table className="w-full text-left text-xs">
                        <thead><tr className="text-[10px] font-black uppercase text-gray-400 tracking-wider border-b border-gray-100">
                            <th className="py-2 pr-3">Staff</th><th className="py-2 pr-3 text-right">Sales</th><th className="py-2 pr-3 text-right">Voids</th><th className="py-2 pr-3 text-right">Void rate</th><th className="py-2 pr-3 text-right">Loss reports</th><th className="py-2" />
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                            {rows.map((r) => {
                                const rate = r.sales ? (r.voidAmount / r.sales) * 100 : 0;
                                const flag = r.voidCount >= 2 && rate > avg * 1.5;
                                return (
                                    <tr key={r.name}>
                                        <td className="py-2 pr-3 font-semibold text-gray-800">{r.name}</td>
                                        <td className="py-2 pr-3 text-right font-mono">{money(r.sales)}</td>
                                        <td className="py-2 pr-3 text-right font-mono">{r.voidCount} ({money(r.voidAmount)})</td>
                                        <td className="py-2 pr-3 text-right font-mono">{rate.toFixed(2)}%</td>
                                        <td className="py-2 pr-3 text-right font-mono">{r.lossReports} ({money(r.lossCost)})</td>
                                        <td className="py-2 text-right">{flag && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Review voids</span>}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
            {data && <p className="text-[11px] text-gray-400 mt-3">Shop average void rate: {avg.toFixed(2)}% of sales.</p>}
        </div>
    );
}
