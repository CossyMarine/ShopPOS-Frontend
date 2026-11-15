import API from '../../../api/axios';

// fresh = true asks the server to skip its 30-second cache for the long
// ranges (This Year / All). Used by the Refresh button.
export async function fetchDashboard(range, branch, fresh = false) {
  const params = branch ? { branch } : {};
  const bust = fresh ? { fresh: 1 } : {};
  const { data: d } = await API.get('/analytics/dashboard', { params: { range, ...params, ...bust } });
  const [mg, dead] = await Promise.allSettled([
    API.get('/analytics/category-margin', { params: { ...d.query, ...params, ...bust } }),
    API.get('/analytics/dead-stock', { params: { days: 30, ...params } }),
  ]);
  return {
    ...d,
    categories: mg.status === 'fulfilled' ? mg.value.data.categories || [] : [],
    dead: dead.status === 'fulfilled' ? dead.value.data : { items: [], totalValueTiedUp: 0 },
  };
}
