import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { Eye } from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import API from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { useBranch } from '../../context/BranchContext';
import ViewItemsModal from './ViewItemsModal';
import Reminders from './Reminders';
import {
  DAYS, PAY, money, num, short, hr, sum, setStoreConfig, formatDateTime,
} from '../../utils/dashboardHelpers';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');

// Anything that changes a number on this screen. Refreshes are debounced, so a
// burst of events (e.g. several product:updated from one sale) costs one load.
const LIVE_EVENTS = [
  // sales
  'receipt:paid', 'receipt:updated', 'receipt:manualPending', 'receipt:manualPaymentResolved', 'sale:created',
  // voids
  'receipt:voided', 'voidRequest:created', 'voidRequest:approved', 'voidRequest:rejected',
  // stock
  'product:updated', 'stockAdjustment:approved',
];

const THEMES = {
  classic: {
    label: 'Green', rgb: '22,163,74', accent: '#16a34a', ink: '#0F172A',
    palette: ['#16a34a', '#f59e0b', '#2563eb', '#8b5cf6', '#ef4444', '#94a3b8', '#64748B'],
    metric: { sales: '#16a34a', customers: '#8b5cf6', profit: '#f59e0b' },
  },
  brand: {
    label: 'Orange', rgb: '255,87,34', accent: '#FF5722', ink: '#0A0A0A',
    palette: ['#FF5722', '#0A0A0A', '#94A3B8', '#FDBA74', '#CBD5E1', '#64748B', '#FFCCBC'],
    metric: { sales: '#FF5722', customers: '#0A0A0A', profit: '#64748B' },
  },
  mono: {
    label: 'Black', rgb: '10,10,10', accent: '#0A0A0A', ink: '#0A0A0A',
    palette: ['#0A0A0A', '#404040', '#737373', '#A3A3A3', '#D4D4D4', '#525252', '#E5E5E5'],
    metric: { sales: '#525252', customers: '#737373', profit: '#A3A3A3' },
  },
};
const METRICS = {
  sales: { name: 'Revenue', series: 'revenue', money: true },
  customers: { name: 'Customers', series: 'customers', money: false },
  profit: { name: 'Profit (est.)', series: 'profit', money: true },
};
const RANGES = [['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['year', 'This Year'], ['all', 'All']];

/* ================= data ================= */
async function fetchDashboard(range, branch) {
  const params = branch ? { branch } : {};
  const { data: d } = await API.get('/analytics/dashboard', { params: { range, ...params } });
  const [mg, dead] = await Promise.allSettled([
    API.get('/analytics/category-margin', { params: { ...d.query, ...params } }),
    API.get('/analytics/dead-stock', { params: { days: 30, ...params } }),
  ]);
  return {
    ...d,
    categories: mg.status === 'fulfilled' ? mg.value.data.categories || [] : [],
    dead: dead.status === 'fulfilled' ? dead.value.data : { items: [], totalValueTiedUp: 0 },
  };
}

/* ================= page ================= */
export default function DashboardOverview({ branch } = {}) {
  const { user, setUser } = useAuth();
  const { branches } = useBranch();
  const saved = user?.dashboardPrefs || {};

  const [range, setRange] = useState('today');
  const [metric, setMetric] = useState('sales');
  // Theme and chart style are saved on the user's account, so they stay until changed again
  const [theme, setThemeState] = useState(THEMES[saved.theme] ? saved.theme : 'classic');
  const [style, setStyleState] = useState(saved.chartStyle === 'bar' ? 'bar' : 'line');
  const [D, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState('');
  const [viewing, setViewing] = useState(null);
  const [rmOpen, setRmOpen] = useState(false);
  const [rmDue, setRmDue] = useState(0);

  const T = THEMES[theme];

  const savePref = async (patch) => {
    try {
      const res = await API.patch('/auth/dashboard-prefs', patch);
      setUser?.(res.data.user);
    } catch {
      toast.error('Could not save your display preference');
    }
  };
  const pickTheme = (t) => { if (t === theme) return; setThemeState(t); savePref({ theme: t }); };
  const pickStyle = (s) => { if (s === style) return; setStyleState(s); savePref({ chartStyle: s }); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await fetchDashboard(range, branch);
      setStoreConfig(d.store);             // currency + timezone from Settings
      setD(d);
      setError('');
      setUpdated(formatDateTime(Date.now(), { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error('Dashboard load failed', e);
      setError(e.response?.data?.message || 'Could not load dashboard data. Check your connection and try Refresh.');
    }
    setLoading(false);
  }, [range, branch]);

  useEffect(() => { load(); }, [load]);

  /* ---------- live refresh ----------
     One socket for the life of this screen. `load` is read through a ref, so
     changing the range (which changes `load`) never tears the connection down.
     Plain io(SOCKET_URL) with no withCredentials — the socket doesn't use
     cookies, and the server's CORS doesn't send Allow-Credentials. */
  const loadRef = useRef(load);
  loadRef.current = load;
  const sockRef = useRef(null);
  const roomsRef = useRef([]);

  useEffect(() => {
    const sock = io(SOCKET_URL);
    sockRef.current = sock;

    // The server forgets rooms when a socket drops, so re-join on every (re)connect
    const joinAll = () => roomsRef.current.forEach((r) => sock.emit('join_room', r));
    sock.on('connect', joinAll);

    let t;
    const kick = () => { clearTimeout(t); t = setTimeout(() => loadRef.current(), 1500); };
    LIVE_EVENTS.forEach((e) => sock.on(e, kick));

    return () => {
      clearTimeout(t);
      sock.disconnect();
      sockRef.current = null;
    };
  }, []);

  // A selected branch listens to that branch only. "All branches" (Super Admin)
  // listens to every branch room, so sales anywhere still refresh the dashboard.
  const roomKey = branch
    ? `branch:${branch}`
    : branches.map((b) => `branch:${b._id}`).join(',');

  useEffect(() => {
    const next = roomKey ? roomKey.split(',') : [];
    const prev = roomsRef.current;
    const sock = sockRef.current;
    if (sock?.connected) {
      prev.filter((r) => !next.includes(r)).forEach((r) => sock.emit('leave_room', r));
      next.filter((r) => !prev.includes(r)).forEach((r) => sock.emit('join_room', r));
    }
    roomsRef.current = next; // if not connected yet, the 'connect' handler joins these
  }, [roomKey]);

  const onDue = useCallback((n) => setRmDue(n), []);

  return (
    <div className={`dash rounded-3xl p-4 lg:p-6 space-y-6 text-ink min-h-full pb-24 ${loading ? 'busy' : ''}`} data-theme={theme}>
      {/* HEADER */}
      <header className="dcard px-6 py-4 flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-accent font-hand text-4xl leading-none font-bold">{D?.store.name || 'Store Dashboard'}</h1>
          <p className="text-xs text-slate-500 mt-1">
            {D ? formatDateTime(Date.now(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-slate-400">Theme</span>
          <div className="dseg flex gap-1 bg-slate-100 rounded-full p-1">
            {Object.entries(THEMES).map(([k, t]) => (
              <button key={k} className={theme === k ? 'on' : ''} onClick={() => pickTheme(k)}>{t.label}</button>
            ))}
          </div>
        </div>
        {updated && <span className="text-xs text-slate-400">Updated {updated}</span>}
        <button onClick={load} className="text-sm font-medium px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors">
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </header>

      {error && <div className="dcard p-4 text-sm text-red-600">{error}</div>}

      {/* RANGE */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-hand text-3xl font-bold leading-none">Business at a glance</h3>
          <p className="text-xs text-slate-500 mt-1">{D ? `${D.period.title} | ${D.period.sub}` : ''}</p>
        </div>
        <div className="dseg flex gap-1 bg-white rounded-full p-1 shadow-md max-w-full overflow-x-auto">
          {RANGES.map(([k, l]) => (
            <button key={k} className={range === k ? 'on' : ''} onClick={() => setRange(k)}>{l}</button>
          ))}
        </div>
      </div>

      {!D ? (
        <div className="dcard p-10 text-center text-sm text-slate-400">{loading ? 'Loading dashboard...' : 'No data'}</div>
      ) : (
        <div className="dash-body space-y-6">
          <Kpis D={D} M={T.metric} />

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <MainChart D={D} T={T} metric={metric} setMetric={setMetric} style={style} setStyle={pickStyle} />
            <PaymentsCard D={D} T={T} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TopItems D={D} />
            <LowStock D={D} />
            <Attention D={D} rmDue={rmDue} openRm={() => setRmOpen(true)} />
          </section>

          <Heat D={D} T={T} />

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Categories D={D} wide={D.branches.length <= 1} />
            {D.branches.length > 1 && <BranchCard D={D} T={T} />}
          </section>

          <Receipts D={D} onView={setViewing} />

          <Reminders open={rmOpen} onOpen={() => setRmOpen(true)} onClose={() => setRmOpen(false)} onDue={onDue} />
        </div>
      )}

      <ViewItemsModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.billId}
        subtitle={viewing ? `${viewing.branch?.name || ''} · ${viewing.cashierName || 'No cashier'}` : ''}
        items={(viewing?.items || []).map((i) => ({ name: i.productName, qty: i.quantity, price: i.unitPrice }))}
        total={viewing?.totalDue ?? viewing?.subtotal}
        payment={viewing && viewing.status === 'paid' ? {
          method: viewing.paymentMethod, cashAmount: viewing.cashAmount, tillAmount: viewing.tillAmount,
          changeGiven: viewing.changeGiven, mpesaReceiptNumber: viewing.mpesaReceiptNumber, paidAt: viewing.paidAt,
        } : null}
      />
    </div>
  );
}

/* ================= KPIs ================= */
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

function Kpis({ D, M }) {
  const vs = D.period.cmp ? `vs ${D.period.cmp}` : 'All recorded sales', dl = D.deltas, t = D.totals, s = D.series.cur;
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
      <KCard label="Total revenue" value={money(t.revenue)} color={M.sales} delta={dl.revenue} vals={s.revenue} foot={vs} />
      <KCard label="Customers served" value={num(t.customers)} color={M.customers} delta={dl.customers} vals={s.customers} foot={`One per paid receipt | ${vs}`} />
      <KCard label="Net profit (est.)" value={money(t.profit)} color={M.profit} delta={dl.profit} vals={s.profit} foot={`${t.marginPct.toFixed(1)}% margin`} />
      <KCard label="Average basket" value={money(t.avgBasket)} color={M.sales} foot="Revenue per customer" />
      <KCard label="Refunds and voids" value={money(D.voided.amount)} color="#ef4444" foot={`${D.voided.count} voided today, ${D.pendingVoids} pending`} />
      <KCard label="Low stock" value={`${D.lowStock.count} products`} color="#f59e0b" foot="At or below reorder level" />
    </section>
  );
}

/* ================= main chart ================= */
function MainChart({ D, T, metric, setMetric, style, setStyle }) {
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

/* ================= payments ================= */
function PaymentsCard({ D, T }) {
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

/* ================= lists ================= */
function TopItems({ D }) {
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

function LowStock({ D }) {
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

function Attention({ D, rmDue, openRm }) {
  const Row = ({ l, v, warn }) => (
    <div className="flex items-center justify-between py-3">
      <span className="text-slate-600">{l}</span>
      <span className={`font-semibold ${warn ? 'text-accent' : ''}`}>{v}</span>
    </div>
  );
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
        <Row l={`Idle stock, 30+ days (${D.dead.items.length})`} v={money(D.dead.totalValueTiedUp)} />
        <Row l="Estimated next payroll" v={money(D.nextPayroll)} />
      </div>
    </div>
  );
}

/* ================= business hours ================= */
function Heat({ D, T }) {
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

/* ================= categories / branches ================= */
function Categories({ D, wide }) {
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

function BranchCard({ D, T }) {
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

/* ================= receipts ================= */
function Receipts({ D, onView }) {
  const pill = {
    paid: 'bg-emerald-50 text-emerald-700', unpaid: 'bg-amber-50 text-amber-700',
    partial: 'bg-amber-50 text-amber-700', voided: 'bg-red-50 text-red-600',
  };
  return (
    <section className="dcard p-6">
      <h4 className="font-semibold text-lg mb-4">Recent receipts</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-slate-400">
            <tr>
              {['Bill', 'Cashier', 'Branch', 'Time', 'Status'].map((h) => <th key={h} className="pb-2 font-medium">{h}</th>)}
              <th className="pb-2 font-medium text-right">Amount</th>
              <th className="pb-2 font-medium text-right">View</th>
            </tr>
          </thead>
          <tbody>
            {D.recent.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-xs text-slate-400">No receipts yet.</td></tr>
            )}
            {D.recent.map((r) => (
              <tr key={r._id} className="border-t border-slate-100">
                <td className="py-3 font-medium">{r.billId}</td>
                <td>{r.cashierName || '-'}</td>
                <td>{r.branch?.name || '-'}</td>
                <td className="text-slate-500 text-xs">
                  {formatDateTime(r.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td><span className={`text-[11px] font-medium px-2 py-0.5 rounded-md capitalize ${pill[r.status] || pill.unpaid}`}>{r.status}</span></td>
                <td className="text-right font-medium">{money(r.totalDue ?? r.subtotal)}</td>
                <td className="text-right">
                  <button onClick={() => onView(r)} className="inline-flex items-center gap-1 text-slate-400 hover:text-accent text-xs font-medium transition-colors" aria-label="View receipt">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
      }
