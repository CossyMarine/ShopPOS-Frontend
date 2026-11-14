import { useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { money, num, short } from '../../../utils/dashboardHelpers';
import { METRICS } from './constants';

export default function MainChart({ D, T, metric, setMetric, style, setStyle }) {
  const P = D.period, MT = METRICS[metric], color = T.metric[metric];
  const cur = D.series.cur[MT.series], prev = D.series.prev ? D.series.prev[MT.series] : null;
  const fmt = (v) => (MT.money ? money(v) : num(v) + ' customers');
  const max = Math.max(0, ...cur.filter((v) => v != null));

  const rows = useMemo(
    () => P.labels.map((l, i) => ({ l, cur: cur[i], prev: prev ? prev[i] : null })),
    [P, cur, prev]
  );

  const sub = P.sub
    + (style === 'line' && prev ? ' | dashed line = ' + P.cmp : '')
    + (metric === 'profit' ? ' | estimated from item costs' : '')
    + (style === 'bar' && max ? ` | peak at ${P.labels[cur.indexOf(max)]}` : '');

  const axis = { tick: { fontSize: 11, fill: '#94A3B8' }, axisLine: false, tickLine: false };
  const tip = (
    <Tooltip
      contentStyle={{ background: T.ink, border: 'none', borderRadius: 10, color: '#fff', fontSize: 12 }}
      itemStyle={{ color: '#fff' }} labelStyle={{ color: '#CBD5E1' }}
      formatter={(v, name) => [fmt(v), name === 'prev' ? 'Previous' : MT.name]}
    />
  );

  return (
    <div className="dcard p-6 xl:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <h4 className="font-semibold text-lg">{MT.name} | {P.title}</h4>
          <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
        </div>
        <div className="dseg flex gap-1 bg-slate-100 rounded-full p-1">
          <button className={style === 'line' ? 'on' : ''} onClick={() => setStyle('line')}>Line</button>
          <button className={style === 'bar' ? 'on' : ''} onClick={() => setStyle('bar')}>Bars</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4 mb-4">
        {Object.entries(METRICS).map(([k, m]) => (
          <button key={k} className={`dchip ${metric === k ? 'on' : ''}`} onClick={() => setMetric(k)}>{m.name.replace(' (est.)', '')}</button>
        ))}
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {style === 'bar' ? (
            <BarChart data={rows}>
              <CartesianGrid vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="l" {...axis} interval="preserveStartEnd" minTickGap={14} />
              <YAxis {...axis} tickFormatter={short} />
              {tip}
              <Bar dataKey="cur" radius={[4, 4, 0, 0]} maxBarSize={30}>
                {rows.map((r, i) => <Cell key={i} fill={max > 0 && r.cur === max ? T.ink : color} />)}
              </Bar>
            </BarChart>
          ) : (
            <AreaChart data={rows}>
              <defs>
                <linearGradient id="mainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.33} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#F1F5F9" />
              <XAxis dataKey="l" {...axis} interval="preserveStartEnd" minTickGap={14} />
              <YAxis {...axis} tickFormatter={short} />
              {tip}
              {prev && <Area dataKey="prev" type="monotone" stroke="#CBD5E1" strokeWidth={2} strokeDasharray="6 6" fill="none" dot={false} activeDot={false} />}
              <Area dataKey="cur" type="monotone" stroke={color} strokeWidth={3} fill="url(#mainGrad)"
                dot={P.labels.length > 20 ? false : { r: 3, fill: '#fff', stroke: color, strokeWidth: 2 }} />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
