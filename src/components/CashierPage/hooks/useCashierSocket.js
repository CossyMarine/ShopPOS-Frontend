import { useEffect } from 'react';
import { createSocket } from '../../../lib/socket';

// ---- Socket: join the branch room and refresh the catalog when stock changes elsewhere ----
// (The Customer Display is fed separately via useDisplayBroadcast → POST /display/cart.)
export default function useCashierSocket({ branch, onCatalogChange }) {
    useEffect(() => {
        const socket = createSocket();

        // The server forgets rooms when a socket drops, so join on every (re)connect.
        const join = () => { if (branch) socket.emit('join_room', `branch:${branch}`); };
        socket.on('connect', join);

        // Another register sold something, or stock changed elsewhere:
        // refresh the counts so this screen never offers units that are gone.
        let t;
        const kick = () => { clearTimeout(t); t = setTimeout(onCatalogChange, 1000); };
        ['sale:created', 'sale:cancelled', 'receipt:voided', 'product:updated', 'stockAdjustment:approved', 'stockTransfer:completed']
            .forEach((e) => socket.on(e, kick));

        return () => { clearTimeout(t); socket.disconnect(); };
    }, [branch, onCatalogChange]);
}
