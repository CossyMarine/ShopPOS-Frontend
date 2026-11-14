import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { money, short } from '../../../utils/dashboardHelpers';

export function Categories({ D, wide }) {
  return (
    <div className={`dcard p-6 ${wide ? 'xl:col-span-3' : 'xl:col-span-2'}`}>
      <h4 className="font-semibold text-lg">Margin by category</h4>
      <p className="text-xs text-slate-500 mt-0.5 mb-4">Revenue, profit and margin for the period</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              <th className="pb-2 font-medium">Category</th>
              <th className="pb-2 font-medium text-right">Revenue</th>
              <th className="pb-2 font-medium text-right">Profit</th>
              <th className="pb-2 font-medium text-right">Margin</th>
            </tr>
          </thead>
          <tbody>
            {D.categories.length === 0 && (
              <tr><td colSpan={4} className="py-6 text-center text-xs text-slate-400">No category sales in this period.</td></tr>
            )}
            {D.categories.map((c, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="py-3 font-medium">{c.category}</td>
                <td className="py-3 text-right">{money(c.revenue)}</td>
                <td className={`py-3 text-right ${c.profit < 0 ? 'text-red-600' : ''}`}>{money(c.profit)}</td>
                <td className={`py-3 text-right font-medium ${c.marginPct < 0 ? 'text-red-600' : c.marginPct < 15 ? 'text-amber-600' : ''}`}>
                  {(+c.marginPct).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BranchCard({ D, T }) {
  return (
    <div className="dcard p-6">
      <h4 className="font-semibold text-lg">Branch performance</h4>
      <p className="text-xs text-slate-500 mt-0.5 mb-4">Revenue and profit by branch</p>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={D.branches}>
            <CartesianGrid vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="branchName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={short} />
            <Tooltip formatter={(v) => money(v)} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="revenue" name="Revenue" fill="#CBD5E1" radius={[4, 4, 0, 0]} maxBarSize={36} />
            <Bar dataKey="profit" name="Profit" fill={T.accent} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
