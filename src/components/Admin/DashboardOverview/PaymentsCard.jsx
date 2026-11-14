import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip } from 'recharts';
import { PAY, money, sum } from '../../../utils/dashboardHelpers';

export default function PaymentsCard({ D, T }) {
  const tot = sum(D.payments.map((p) => p.amount)) || 1;
  const rows = D.payments.map((p) => ({
    value: p.amount,
    label: `${PAY[p.method] || p.method}  ${((p.amount / tot) * 100).toFixed(0)}%`,
  }));
  return (
    <div className="dcard p-6">
      <h4 className="font-semibold text-lg">Payment methods</h4>
      <p className="text-xs text-slate-500 mt-0.5 mb-4">Amounts paid by customers, VAT included</p>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">No payments recorded in this period.</p>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 8 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="label" width={130} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip cursor={{ fill: '#F8FAFC' }} formatter={(v) => money(v)} labelFormatter={() => ''} />
              <Bar dataKey="value" radius={10} barSize={24}>
                {rows.map((_, i) => <Cell key={i} fill={T.palette[i % T.palette.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
