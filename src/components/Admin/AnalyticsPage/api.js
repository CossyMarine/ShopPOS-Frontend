import API from '../../../api/axios';
import { EMPTY_MARGIN, EMPTY_VAT } from './constants';

// Overview is required. Category margin and VAT can fail without taking the
// page down; a failed VAT call is flagged so the page can say so instead of
// silently hiding VAT.
export async function fetchAnalytics(params) {
    const [overview, margin, vat] = await Promise.allSettled([
        API.get('/analytics/overview', { params }),
        API.get('/analytics/category-margin', { params }),
        API.get('/analytics/vat', { params }),
    ]);
    if (overview.status === 'rejected') throw overview.reason;
    return {
        overview: overview.value.data,
        margin: margin.status === 'fulfilled' ? margin.value.data : EMPTY_MARGIN,
        vat: vat.status === 'fulfilled' ? vat.value.data : { ...EMPTY_VAT, failed: true },
    };
}

// Dead stock is deliberately not range-bound (all-time last sale).
export async function fetchDeadStock(days, branch) {
    const params = { days };
    if (branch) params.branch = branch;
    const { data } = await API.get('/analytics/dead-stock', { params });
    return data;
}
