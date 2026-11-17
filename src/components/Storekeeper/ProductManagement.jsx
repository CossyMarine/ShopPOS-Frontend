import { useEffect, useMemo, useState, useCallback } from 'react';
import { Plus, Boxes, PackagePlus, Package, History, Truck } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ConfirmModal from '../Admin/ConfirmModal';
import { useAuth } from '../../hooks/useAuth';
import LabelPrintModal from './LabelPrintModal';
import { EMPTY_UNIT, packsOf, breakdown, money, num, statusOf } from './productManagementUtils';
import { baseAbbr, stockOf } from '../../utils/receivingMath';
import { avgCostPerEach } from './productManagementUtils';
import ProductStats from './ProductStats';
import LowStockBanner from './LowStockBanner';
import UnitManager from './UnitManager';
import ProductFilters from './ProductFilters';
import ProductTable from './ProductTable';
import ProductFormModal from './ProductFormModal';
import ReceiveStock from './ReceiveStock';
import ReceiptHistory, { ReceiptModal } from './ReceiptHistory';
import SuppliersManager from './SuppliersManager';
import StockAdjustmentModal from './StockAdjustmentModal';

const TABS = [['products', 'Products', Package], ['receive', 'Receive stock', PackagePlus], ['packs', 'Packs & units', Boxes], ['history', 'History', History], ['suppliers', 'Suppliers', Truck]];

export default function ProductManagement({ branch }) {
    const { user } = useAuth();
    const effectiveBranch = branch || user.branch;
    const canDelete = !!(user.isAdmin || user.role === 'branchManager');

    const [tab, setTab] = useState('products');
    const [products, setProducts] = useState([]);
    const [units, setUnits] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [receipts, setReceipts] = useState([]);
    const [modal, setModal] = useState(null);            // { product, name }
    const [pending, setPending] = useState(null);        // { type:'delete'|'archive', item }
    const [busy, setBusy] = useState(false);
    const [labelFor, setLabelFor] = useState(null);
    const [adjustingFor, setAdjustingFor] = useState(null);
    const [shownReceipt, setShownReceipt] = useState(null);
    const [focusReq, setFocusReq] = useState(null);
    const [showUnitManager, setShowUnitManager] = useState(false);
    const [unitForm, setUnitForm] = useState(EMPTY_UNIT);
    const [savingUnit, setSavingUnit] = useState(false);
    const [deletingUnitId, setDeletingUnitId] = useState(null);
    const [supplierFilter, setSupplierFilter] = useState('');
    const [showLowStockBanner, setShowLowStockBanner] = useState(true);

    const [search, setSearch] = useState('');
    const [filterPackaging, setFilterPackaging] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [filterStatus, setFilterStatus] = useState('All');

    const params = effectiveBranch ? { branch: effectiveBranch } : {};
    const fetchProducts = useCallback(async () => {
        try { const r = await API.get('/products', { params: { ...params, status: 'all' } }); setProducts(r.data); }
        catch { toast.error('Failed to load products'); }
    }, [effectiveBranch]); // eslint-disable-line
    const fetchUnits = async () => { try { setUnits((await API.get('/inventory/units')).data); } catch { /* ignore */ } };
    const fetchSuppliers = useCallback(async () => { try { setSuppliers((await API.get('/suppliers', { params: { ...params, status: 'all' } })).data); } catch { /* ignore */ } }, [effectiveBranch]); // eslint-disable-line
    const fetchReceipts = useCallback(async () => { try { setReceipts((await API.get('/goods-receipts', { params })).data); } catch { /* ignore */ } }, [effectiveBranch]); // eslint-disable-line

    useEffect(() => { fetchProducts(); fetchUnits(); fetchSuppliers(); }, [effectiveBranch]); // eslint-disable-line
    useEffect(() => { if (tab === 'history') fetchReceipts(); }, [tab, effectiveBranch]); // eslint-disable-line

    const active = useMemo(() => products.filter((p) => p.isActive !== false), [products]);
    const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(), [products]);

    const stats = useMemo(() => {
        let bulkCount = 0, lowCount = 0, stockValue = 0, potentialProfit = 0;
        active.forEach((p) => {
            const s = stockOf(p), cost = avgCostPerEach(p);
            if ((p.packs || []).length) bulkCount++;
            if (s === 0 || (p.reorderLevel > 0 && s <= p.reorderLevel)) lowCount++;
            stockValue += s * cost; potentialProfit += s * ((p.sellingPrice || 0) - cost);
        });
        return { totalSkus: active.length, bulkCount, lowCount, stockValue, potentialProfit };
    }, [active]);
    const lowStockItems = useMemo(() => active.filter((p) => stockOf(p) === 0 || (p.reorderLevel > 0 && stockOf(p) <= p.reorderLevel)), [active]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        return products.filter((p) => {
            const st = statusOf(p);
            if (filterStatus === 'Archived' ? p.isActive !== false : p.isActive === false) return false;
            if (filterStatus !== 'All' && filterStatus !== 'Archived' && st !== filterStatus) return false;
            if (filterCategory !== 'all' && p.category !== filterCategory) return false;
            const has = (p.packs || []).length > 0;
            if (filterPackaging === 'bulk' && !has) return false;
            if (filterPackaging === 'single' && has) return false;
            return !q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.barcode || '').toLowerCase().includes(q) || (p.packs || []).some((k) => (k.barcode || '').toLowerCase().includes(q));
        });
    }, [products, search, filterStatus, filterCategory, filterPackaging]);

    const goReceive = (p, key) => {
        if (p.isActive === false) return toast.error(`${p.name} is archived. Restore it first.`);
        setFocusReq({ id: p._id, key, n: Date.now() }); setTab('receive'); window.scrollTo({ top: 0 });
    };

    const afterSave = async (saved, mode) => {
        setModal(null); await fetchProducts(); await fetchSuppliers();
        if (mode === 'receive') goReceive(saved);
    };
    const afterReceive = async (receipt) => { setShownReceipt(receipt); setFocusReq(null); await fetchProducts(); await fetchSuppliers(); fetchReceipts(); setTab('products'); };

    const confirmPending = async () => {
        setBusy(true);
        try {
            if (pending.type === 'delete') { await API.delete(`/products/${pending.item._id}`); toast.success('Product deleted'); }
            else { await API.put(`/products/${pending.item._id}`, { isActive: false, branch: effectiveBranch }); toast.success('Product archived'); }
            setPending(null); fetchProducts();
        } catch (e) { toast.error(e.response?.data?.message || 'Action failed'); }
        setBusy(false);
    };
    const restore = async (p) => { try { await API.put(`/products/${p._id}`, { isActive: true, branch: effectiveBranch }); toast.success('Product restored'); fetchProducts(); } catch (e) { toast.error(e.response?.data?.message || 'Failed to restore'); } };

    const addUnit = async () => {
        if (!unitForm.name || !unitForm.abbreviation) return toast.error('Name and abbreviation are required');
        setSavingUnit(true);
        try { await API.post('/inventory/units', unitForm); toast.success('Unit added'); setUnitForm(EMPTY_UNIT); fetchUnits(); }
        catch (e) { toast.error(e.response?.data?.message || 'Failed to add unit'); }
        setSavingUnit(false);
    };
    const removeUnit = async (u) => {
        setDeletingUnitId(u._id);
        try { await API.delete(`/inventory/units/${u._id}`); toast.success('Unit removed'); fetchUnits(); }
        catch (e) { toast.error(e.response?.data?.message || 'Unit is in use — cannot remove'); }
        setDeletingUnitId(null);
    };

    const openNew = (name = '') => (effectiveBranch ? setModal({ product: null, name }) : toast.error('Select a branch first'));

    return (
        <div className="space-y-6 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-2xl font-black text-gray-800">Products & Stock</h2><p className="text-sm text-gray-500">Buy in cartons, boxes or sacks. The system counts the pieces.</p></div>
                <div className="flex items-center gap-2">
                    <button onClick={() => { setFocusReq(null); setTab('receive'); }} className="flex items-center gap-2 bg-white border border-gray-200 hover:border-orange-400 text-sm font-bold text-gray-700 px-4 py-2 rounded-xl shadow-sm"><PackagePlus size={15} />Receive stock</button>
                    <button onClick={() => openNew()} className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-hover text-white px-4 py-2 rounded-xl text-sm font-extrabold shadow-sm"><Plus size={16} />New product</button>
                </div>
            </div>

            <nav className="flex gap-1 bg-gray-100 rounded-full p-1 overflow-x-auto w-fit max-w-full">
                {TABS.map(([k, t, Icon]) => (
                    <button key={k} onClick={() => { if (k === 'receive') setFocusReq(null); setTab(k); }} className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${tab === k ? 'bg-brand-orange text-white' : 'text-gray-600'}`}><Icon size={14} />{t}</button>
                ))}
            </nav>

            {branch !== undefined && !branch && <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold rounded-xl px-4 py-3">You're viewing All Branches. Pick a branch above to add products or receive stock.</div>}

            {tab === 'products' && (<>
                <ProductStats stats={stats} />
                {showLowStockBanner && lowStockItems.length > 0 && <LowStockBanner items={lowStockItems} onDismiss={() => setShowLowStockBanner(false)} />}
                <ProductFilters search={search} setSearch={setSearch} filterPackaging={filterPackaging} setFilterPackaging={setFilterPackaging}
                    filterCategory={filterCategory} setFilterCategory={setFilterCategory} filterStatus={filterStatus} setFilterStatus={setFilterStatus} categories={categories} />
                <ProductTable products={filtered} canDelete={canDelete}
                    onReceiveStock={goReceive} onReportLoss={setAdjustingFor} onPrintLabel={setLabelFor}
                    onEdit={(p) => setModal({ product: p })} onArchive={(p) => setPending({ type: 'archive', item: p })} onRestore={restore} onDelete={(p) => setPending({ type: 'delete', item: p })} />
            </>)}

            {tab === 'receive' && <ReceiveStock products={products} suppliers={suppliers} branch={effectiveBranch} focusReq={focusReq}
                onDone={afterReceive} onEditProduct={(p) => setModal({ product: p })} onCreateProduct={(name) => openNew(name)} />}

            {tab === 'packs' && (
                <div className="space-y-4">
                    <div className="rounded-2xl p-5 bg-orange-50 border border-orange-100 text-sm text-gray-700">
                        <b>How packs work:</b> every product has one <b>base unit</b> (pieces, kg or litres). Add packs such as <b>Carton = 24 pcs</b> or <b>Sack = 50 kg</b>, and optionally a <b>selling price per pack</b>. When receiving, pick how you bought it, or mix units (10 boxes + 12 pcs), and the system converts to the base unit.
                    </div>
                    <button onClick={() => setShowUnitManager((v) => !v)} className="flex items-center gap-2 bg-white border border-gray-200 text-sm font-bold text-gray-700 px-4 py-2 rounded-xl"><Boxes size={15} />Manage measurement units</button>
                    {showUnitManager && <UnitManager units={units} unitForm={unitForm} setUnitForm={setUnitForm} onAdd={addUnit} savingUnit={savingUnit} deletingUnitId={deletingUnitId} onRemove={removeUnit} />}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {active.map((p) => (
                            <div key={p._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                                <p className="font-bold">{p.name}</p>
                                <p className="text-xs text-gray-500">{p.category} · Stock <b>{num(stockOf(p))} {baseAbbr(p)}</b>{packsOf(p).length && stockOf(p) > 0 ? ` (${breakdown(p, stockOf(p))})` : ''}</p>
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {packsOf(p).length ? [...packsOf(p)].reverse().map((k) => <span key={k._id} className="sk-chip">1 {k.name} = {num(k.qty)} {baseAbbr(p)} · {money(k.price > 0 ? k.price : p.sellingPrice * k.qty)}</span>)
                                        : <span className="text-xs text-gray-400">Sold only as single {baseAbbr(p)}</span>}
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button onClick={() => setModal({ product: p })} className="flex-1 px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl">Manage packs</button>
                                    <button onClick={() => goReceive(p)} className="flex-1 px-3 py-2 text-xs font-bold bg-brand-orange text-white rounded-xl">Add stock</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === 'history' && <ReceiptHistory receipts={receipts} suppliers={suppliers} supplierFilter={supplierFilter} setSupplierFilter={setSupplierFilter} />}

            {tab === 'suppliers' && <SuppliersManager suppliers={suppliers} branch={effectiveBranch} canDelete={canDelete} refresh={fetchSuppliers}
                onViewDeliveries={(s) => { setSupplierFilter(s._id); setTab('history'); }} />}

            {modal && <ProductFormModal key={modal.product?._id || 'new'} product={modal.product} initialName={modal.name} units={units} categories={categories} suppliers={suppliers}
                branch={effectiveBranch} onClose={() => setModal(null)} onSaved={afterSave} onOpenUnitManager={() => { setModal(null); setTab('packs'); setShowUnitManager(true); }} />}

            <StockAdjustmentModal product={adjustingFor} open={!!adjustingFor} onClose={() => setAdjustingFor(null)} onSubmitted={fetchProducts} />
            {labelFor && <LabelPrintModal product={labelFor} onClose={() => setLabelFor(null)} />}
            {shownReceipt && <ReceiptModal r={shownReceipt} fresh onClose={() => setShownReceipt(null)} />}

            <ConfirmModal open={!!pending} tone={pending?.type === 'delete' ? 'danger' : undefined} loading={busy}
                title={pending?.type === 'delete' ? 'Delete product?' : 'Archive product?'}
                description={pending?.type === 'delete' ? `Permanently remove "${pending?.item?.name}" from the catalog? This can't be undone.` : `Hide "${pending?.item?.name}" from search and receiving? Its history is kept and you can restore it any time.`}
                confirmLabel={pending?.type === 'delete' ? 'Delete' : 'Archive'} onConfirm={confirmPending} onClose={() => setPending(null)} />

            <style>{`
                .input { width: 100%; background: rgb(249 250 251); border: 1px solid rgb(229 231 235); border-radius: 0.75rem; padding: 0.6rem 0.85rem; font-size: 0.875rem; color: rgb(31 41 55); }
                .input:focus { outline: none; border-color: rgb(249 115 22); background: white; box-shadow: 0 0 0 2px rgba(249,115,22,.1); }
                .input::placeholder { color: rgb(156 163 175); }
                .sk-label { display:block; font-size:.65rem; font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#78716c; margin-bottom:.3rem; }
                .sk-chip { display:inline-flex; align-items:center; gap:.3rem; padding:.3rem .8rem; border-radius:999px; font-size:.72rem; font-weight:600; color:#57534e; border:1px solid #e7e5e4; background:#fff; }
                .sk-chip:hover { border-color:#f97316; } .sk-chip.on { background:#f97316; border-color:#f97316; color:#fff; }
                .sk-seg { display:flex; flex-wrap:wrap; gap:.25rem; background:#f5f5f4; border:1px solid #e7e5e4; border-radius:.75rem; padding:.25rem; }
                .sk-seg button { flex:1; min-width:70px; padding:.5rem .7rem; border-radius:.55rem; font-size:.78rem; font-weight:600; color:#57534e; }
                .sk-seg button.on { background:#f97316; color:#fff; }
                .sk-stp { width:40px; height:40px; display:inline-flex; align-items:center; justify-content:center; border-radius:.75rem; border:1px solid #e7e5e4; background:#fff; flex-shrink:0; }
                .sk-flag { display:flex; gap:.4rem; font-size:.72rem; font-weight:500; padding:.4rem .6rem; border-radius:.5rem; }
                .sk-flag.err { background:#fef2f2; color:#b91c1c; } .sk-flag.warn { background:#fffbeb; color:#b45309; } .sk-flag.info { background:#eff6ff; color:#1d4ed8; }
            `}</style>
        </div>
    );
                                            }
