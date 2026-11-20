import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL, REGISTER_ID } from '../constants';

// ---- Socket: broadcast the live cart to the Customer Display + join branch room ----
export default function useCashierSocket({ branch, cart, onCatalogChange }) {
    const socketRef = useRef(null);

    useEffect(() => {
        const socket = io(SOCKET_URL);
        socketRef.current = socket;
        socket.emit('join_room', `branch:${branch}`);

        // Another register sold something, or stock changed elsewhere:
        // refresh the counts so this screen never offers units that are gone.
        let t;
        const kick = () => { clearTimeout(t); t = setTimeout(onCatalogChange, 1000); };
        ['sale:created', 'sale:cancelled', 'receipt:voided', 'product:updated', 'stockAdjustment:approved', 'stockTransfer:completed']
            .forEach((e) => socket.on(e, kick));

        return () => { clearTimeout(t); socket.disconnect(); };
    }, [branch, onCatalogChange]);

    useEffect(() => {
        socketRef.current?.emit('cart:scan', { branchId: branch, registerId: REGISTER_ID, cart });
    }, [cart, branch]);
}
