import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import API from '../../../api/axios';
import { useAuth } from '../../../hooks/useAuth';
import { useBranch } from '../../../context/BranchContext';
import { setStoreConfig, formatDateTime } from '../../../utils/dashboardHelpers';
import { lineLabel, lineQtyPrice } from '../../../utils/packLine';
import ViewItemsModal from '../ViewItemsModal';
import { THEMES, RANGES } from './constants';
import { fetchDashboard } from './api';
import useLiveRefresh from './useLiveRefresh';
import Stats from './Stats';
import MainChart from './MainChart';
import PaymentsCard from './PaymentsCard';
import { TopItems, LowStock, Attention } from './Lists';
import Heat from './Heat';
import { Categories, BranchCard } from './Breakdown';
import Receipts from './Receipts';

// rmDue / onOpenReminders come from Admin.jsx, where <Reminders> lives so
// its alerts work on every tab, not just this one.
export default function DashboardOverview({ branch, rmDue = 0, onOpenReminders } = {}) {
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

  // force = true (the Refresh button) skips the server's 30s cache on the long ranges
  const load = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const d = await fetchDashboard(range, branch, force === true);
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

  // This Year / All are heavy queries, so live events wait longer before reloading them
  const liveDelay = range === 'year' || range === 'all' ? 10000 : 1500;
  useLiveRefresh(load, branch, branches, liveDelay);

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
        <button onClick={() => load(true)} className="text-sm font-medium px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors">
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
          <Stats D={D} M={T.metric} />

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <MainChart D={D} T={T} metric={metric} setMetric={setMetric} style={style} setStyle={pickStyle} />
            <PaymentsCard D={D} T={T} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <TopItems D={D} />
            <LowStock D={D} />
            <Attention D={D} rmDue={rmDue} openRm={() => onOpenReminders?.()} />
          </section>

          <Heat D={D} T={T} />

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Categories D={D} wide={D.branches.length <= 1} />
            {D.branches.length > 1 && <BranchCard D={D} T={T} />}
          </section>

          <Receipts D={D} onView={setViewing} />
        </div>
      )}

      <ViewItemsModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.billId}
        subtitle={viewing ? `${viewing.branch?.name || ''} · ${viewing.cashierName || 'No cashier'}` : ''}
        items={(viewing?.items || []).map((i) => {
          const l = lineQtyPrice(i);
          return { name: lineLabel(i), qty: l.qty, price: l.price };
        })}
        total={viewing?.totalDue ?? viewing?.subtotal}
        payment={viewing && viewing.status === 'paid' ? {
          method: viewing.paymentMethod, cashAmount: viewing.cashAmount, tillAmount: viewing.tillAmount,
          changeGiven: viewing.changeGiven, mpesaReceiptNumber: viewing.mpesaReceiptNumber, paidAt: viewing.paidAt,
        } : null}
      />
    </div>
  );
      }
