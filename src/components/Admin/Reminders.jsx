import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { money, eat, day0, fromLocal, zonedToUtcMs, formatDateTime, todayStr } from '../../utils/dashboardHelpers';

const RC = { overdue: '#ef4444', today: '#f97316', soon: '#f59e0b', later: '#94A3B8' };
const RANK = { overdue: 3, today: 2, soon: 1, later: 0 };

const rid = (r) => r._id;
const eff = (r) => Math.max(+new Date(r.due), r.snoozeUntil ? +new Date(r.snoozeUntil) : 0);
const fkey = (r) => rid(r) + '|' + eff(r);

function stateOf(r, now = Date.now()) {
  const t = eff(r);
  if (t <= now) return 'overdue';
  if (day0(eat(t)) === day0(eat(now))) return 'today';
  return t - now <= 3 * 864e5 ? 'soon' : 'later';
}

function label(r, now = Date.now()) {
  const t = eff(r), st = stateOf(r, now), d = Math.abs(t - now);
  const span = d < 60e3 ? '' : d < 36e5 ? Math.round(d / 60e3) + ' min' : d < 864e5 ? Math.round(d / 36e5) + ' h' : Math.round(d / 864e5) + ' d';
  if (st === 'overdue') return span ? `Overdue by ${span}` : 'Due now';
  if (st === 'today') return 'Today, ' + formatDateTime(t, { hour: '2-digit', minute: '2-digit' });
  return `${formatDateTime(t, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} (in ${span})`;
}

function nextDue(r, isoStr) {
  const e = eat(isoStr), y = e.getUTCFullYear(), m = e.getUTCMonth(), H = e.getUTCHours(), M = e.getUTCMinutes();
  const dim = (yy, mm) => new Date(Date.UTC(yy, mm + 1, 0)).getUTCDate();
  if (r.repeat === 'weekly') return fromLocal(y, m, e.getUTCDate() + 7, H, M);
  if (r.repeat === 'yearly') return fromLocal(y + 1, m, Math.min(r.day || e.getUTCDate(), dim(y + 1, m)), H, M);
  return fromLocal(y, m + 1, Math.min(r.day || e.getUTCDate(), dim(y, m + 1)), H, M);
}

export default function Reminders({ open, onOpen, onClose, onDue }) {
  const [list, setList] = useState([]);
  const [, setTick] = useState(0);
  const [form, setForm] = useState({ title: '', date: todayStr(), time: '09:00', amount: '', repeat: 'none' });
  const listRef = useRef([]);
  const fired = useRef(null);
  const ticks = useRef(0);
  listRef.current = list;

  const load = useCallback(async () => {
    try {
      const { data } = await API.get('/reminders');
      setList(data);
      // anything already overdue when the page opens shows by colour, not as a pop-up
      if (!fired.current) {
        fired.current = new Set();
        data.filter((r) => !r.done && eff(r) <= Date.now()).forEach((r) => fired.current.add(fkey(r)));
      }
    } catch (e) {
      console.error('Failed to load reminders', e);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (id, patch) => {
    setList((l) => l.map((r) => (rid(r) === id ? { ...r, ...patch } : r)));
    try {
      const { data } = await API.patch(`/reminders/${id}`, patch);
      setList((l) => l.map((r) => (rid(r) === id ? data : r)));
    } catch {
      toast.error('Could not save the change');
      load();
    }
  };

  const active = list.filter((r) => !r.done).sort((a, b) => eff(a) - eff(b));
  const states = active.map((r) => stateOf(r));
  const due = states.filter((s) => s === 'overdue' || s === 'today').length;
  useEffect(() => { onDue?.(due); }, [due, onDue]);

  // Alerts fire while the dashboard is open; re-sync with the server every ~5 minutes
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      fired.current ||= new Set();
      listRef.current.filter((r) => !r.done).forEach((r) => {
        const k = fkey(r);
        if (eff(r) <= now && !fired.current.has(k)) {
          fired.current.add(k);
          toast.info('Due now: ' + r.title);
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try { new Notification('Reminder', { body: r.title + (r.amount ? ' | ' + money(r.amount) : '') }); } catch { /* ignore */ }
          }
        }
      });
      if (++ticks.current % 10 === 0) load();
      setTick((n) => n + 1);
    };
    const id = setInterval(tick, 30000);
    const vis = () => { if (!document.hidden) tick(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [load]);

  const act = async (id, a, v) => {
    const r = list.find((x) => rid(x) === id);
    if (!r) return;
    const now = Date.now();
    if (a === 'del') {
      setList((l) => l.filter((x) => rid(x) !== id));
      try { await API.delete(`/reminders/${id}`); } catch { toast.error('Could not delete'); load(); }
      return;
    }
    if (a === 'undo') return update(id, { done: false, doneAt: null });
    if (a === 'done') {
      if (r.repeat && r.repeat !== 'none') {
        let t = nextDue(r, r.due), n = 0;
        while (t <= now && n++ < 120) t = nextDue(r, new Date(t).toISOString());
        return update(id, { due: new Date(t).toISOString(), snoozeUntil: null });
      }
      return update(id, { done: true, doneAt: new Date(now).toISOString() });
    }
    if (a === 'snooze' && v) {
      const e = eat(now);
      const tmr9 = fromLocal(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate() + 1, 9, 0);
      return update(id, { snoozeUntil: new Date(v === '1h' ? now + 36e5 : v === 'tmr' ? tmr9 : now + 7 * 864e5).toISOString() });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const dueMs = zonedToUtcMs(form.date, form.time);
    if (!form.title.trim() || isNaN(dueMs)) return toast.error('Add a title and a valid date');
    try {
      const { data } = await API.post('/reminders', {
        title: form.title.trim(),
        amount: form.amount ? +form.amount : null,
        due: new Date(dueMs).toISOString(),
        repeat: form.repeat,
        day: +form.date.slice(8, 10),
      });
      setList((l) => [...l, data]);
      setForm((f) => ({ ...f, title: '', amount: '', repeat: 'none' }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not save the reminder');
    }
  };

  const top = states.reduce((a, s) => (RANK[s] > RANK[a] ? s : a), 'later');
  const urgent = states.filter((s) => s !== 'later').length;
  const count = urgent || active.length;
  const color = active.length ? RC[top] : '#CBD5E1';
  const done = list.filter((r) => r.done).sort((a, b) => +new Date(b.doneAt || 0) - +new Date(a.doneAt || 0)).slice(0, 10);
  const field = 'text-sm bg-slate-100 rounded-lg px-3 py-2.5 outline-none';
  const now = Date.now();

  return (
    <>
      <button
        type="button" onClick={onOpen} aria-label="Open reminders"
        title={active.length ? `${active.length} active reminder${active.length === 1 ? '' : 's'}` : 'No reminders'}
        className={`fixed bottom-5 right-5 z-40 dcard flex items-center gap-2 pl-4 pr-2.5 py-2.5 text-sm font-medium ${active.length && RANK[top] >= 2 ? 'rm-pulse' : ''}`}
        style={{ borderRadius: 999, border: `2px solid ${active.length ? color : 'transparent'}`, '--rm-a': color + '88' }}
      >
        <span>Reminders</span>
        {count > 0 && (
          <span className="min-w-[24px] h-6 px-1.5 rounded-full text-white text-xs font-semibold grid place-items-center" style={{ background: color }}>
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={onClose} />
          <aside className="dcard absolute right-0 top-0 h-full w-full sm:w-[26rem] overflow-y-auto p-6" style={{ borderRadius: '20px 0 0 20px' }} role="dialog" aria-label="Reminders">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-lg">Reminders</h4>
                <p className="text-xs text-slate-500 mt-0.5">Dates, payments and notes. Saved to your account. Do not store passwords or keys here.</p>
              </div>
              <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-ink px-2 py-1">Close</button>
            </div>

            {typeof Notification !== 'undefined' && Notification.permission === 'default' && (
              <button type="button" onClick={async () => { try { await Notification.requestPermission(); } catch { /* ignore */ } setTick((n) => n + 1); }}
                className="mt-4 w-full text-xs font-medium px-3 py-2 rounded-lg bg-accent-soft text-accent">
                Turn on browser notifications
              </button>
            )}

            <form onSubmit={submit} className="mt-5 space-y-3">
              <input required maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="What needs to happen? e.g. Pay web developer" className={`w-full ${field}`} />
              <div className="grid grid-cols-2 gap-3">
                <input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={field} />
                <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={field} />
                <input type="number" min="0" step="any" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount (optional)" className={field} />
                <select value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value })} className={field}>
                  <option value="none">Does not repeat</option>
                  <option value="weekly">Every week</option>
                  <option value="monthly">Every month</option>
                  <option value="yearly">Every year</option>
                </select>
              </div>
              <button type="submit" className="w-full text-sm font-medium px-4 py-2.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors">Add reminder</button>
            </form>

            <div className="mt-6 space-y-3">
              {active.length === 0 && <p className="text-xs text-slate-400">No active reminders.</p>}
              {active.map((r) => {
                const st = stateOf(r, now), c = RC[st], id = rid(r);
                const meta = [
                  r.amount ? money(r.amount) : '',
                  r.repeat && r.repeat !== 'none' ? 'Repeats ' + r.repeat : '',
                  r.snoozeUntil && +new Date(r.snoozeUntil) > +new Date(r.due) ? 'Snoozed' : '',
                ].filter(Boolean).join(' | ');
                return (
                  <div key={id} className="flex gap-3 p-3 rounded-2xl bg-slate-50">
                    <span className="w-1.5 rounded-full shrink-0" style={{ background: c }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium break-words">{r.title}</p>
                      <p className="text-xs font-medium" style={{ color: c }}>{label(r, now)}</p>
                      {meta && <p className="text-xs text-slate-500">{meta}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <button type="button" onClick={() => act(id, 'done')} className="text-xs font-medium px-3 py-1.5 rounded-lg bg-accent text-white">Done</button>
                        {(st === 'overdue' || st === 'today') && (
                          <select value="" onChange={(e) => e.target.value && act(id, 'snooze', e.target.value)} className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5">
                            <option value="">Snooze</option>
                            <option value="1h">1 hour</option>
                            <option value="tmr">Tomorrow 9am</option>
                            <option value="wk">Next week</option>
                          </select>
                        )}
                        <button type="button" onClick={() => act(id, 'del')} className="text-xs text-slate-400 hover:text-red-600 px-2 py-1.5">Delete</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {done.length > 0 && (
              <details className="mt-6">
                <summary className="text-xs text-slate-500 cursor-pointer">Completed</summary>
                <div className="mt-3 space-y-2">
                  {done.map((r) => (
                    <div key={rid(r)} className="flex items-center justify-between gap-2 text-sm text-slate-400">
                      <span className="line-through truncate">{r.title}</span>
                      <span className="shrink-0">
                        <button type="button" onClick={() => act(rid(r), 'undo')} className="text-xs hover:text-ink px-2">Restore</button>
                        <button type="button" onClick={() => act(rid(r), 'del')} className="text-xs hover:text-red-600 px-2">Delete</button>
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </aside>
        </div>
      )}
    </>
  );
    }
