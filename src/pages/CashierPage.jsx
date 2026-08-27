import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { Barcode, Trash2, Plus, Minus, X, Lock, ShieldAlert, History, UserCircle2, LogOut } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import PaymentModal from '../components/Cashier/PaymentModal';
import OfflineCashPaymentModal from '../components/Cashier/OfflineCashPaymentModal';
import OfflineBanner from '../components/Cashier/OfflineBanner';
import OpenShiftModal from '../components/Cashier/OpenShiftModal';
import CloseShiftModal from '../components/Cashier/CloseShiftModal';
import VoidRequestModal from '../components/Cashier/VoidRequestModal';
import HistoryModal from '../components/Cashier/HistoryModal';
import { formatKenyanDate, formatKenyanTime } from '../utils/formatDate';
import { cacheProducts, getCachedProducts } from '../utils/offlineDb';
import { buildOfflineSale, queueOfflineSale, syncOfflineQueue, getQueuedSaleCount } from '../utils/offlineSync';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
const REGISTER_ID = 'reg-1'; // one cashier login = one physical register; make this configurable if a branch runs multiple

function initialsOf(name = '') {
    return name.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
}

// Mirrors backend utils/vat.js buildOrderVat — used here only to show the
// cashier a live estimate before checkout. The server recomputes the real
// figures independently, so this never needs to be perfectly authoritative.
function estimateCartVat(cart, vatSettings) {
    const rungUpTotal = cart.reduce((sum, i) => sum + i.lineTotal, 0);

    if (!vatSettings?.enabled) {
        return { vatEnabled: false, vatAmount: 0, netSubtotal: rungUpTotal, totalDue: rungUpTotal };
    }

    const { rate, priceMode } = vatSettings;
    let vatAmount = 0;
    let netSubtotal = 0;

    for (const item of cart) {
        const lineTotal = item.lineTotal;
        if (item.vatClass === 'zero' || item.vatClass === 'exempt') {
            netSubtotal += lineTotal;
            continue;
        }
        if (priceMode === 'inclusive') {
            const net = lineTotal / (1 + rate / 100);
            vatAmount += lineTotal - net;
            netSubtotal += net;
        } else {
            vatAmount += lineTotal * (rate / 100);
            netSubtotal += lineTotal;
        }
    }

    vatAmount = Number(vatAmount.toFixed(2));
    netSubtotal = Number(netSubtotal.toFixed(2));
    const totalDue = priceMode === 'inclusive' ? rungUpTotal : Number((netSubtotal + vatAmount).toFixed(2));

    return { vatEnabled: true, vatAmount, netSubtotal, totalDue };
}

export default function CashierPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { isOnline } = useOnlineStatus();
    const [shift, setShift] = useState(null);
    const [shiftLoading, setShiftLoading] = useState(true);
    const [showOpenShift, setShowOpenShift] = useState(false);
    const [showCloseShift, setShowCloseShift] = useState(false);
    const [showVoid, setShowVoid] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showOfflinePayment, setShowOfflinePayment] = useState(false);
    const [pendingSyncCount, setPendingSyncCount] = useState(0);
    const [syncing, setSyncing] = useState(false);

    const [products, setProducts] = useState([]);
    const [category, setCategory] = useState('All');
    const [barcode, setBarcode] = useState('');
    const [cart, setCart] = useState([]);
    const [receipt, setReceipt] = useState(null); // set once the sale is created, pre-payment
    const [showPayment, setShowPayment] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);
    const [vatSettings, setVatSettings] = useState(null);

    const [now, setNow] = useState(new Date());

    const socketRef = useRef(null);
    const barcodeRef = useRef(null);
    // Mirrors `receipt` in a ref so the beforeunload handler (added once on
    // mount) always sees the latest unpaid receipt without re-binding.
    const receiptRef = useRef(null);

    // ---- Live Kenyan clock in the header ----
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000 * 30);
        return () => clearInterval(t);
    }, []);

    // ---- Shift gate ----
    const fetchShift = useCallback(async () => {
        setShiftLoading(true);
        try {
            const res = await API.get('/shifts/current');
            setShift(res.data);
        } catch {
            setShift(null);
        }
        setShiftLoading(false);
    }, []);

    useEffect(() => { fetchShift(); }, [fetchShift]);

    // ---- Catalog: cache every successful fetch, fall back to the last
    // cache when there's no connection to fetch fresh — better a slightly
    // stale price list than no cart at all when the shop needs to keep
    // ringing up sales through an outage. ----
    const fetchProducts = useCallback(async () => {
        try {
            const res = await API.get('/products', { params: { branch: user.branch } });
            setProducts(res.data);
            cacheProducts(res.data).catch(() => {}); // best-effort, never blocks the UI on a cache write failing
        } catch (err) {
            const cached = await getCachedProducts().catch(() => []);
            if (cached.length > 0) {
                setProducts(cached.filter((p) => p.branch === user.branch || p.branch?._id === user.branch));
                if (err.response) toast.error('Failed to load products — showing last known prices');
            } else {
                toast.error('Failed to load products');
            }
        }
    }, [user.branch]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    // ---- VAT settings, for the live cart estimate ----
    useEffect(() => {
        API.get('/settings/public')
            .then((res) => setVatSettings(res.data.vat || { enabled: false }))
            .catch(() => setVatSettings({ enabled: false }));
    }, []);

    // ---- Socket: broadcast the live cart to the Customer Display + join branch room ----
    useEffect(() => {
        const socket = io(SOCKET_URL);
        socketRef.current = socket;
        socket.emit('join_room', `branch:${user.branch}`);
        return () => socket.disconnect();
    }, [user.branch]);

    useEffect(() => {
        socketRef.current?.emit('cart:scan', { branchId: user.branch, registerId: REGISTER_ID, cart });
    }, [cart, user.branch]);

    // ---- Offline queue: keep the pending count current, and sync
    // automatically the moment the connection is verified real (not just
    // navigator.onLine flipping true, which can lag or false-positive). ----
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
                toast.error(`${result.failures.length} sale(s) failed to sync — still saved on this device`);
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

    // ---- Cart operations ----
    const addToCart = (product, qty = 1) => {
        // Price at the moment of adding, factoring in any active promotion —
        // this is a live preview, but the server recomputes it independently
        // at checkout regardless, so this is purely for the cashier's screen.
        const effectivePrice = product.activePromotion?.effectivePrice ?? product.sellingPrice;
        setCart((prev) => {
            const existing = prev.find((i) => i.productId === product._id);
            if (existing) {
                return prev.map((i) => (i.productId === product._id ? { ...i, quantity: i.quantity + qty } : i));
            }
            return [...prev, {
                productId: product._id,
                productName: product.name,
                imageUrl: product.imageUrl || null,
                unitPrice: effectivePrice,
                originalPrice: product.sellingPrice,
                promotionName: product.activePromotion?.name || null,
                quantity: qty,
                lineTotal: effectivePrice * qty,
                vatClass: product.vatClass || 'standard',
            }];
        });
    };

    const updateQty = (productId, delta) => {
        setCart((prev) => prev
            .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta, lineTotal: i.unitPrice * (i.quantity + delta) } : i))
            .filter((i) => i.quantity > 0));
    };

    const removeItem = (productId) => setCart((prev) => prev.filter((i) => i.productId !== productId));
    const clearCart = () => setCart([]);

    // Tries the live lookup first. Falls back to the cached catalog only on
    // a genuine connection failure, not on a real "not found" response — a
    // 404 from the server is still an authoritative answer, offline or not.
    const handleBarcodeSubmit = async () => {
        const code = barcode.trim();
        if (!code) return;
        try {
            const res = await API.get(`/products/barcode/${encodeURIComponent(code)}`, { params: { branch: user.branch } });
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

    // ---- Totals ----
    const totalQty = cart.reduce((sum, i) => sum + i.quantity, 0);
    const { vatEnabled, vatAmount, netSubtotal, totalDue } = useMemo(
        () => estimateCartVat(cart, vatSettings),
        [cart, vatSettings]
    );

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

        setCheckingOut(true);
        try {
            const items = cart.map(({ productId, productName, imageUrl, quantity, unitPrice, lineTotal, vatClass }) => ({
                productId, productName, imageUrl, quantity, unitPrice, lineTotal, vatClass,
            }));
            const clientSaleId = crypto.randomUUID();
            // subtotal sent here is just a display hint — the server always
            // recomputes it (and the VAT/totalDue figures) from `items` itself.
            const res = await API.post('/orders', { items, subtotal: netSubtotal, branch: user.branch, clientSaleId });
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
            }
        }
        setCheckingOut(false);
    };

    // ---- Confirms an offline cash sale: no server call, just writes the
    // sale to the local queue and clears the cart immediately so the
    // cashier can keep ringing up the next customer without delay. ----
    const handleOfflineCashConfirm = async () => {
        const sale = buildOfflineSale({
            cart,
            branch: user.branch,
            shiftId: shift?._id,
            totalDue,
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
        try {
            await API.post(`/receipts/${r._id}/cancel`);
            if (!silent) toast.info('Checkout cancelled — stock released');
            fetchProducts();
        } catch (err) {
            if (!silent) toast.error(err.response?.data?.message || 'Failed to cancel checkout');
        }
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

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Categories are derived from whatever products actually exist for this
    // branch — never hardcoded, so new categories show up automatically.
    const categories = useMemo(
        () => ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort()],
        [products]
    );

    // Reset back to "All" if the currently selected category no longer exists
    // (e.g. it was renamed/removed, or the branch's catalog changed).
    useEffect(() => {
        if (category !== 'All' && !categories.includes(category)) setCategory('All');
    }, [categories, category]);

    const visibleProducts = category === 'All' ? products : products.filter((p) => p.category === category);

    if (shiftLoading) return <div className="h-screen flex items-center justify-center text-gray-400 text-sm">Loading…</div>;

    // ---- Shift gate: cashier can't sell without an open shift ----
    if (!shift) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
                <Lock size={32} className="text-brand-orange" />
                <p className="text-gray-600 font-semibold">Open your shift to start selling</p>
                <button onClick={() => setShowOpenShift(true)} className="bg-brand-orange hover:bg-brand-orange-hover text-white px-6 py-2.5 rounded-xl text-sm font-bold">
                    Open Shift
                </button>
                <OpenShiftModal open={showOpenShift} onClose={() => setShowOpenShift(false)} onOpened={() => { setShowOpenShift(false); fetchShift(); }} />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            <OfflineBanner
                isOnline={isOnline}
                pendingCount={pendingSyncCount}
                syncing={syncing}
                onSyncNow={runSync}
            />
            {/* HEADER */}
            <header className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-brand-orange flex items-center justify-center font-extrabold text-lg text-white shadow-md shrink-0">
                        B
                    </div>
                    <div className="min-w-0">
                        <h1 className="font-extrabold text-sm sm:text-base leading-none text-gray-900 truncate">Babylon POS</h1>
                        <span className="text-[11px] font-semibold text-brand-orange">
                            {formatKenyanDate(now, { weekday: 'short', day: '2-digit', month: 'short' })} · {formatKenyanTime(now)} EAT
                        </span>
                    </div>
                    <div className="h-6 w-px bg-gray-200 hidden md:block" />
                    <div className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1.5 rounded-lg shrink-0">
                        <Barcode size={13} className="text-brand-orange" />
                        Register #1
                    </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button onClick={() => setShowHistory(true)} title="Bill history & voids"
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                        <History size={14} />
                        <span className="hidden sm:inline">History</span>
                    </button>

                    <button onClick={() => setShowVoid(true)} title="Request void on a specific bill"
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition">
                        <ShieldAlert size={14} />
                        <span className="hidden sm:inline">Void</span>
                    </button>

                    <button onClick={() => navigate('/home')} title="Customer Dashboard"
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                        <UserCircle2 size={14} />
                        <span className="hidden sm:inline">Customer Dashboard</span>
                    </button>

                    <div className="flex items-center gap-2 bg-orange-50/80 px-2 py-1.5 rounded-lg border border-orange-100 shrink-0">
                        <div className="w-7 h-7 rounded-full bg-brand-orange text-white text-xs flex items-center justify-center font-bold shrink-0">
                            {initialsOf(user.fullName)}
                        </div>
                        <div className="text-left hidden md:block">
                            <p className="text-xs font-bold text-gray-900 leading-none truncate max-w-[100px]">{user.fullName}</p>
                            <span className="text-[10px] text-gray-500 font-medium">Shift Active</span>
                        </div>
                    </div>

                    <button onClick={handleLogout} title="Log out"
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <LogOut size={16} />
                    </button>

                    <button onClick={() => setShowCloseShift(true)} title="Close register / lock shift"
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Lock size={16} />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* CATALOG */}
                <section className="w-3/5 flex flex-col border-r border-gray-200 bg-white overflow-hidden">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50 space-y-2.5">
                        <div className="relative">
                            <Barcode size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-orange" />
                            <input
                                ref={barcodeRef}
                                autoFocus
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSubmit()}
                                placeholder="Scan barcode or type item…"
                                className="w-full pl-11 pr-20 py-2.5 bg-white border-2 border-brand-orange/30 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-orange"
                            />
                            <button onClick={handleBarcodeSubmit} className="absolute right-1.5 top-1.5 bottom-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white px-3 rounded-lg text-xs font-bold">
                                Add
                            </button>
                        </div>

                        {/* CATEGORY FILTERS — built from live product data, not hardcoded */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
                            {categories.map((c) => (
                                <button key={c} onClick={() => setCategory(c)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                                        category === c
                                            ? 'bg-brand-orange text-white shadow-sm'
                                            : 'bg-gray-200 text-gray-700 hover:bg-brand-orange-light hover:text-brand-orange'
                                    }`}>
                                    {c === 'All' ? 'All Items' : c}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 p-3 overflow-y-auto">
                        <div className="grid grid-cols-3 xl:grid-cols-4 gap-2.5">
                            {visibleProducts.map((p) => {
                                const stock = p.currentStock ?? 0;
                                const qtyInCart = cart.find((i) => i.productId === p._id)?.quantity || 0;
                                const promo = p.activePromotion;
                                return (
                                    <button key={p._id} onClick={() => stock > 0 && addToCart(p)} disabled={stock <= 0}
                                        className="relative text-left p-2.5 bg-white rounded-xl border border-gray-200 hover:border-brand-orange hover:shadow-md transition flex flex-col disabled:opacity-40">
                                        {qtyInCart > 0 && (
                                            <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-brand-orange text-white text-[11px] font-black flex items-center justify-center shadow-md ring-2 ring-white z-10">
                                                {qtyInCart}
                                            </span>
                                        )}
                                        {promo && (
                                            <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10">
                                                {promo.type === 'percent_off' ? `-${promo.value}%` : `-${promo.value} KES`}
                                            </span>
                                        )}
                                        <div className="w-full h-28 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden mb-1.5">
                                            {p.imageUrl ? (
                                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[10px] font-black text-gray-400 text-center px-1 leading-tight">{p.name}</span>
                                            )}
                                        </div>
                                        <h4 className="text-xs font-bold text-gray-800 line-clamp-2">{p.name}</h4>
                                        <div className="mt-1.5 flex justify-between items-center">
                                            {promo ? (
                                                <span className="flex items-baseline gap-1">
                                                    <span className="text-xs font-extrabold text-red-500">{promo.effectivePrice} KES</span>
                                                    <span className="text-[9px] text-gray-400 line-through">{p.sellingPrice}</span>
                                                </span>
                                            ) : (
                                                <span className="text-xs font-extrabold text-brand-orange">{p.sellingPrice} KES</span>
                                            )}
                                            <span className={`text-[9px] font-bold px-1 rounded ${stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                {stock > 0 ? stock : 'Out'}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* CART */}
                <section className="w-2/5 bg-gray-50 flex flex-col overflow-hidden">
                    <div className="p-3.5 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
                        <h2 className="font-extrabold text-sm text-gray-900">Current Checkout</h2>
                        {cart.length > 0 && (
                            <button onClick={clearCart} className="text-xs text-red-500 font-bold bg-red-50 px-2.5 py-1.5 rounded-lg">
                                <Trash2 size={13} className="inline mr-1" /> Clear
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {cart.length === 0 ? (
                            <p className="text-center text-gray-400 text-xs py-10">Scan a barcode or tap a product</p>
                        ) : (
                            <>
                                {cart.map((item) => (
                                    <div key={item.productId} className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between">
                                        <div className="flex-1 min-w-0 pr-2">
                                            <h4 className="text-xs font-bold text-gray-900 truncate">{item.productName}</h4>
                                            <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                {item.unitPrice} KES × {item.quantity}
                                                {item.promotionName && (
                                                    <span className="text-[9px] bg-red-50 text-red-500 font-bold px-1 rounded">{item.promotionName}</span>
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><Minus size={12} /></button>
                                            <span className="text-xs font-extrabold w-5 text-center">{item.quantity}</span>
                                            <button onClick={() => updateQty(item.productId, 1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><Plus size={12} /></button>
                                            <span className="text-xs font-extrabold text-brand-orange w-14 text-right">{item.unitPrice * item.quantity}</span>
                                            <button onClick={() => removeItem(item.productId)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
                                        </div>
                                    </div>
                                ))}

                                {/* Total + Pay button now sit right after the last product, not pinned to the screen bottom */}
                                <div className="pt-1 space-y-2.5">
                                    <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-1.5">
                                        {vatEnabled && (
                                            <>
                                                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                                                    <span>Subtotal</span>
                                                    <span>{netSubtotal.toLocaleString()} KES</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                                                    <span>VAT ({vatSettings.rate}%)</span>
                                                    <span>{vatAmount.toLocaleString()} KES</span>
                                                </div>
                                                <div className="border-t border-dashed border-gray-200" />
                                            </>
                                        )}
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-extrabold text-gray-900">Total ({totalQty} items)</span>
                                            <span className="text-xl font-black text-brand-orange">{totalDue.toLocaleString()} KES</span>
                                        </div>
                                    </div>
                                    <button onClick={handleCheckout} disabled={checkingOut || cart.length === 0}
                                        className="w-full py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl text-sm font-extrabold disabled:opacity-50">
                                        {checkingOut ? 'Starting…' : 'Purchase / Checkout'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </section>
            </div>

            {showPayment && receipt && (
                <PaymentModal receipt={receipt} onClose={handleCancelCheckout} onComplete={handlePaymentComplete} />
            )}
            <OfflineCashPaymentModal
                open={showOfflinePayment}
                onClose={() => setShowOfflinePayment(false)}
                totalDue={totalDue}
                onConfirm={handleOfflineCashConfirm}
            />
            <CloseShiftModal open={showCloseShift} shiftId={shift?._id} onClose={() => setShowCloseShift(false)}
                onClosed={() => { setShowCloseShift(false); navigate('/login'); logout(); }} />
            <VoidRequestModal open={showVoid} branch={user.branch} onClose={() => setShowVoid(false)} />
            <HistoryModal open={showHistory} branch={user.branch} onClose={() => setShowHistory(false)} />
        </div>
    );
}
