import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { Barcode, Trash2, Plus, Minus, X, Lock, ShieldAlert, Pause } from 'lucide-react';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import PaymentModal from '../components/Cashier/PaymentModal';
import OpenShiftModal from '../components/Cashier/OpenShiftModal';
import CloseShiftModal from '../components/Cashier/CloseShiftModal';
import VoidRequestModal from '../components/Cashier/VoidRequestModal';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
const REGISTER_ID = 'reg-1'; // one cashier login = one physical register; make this configurable if a branch runs multiple

export default function CashierPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [shift, setShift] = useState(null);
    const [shiftLoading, setShiftLoading] = useState(true);
    const [showOpenShift, setShowOpenShift] = useState(false);
    const [showCloseShift, setShowCloseShift] = useState(false);
    const [showVoid, setShowVoid] = useState(false);

    const [products, setProducts] = useState([]);
    const [category, setCategory] = useState('All');
    const [barcode, setBarcode] = useState('');
    const [cart, setCart] = useState([]);
    const [receipt, setReceipt] = useState(null); // set once the sale is created, pre-payment
    const [showPayment, setShowPayment] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);

    const socketRef = useRef(null);
    const barcodeRef = useRef(null);

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

    // ---- Catalog ----
    const fetchProducts = useCallback(async () => {
        try {
            const res = await API.get('/products', { params: { branch: user.branch } });
            setProducts(res.data);
        } catch {
            toast.error('Failed to load products');
        }
    }, [user.branch]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

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

    // ---- Cart operations ----
    const addToCart = (product, qty = 1) => {
        setCart((prev) => {
            const existing = prev.find((i) => i.productId === product._id);
            if (existing) {
                return prev.map((i) => (i.productId === product._id ? { ...i, quantity: i.quantity + qty } : i));
            }
            return [...prev, {
                productId: product._id,
                productName: product.name,
                imageUrl: product.imageUrl || null,
                unitPrice: product.sellingPrice,
                quantity: qty,
                lineTotal: product.sellingPrice * qty,
            }];
        });
    };

    const updateQty = (productId, delta) => {
        setCart((prev) => prev
            .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta } : i))
            .filter((i) => i.quantity > 0));
    };

    const removeItem = (productId) => setCart((prev) => prev.filter((i) => i.productId !== productId));
    const clearCart = () => setCart([]);

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
            toast.error(err.response?.data?.message || `No product found for "${code}"`);
        }
        setBarcode('');
        barcodeRef.current?.focus();
    };

    // ---- Totals ----
    const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const totalQty = cart.reduce((sum, i) => sum + i.quantity, 0);

    // ---- Checkout: creates the Order + Receipt (unpaid), then opens payment ----
    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error('Cart is empty');
        if (!shift) return toast.error('Open your shift before taking sales');

        setCheckingOut(true);
        try {
            const items = cart.map(({ productId, productName, imageUrl, quantity, unitPrice, lineTotal }) => ({
                productId, productName, imageUrl, quantity, unitPrice, lineTotal,
            }));
            const res = await API.post('/orders', { items, subtotal, branch: user.branch });
            setReceipt(res.data.receipt);
            setShowPayment(true);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to start checkout');
        }
        setCheckingOut(false);
    };

    const handlePaymentComplete = () => {
        setShowPayment(false);
        setReceipt(null);
        clearCart();
        fetchProducts(); // refresh stock counts after FIFO deduction
        toast.success('Sale complete');
    };

    const categories = ['All', ...new Set(products.map((p) => p.category))];
    const visibleProducts = category === 'All' ? products : products.filter((p) => p.category === category);

    if (shiftLoading) return <div className="h-screen flex items-center justify-center text-gray-400 text-sm">Loading…</div>;

    // ---- Shift gate: cashier can't sell without an open shift ----
    if (!shift) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
                <Lock size={32} className="text-orange-500" />
                <p className="text-gray-600 font-semibold">Open your shift to start selling</p>
                <button onClick={() => setShowOpenShift(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold">
                    Open Shift
                </button>
                <OpenShiftModal open={showOpenShift} onClose={() => setShowOpenShift(false)} onOpened={() => { setShowOpenShift(false); fetchShift(); }} />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            {/* HEADER */}
            <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-sm">
                <div>
                    <h1 className="font-extrabold text-base text-gray-900">Babylon POS</h1>
                    <span className="text-xs text-gray-500">{user.fullName} — Shift open</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowVoid(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200">
                        <ShieldAlert size={14} /> Void Sale
                    </button>
                    <button onClick={() => setShowCloseShift(true)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Close shift">
                        <Lock size={16} />
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* CATALOG */}
                <section className="w-3/5 flex flex-col border-r border-gray-200 bg-white overflow-hidden">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50 space-y-2.5">
                        <div className="relative">
                            <Barcode size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-500" />
                            <input
                                ref={barcodeRef}
                                autoFocus
                                value={barcode}
                                onChange={(e) => setBarcode(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleBarcodeSubmit()}
                                placeholder="Scan barcode or type item…"
                                className="w-full pl-11 pr-20 py-2.5 bg-white border-2 border-orange-500/30 rounded-xl text-sm font-semibold focus:outline-none focus:border-orange-500"
                            />
                            <button onClick={handleBarcodeSubmit} className="absolute right-1.5 top-1.5 bottom-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 rounded-lg text-xs font-bold">
                                Add
                            </button>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {categories.map((c) => (
                                <button key={c} onClick={() => setCategory(c)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${category === c ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 p-3 overflow-y-auto">
                        <div className="grid grid-cols-3 xl:grid-cols-4 gap-2.5">
                            {visibleProducts.map((p) => {
                                const stock = p.currentStock ?? 0;
                                return (
                                    <button key={p._id} onClick={() => stock > 0 && addToCart(p)} disabled={stock <= 0}
                                        className="text-left p-2.5 bg-white rounded-xl border border-gray-200 hover:border-orange-500 hover:shadow-md transition flex flex-col disabled:opacity-40">
                                        <div className="w-full h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden mb-1.5">
                                            {p.imageUrl ? (
                                                <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-[10px] font-black text-gray-400 text-center px-1 leading-tight">{p.name}</span>
                                            )}
                                        </div>
                                        <h4 className="text-xs font-bold text-gray-800 line-clamp-2">{p.name}</h4>
                                        <div className="mt-1.5 flex justify-between items-center">
                                            <span className="text-xs font-extrabold text-orange-500">{p.sellingPrice} KES</span>
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
                <section className="w-2/5 bg-gray-50 flex flex-col justify-between overflow-hidden">
                    <div className="p-3.5 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
                        <h2 className="font-extrabold text-sm text-gray-900">Current Checkout</h2>
                        {cart.length > 0 && (
                            <button onClick={clearCart} className="text-xs text-red-500 font-bold bg-red-50 px-2.5 py-1.5 rounded-lg">
                                <Trash2 size={13} className="inline mr-1" /> Clear
                            </button>
                        )}
                    </div>

                    <div className="flex-1 p-3 overflow-y-auto space-y-2">
                        {cart.length === 0 ? (
                            <p className="text-center text-gray-400 text-xs py-10">Scan a barcode or tap a product</p>
                        ) : (
                            cart.map((item) => (
                                <div key={item.productId} className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <h4 className="text-xs font-bold text-gray-900 truncate">{item.productName}</h4>
                                        <span className="text-[10px] text-gray-500">{item.unitPrice} KES × {item.quantity}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button onClick={() => updateQty(item.productId, -1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><Minus size={12} /></button>
                                        <span className="text-xs font-extrabold w-5 text-center">{item.quantity}</span>
                                        <button onClick={() => updateQty(item.productId, 1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><Plus size={12} /></button>
                                        <span className="text-xs font-extrabold text-orange-500 w-14 text-right">{item.unitPrice * item.quantity}</span>
                                        <button onClick={() => removeItem(item.productId)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-3.5 bg-white border-t border-gray-200 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-extrabold text-gray-900">Total ({totalQty} items)</span>
                            <span className="text-xl font-black text-orange-500">{subtotal.toLocaleString()} KES</span>
                        </div>
                        <button onClick={handleCheckout} disabled={checkingOut || cart.length === 0}
                            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-extrabold disabled:opacity-50">
                            {checkingOut ? 'Starting…' : 'Purchase / Checkout'}
                        </button>
                    </div>
                </section>
            </div>

            {showPayment && receipt && (
                <PaymentModal receipt={receipt} onClose={() => setShowPayment(false)} onComplete={handlePaymentComplete} />
            )}
            <CloseShiftModal open={showCloseShift} shiftId={shift?._id} onClose={() => setShowCloseShift(false)}
                onClosed={() => { setShowCloseShift(false); navigate('/login'); logout(); }} />
            <VoidRequestModal open={showVoid} branch={user.branch} onClose={() => setShowVoid(false)} />
        </div>
    );
                                                       }
