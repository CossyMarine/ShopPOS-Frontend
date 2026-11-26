export { SOCKET_URL } from '../../../lib/socket';

// Anything that changes a number on this screen. Refreshes are debounced, so a
// burst of events (e.g. several product:updated from one sale) costs one load.
export const LIVE_EVENTS = [
  // sales
  'receipt:paid', 'receipt:updated', 'receipt:manualPending', 'receipt:manualPaymentResolved', 'sale:created',
  // credit given / settled
  'credit:created', 'credit:updated',
  // voids
  'receipt:voided', 'voidRequest:created', 'voidRequest:approved', 'voidRequest:rejected',
  // stock
  'product:updated', 'stockAdjustment:approved',
];

export const THEMES = {
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

export const METRICS = {
  sales: { name: 'Revenue', series: 'revenue', money: true },
  customers: { name: 'Customers', series: 'customers', money: false },
  profit: { name: 'Profit (est.)', series: 'profit', money: true },
};

export const RANGES = [['today', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['year', 'This Year'], ['all', 'All']];
