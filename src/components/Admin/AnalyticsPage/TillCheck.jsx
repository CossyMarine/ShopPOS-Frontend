import { money } from './utils';

export default function TillCheck({ till }) {
    const rows = till?.rows || [];
    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-sm font-extrabold text-gray-900">Till Check, Closed Shifts</h2>
            <p className="text-xs text-gray-500">Expected cash = opening float + cash sales - petty cash. Counted cash is what the cashier entered when closing the shift.</p>
            {rows.length === 0 ? (
                <p className="text-xs text-gray-400 mt-3">No closed shifts in this range.</p>
            ) : (
                <div className="overflow-x-auto mt-3">
                    <table className="w-full text-left text-xs">
                        <thead><tr className="text-[10px] font-black uppercase text-gray-400 tracking-wider border-b border-gray-100">
                            <th className="py-2 pr-3">Day</th><th className="py-2 pr-3">Cashier</th><th className="py-2 pr-3 text-right">Expected</th><th className="py-2 pr-3 text-right">Counted</th><th className="py-2 text-right">Difference</th>
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                            {rows.map((r) => (
                                <tr key={r.shiftId}>
                                    <td className="py-2 pr-3">{r.date}</td><td className="py-2 pr-3">{r.cashier}</td>
                                    <td className="py-2 pr-3 text-right font-mono">{money(r.expected)}</td><td className="py-2 pr-3 text-right font-mono">{money(r.counted)}</td>
                                    <td className={`py-2 text-right font-mono font-bold ${r.difference < -50 ? 'text-red-600' : r.difference > 50 ? 'text-amber-600' : 'text-gray-500'}`}>
                                        {Math.abs(r.difference) <= 50 ? 'Balanced' : `${r.difference < 0 ? 'Short' : 'Over'} ${money(Math.abs(r.difference))}`}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
