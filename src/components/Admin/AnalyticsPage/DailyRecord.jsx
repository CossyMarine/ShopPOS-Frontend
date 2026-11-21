import { money, isDay, downloadCsv } from './utils';

export default function DailyRecord({ view, selected, onPickDay }) {
    if (!view.trend.length) return null;
    const monthly = !isDay(view.trend[0].date);
    const rows = view.trend.slice().reverse();
    const tot = rows.reduce((a, r) => ({
        sales: a.sales + r.sales, gross: a.gross + r.gross, stockLoss: a.stockLoss + r.stockLoss,
        pettyCash: a.pettyCash + r.pettyCash, profit: a.profit + r.profit,
    }), { sales: 0, gross: 0, stockLoss: 0, pettyCash: 0, profit: 0 });

    const csv = () => downloadCsv(
        `shoppos-${monthly ? 'monthly' : 'daily'}-record.csv`,
        ['Period', view.revenueLabel, 'Gross profit', 'Stock losses', 'Petty cash', 'Result before salaries'],
        rows.map((r) => [r.date, r.sales, r.gross, r.stockLoss, r.pettyCash, r.profit]),
    );

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="p-5 pb-2 flex items-start justify-between gap-2">
                <div>
                    <h2 className="text-sm font-extrabold text-gray-900">{monthly ? 'Month by Month Record' : 'Daily Record'}</h2>
                    <p className="text-xs text-gray-500">Every {monthly ? 'month' : 'day'} on one line. {monthly ? '' : 'Click a day to see exactly what happened.'}</p>
                </div>
                <button onClick={csv} className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:border-brand-orange hover:text-brand-orange">Download CSV</button>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-white">
                        <tr className="text-[10px] font-black uppercase text-gray-400 tracking-wider border-b border-gray-100">
                            <th className="px-5 py-2 text-left">Period</th>
                            <th className="px-3 py-2 text-right">{view.vOn ? 'Revenue (incl. VAT)' : 'Revenue'}</th>
                            <th className="px-3 py-2 text-right">Gross profit</th>
                            <th className="px-3 py-2 text-right">Stock losses</th>
                            <th className="px-3 py-2 text-right">Petty cash</th>
                            <th className="px-3 py-2 text-right">Result</th>
                            <th className="px-5 py-2" />
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr
                                key={r.date} onClick={() => isDay(r.date) && onPickDay(r.date)}
                                className={`border-b border-gray-50 ${isDay(r.date) ? 'cursor-pointer hover:bg-gray-50' : ''} ${r.date === selected ? 'bg-slate-50' : ''}`}
                            >
                                <td className="px-5 py-2 font-semibold text-gray-800">{r.label}</td>
                                <td className="px-3 py-2 text-right font-mono">{money(r.sales)}</td>
                                <td className="px-3 py-2 text-right font-mono">{money(r.gross)}</td>
                                <td className="px-3 py-2 text-right font-mono">{r.stockLoss ? money(r.stockLoss) : '-'}</td>
                                <td className="px-3 py-2 text-right font-mono">{r.pettyCash ? money(r.pettyCash) : '-'}</td>
                                <td className={`px-3 py-2 text-right font-mono font-bold ${r.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(r.profit)}</td>
                                <td className="px-5 py-2 text-right">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.profit >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{r.profit >= 0 ? 'Profit' : 'Loss'}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-gray-200 font-black text-gray-900">
                            <td className="px-5 py-2">Total</td>
                            <td className="px-3 py-2 text-right font-mono">{money(tot.sales)}</td>
                            <td className="px-3 py-2 text-right font-mono">{money(tot.gross)}</td>
                            <td className="px-3 py-2 text-right font-mono">{money(tot.stockLoss)}</td>
                            <td className="px-3 py-2 text-right font-mono">{money(tot.pettyCash)}</td>
                            <td className={`px-3 py-2 text-right font-mono ${tot.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(tot.profit)}</td>
                            <td />
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}
