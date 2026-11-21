import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../constants';

// ---- Socket: join the branch room and refresh the catalog when stock changes elsewhere ----
// (The Customer Display is fed separately via useDisplayBroadcast → POST /display/cart.)
export default function useCashierSocket({ branch, onCatalogChange }) {
    useEffect(() => {
        const socket = io(SOCKET_URL);
        socket.emit('join_room', `branch:${branch}`);

        // Another register sold something, or stock changed elsewhere:
        // refresh the counts so this screen never offers units that are gone.
        let t;
        const kick = () => { clearTimeout(t); t = setTimeout(onCatalogChange, 1000); };
        ['sale:created', 'sale:cancelled', 'receipt:voided', 'product:updated', 'stockAdjustment:approved', 'stockTransfer:completed']
            .forEach((e) => socket.on(e, kick));

        return () => { clearTimeout(t); socket.disconnect(); };
    }, [branch, onCatalogChange]);
}
