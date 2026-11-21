import { useState, useEffect, useRef } from 'react';
import API from '../../../api/axios';

// Small loader for the sections that own their data (day report, till, staff, audit).
export default function useFetch(url, params, enabled = true) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const seq = useRef(0);
    const key = JSON.stringify(params);

    useEffect(() => {
        if (!enabled) return;
        const mine = ++seq.current;
        setLoading(true);
        setError(null);
        API.get(url, { params: JSON.parse(key) })
            .then((r) => { if (mine === seq.current) setData(r.data); })
            .catch((e) => { if (mine === seq.current) setError(e.response?.data?.message || 'Could not load this section'); })
            .finally(() => { if (mine === seq.current) setLoading(false); });
    }, [url, key, enabled]);

    return { data, loading, error };
}
