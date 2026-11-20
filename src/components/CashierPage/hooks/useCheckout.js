import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import API from '../../../api/axios';
import { buildOfflineSale, queueOfflineSale } from '../../../utils/offlineSync';

export default function useCheckout({
    cart, clearCart, shift, isOnline, stockOf,
    netSubtotal, totalDue, branch, fetchProducts, refreshPendingCount,
}) {
    const [receipt, setReceipt] = useState(null); // set once the sale is created, pre-payment
    const [showPayment, setShowPayment] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);
    const [showOfflinePayment, setShowOfflinePayment] = useState(false);

    // Mirrors `receipt` in a ref so the beforeunload handler (added once on
    // mount) always sees the latest unpaid receipt without re-binding.
    const receiptRef = useRef(null);

    // ---- Checkout: online creates the Order + Receipt (unpaid), then opens
    // payment as before. Offline skips the server round trip entirely —
    // there's nothing to round-trip to — and opens the local cash-only
    // confirmation instead. ----
    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error('Cart is empty');
        if (!shift) return toast.error('Open your shift before taking sales');

        if (!isOnline) {
            setShowOfflinePayment(true);
            return;
        }

        // Last-chance check: stock may have dropped (another register) since
        // these items were added.
        const over = cart.find((i) => { const s = stockOf(i.productId); return s != null && i.quantity > s; });
        if (over) {
            return toast.error(`Only ${stockOf(over.productId)} ${over.productName} left. Please reduce the quantity.`);
        }

        setCheckingOut(true);
        try {
            const items = cart.map(({ productId, productName, imageUrl, quantity, unitPrice, vatClass }) => ({
                productId, productName, imageUrl, quantity, unitPrice, lineTotal: unitPrice * quantity, vatClass,
            }));
            const clientSaleId = crypto.randomUUID();
            // subtotal sent here is just a display hint — the server always
            // recomputes it (and the VAT/totalDue figures) from `items` itself.
            const res = await API.post('/orders', { items, subtotal: netSubtotal, branch, clientSaleId });
            setReceipt(res.data.receipt);
            setShowPayment(true);
        } catch (err) {
            if (!err.response) {
                // The request never reached the server at all — treat this
                // exactly like starting out offline, rather than showing a
                // generic error and leaving the cashier stuck.
                setShowOfflinePayment(true);
            } else {
                toast.error(err.response?.data?.message || 'Failed to start checkout');
                fetchProducts(); // the failure is often stale stock — show the real counts
            }
        }
        setCheckingOut(false);
    };

    // ---- Confirms an offline cash sale: no server call, just writes the
    // sale to the local queue and clears the cart immediately so the
    // cashier can keep ringing up the next customer without delay. ----
    const handleOfflineCashConfirm = async (payment) => {
        const sale = buildOfflineSale({
            cart,
            branch,
            shiftId: shift?._id,
            totalDue,
            tillAmount: payment?.tillAmount,
        });
        await queueOfflineSale(sale);
        setShowOfflinePayment(false);
        clearCart();
        refreshPendingCount();
        toast.success("Sale saved — will sync automatically once you're back online");
    };

    const handlePaymentComplete = () => {
        setShowPayment(false);
        setReceipt(null);
        clearCart();
        fetchProducts(); // refresh stock counts after FIFO deduction
        toast.success('Sale complete');
    };

    // ---- Abandoned checkout: the cashier closed the payment popup before
    // paying. The bill and its FIFO stock deduction already exist on the
    // backend at this point, so we tell the server to restock + void it —
    // the cart itself is left alone so the cashier can just hit Purchase
    // again. Safe to call more than once; the backend no-ops if the bill
    // was already paid or already cancelled. ----
    const handleCancelCheckout = useCallback(async (silent = false) => {
        const r = receiptRef.current;
        setShowPayment(false);
        setReceipt(null);
        if (!r) return;
        setCheckingOut(true); // hold the Purchase button until the restocked counts are back
        try {
            await API.post(`/receipts/${r._id}/cancel`);
            if (!silent) toast.info('Checkout cancelled — stock released');
        } catch (err) {
            if (!silent) toast.error(err.response?.data?.message || 'Failed to cancel checkout');
        }
        await fetchProducts();
        setCheckingOut(false);
    }, [fetchProducts]);

    // Keep the ref in sync so the beforeunload handler below (bound once)
    // always sees the current unpaid receipt, if any.
    useEffect(() => { receiptRef.current = receipt; }, [receipt]);

    // ---- Tab/window closed mid-checkout: sendBeacon fires a best-effort
    // cancel request as the page unloads (cookies still travel with it, so
    // auth still works; a normal fetch/axios call isn't reliable here). ----
    useEffect(() => {
        const handleBeforeUnload = () => {
            const r = receiptRef.current;
            if (!r) return;
            const base = (API.defaults.baseURL || '').replace(/\/$/, '');
            navigator.sendBeacon?.(`${base}/receipts/${r._id}/cancel`);
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    return {
        receipt, showPayment, checkingOut, showOfflinePayment, setShowOfflinePayment,
        handleCheckout, handleOfflineCashConfirm, handlePaymentComplete, handleCancelCheckout,
    };
          }
