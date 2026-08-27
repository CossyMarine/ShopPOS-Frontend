import { useState, useEffect, useCallback } from 'react';
import API from '../api/axios';

// navigator.onLine only means "connected to a network" — a device on wifi
// with no real internet (captive portal, router up but ISP down) still
// reports true. So on top of the browser events, this also does a cheap
// real request when the browser THINKS it's back online, and only then
// flips the app's own "isOnline" state — avoiding a sync attempt that just
// immediately fails against a network that looks connected but isn't.
export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [checking, setChecking] = useState(false);

    const verifyConnection = useCallback(async () => {
        if (!navigator.onLine) {
            setIsOnline(false);
            return false;
        }
        setChecking(true);
        try {
            // Any cheap, already-authenticated GET works here — /branches/mine
            // is lightweight and every logged-in role can hit it.
            await API.get('/branches/mine', { timeout: 5000 });
            setIsOnline(true);
            setChecking(false);
            return true;
        } catch (err) {
            // A real HTTP response (even a 4xx/5xx) still proves the network
            // path works — only a response-less failure means truly offline.
            const reallyOffline = !err.response;
            setIsOnline(!reallyOffline);
            setChecking(false);
            return !reallyOffline;
        }
    }, []);

    useEffect(() => {
        const goOnline = () => verifyConnection();
        const goOffline = () => setIsOnline(false);
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, [verifyConnection]);

    return { isOnline, checking, verifyConnection };
}
