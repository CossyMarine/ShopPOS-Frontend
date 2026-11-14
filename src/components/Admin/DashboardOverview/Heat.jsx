import { Fragment } from 'react';
import { DAYS, hr } from '../../../utils/dashboardHelpers';

export default function Heat({ D, T }) {
  const { openHour: open, closeHour: close } = D.store;
  const H = D.heat, max = Math.max(1, ...H.flat()), hrs = close - open + 1;
  let best = null;
  H.forEach((row, di) => row.forEach((v, hi) => { if (v > 0 && (!best || v > best.v)) best = { v, di, hi }; }));
  return (
    <section className="dcard p-6">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-4">
        <div>
          <h4 className="font-semibold text-lg">Business hours</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {best ? `Busiest: ${DAYS[best.di]} at ${hr(open + best.hi)} (${best.v} customers)` : 'No sales recorded in this period'}
          </p>
        </div>
        <span className="text-xs font-medium px-3 py-1 rounded-full bg-accent-soft text-accent">{D.period.title}</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[620px] grid gap-1.5" style={{ gridTemplateColumns: `40px repeat(${hrs},1fr)` }}>
          <span />
          {Array.from({ length: hrs }, (_, i) => (
            <span key={i} className="text-[10px] text-slate-400 text-center">{hr(open + i)}</span>
          ))}
          {H.map((row, di) => (
            <Fragment key={di}>
              <span className="text-xs text-slate-500 self-center">{DAYS[di]}</span>
              {row.map((v, hi) => (
                <div key={hi} title={`${DAYS[di]} ${hr(open + hi)}: ${v} customers`} className="h-7 rounded-lg"
                  style={{ background: v ? `rgba(${T.rgb},${(0.12 + (0.88 * v) / max).toFixed(2)})` : '#F1F5F9' }} />
              ))}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
