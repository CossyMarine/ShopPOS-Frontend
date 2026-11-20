import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { syncOfflineQueue, getQueuedSaleCount } from '../../../utils/offlineSync';

// ---- Offline queue: keep the pending count current, and sync
// automatically the moment the connection is verified real (not just
// navigator.onLine flipping true, which can lag or false-positive). ----
export default function useOfflineSync({ isOnline, fetchProducts }) {
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [syncing, setSyncing] = useState(false);

    const refreshPendingCount = useCallback(() => {
        getQueuedSaleCount().then(setPendingSyncCount).catch(() => {});
    }, []);

    useEffect(() => { refreshPendingCount(); }, [refreshPendingCount]);

    const runSync = useCallback(async () => {
        setSyncing(true);
        try {
            const result = await syncOfflineQueue();
            if (result.synced > 0) {
                toast.success(`Synced ${result.synced} offline sale${result.synced !== 1 ? 's' : ''}`);
                fetchProducts(); // stock counts may have shifted from the sync
            }
            if (result.discrepancies > 0) {
                toast.warn(`${result.discrepancies} synced sale(s) had a stock mismatch — check with your manager`);
            }
            if (result.failures?.length > 0) {
                const reason = result.failures[0]?.error;
                toast.error(`${result.failures.length} sale(s) failed to sync — still saved on this device${reason ? `: ${reason}` : ''}`);
            }
        } catch {
            // Sync failed outright (e.g. connection dropped again mid-sync) —
            // everything stays safely queued for the next attempt, silently.
        }
        refreshPendingCount();
        setSyncing(false);
    }, [fetchProducts, refreshPendingCount]);

    useEffect(() => {
        if (isOnline) runSync();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOnline]);

    return { pendingSyncCount, syncing, runSync, refreshPendingCount };
}
