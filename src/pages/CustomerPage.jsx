import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Heart, Search, Coins, Receipt, Store, ShoppingBag } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../hooks/useAuth';
import API from '../api/axios';

export default function CustomerPage() {
    const { user } = useAuth();
    const isCustomer = user?.role === 'customer';
    const [branches, setBranches] = useState([]);
    const [branch, setBranch] = useState(() => localStorage.getItem('shopping_branch') || '');
    const [products, setProducts] = useState([]);
    const [favoriteIds, setFavoriteIds] = useState(new Set());
    const [tab, setTab] = useState('all'); // 'all' | 'favorites'
    const [search, setSearch] = useState('');
    const [wallet, setWallet] = useState(null);
    const [billId, setBillId] = useState('');

    useEffect(() => {
        API.get('/customer/catalog').then((res) => {
            const seen = new Set(res.data.map((p) => p.branch));
            // Derive a branch picker straight from the catalog if /branches isn't public
            setBranches([...seen]);
        }).catch(() => {});
    }, []);

    const fetchCatalog = useCallback(() => {
        API.get('/customer/catalog', { params: branch ? { branch } : {} })
            .then((res) => setProducts(res.data))
            .catch(() => toast.error('Failed to load products'));
    }, [branch]);

    useEffect(() => { fetchCatalog(); }, [fetchCatalog]);
    useEffect(() => { if (branch) localStorage.setItem('shopping_branch', branch); }, [branch]);

    useEffect(() => {
        if (!isCustomer) return;
        API.get('/customer/favorites').then((res) => setFavoriteIds(new Set(res.data.map((p) => p._id)))).catch(() => {});
        API.get('/wallet/me').then((res) => setWallet(res.data)).catch(() => {});
    }, [isCustomer]);

    const toggleFavorite = async (productId, e) => {
        e.stopPropagation();
        if (!isCustomer) return toast.info('Log in to save favorites');
        try {
            const res = await API.post(`/customer/favorites/${productId}/toggle`);
            setFavoriteIds((prev) => {
                const next = new Set(prev);
                res.data.isFavorite ? next.add(productId) : next.delete(productId);
                return next;
            });
        } catch {
            toast.error('Failed to update favorites');
        }
    };

    const visible = products
        .filter((p) => (tab === 'favorites' ? favoriteIds.has(p._id) : true))
        .filter((p) => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="min-h-screen bg-stone-50 pb-20">
            {/* HEADER */}
            <header className="bg-white border-b border-stone-200 sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center font-black text-lg text-white">B</div>
                    <span className="font-black text-gray-900">Babylon Portal</span>
                </div>
                {isCustomer ? (
                    <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-2.5 py-1.5 rounded-xl">
                        <Coins size={13} className="text-orange-500" />
                        <span className="text-xs font-extrabold text-orange-600">{wallet?.points ?? 0} PTS</span>
                    </div>
                ) : (
                    <Link to="/login" className="text-xs font-bold text-orange-500">Log in</Link>
                )}
            </header>

            {/* QUICK BILL PAY BANNER */}
            <div className="mx-4 mt-4 bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Quick Checkout</span>
                <h2 className="text-lg font-black mt-1">Pay Your Store Bill</h2>
                <p className="text-xs text-gray-300 mt-1 mb-3">Enter the receipt code from the cashier or display screen.</p>
                <div className="flex gap-2">
                    <input value={billId} onChange={(e) => setBillId(e.target.value)} placeholder="e.g. #B0004"
                        className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm font-mono font-bold placeholder-gray-400" />
                    <Link to={`/wallet?bill=${encodeURIComponent(billId)}`}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5">
                        <Receipt size={14} /> Pay
                    </Link>
                </div>
            </div>

            {/* BRANCH + FILTERS */}
            <div className="px-4 mt-4 space-y-3">
                {branches.length > 1 && (
                    <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-3 py-2">
                        <Store size={14} className="text-orange-500 shrink-0" />
                        <select value={branch} onChange={(e) => setBranch(e.target.value)} className="flex-1 text-sm font-bold bg-transparent focus:outline-none">
                            <option value="">All Branches</option>
                            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <button onClick={() => setTab('all')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold ${tab === 'all' ? 'bg-orange-500 text-white' : 'bg-white border border-stone-200 text-gray-600'}`}>
                        <ShoppingBag size={13} className="inline mr-1.5" /> All Products
                    </button>
                    <button onClick={() => setTab('favorites')}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold ${tab === 'favorites' ? 'bg-orange-500 text-white' : 'bg-white border border-stone-200 text-gray-600'}`}>
                        <Heart size={13} className="inline mr-1.5" /> Favorites ({favoriteIds.size})
                    </button>
                </div>

                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…"
                        className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:outline-none focus:border-orange-500" />
                </div>
            </div>

            {/* CATALOG GRID */}
            <div className="px-4 mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {visible.length === 0 ? (
                    <p className="col-span-full text-center text-gray-400 text-sm py-16">No products found</p>
                ) : (
                    visible.map((p) => (
                        <div key={p._id} className="bg-white rounded-2xl p-3 border border-stone-200 relative">
                            <button onClick={(e) => toggleFavorite(p._id, e)}
                                className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-gray-50 hover:bg-red-50 flex items-center justify-center z-10">
                                <Heart size={13} className={favoriteIds.has(p._id) ? 'fill-red-500 text-red-500' : 'text-gray-400'} />
                            </button>
                            <div className="w-full h-28 sm:h-36 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden mb-2">
                                {p.imageUrl ? (
                                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-[10px] font-black text-gray-400 text-center px-1.5 leading-tight">{p.name}</span>
                                )}
                            </div>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">{p.category}</span>
                            <h4 className="text-xs font-extrabold text-gray-900 mt-0.5 line-clamp-2">{p.name}</h4>
                            <p className="text-xs font-black text-orange-500 mt-1.5">{p.sellingPrice} KES</p>
                        </div>
                    ))
                )}
            </div>

            <BottomNav />
        </div>
    );
                        }
