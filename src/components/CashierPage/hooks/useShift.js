import { useState, useEffect, useCallback } from 'react';
import API from '../../../api/axios';

// ---- Shift gate ----
export default function useShift() {
    const [shift, setShift] = useState(null);
    const [shiftLoading, setShiftLoading] = useState(true);

    const fetchShift = useCallback(async () => {
        setShiftLoading(true);
        try {
            const res = await API.get('/shifts/current');
            setShift(res.data);
        } catch {
            setShift(null);
        }
        setShiftLoading(false);
    }, []);

    useEffect(() => { fetchShift(); }, [fetchShift]);

    return { shift, shiftLoading, fetchShift };
}
