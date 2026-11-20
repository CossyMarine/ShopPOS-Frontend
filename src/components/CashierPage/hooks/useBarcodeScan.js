import { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import API from '../../../api/axios';

// Tries the live lookup first. Falls back to the cached catalog only on
// a genuine connection failure, not on a real "not found" response — a
// 404 from the server is still an authoritative answer, offline or not.
export default function useBarcodeScan({ branch, products, addToCart }) {
    const [barcode, setBarcode] = useState('');
    const barcodeRef = useRef(null);

    const handleBarcodeSubmit = async () => {
        const code = barcode.trim();
        if (!code) return;
        try {
            const res = await API.get(`/products/barcode/${encodeURIComponent(code)}`, { params: { branch } });
            const product = res.data;
            if ((product.currentStock ?? 0) <= 0) {
                toast.warning(`${product.name} is out of stock`);
            } else {
                addToCart(product);
            }
        } catch (err) {
            if (!err.response) {
                const match = products.find((p) => p.barcode === code || p.caseBarcode === code);
                if (match) {
                    if ((match.currentStock ?? 0) <= 0) {
                        toast.warning(`${match.name} is out of stock`);
                    } else {
                        addToCart(match);
                    }
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
