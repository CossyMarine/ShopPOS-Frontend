import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import API from '../../../api/axios';

// Tries the live lookup first. Falls back to the cached catalog only on
// a genuine connection failure, not on a real "not found" response — a
// 404 from the server is still an authoritative answer, offline or not.
// A scanned PACK barcode adds the pack (carton/box/bale), not one piece.
export default function useBarcodeScan({ branch, products, addToCart }) {
    const [barcode, setBarcode] = useState('');
    const barcodeRef = useRef(null);

    const addScanned = (product, pack) => {
        const need = pack ? pack.qty : 1;
        if ((product.currentStock ?? 0) < need) {
            toast.warning(pack
                ? `Not enough ${product.name} for a ${pack.name} of ${pack.qty} (${product.currentStock ?? 0} pcs left)`
                : `${product.name} is out of stock`);
        } else {
            addToCart(product, 1, pack);
        }
    };

    const handleBarcodeSubmit = async () => {
        const code = barcode.trim();
        if (!code) return;
        try {
            const res = await API.get(`/products/barcode/${encodeURIComponent(code)}`, { params: { branch } });
            const product = res.data;
            const pack = product.matchedPackId ? (product.packs || []).find((k) => String(k._id) === product.matchedPackId) : null;
            addScanned(product, pack);
        } catch (err) {
            if (!err.response) {
                const match = products.find((p) => p.barcode === code || p.caseBarcode === code || (p.packs || []).some((k) => k.barcode === code));
                if (match) {
                    const pack = (match.packs || []).find((k) => k.barcode && k.barcode === code) || null;
                    addScanned(match, pack);
                } else {
                    toast.error(`No product found for "${code}" — offline, showing last known catalog only`);
                }
            } else {
                toast.error(err.response?.data?.message || `No product found for "${code}"`);
            }
        }
        setBarcode('');
        barcodeRef.current?.focus();
    };

    return { barcode, setBarcode, barcodeRef, handleBarcodeSubmit };
}
