// Formatting + timezone helpers. Currency and timezone come from the store
// settings (sent by the dashboard API) — nothing store-specific is hardcoded.
let TZ = 'Africa/Nairobi';   // overwritten by setStoreConfig() as soon as data loads
let CUR = 'KES';

export const setStoreConfig = ({ timezone, currency } = {}) => {
  if (timezone) TZ = timezone;
  if (currency) CUR = currency;
};

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const PAY = {
  cash: 'Cash', mpesa_till: 'M-Pesa Till', mpesa_paybill: 'M-Pesa Paybill', mpesa_pochi: 'M-Pesa Pochi',
  mpesa_stk: 'M-Pesa STK', manual_till: 'Manual Till', reward: 'Reward Points', both: 'Cash + Till',
  credit: 'On Credit', unknown: 'Unrecorded',
};

export const money = (n) => `${CUR} ${Math.round(+n || 0).toLocaleString('en-KE')}`;
export const num = (n) => Math.round(+n || 0).toLocaleString('en-KE');
export const short = (n) => (n >= 1e6 ? +(n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? +(n / 1e3).toFixed(1) + 'k' : n);
export const hr = (h) => (h % 12 || 12) + (h < 12 ? 'am' : 'pm');
export const sum = (a) => a.reduce((x, y) => x + (y || 0), 0);

/* ---- receipt payment info (for ViewItemsModal) ----
   Works for paid bills and bills given on credit. A credit bill carries a
   "credit" entry in payments[] — the sale, not money received. Its paidAt is
   the day the credit was GIVEN, so for a settled credit bill the time it was
   actually paid is the last money entry. Needs the full receipt (payments,
   amountPaid); returns null for anything that isn't paid or on credit. */
export const receiptPaymentInfo = (r) => {
  if (!r || !['paid', 'credit'].includes(r.status)) return null;
  const pays = r.payments || [];
  const creditEntry = pays.find((p) => p.method === 'credit');
  const moneyPays = pays.filter((p) => p.method !== 'credit');
  const lastMoneyAt = moneyPays.length ? moneyPays[moneyPays.length - 1].paidAt : null;
  const owed = r.totalDue ?? r.subtotal;
  const onCredit = r.status === 'credit' || !!creditEntry;

  let paidAt = r.paidAt;
  if (r.status === 'credit') paidAt = creditEntry?.paidAt || r.paidAt;
  else if (onCredit) paidAt = lastMoneyAt || r.paidAt;

  return {
    method: r.paymentMethod,
    cashAmount: r.cashAmount,
    tillAmount: r.tillAmount,
    changeGiven: r.changeGiven,
    mpesaReceiptNumber: r.mpesaReceiptNumber,
    onCredit,
    creditAmount: onCredit ? (creditEntry?.amount ?? owed) : 0,
    balance: r.status === 'credit' ? Math.max(0, Number((owed - (r.amountPaid || 0)).toFixed(2))) : 0,
    paidAt,
  };
};

/* ---- timezone maths (any IANA zone) ---- */
const dtfs = {};
const tzParts = (date) => {
  dtfs[TZ] ||= new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  });
  const o = {};
  dtfs[TZ].formatToParts(date).forEach((p) => { if (p.type !== 'literal') o[p.type] = +p.value; });
  return o;
};
export const offsetMs = (date) => {
  const p = tzParts(date);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
};
// shifted Date — read it with getUTC*
export const eat = (d) => { const dt = new Date(d); return new Date(dt.getTime() + offsetMs(dt)); };
export const day0 = (e) => Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), e.getUTCDate());
export const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
export const todayStr = () => iso(day0(eat(Date.now())));
// store-local wall clock -> real UTC ms
export const fromLocal = (y, m, d, H = 0, M = 0) => {
  const g = Date.UTC(y, m, d, H, M);
  return g - offsetMs(new Date(g));
};
export const zonedToUtcMs = (dateStr, timeStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [H, M] = (timeStr || '09:00').split(':').map(Number);
  return fromLocal(y, m - 1, d, H, M);
};
export const formatDateTime = (date, opts = {}) =>
  new Date(date).toLocaleString('en-KE', { timeZone: TZ, ...opts });
