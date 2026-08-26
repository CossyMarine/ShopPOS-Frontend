import { useState, useEffect, useCallback, useMemo } from 'react';
import { Tag, CalendarClock, Plus, Trash2, Power, X } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { useBranch } from '../../context/BranchContext';
import { formatKenyanDateTime } from '../../utils/formatDate';
import ConfirmModal from './ConfirmModal';

// Two related but distinct pricing tools live here:
//  - Promotions: temporary % / flat discounts on a product or category,
//    applied automatically at checkout for as long as their window is open.
//  - Price Schedules: a permanent price change queued for a future moment
//    (e.g. "raise flour to 180 starting the 1st"), applied once and done.
export default function PricingPromotions({ branch }) {
    const { branches } = useBranch();
    const [tab, setTab] = useState('promotions');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-black text-gray-800">Pricing & Promotions</h2>
                <p className="text-sm text-gray-500">Discounts applied automatically at checkout, and price changes queued for later</p>
            </div>

            <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
                <button onClick={() => setTab('promotions')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${tab === 'promotions' ? 'bg-orange-500 text-white' : 'text-gray-500'}`}>
                    <Tag size={13} /> Promotions
                </button>
                <button onClick={() => setTab('schedules')}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${tab === 'schedules' ? 'bg-gray-800 text-white' : 'text-gray-500'}`}>
                    <CalendarClock size={13} /> Scheduled Price Changes
                </button>
            </div>

            {tab === 'promotions'
                ? <PromotionsTab branch={branch} branches={branches} />
                : <PriceSchedulesTab branch={branch} />}
        </div>
    );
}

// ============================= PROMOTIONS =============================

function PromotionsTab({ branch, branches }) {
    const [promotions, setPromotions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);

    const fetchPromotions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.get('/promotions', branch ? { params: { branch } } : {});
            setPromotions(res.data);
        } catch {
            toast.error('Failed to load promotions');
        }
        setLoading(false);
    }, [branch]);

    useEffect(() => { fetchPromotions(); }, [fetchPromotions]);

    const toggleActive = async (promo) => {
        try {
            await API.put(`/promotions/${promo._id}`, { isActive: !promo.isActive });
            toast.success(promo.isActive ? 'Promotion paused' : 'Promotion activated');
            fetchPromotions();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update promotion');
        }
    };

    const confirmDelete = async () => {
        try {
            await API.delete(`/promotions/${pendingDelete._id}`);
            toast.success('Promotion deleted');
            setPendingDelete(null);
            fetchPromotions();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete promotion');
        }
    };

    const isLive = (p) => {
        const now = new Date();
        return p.isActive && new Date(p.startDate) <= now && new Date(p.endDate) >= now;
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <button onClick={() => setShowNew(true)}
                    className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                    <Plus size={14} /> New Promotion
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                            <th className="p-3.5">Promotion</th>
                            <th className="p-3.5">Discount</th>
                            <th className="p-3.5">Applies To</th>
                            <th className="p-3.5">Window</th>
                            <th className="p-3.5">Status</th>
                            <th className="p-3.5 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-medium">
                        {!loading && promotions.length === 0 && (
                            <tr><td colSpan={6} className="text-center py-10 text-gray-400 font-bold">No promotions yet</td></tr>
                        )}
                        {promotions.map((p) => (
                            <tr key={p._id} className="hover:bg-gray-50/70">
                                <td className="p-3.5 font-extrabold text-gray-900">
                                    {p.name}
                                    {p.branch && <span className="block text-[10px] text-gray-400 font-medium">{p.branch.name} only</span>}
                                </td>
                                <td className="p-3.5 font-mono text-red-500 font-bold">
                                    {p.type === 'percent_off' ? `-${p.value}%` : `-${p.value} KES/unit`}
                                </td>
                                <td className="p-3.5">
                                    {p.scope === 'category'
                                        ? <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{p.category}</span>
                                        : <span className="text-gray-500">{p.products.length} product{p.products.length !== 1 ? 's' : ''}</span>}
                                </td>
                                <td className="p-3.5 text-[10px] text-gray-500">
                                    {formatKenyanDateTime(p.startDate)}<br />→ {formatKenyanDateTime(p.endDate)}
                                </td>
                                <td className="p-3.5">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${isLive(p) ? 'bg-green-50 text-green-600 border border-green-100' : p.isActive ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-gray-100 text-gray-500'}`}>
                                        {isLive(p) ? 'Live now' : p.isActive ? 'Scheduled' : 'Paused'}
                                    </span>
                                </td>
                                <td className="p-3.5 text-right whitespace-nowrap space-x-3">
                                    <button onClick={() => toggleActive(p)} className="text-gray-400 hover:text-orange-500 inline-flex items-center gap-1 font-bold">
                                        <Power size={12} /> {p.isActive ? 'Pause' : 'Activate'}
                                    </button>
                                    <button onClick={() => setPendingDelete(p)} className="text-gray-300 hover:text-red-500 inline-flex items-center gap-1 font-bold">
                                        <Trash2 size={12} /> Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <NewPromotionModal open={showNew} onClose={() => setShowNew(false)} branch={branch} branches={branches} onCreated={fetchPromotions} />

            <ConfirmModal
                open={!!pendingDelete}
                title="Delete this promotion?"
                description="This removes it permanently. If you just want to switch it off temporarily, use Pause instead."
                confirmLabel="Delete"
                tone="danger"
                onConfirm={confirmDelete}
                onClose={() => setPendingDelete(null)}
            />
        </div>
    );
}

function NewPromotionModal({ open, onClose, branch, branches, onCreated }) {
    const emptyForm = {
        name: '', type: 'percent_off', value: '', scope: 'category', category: '',
        products: [], branchScope: 'store-wide', startDate: '', endDate: '', notes: '',
    };
    const [form, setForm] = useState(emptyForm);
    const [products, setProducts] = useState([]);
    const [productSearch, setProductSearch] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        API.get('/products', branch ? { params: { branch } } : {}).then((res) => setProducts(res.data)).catch(() => {});
    }, [open, branch]);

    const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean))], [products]);
    const filteredProducts = products.filter((p) => !productSearch.trim() || p.name.toLowerCase().includes(productSearch.toLowerCase()));

    if (!open) return null;

    const toggleProduct = (id) => {
        setForm((f) => ({
            ...f,
            products: f.products.includes(id) ? f.products.filter((p) => p !== id) : [...f.products, id],
        }));
    };

    const submit = async () => {
        if (!form.name.trim()) return toast.error('Name is required');
        if (!form.value || Number(form.value) <= 0) return toast.error('Enter a discount value');
        if (form.scope === 'category' && !form.category) return toast.error('Select a category');
        if (form.scope === 'product' && form.products.length === 0) return toast.error('Select at least one product');
        if (!form.startDate || !form.endDate) return toast.error('Set a start and end date');

        setSaving(true);
        try {
            await API.post('/promotions', {
                name: form.name.trim(),
                type: form.type,
                value: Number(form.value),
                scope: form.scope,
                category: form.scope === 'category' ? form.category : undefined,
                products: form.scope === 'product' ? form.products : undefined,
                branch: form.branchScope === 'store-wide' ? null : (branch || form.branchScope),
                startDate: form.startDate,
                endDate: form.endDate,
                notes: form.notes,
            });
            toast.success('Promotion created');
            setForm(emptyForm);
            onCreated();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create promotion');
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
                    <h3 className="text-base font-black text-gray-800 flex items-center gap-2"><Tag size={18} className="text-orange-500" /> New Promotion</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. August Soap Sale" className="input" />

                    <div className="grid grid-cols-2 gap-3">
                        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
                            <option value="percent_off">Percentage off</option>
                            <option value="flat_off">Flat amount off</option>
                        </select>
                        <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })}
                            placeholder={form.type === 'percent_off' ? 'e.g. 15 (%)' : 'e.g. 20 (KES)'} className="input" />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className="input">
                            <option value="category">Whole category</option>
                            <option value="product">Specific products</option>
                        </select>
                        <select value={form.branchScope} onChange={(e) => setForm({ ...form, branchScope: e.target.value })} className="input">
                            <option value="store-wide">All branches</option>
                            {branch && <option value={branch}>This branch only</option>}
                        </select>
                    </div>

                    {form.scope === 'category' ? (
                        <div>
                            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                                list="promoCategoryList" placeholder="Select a category…" className="input" />
                            <datalist id="promoCategoryList">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                        </div>
                    ) : (
                        <div>
                            <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)}
                                placeholder="Search products to add…" className="input mb-2" />
                            <div className="border border-gray-200 rounded-xl max-h-36 overflow-y-auto divide-y divide-gray-100">
                                {filteredProducts.slice(0, 30).map((p) => (
                                    <label key={p._id} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-orange-50 cursor-pointer">
                                        <input type="checkbox" checked={form.products.includes(p._id)} onChange={() => toggleProduct(p._id)} className="rounded border-gray-300" />
                                        <span className="font-bold text-gray-800">{p.name}</span>
                                        <span className="text-gray-400 ml-auto">{p.sellingPrice} KES</span>
                                    </label>
                                ))}
                            </div>
                            {form.products.length > 0 && <p className="text-[10px] text-gray-400 mt-1">{form.products.length} selected</p>}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Starts</label>
                            <input type="datetime-local" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Ends</label>
                            <input type="datetime-local" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input" />
                        </div>
                    </div>

                    <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Notes (optional)" className="input" />
                </div>

                <div className="p-6 pt-4 border-t border-gray-100 shrink-0">
                    <button onClick={submit} disabled={saving}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                        {saving ? 'Creating…' : 'Create Promotion'}
                    </button>
                </div>

                <style>{`
                    .input { width: 100%; background: rgb(249 250 251); border: 1px solid rgb(229 231 235); border-radius: 0.75rem; padding: 0.6rem 0.85rem; font-size: 0.8rem; color: rgb(31 41 55); }
                    .input:focus { outline: none; border-color: rgb(249 115 22); background: white; box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1); }
                `}</style>
            </div>
        </div>
    );
}

// ========================= PRICE SCHEDULES =========================

function PriceSchedulesTab({ branch }) {
    const [tabStatus, setTabStatus] = useState('pending');
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [pendingCancel, setPendingCancel] = useState(null);

    const fetchSchedules = useCallback(async () => {
        setLoading(true);
        try {
            const params = { status: tabStatus };
            if (branch) params.branch = branch;
            const res = await API.get('/price-schedules', { params });
            setSchedules(res.data);
        } catch {
            toast.error('Failed to load price schedules');
        }
        setLoading(false);
    }, [branch, tabStatus]);

    useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

    const confirmCancel = async () => {
        try {
            await API.patch(`/price-schedules/${pendingCancel._id}/cancel`);
            toast.success('Schedule cancelled');
            setPendingCancel(null);
            fetchSchedules();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to cancel');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div className="flex gap-1.5">
                    {['pending', 'applied', 'cancelled'].map((s) => (
                        <button key={s} onClick={() => setTabStatus(s)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize ${tabStatus === s ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
                            {s}
                        </button>
                    ))}
                </div>
                {branch && (
                    <button onClick={() => setShowNew(true)}
                        className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                        <Plus size={14} /> Schedule a Price Change
                    </button>
                )}
            </div>
            {!branch && (
                <p className="text-xs text-gray-400 bg-white border border-gray-200 rounded-xl px-4 py-3">
                    Select a branch to schedule a new price change for its products.
                </p>
            )}

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                            <th className="p-3.5">Product</th>
                            <th className="p-3.5">Change</th>
                            <th className="p-3.5">Effective</th>
                            <th className="p-3.5">Scheduled By</th>
                            {tabStatus === 'pending' && <th className="p-3.5 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-medium">
                        {!loading && schedules.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-10 text-gray-400 font-bold">Nothing here</td></tr>
                        )}
                        {schedules.map((s) => (
                            <tr key={s._id} className="hover:bg-gray-50/70">
                                <td className="p-3.5 font-extrabold text-gray-900">{s.product?.name || '—'}</td>
                                <td className="p-3.5 font-mono">
                                    {s.valueAtScheduling} → <span className="text-orange-500 font-bold">{s.newValue}</span> KES
                                    <span className="block text-[10px] text-gray-400 capitalize font-sans">{s.field === 'casePrice' ? 'Case price' : 'Unit price'}</span>
                                </td>
                                <td className="p-3.5 text-[10px] text-gray-500">{formatKenyanDateTime(s.effectiveAt)}</td>
                                <td className="p-3.5 text-[10px] text-gray-500">{s.scheduledBy?.fullName || '—'}</td>
                                {tabStatus === 'pending' && (
                                    <td className="p-3.5 text-right">
                                        <button onClick={() => setPendingCancel(s)} className="text-gray-300 hover:text-red-500 inline-flex items-center gap-1 font-bold">
                                            <Trash2 size={12} /> Cancel
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <NewPriceScheduleModal open={showNew} onClose={() => setShowNew(false)} branch={branch} onCreated={fetchSchedules} />

            <ConfirmModal
                open={!!pendingCancel}
                title="Cancel this price schedule?"
                description="The product's price will stay as it is now — this change will never be applied."
                confirmLabel="Cancel Schedule"
                tone="danger"
                onConfirm={confirmCancel}
                onClose={() => setPendingCancel(null)}
            />
        </div>
    );
}

function NewPriceScheduleModal({ open, onClose, branch, onCreated }) {
    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(null);
    const [field, setField] = useState('sellingPrice');
    const [newValue, setNewValue] = useState('');
    const [effectiveAt, setEffectiveAt] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open || !branch) return;
        API.get('/products', { params: { branch } }).then((res) => setProducts(res.data)).catch(() => {});
    }, [open, branch]);

    if (!open) return null;

    const filtered = products.filter((p) => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()));

    const submit = async () => {
        if (!selected) return toast.error('Select a product');
        if (!newValue || Number(newValue) < 0) return toast.error('Enter a valid price');
        if (!effectiveAt) return toast.error('Choose when this should take effect');

        setSaving(true);
        try {
            await API.post('/price-schedules', {
                product: selected._id,
                field,
                newValue: Number(newValue),
                effectiveAt,
            });
            toast.success('Price change scheduled');
            setSelected(null); setNewValue(''); setEffectiveAt('');
            onCreated();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to schedule price change');
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
                    <h3 className="text-base font-black text-gray-800 flex items-center gap-2"><CalendarClock size={18} className="text-orange-500" /> Schedule a Price Change</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {!selected ? (
                        <div>
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search a product…" className="input mb-2" />
                            <div className="border border-gray-200 rounded-xl max-h-52 overflow-y-auto divide-y divide-gray-100">
                                {filtered.slice(0, 30).map((p) => (
                                    <button key={p._id} onClick={() => setSelected(p)}
                                        className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-orange-50">
                                        <span className="font-bold text-gray-800">{p.name}</span>
                                        <span className="text-gray-400">{p.sellingPrice} KES</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-800">{selected.name}</span>
                                <button onClick={() => setSelected(null)} className="text-[10px] text-orange-500 font-bold">Change</button>
                            </div>
                            <select value={field} onChange={(e) => setField(e.target.value)} className="input">
                                <option value="sellingPrice">Unit price (currently {selected.sellingPrice} KES)</option>
                                {selected.packSize > 1 && <option value="casePrice">Case price (currently {selected.casePrice ?? '—'} KES)</option>}
                            </select>
                            <input type="number" value={newValue} onChange={(e) => setNewValue(e.target.value)}
                                placeholder="New price (KES)" className="input" />
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 mb-1">Effective from</label>
                                <input type="datetime-local" value={effectiveAt} onChange={(e) => setEffectiveAt(e.target.value)} className="input" />
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 pt-4 border-t border-gray-100 shrink-0">
                    <button onClick={submit} disabled={saving || !selected}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                        {saving ? 'Scheduling…' : 'Schedule Price Change'}
                    </button>
                </div>

                <style>{`
                    .input { width: 100%; background: rgb(249 250 251); border: 1px solid rgb(229 231 235); border-radius: 0.75rem; padding: 0.6rem 0.85rem; font-size: 0.8rem; color: rgb(31 41 55); }
                    .input:focus { outline: none; border-color: rgb(249 115 22); background: white; box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1); }
                `}</style>
            </div>
        </div>
    );
                  }
