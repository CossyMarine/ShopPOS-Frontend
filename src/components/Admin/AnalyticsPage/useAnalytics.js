import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAnalytics } from './api';
import { EMPTY_OVERVIEW, EMPTY_MARGIN, EMPTY_VAT, EMPTY_COSTS } from './constants';

export default function useAnalytics({ branch, range, from, to }) {
    const [state, setState] = useState({ data: EMPTY_OVERVIEW, margin: EMPTY_MARGIN, vat: EMPTY_VAT, costs: EMPTY_COSTS });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const seq = useRef(0); // ignore a slow response that arrives after a newer request

    const load = useCallback(async () => {
        if (range === 'custom' && (!from || !to)) return;
        const mine = ++seq.current;
        setLoading(true);
        setError(null);
        try {
            const params = { range };
            if (branch) params.branch = branch;
            if (range === 'custom') {
                params.from = from;
                params.to = to;
            }
            const res = await fetchAnalytics(params);
            if (mine !== seq.current) return;
            setState({ data: res.overview, margin: res.margin, vat: res.vat, costs: res.costs });
        } catch (err) {
            if (mine !== seq.current) return;
            setError(err.response?.data?.message || 'Failed to load analytics');
        } finally {
            if (mine === seq.current) setLoading(false);
        }
    }, [branch, range, from, to]);

    useEffect(() => { load(); }, [load]);

    return { ...state, loading, error, reload: load };
}
