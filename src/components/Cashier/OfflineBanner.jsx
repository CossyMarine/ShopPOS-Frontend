import { WifiOff, RefreshCw, CloudUpload } from 'lucide-react';

// Sits at the top of CashierPage. Three states: fully online with nothing
// queued (renders nothing, stays out of the way), offline (amber warning),
// and online-with-a-backlog-still-clearing (blue, informational — not scary,
// since this is the normal/expected moment right after reconnecting).
export default function OfflineBanner({ isOnline, pendingCount, syncing, onSyncNow }) {
    if (isOnline && pendingCount === 0) return null;

    if (!isOnline) {
        return (
            <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold">
                <WifiOff size={14} />
                No connection — sales are saving on this device
                {pendingCount > 0 && <span className="bg-white/20 px-2 py-0.5 rounded-full">{pendingCount} queued</span>}
            </div>
        );
    }

    return (
        <div className="bg-blue-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold">
            <CloudUpload size={14} />
            {pendingCount} sale{pendingCount !== 1 ? 's' : ''} waiting to sync
            <button onClick={onSyncNow} disabled={syncing}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full disabled:opacity-60">
                <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing…' : 'Sync now'}
            </button>
        </div>
    );
}
