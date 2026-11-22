import { isDay } from './useDailySales';

export const PERIODS = [
  { id: 'last_month', label: 'Last Month' },
  { id: 'today', label: 'Today' },
  { id: 'this_month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
  { id: 'all', label: 'All' },
  { id: 'custom', label: 'Custom' },
];

const money = (n) => {
  const v = Number(n || 0);
  return `${v < 0 ? '-' : ''}KES ${Math.abs(v).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
};

export default function DailySales({
  range, setRange, from, setFrom, to, setTo,
  data, onPickDay, selectedDay,
}) {
  const { rows, totals, vatOn, vatFailed, loading, error } = data;
  const monthly = rows.length > 0 && !isDay(rows[0].date);
  const list = rows.slice().reverse();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500"
        >
          {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {range === 'custom' && (
          <>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs" />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-2 py-2 text-xs" />
          </>
        )}
        {loading && <span className="text-xs text-gray-400">Loading…</span>}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-lg">{error}</div>}
      {vatFailed && (
        <div className="p-3 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold rounded-lg">
          VAT details could not be loaded, so figures may not match the VAT setting. Press Refresh.
        </div>
      )}

      <div className={`grid grid-cols-2 ${vatOn ? 'lg:grid-cols-3' : ''} gap-3`}>
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{vatOn ? 'Sales (incl. VAT)' : 'Sales'}</p>
          <p className="text-xl font-black text-gray-800 mt-1">{money(totals.sales)}</p>
        </div>
        {vatOn && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">VAT collected</p>
            <p className="text-xl font-black text-gray-800 mt-1">{money(totals.vat)}</p>
          </div>
        )}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{vatOn ? 'Profit (excl. VAT)' : 'Profit'}</p>
          <p className={`text-xl font-black mt-1 ${totals.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(totals.profit)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 pb-2">
          <h2 className="text-sm font-extrabold text-gray-900">{monthly ? 'Monthly Sales' : 'Daily Sales'}</h2>
          {!monthly && <p className="text-xs text-gray-500">Tap a day to see its receipts.</p>}
        </div>
        {rows.length === 0 ? (
          <p className="px-4 pb-4 text-xs text-gray-400">No paid sales in this period.</p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="text-[10px] font-black uppercase text-gray-400 tracking-wider border-b border-gray-100">
                  <th className="px-4 py-2 text-left">{monthly ? 'Month' : 'Day'}</th>
                  <th className="px-3 py-2 text-right">{vatOn ? 'Sales (incl. VAT)' : 'Sales'}</th>
                  {vatOn && <th className="px-3 py-2 text-right">VAT</th>}
                  <th className="px-4 py-2 text-right">{vatOn ? 'Profit (excl. VAT)' : 'Profit'}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr
                    key={r.date}
                    onClick={() => isDay(r.date) && onPickDay(r.date)}
                    className={`border-b border-gray-50 ${isDay(r.date) ? 'cursor-pointer hover:bg-gray-50' : ''} ${r.date === selectedDay ? 'bg-orange-50' : ''}`}
                  >
                    <td className="px-4 py-2 font-semibold text-gray-800">{r.label}</td>
                    <td className="px-3 py-2 text-right font-mono">{money(r.sales)}</td>
                    {vatOn && <td className="px-3 py-2 text-right font-mono">{money(r.vat)}</td>}
                    <td className={`px-4 py-2 text-right font-mono font-bold ${r.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(r.profit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 font-black text-gray-900">
                  <td className="px-4 py-2">Total</td>
                  <td className="px-3 py-2 text-right font-mono">{money(totals.sales)}</td>
                  {vatOn && <td className="px-3 py-2 text-right font-mono">{money(totals.vat)}</td>}
                  <td className="px-4 py-2 text-right font-mono">{money(totals.profit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
