import { money, num } from '../../../utils/dashboardHelpers';

export function TopItems({ D }) {
  const tmax = Math.max(...D.topItems.map((i) => i.revenue), 1);
  return (
    <div className="dcard p-6">
      <h4 className="font-semibold text-lg mb-4">Top selling products</h4>
      <div className="space-y-4">
        {D.topItems.length === 0 && <p className="text-xs text-slate-400">No sales in this period.</p>}
        {D.topItems.map((i, k) => (
          <div key={k}>
            <div className="flex justify-between gap-3 text-sm">
              <span className="truncate">{i.productName}</span>
              <b className="shrink-0">{num(i.unitsSold)} sold</b>
            </div>
            <div className="h-2 bg-slate-100 rounded-full mt-1.5">
              <div className="h-2 rounded-full" style={{ width: `${(i.revenue / tmax) * 100}%`, background: 'linear-gradient(90deg,var(--accent-lite),var(--accent))' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LowStock({ D }) {
  const sev = (it) => (it.stock === 0 || (it.level && it.stock / it.level <= 0.25) ? '#ef4444' : it.level && it.stock / it.level <= 0.5 ? '#f97316' : '#f59e0b');
  const shown = D.lowStock.items.slice(0, 5);
  return (
    <div className="dcard p-6">
      <h4 className="font-semibold text-lg mb-4">Low stock alerts</h4>
      <div className="space-y-3">
        {shown.length === 0 && <p className="text-xs text-slate-400">Nothing is below its reorder level.</p>}
        {shown.map((it, k) => (
          <div key={k} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50">
            <span className="w-2 h-8 rounded-full shrink-0" style={{ background: sev(it) }} />
            <div className="flex-1 min-w-0 text-sm font-medium">
              <p className="truncate">{it.name}</p>
              <p className="text-xs text-slate-400 font-normal">Reorder level: {it.level}</p>
            </div>
            <b className="text-sm shrink-0" style={{ color: sev(it) }}>
              {it.stock === 0 ? 'Out of stock' : `${it.stock}${it.unit ? ' ' + it.unit : ''} left`}
            </b>
          </div>
        ))}
        {D.lowStock.count > shown.length && (
          <p className="text-xs text-slate-400 text-center pt-1">{D.lowStock.count - shown.length} more in Products &amp; Stock</p>
        )}
      </div>
    </div>
  );
}

export function Attention({ D, rmDue, openRm }) {
  const Row = ({ l, v, warn }) => (
    <div className="flex items-center justify-between py-3">
      <span className="text-slate-600">{l}</span>
      <span className={`font-semibold ${warn ? 'text-accent' : ''}`}>{v}</span>
    </div>
  );
  const credit = D.credit || { outstanding: 0, outstandingCount: 0 };
  return (
    <div className="dcard p-6">
      <h4 className="font-semibold text-lg">Needs attention</h4>
      <p className="text-xs text-slate-500 mt-0.5 mb-3">Items waiting on a decision</p>
      <div className="divide-y divide-slate-100 text-sm">
        <button type="button" onClick={openRm} className="w-full flex items-center justify-between py-3 text-left">
          <span className="text-slate-600">Reminders due</span>
          <span className={`font-semibold ${rmDue ? 'text-accent' : ''}`}>{rmDue}</span>
        </button>
        <Row l="Payments awaiting confirmation" v={D.pendingPayments} warn={D.pendingPayments > 0} />
        <Row l="Void requests pending" v={D.pendingVoids} warn={D.pendingVoids > 0} />
        <Row
          l={`Credit owed by customers${credit.outstandingCount ? ` (${credit.outstandingCount})` : ''}`}
          v={money(credit.outstanding)}
          warn={credit.outstanding > 0}
        />
        <Row l={`Idle stock, 30+ days (${D.dead.items.length})`} v={money(D.dead.totalValueTiedUp)} />
        <Row l="Estimated next payroll" v={money(D.nextPayroll)} />
      </div>
    </div>
  );
                                          }
