import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip } from 'recharts';
import { PAY, money, sum } from '../../../utils/dashboardHelpers';

const CREDIT_COLOR = '#e11d48';

export default function PaymentsCard({ D, T }) {
  const tot = sum(D.payments.map((p) => p.amount)) || 1;

  // Credit always gets its own colour; the other methods cycle through the theme palette
  let n = 0;
  const rows = D.payments.map((p) => ({
    method: p.method,
    value: p.amount,
    fill: p.method === 'credit' ? CREDIT_COLOR : T.palette[n++ % T.palette.length],
    label: `${PAY[p.method] || p.method}  ${((p.amount / tot) * 100).toFixed(0)}%`,
  }));

  const credit = D.credit || { given: 0, collected: 0, outstanding: 0, outstandingCount: 0 };
  const showCredit = credit.given > 0 || credit.collected > 0 || credit.outstanding > 0;

  return (
    <div className="dcard p-6">
      <h4 className="font-semibold text-lg">Payment methods</h4>
      <p className="text-xs text-slate-500 mt-0.5 mb-4">How this period's sales were paid, VAT included. "On Credit" is sold but not paid yet.</p>
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
                {rows.map((r, i) => <Cell key={i} fill={r.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {showCredit && (
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Given on credit</p>
            <p className="text-sm font-semibold" style={{ color: CREDIT_COLOR }}>{money(credit.given)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Paid back</p>
            <p className="text-sm font-semibold">{money(credit.collected)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Still owed</p>
            <p className="text-sm font-semibold">
              {money(credit.outstanding)}
              {credit.outstandingCount > 0 && (
                <span className="text-[10px] font-normal text-slate-400"> · {credit.outstandingCount} bill{credit.outstandingCount > 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
              }
