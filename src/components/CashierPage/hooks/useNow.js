import { useState, useEffect } from 'react';

// Live clock for the header — ticks every 30s.
export default function useNow(intervalMs = 1000 * 30) {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), intervalMs);
        return () => clearInterval(t);
    }, [intervalMs]);

    return now;
}
