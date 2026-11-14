import API from '../../../api/axios';

export async function fetchDashboard(range, branch) {
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
