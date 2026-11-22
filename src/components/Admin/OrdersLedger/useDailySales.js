import { useState, useEffect, useRef } from 'react';
import API from '../../../api/axios';

const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
const dayLabel = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MON[m - 1]}`; };

function groupByMonth(days) {
  const by = {};
  days.forEach((t) => {
    const k = t.date.slice(0, 7);
    const o = (by[k] ||= { date: k, label: MON[Number(k.slice(5)) - 1] + ' ' + k.slice(0, 4), sales: 0, vat: 0, profit: 0 });
    o.sales += t.sales; o.vat += t.vat || 0; o.profit += t.profit;
  });
  return Object.values(by).sort((a, b) => a.date.localeCompare(b.date));
}

export default function useDailySales({ branch, range, from, to, tick = 0 }) {
  const [state, setState] = useState({ rows: [], totals: { sales: 0, vat: 0, profit: 0 }, vatOn: false, vatFailed: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  useEffect(() => {
    if (range === 'custom' && (!from || !to)) return;
    const mine = ++seq.current;
    const params = { range, ...(branch ? { branch } : {}), ...(range === 'custom' ? { from, to } : {}) };

    (async () => {
      setLoading(true); setError(null);
      try {
        const [ov, vat] = await Promise.allSettled([
          API.get('/analytics/overview', { params }),
          API.get('/analytics/vat', { params }),
        ]);
        if (mine !== seq.current) return;
        if (ov.status === 'rejected') throw ov.reason;

        const o = ov.value.data;
        const v = vat.status === 'fulfilled' ? vat.value.data : null;
        const vatOn = !!v?.enabled && !!v.totals;

        let days, totals;
        if (vatOn) {
          days = (v.daily || []).map((x) => ({
            date: x.date, label: dayLabel(x.date), sales: x.paid, vat: x.vat, profit: x.net - x.cost,
          }));
          totals = { sales: v.totals.paid, vat: v.totals.vat, profit: v.totals.profitExVat };
        } else {
          days = (o.profitTrend || []).map((x) => ({
            date: x.date, label: x.label, sales: x.revenue, vat: 0, profit: x.profit,
          }));
          totals = { sales: o.totals.totalRevenue, vat: 0, profit: o.totals.totalProfit };
        }
        days.sort((a, b) => a.date.localeCompare(b.date));

        setState({
          rows: days.length > 45 ? groupByMonth(days) : days,
          totals, vatOn, vatFailed: vat.status === 'rejected',
        });
      } catch (e) {
        if (mine === seq.current) setError(e.response?.data?.message || 'Failed to load daily sales');
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    })();
  }, [branch, range, from, to, tick]);

  return { ...state, loading, error };
            }
