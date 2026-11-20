import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import API from '../../../api/axios';
import { cacheProducts, getCachedProducts } from '../../../utils/offlineDb';

// ---- Catalog: cache every successful fetch, fall back to the last
// cache when there's no connection to fetch fresh — better a slightly
// stale price list than no cart at all when the shop needs to keep
// ringing up sales through an outage. ----
export default function useProducts(branch) {
    const [products, setProducts] = useState([]);

    const fetchProducts = useCallback(async () => {
        try {
            const res = await API.get('/products', { params: { branch } });
            setProducts(res.data);
            cacheProducts(res.data).catch(() => {}); // best-effort, never blocks the UI on a cache write failing
        } catch (err) {
            const cached = await getCachedProducts().catch(() => []);
            if (cached.length > 0) {
                setProducts(cached.filter((p) => p.branch === branch || p.branch?._id === branch));
                if (err.response) toast.error('Failed to load products — showing last known prices');
            } else {
                toast.error('Failed to load products');
            }
        }
    }, [branch]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    return { products, fetchProducts };
}
