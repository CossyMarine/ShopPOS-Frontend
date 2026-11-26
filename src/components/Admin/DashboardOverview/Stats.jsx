import { money, num } from '../../../utils/dashboardHelpers';

function Spark({ vals, color }) {
  const v = vals.filter((x) => x != null);
  if (v.length < 2) return null;
  const w = 120, h = 36, mx = Math.max(...v), mn = Math.min(...v);
  const pts = v.map((x, i) => `${(i / (v.length - 1)) * w},${h - ((x - mn) / (mx - mn || 1)) * (h - 4) - 2}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-28 h-9 shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KCard({ label, value, color, delta, vals, foot }) {
  return (
    <div className="dcard p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
        {delta != null && (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${delta >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {delta >= 0 ? '+' : '-'}{Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2 mt-3">
        <p className="text-2xl font-semibold">{value}</p>
        {vals && <Spark vals={vals} color={color} />}
      </div>
      <p className="text-[11px] text-slate-400 mt-2">{foot}</p>
    </div>
  );
}

export default function Stats({ D, M }) {
  const vs = D.period.cmp ? `vs ${D.period.cmp}` : 'All recorded sales', dl = D.deltas, t = D.totals, s = D.series.cur;
  const onCredit = D.credit?.given || 0;
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      <KCard
        label="Total revenue"
        value={money(t.revenue)}
        color={M.sales}
        delta={dl.revenue}
        vals={s.revenue}
        foot={onCredit > 0 ? `${vs} | ${money(onCredit)} of it on credit` : vs}
      />
      <KCard label="Customers served" value={num(t.customers)} color={M.customers} delta={dl.customers} vals={s.customers} foot={`One per sale | ${vs}`} />
      <KCard label="Net profit (est.)" value={money(t.profit)} color={M.profit} delta={dl.profit} vals={s.profit} foot={`${t.marginPct.toFixed(1)}% margin`} />
      <KCard label="Average basket" value={money(t.avgBasket)} color={M.sales} foot="Revenue per customer" />
      <KCard label="Refunds and voids" value={money(D.voided.amount)} color="#ef4444" foot={`${D.voided.count} voided today, ${D.pendingVoids} pending`} />
      <KCard label="Low stock" value={`${D.lowStock.count} products`} color="#f59e0b" foot="At or below reorder level" />
    </section>
  );
                                                             }
