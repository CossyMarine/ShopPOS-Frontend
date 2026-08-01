import { useState, useEffect, useRef, useMemo } from 'react';
import {
    Pencil, Trash2, Plus, Package, X, Upload, Image as ImageIcon,
    PackagePlus, Barcode, Boxes, Search, TriangleAlert, Wallet,
    TrendingUp, Wand2,
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ConfirmModal from '../Admin/ConfirmModal';
import { useAuth } from '../../hooks/useAuth';
import LabelPrintModal from './LabelPrintModal';

const EMPTY_FORM = {
    name: '', barcode: '', category: 'General', unit: '',
    sellingPrice: '', reorderLevel: '',
    isBulk: false, packSize: '10', caseLabel: 'Carton', caseBarcode: '', casePrice: '',
    imageUrl: '', imagePublicId: '',
    openingQty: '', openingCost: '', openingReceivedAs: 'each',
};
const EMPTY_STOCK = { quantity: '', costPerUnit: '', expiryDate: '', supplierNote: '', receivedAs: 'each' };
const EMPTY_UNIT = { name: '', abbreviation: '' };

// Weighted-average buying price per "each" unit, derived from remaining batches.
function avgCostPerEach(product) {
    const batches = product.batches || [];
    const totalQty = batches.reduce((s, b) => s + b.quantity, 0);
    if (!totalQty) return 0;
    const totalCost = batches.reduce((s, b) => s + b.quantity * b.costPerUnit, 0);
    return totalCost / totalQty;
}

const money = (n) => (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function ProductManagement() {
    const { user } = useAuth();
    const [products, setProducts] = useState([]);
    const [units, setUnits] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
    const [showProductModal, setShowProductModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [pendingDelete, setPendingDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [receivingFor, setReceivingFor] = useState(null);
    const [stockForm, setStockForm] = useState(EMPTY_STOCK);
    const [receiving, setReceiving] = useState(false);
    const [labelFor, setLabelFor] = useState(null);

    const [showUnitManager, setShowUnitManager] = useState(false);
    const [unitForm, setUnitForm] = useState(EMPTY_UNIT);
    const [savingUnit, setSavingUnit] = useState(false);
    const [deletingUnitId, setDeletingUnitId] = useState(null);

    const [search, setSearch] = useState('');
    const [filterPackaging, setFilterPackaging] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showLowStockBanner, setShowLowStockBanner] = useState(true);

    const fileRef = useRef();

    const fetchProducts = async () => {
        try {
            const res = await API.get('/products', { params: { branch: user.branch } });
            setProducts(res.data);
        } catch (err) {
            console.error('Failed to fetch products', err);
            toast.error('Failed to load products');
        }
    };

    const fetchUnits = async () => {
        try {
            const res = await API.get('/inventory/units');
            setUnits(res.data);
        } catch (err) {
            console.error('Failed to fetch units', err);
        }
    };

    useEffect(() => { fetchProducts(); fetchUnits(); }, []);

    const selectedUnit = units.find((u) => u._id === form.unit);
    const unitAbbr = selectedUnit?.abbreviation || 'unit';
    const packSizeNum = parseInt(form.packSize, 10) || 1;
    const isBulk = form.isBulk;

    const categories = useMemo(
        () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
        [products]
    );

    // ---------- Stats ----------
    const stats = useMemo(() => {
        let bulkCount = 0, lowCount = 0, stockValue = 0, potentialProfit = 0;
        products.forEach((p) => {
            const stock = p.currentStock ?? 0;
            const packSize = p.packSize || 1;
            const cost = avgCostPerEach(p);
            if (packSize > 1) bulkCount++;
            const low = stock === 0 || (p.reorderLevel > 0 && stock <= p.reorderLevel);
            if (low) lowCount++;
            stockValue += stock * cost;
            potentialProfit += stock * ((p.sellingPrice || 0) - cost);
        });
        return { totalSkus: products.length, bulkCount, lowCount, stockValue, potentialProfit };
    }, [products]);

    const lowStockItems = useMemo(
        () => products.filter((p) => {
            const stock = p.currentStock ?? 0;
            return stock === 0 || (p.reorderLevel > 0 && stock <= p.reorderLevel);
        }),
        [products]
    );

    // ---------- Filtering ----------
    const filteredProducts = useMemo(() => {
        const q = search.toLowerCase().trim();
        return products.filter((p) => {
            const packSize = p.packSize || 1;
            const matchesQuery = !q
                || p.name.toLowerCase().includes(q)
                || (p.barcode || '').toLowerCase().includes(q)
                || (p.caseBarcode || '').toLowerCase().includes(q);
            const matchesCat = filterCategory === 'all' || p.category === filterCategory;
            let matchesPkg = true;
            if (filterPackaging === 'bulk') matchesPkg = packSize > 1;
            if (filterPackaging === 'single') matchesPkg = packSize === 1;
            return matchesQuery && matchesCat && matchesPkg;
        });
    }, [products, search, filterCategory, filterPackaging]);

    // ---------- Modal open/close ----------
    const openAddModal = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        if (fileRef.current) fileRef.current.value = '';
        setShowProductModal(true);
    };

    const startEdit = (item) => {
        setEditingId(item._id);
        const bulk = (item.packSize || 1) > 1;
        setForm({
            ...EMPTY_FORM,
            name: item.name,
            barcode: item.barcode || '',
            category: item.category,
            unit: item.unit?._id || item.unit || '',
            sellingPrice: item.sellingPrice,
            reorderLevel: item.reorderLevel || '',
            isBulk: bulk,
            packSize: String(item.packSize || 10),
            caseLabel: item.caseLabel || 'Carton',
            caseBarcode: item.caseBarcode || '',
            casePrice: item.casePrice ?? '',
            imageUrl: item.imageUrl || '',
            imagePublicId: item.imagePublicId || '',
        });
        setShowProductModal(true);
    };

    const closeProductModal = () => {
        setShowProductModal(false);
        setEditingId(null);
        setForm(EMPTY_FORM);
        if (fileRef.current) fileRef.current.value = '';
    };

    const toggleBulk = () => {
        setForm((prev) => ({
            ...prev,
            isBulk: !prev.isBulk,
            packSize: !prev.isBulk ? (prev.packSize === '1' ? '10' : prev.packSize) : '1',
        }));
    };

    const generateRandomBarcode = () => {
        setForm((prev) => ({ ...prev, barcode: '6291' + Math.floor(100000000 + Math.random() * 900000000) }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return toast.error('Max file size is 5MB');

        const formData = new FormData();
        formData.append('image', file);

        try {
            setUploading(true);
            const res = await API.post('/products/upload-image', formData);
            setForm((prev) => ({ ...prev, imageUrl: res.data.url, imagePublicId: res.data.publicId }));
            toast.success('Image uploaded');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Image upload failed');
        } finally {
            setUploading(false);
        }
    };

    const removeImage = () => {
        setForm((prev) => ({ ...prev, imageUrl: '', imagePublicId: '' }));
        if (fileRef.current) fileRef.current.value = '';
    };

    // ---------- Save / Delete / Receive stock ----------
    const saveItem = async () => {
        if (!form.name || !form.sellingPrice || !form.unit) {
            return toast.error('Name, unit and selling price are required');
        }
        if (form.openingQty && !form.openingCost && form.openingCost !== 0) {
            return toast.error('Enter the buying price for the opening stock, or leave both blank');
        }

        const resolvedPackSize = isBulk ? Math.max(2, packSizeNum) : 1;

        setSaving(true);
        try {
            const payload = {
                name: form.name,
                barcode: form.barcode || undefined,
                category: form.category || 'General',
                unit: form.unit,
                sellingPrice: parseFloat(form.sellingPrice),
                casePrice: isBulk && form.casePrice !== '' ? parseFloat(form.casePrice) : null,
                reorderLevel: form.reorderLevel ? parseFloat(form.reorderLevel) : 0,
                packSize: resolvedPackSize,
                caseLabel: isBulk ? (form.caseLabel || 'Carton') : 'Carton',
                caseBarcode: isBulk ? (form.caseBarcode || null) : null,
                imageUrl: form.imageUrl || null,
                imagePublicId: form.imagePublicId || null,
                branch: user.branch,
            };

            if (editingId) {
                await API.put(`/products/${editingId}`, payload);
                toast.success('Product updated');
            } else {
                const created = await API.post('/products', payload);
                if (form.openingQty) {
                    await API.post(`/products/${created.data._id}/receive-stock`, {
                        quantity: parseFloat(form.openingQty),
                        costPerUnit: parseFloat(form.openingCost),
                        receivedAs: isBulk ? form.openingReceivedAs : 'each',
                    });
                    toast.success('Product added with opening stock');
                } else {
                    toast.success('Product added — remember to receive its opening stock');
                }
            }
            closeProductModal();
            fetchProducts();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save product');
        }
        setSaving(false);
    };

    const confirmDelete = async () => {
        setDeleting(true);
        try {
            await API.delete(`/products/${pendingDelete._id}`);
            toast.success('Product deleted');
            setPendingDelete(null);
            fetchProducts();
        } catch (err) {
            toast.error('Failed to delete product');
        }
        setDeleting(false);
    };

    const submitStock = async () => {
        if (!stockForm.quantity || stockForm.costPerUnit === '') {
            return toast.error('Quantity and cost are required');
        }
        setReceiving(true);
        try {
            await API.post(`/products/${receivingFor._id}/receive-stock`, {
                quantity: parseFloat(stockForm.quantity),
                costPerUnit: parseFloat(stockForm.costPerUnit),
                receivedAs: stockForm.receivedAs,
                expiryDate: stockForm.expiryDate || null,
                supplierNote: stockForm.supplierNote,
            });
            toast.success(`Stock received for ${receivingFor.name}`);
            setReceivingFor(null);
            setStockForm(EMPTY_STOCK);
            fetchProducts();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to receive stock');
        }
        setReceiving(false);
    };

    const addUnit = async () => {
        if (!unitForm.name || !unitForm.abbreviation) {
            return toast.error('Name and abbreviation are required');
        }
        setSavingUnit(true);
        try {
            await API.post('/inventory/units', unitForm);
            toast.success('Unit added');
            setUnitForm(EMPTY_UNIT);
            fetchUnits();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add unit');
        }
        setSavingUnit(false);
    };

    const removeUnit = async (unit) => {
        setDeletingUnitId(unit._id);
        try {
            await API.delete(`/inventory/units/${unit._id}`);
            toast.success('Unit removed');
            fetchUnits();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Unit is in use — cannot remove');
        }
        setDeletingUnitId(null);
    };

    const earliestExpiry = (product) => {
        const dated = (product.batches || []).filter((b) => b.expiryDate);
        if (!dated.length) return null;
        return dated.reduce((min, b) => (new Date(b.expiryDate) < new Date(min) ? b.expiryDate : min), dated[0].expiryDate);
    };
    const isExpiringSoon = (date) => date && (new Date(date) - Date.now()) < 3 * 24 * 60 * 60 * 1000;

    // Live preview for the Receive Stock modal
    const hasCase = receivingFor && (receivingFor.packSize || 1) > 1;
    const stockQtyNum = parseFloat(stockForm.quantity) || 0;
    const stockCostNum = parseFloat(stockForm.costPerUnit) || 0;
    const stockPreview = hasCase && stockForm.receivedAs === 'case' && stockQtyNum > 0
        ? { pieces: stockQtyNum * receivingFor.packSize, costEach: stockCostNum / receivingFor.packSize }
        : null;

    // Live buying-price → profit preview for the Add/Edit modal
    const openQtyNum = parseFloat(form.openingQty) || 0;
    const openCostNum = parseFloat(form.openingCost) || 0;
    const editingProduct = editingId ? products.find((p) => p._id === editingId) : null;
    const modalCostPerEach = editingId
        ? avgCostPerEach(editingProduct || {})
        : (openQtyNum > 0
            ? (isBulk && form.openingReceivedAs === 'case' ? openCostNum / packSizeNum : openCostNum)
            : 0);
    const modalSellingPrice = parseFloat(form.sellingPrice) || 0;
    const modalCasePrice = parseFloat(form.casePrice) || 0;
    const eachProfit = modalSellingPrice - modalCostPerEach;
    const caseProfit = isBulk ? modalCasePrice - modalCostPerEach * packSizeNum : 0;
    const showProfitPreview = modalCostPerEach > 0 && modalSellingPrice > 0;

    return (
        <div className="space-y-6 bg-gray-50 text-gray-800">

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Products & Stock</h2>
                    <p className="text-sm text-gray-500">Add products, receive stock batches, print labels, and track expiry</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowUnitManager((v) => !v)}
                        className="flex items-center gap-2 bg-white border border-gray-200 hover:border-orange-400 text-sm font-bold text-gray-700 hover:text-orange-500 px-4 py-2 rounded-xl shadow-sm transition-colors"
                    >
                        <Boxes size={15} /> Manage Units
                    </button>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-hover text-white px-4 py-2 rounded-xl text-sm font-extrabold shadow-sm transition"
                    >
                        <Plus size={16} /> Add New Product
                    </button>
                </div>
            </div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Total SKUs</span>
                        <p className="text-xl font-black text-gray-900 mt-0.5">{stats.totalSkus}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center text-lg">
                        <Package size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Bulk / Carton Items</span>
                        <p className="text-xl font-black text-indigo-600 mt-0.5">{stats.bulkCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
                        <PackagePlus size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Low / Out of Stock</span>
                        <p className="text-xl font-black text-amber-600 mt-0.5">{stats.lowCount}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
                        <TriangleAlert size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Stock Value (Cost)</span>
                        <p className="text-xl font-black text-gray-900 mt-0.5">{money(stats.stockValue)} KES</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center text-lg">
                        <Wallet size={18} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Potential Profit</span>
                        <p className="text-xl font-black text-green-600 mt-0.5">{money(stats.potentialProfit)} KES</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-lg">
                        <TrendingUp size={18} />
                    </div>
                </div>
            </div>

            {/* LOW STOCK ALERT BANNER */}
            {showLowStockBanner && lowStockItems.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                    <TriangleAlert size={18} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-amber-800">
                            {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} need{lowStockItems.length === 1 ? 's' : ''} restocking
                        </p>
                        <p className="text-xs text-amber-700 font-medium truncate">
                            {lowStockItems.map((p) => p.name).join(', ')}
                        </p>
                    </div>
                    <button onClick={() => setShowLowStockBanner(false)} className="text-amber-500 hover:text-amber-700 shrink-0">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* UNIT MANAGER */}
            {showUnitManager && (
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-black text-gray-800 mb-1">Measurement Units</h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Define the units products are sold in (Piece, Kilogram, Litre...) — these populate the "Unit" dropdown below.
                    </p>
                    <div className="flex flex-wrap gap-3 mb-4">
                        <input
                            value={unitForm.name}
                            onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })}
                            placeholder="e.g. Piece, Kilogram, Litre"
                            className="input flex-1 min-w-[160px]"
                        />
                        <input
                            value={unitForm.abbreviation}
                            onChange={(e) => setUnitForm({ ...unitForm, abbreviation: e.target.value })}
                            placeholder="e.g. pc, kg, l"
                            className="input w-32"
                        />
                        <button
                            onClick={addUnit}
                            disabled={savingUnit}
                            className="flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                        >
                            <Plus size={15} /> {savingUnit ? 'Adding…' : 'Add Unit'}
                        </button>
                    </div>
                    {units.length === 0 ? (
                        <p className="text-xs text-gray-400 font-medium">No units yet — add one above before creating products.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {units.map((u) => (
                                <span key={u._id} className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-full pl-3 pr-1.5 py-1 text-xs font-bold text-gray-700">
                                    {u.name} ({u.abbreviation})
                                    <button onClick={() => removeUnit(u)} disabled={deletingUnitId === u._id} title="Remove unit" className="text-gray-400 hover:text-red-500 disabled:opacity-40">
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* SEARCH & FILTER BAR */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
                <div className="relative w-full md:w-80">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                        <Search size={13} />
                    </span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search SKU, Product, Barcode..."
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-orange transition"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <select value={filterPackaging} onChange={(e) => setFilterPackaging(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold px-3 py-2 focus:outline-none focus:border-brand-orange">
                        <option value="all">All Packaging Types</option>
                        <option value="bulk">Bulk / Carton Items Only</option>
                        <option value="single">Single Unit Items Only</option>
                    </select>

                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold px-3 py-2 focus:outline-none focus:border-brand-orange">
                        <option value="all">All Categories</option>
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* INVENTORY TABLE */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                <th className="p-3.5">Product & Barcode</th>
                                <th className="p-3.5">Packaging</th>
                                <th className="p-3.5">Cost Structure</th>
                                <th className="p-3.5">Selling Price / Profit</th>
                                <th className="p-3.5">Current Inventory</th>
                                <th className="p-3.5">Status</th>
                                <th className="p-3.5 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs font-medium">
                            {filteredProducts.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-10 text-gray-400 font-bold">No products found</td></tr>
                            ) : (
                                filteredProducts.map((item) => {
                                    const stock = item.currentStock ?? 0;
                                    const packSize = item.packSize || 1;
                                    const bulk = packSize > 1;
                                    const cost = avgCostPerEach(item);
                                    const caseCost = cost * packSize;
                                    const unitProfit = (item.sellingPrice || 0) - cost;
                                    const caseProfitCalc = item.casePrice != null ? item.casePrice - caseCost : null;
                                    const expiry = earliestExpiry(item);
                                    const out = stock === 0;
                                    const low = !out && item.reorderLevel > 0 && stock <= item.reorderLevel;

                                    return (
                                        <tr key={item._id} className="hover:bg-gray-50/80 transition">
                                            <td className="p-3.5">
                                                <p className="font-extrabold text-gray-900 leading-tight">{item.name}</p>
                                                <span className="text-[10px] font-mono font-bold text-gray-400 flex items-center gap-1">
                                                    <Barcode size={10} /> {item.barcode || '—'}
                                                </span>
                                                <span className="text-[10px] text-gray-400">{item.category}</span>
                                            </td>

                                            <td className="p-3.5">
                                                {bulk ? (
                                                    <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 w-fit">
                                                        <Package size={10} /> {item.caseLabel} ({packSize} {item.unit?.abbreviation || 'pcs'})
                                                    </span>
                                                ) : (
                                                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold w-fit">Single Unit</span>
                                                )}
                                            </td>

                                            <td className="p-3.5">
                                                {cost > 0 ? (
                                                    bulk ? (
                                                        <div>
                                                            <p className="font-extrabold text-gray-900">{money(caseCost)} KES <span className="text-[10px] text-gray-400 font-normal">/ {item.caseLabel}</span></p>
                                                            <span className="text-[10px] font-semibold text-gray-500">({money(cost)} KES / {item.unit?.abbreviation || 'pc'})</span>
                                                        </div>
                                                    ) : (
                                                        <span className="font-bold text-gray-600">{money(cost)} KES</span>
                                                    )
                                                ) : (
                                                    <span className="text-[10px] text-gray-400 italic">No stock received yet</span>
                                                )}
                                            </td>

                                            <td className="p-3.5">
                                                <p className="font-black text-brand-orange">
                                                    {money(item.sellingPrice)} KES <span className="text-[10px] text-gray-400 font-normal">/ {item.unit?.abbreviation || 'unit'}</span>
                                                </p>
                                                {bulk && item.casePrice != null && (
                                                    <p className="font-extrabold text-indigo-600 text-[11px]">
                                                        {money(item.casePrice)} KES <span className="text-[10px] text-gray-400 font-normal">/ {item.caseLabel}</span>
                                                    </p>
                                                )}
                                                {cost > 0 ? (
                                                    <div className="mt-1 space-y-0.5">
                                                        <p className={`text-[10px] font-bold ${unitProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                            {unitProfit >= 0 ? '+' : ''}{money(unitProfit)} KES profit/{item.unit?.abbreviation || 'unit'}
                                                        </p>
                                                        {bulk && caseProfitCalc != null && (
                                                            <p className={`text-[10px] font-bold ${caseProfitCalc >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                {caseProfitCalc >= 0 ? '+' : ''}{money(caseProfitCalc)} KES profit/{item.caseLabel}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <p className="text-[10px] text-gray-400 italic mt-1">Profit shown after stock is received</p>
                                                )}
                                            </td>

                                            <td className="p-3.5">
                                                {bulk ? (
                                                    <div>
                                                        <p className="font-black text-gray-900">
                                                            {Math.floor(stock / packSize)} {item.caseLabel}{Math.floor(stock / packSize) !== 1 ? 's' : ''} + {stock % packSize} {item.unit?.abbreviation || 'pc'}
                                                        </p>
                                                        <span className="text-[10px] text-gray-500 font-semibold">({stock} {item.unit?.abbreviation || 'units'} total)</span>
                                                    </div>
                                                ) : (
                                                    <span className="font-black text-gray-900">{stock} {item.unit?.abbreviation || 'units'}</span>
                                                )}
                                            </td>

                                            <td className="p-3.5 space-y-1">
                                                {out && <span className="block bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md text-[10px] font-extrabold w-fit">Out of Stock</span>}
                                                {low && <span className="block bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-extrabold w-fit">Low Stock</span>}
                                                {!out && !low && <span className="block bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-md text-[10px] font-extrabold w-fit">In Stock</span>}
                                                {expiry && (
                                                    <span className={`block px-2 py-0.5 rounded text-[10px] font-extrabold w-fit ${isExpiringSoon(expiry) ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        Exp {new Date(expiry).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="p-3.5">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => { setReceivingFor(item); setStockForm(EMPTY_STOCK); }} title="Receive stock"
                                                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-green-600 hover:text-white text-gray-700 transition">
                                                        <PackagePlus size={13} />
                                                    </button>
                                                    <button onClick={() => setLabelFor(item)} title="Print barcode label"
                                                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-700 transition">
                                                        <Barcode size={13} />
                                                    </button>
                                                    <button onClick={() => startEdit(item)} title="Edit"
                                                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-orange-500 hover:text-white text-gray-700 transition">
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button onClick={() => setPendingDelete(item)} title="Delete"
                                                        className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-600 hover:text-white text-gray-700 transition">
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADD / EDIT PRODUCT MODAL */}
            {showProductModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                            <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                                <Package size={16} className="text-brand-orange" /> {editingId ? 'Edit Product' : 'Add New Product'}
                            </h3>
                            <button onClick={closeProductModal} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Product Name</label>
                                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="e.g. Fresh Milk 500ml" className="input font-bold" />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Category</label>
                                    <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        list="categoryList" placeholder="Dairy, Bakery, Pantry..." className="input font-bold" />
                                    <datalist id="categoryList">
                                        {categories.map((c) => <option key={c} value={c} />)}
                                    </datalist>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Unit (sold loose as)</label>
                                    {units.length === 0 ? (
                                        <button type="button" onClick={() => setShowUnitManager(true)}
                                            className="w-full text-left text-xs font-bold text-orange-500 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 hover:bg-orange-100">
                                            No units yet — tap to add one →
                                        </button>
                                    ) : (
                                        <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input font-bold">
                                            <option value="">Select unit</option>
                                            {units.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.abbreviation})</option>)}
                                        </select>
                                    )}
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Barcode (each)</label>
                                    <div className="flex gap-1">
                                        <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                            placeholder="Scan or type EAN-13" className="input font-mono font-bold" />
                                        <button type="button" onClick={generateRandomBarcode} title="Generate barcode"
                                            className="bg-gray-200 hover:bg-gray-300 px-3 rounded-xl">
                                            <Wand2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* BULK TOGGLE CARD */}
                            <div className="bg-orange-50/60 border border-orange-200 p-3.5 rounded-2xl">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input type="checkbox" checked={isBulk} onChange={toggleBulk}
                                        className="w-4 h-4 text-brand-orange rounded border-gray-300 accent-brand-orange" />
                                    <div>
                                        <span className="text-xs font-extrabold text-gray-900 block">Bought in Carton / Sack / Wholesale Bulk?</span>
                                        <span className="text-[10px] text-gray-500 font-medium">Enable if item is purchased in bulk and broken down for individual or carton sales.</span>
                                    </div>
                                </label>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                                    Selling Price per {unitAbbr} (KES)
                                </label>
                                <input type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                                    placeholder="e.g. 60" className="input font-bold" />
                            </div>

                            {isBulk && (
                                <div className="space-y-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">{unitAbbr} per Carton/Sack</label>
                                            <input type="number" min="2" value={form.packSize} onChange={(e) => setForm({ ...form, packSize: e.target.value })} className="input font-bold" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">What do you call it?</label>
                                            <input value={form.caseLabel} onChange={(e) => setForm({ ...form, caseLabel: e.target.value })} placeholder="Carton, Sack, Crate..." className="input font-bold" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Whole {form.caseLabel || 'Carton'} Selling Price (KES)</label>
                                        <input type="number" value={form.casePrice} onChange={(e) => setForm({ ...form, casePrice: e.target.value })} placeholder="e.g. 350" className="input font-extrabold text-indigo-600" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">{form.caseLabel || 'Carton'} Barcode (optional)</label>
                                        <input value={form.caseBarcode} onChange={(e) => setForm({ ...form, caseBarcode: e.target.value })} placeholder="Separate barcode on the whole unit" className="input font-mono font-bold" />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Reorder Level (low-stock alert threshold)</label>
                                <input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                                    placeholder="Alert when stock drops below this" className="input font-bold" />
                            </div>

                            {/* OPENING STOCK — new products only */}
                            {!editingId && (
                                <div className="border border-dashed border-green-200 rounded-xl p-3.5 space-y-3 bg-green-50/40">
                                    <p className="text-[11px] font-bold text-green-700 uppercase tracking-wide">
                                        Opening Stock & Buying Price (optional — what you actually bought)
                                    </p>

                                    {isBulk && (
                                        <div className="flex bg-white rounded-xl p-1 border border-green-100">
                                            <button type="button" onClick={() => setForm({ ...form, openingReceivedAs: 'each' })}
                                                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition ${form.openingReceivedAs === 'each' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500'}`}>
                                                By {unitAbbr}
                                            </button>
                                            <button type="button" onClick={() => setForm({ ...form, openingReceivedAs: 'case' })}
                                                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition ${form.openingReceivedAs === 'case' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500'}`}>
                                                By {form.caseLabel || 'Carton'}
                                            </button>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                                            {isBulk && form.openingReceivedAs === 'case' ? `${form.caseLabel || 'Cartons'} Bought` : `Quantity Bought (${unitAbbr})`}
                                        </label>
                                        <input type="number" value={form.openingQty} onChange={(e) => setForm({ ...form, openingQty: e.target.value })} placeholder="e.g. 5" className="input font-bold" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                                            {isBulk && form.openingReceivedAs === 'case' ? `Buying Price per ${form.caseLabel || 'Carton'} (KES)` : `Buying Price per ${unitAbbr} (KES)`}
                                        </label>
                                        <input type="number" value={form.openingCost} onChange={(e) => setForm({ ...form, openingCost: e.target.value })} placeholder="e.g. 300" className="input font-bold" />
                                    </div>

                                    {showProfitPreview && (
                                        <div className="bg-white p-3 rounded-xl border border-green-200 text-[11px] font-semibold space-y-1 text-gray-600">
                                            <div className="flex justify-between">
                                                <span>Buying price per {unitAbbr}:</span>
                                                <span className="font-extrabold text-gray-900">{money(modalCostPerEach)} KES</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Profit per {unitAbbr} sold:</span>
                                                <span className={`font-extrabold ${eachProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                    {eachProfit >= 0 ? '+' : ''}{money(eachProfit)} KES
                                                </span>
                                            </div>
                                            {isBulk && modalCasePrice > 0 && (
                                                <div className="flex justify-between">
                                                    <span>Profit per {form.caseLabel || 'Carton'} sold whole:</span>
                                                    <span className={`font-extrabold ${caseProfit >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                                                        {caseProfit >= 0 ? '+' : ''}{money(caseProfit)} KES
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-[11px] text-gray-400">Leave blank to add the product without stock — you can receive stock later.</p>
                                </div>
                            )}

                            {/* Read-only profit info when editing */}
                            {editingId && showProfitPreview && (
                                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-[11px] font-semibold space-y-1 text-gray-600">
                                    <div className="flex justify-between">
                                        <span>Current avg. buying price per {unitAbbr}:</span>
                                        <span className="font-extrabold text-gray-900">{money(modalCostPerEach)} KES</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Profit per {unitAbbr} at this selling price:</span>
                                        <span className={`font-extrabold ${eachProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {eachProfit >= 0 ? '+' : ''}{money(eachProfit)} KES
                                        </span>
                                    </div>
                                    {isBulk && modalCasePrice > 0 && (
                                        <div className="flex justify-between">
                                            <span>Profit per {form.caseLabel || 'Carton'}:</span>
                                            <span className={`font-extrabold ${caseProfit >= 0 ? 'text-indigo-600' : 'text-red-500'}`}>
                                                {caseProfit >= 0 ? '+' : ''}{money(caseProfit)} KES
                                            </span>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-gray-400 pt-1">To change the buying price, use "Receive stock" on the catalog row.</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Product Image (optional)</label>
                                <div className="space-y-2">
                                    {form.imageUrl && (
                                        <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                                            <img src={form.imageUrl} alt="Preview" className="h-14 w-14 rounded-lg object-cover shrink-0" />
                                            <span className="text-xs text-gray-400 truncate flex-1">Image attached</span>
                                            <button type="button" onClick={removeImage} className="text-gray-400 hover:text-red-500 shrink-0">
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}
                                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} className="hidden" />
                                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-orange-400 hover:text-orange-500 disabled:opacity-50">
                                        {uploading ? <><ImageIcon size={15} className="animate-pulse" /> Uploading…</> : <><Upload size={15} /> {form.imageUrl ? 'Change image' : 'Upload from gallery'}</>}
                                    </button>
                                </div>
                            </div>

                            <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100">
                                <button type="button" onClick={closeProductModal} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition">Cancel</button>
                                <button type="button" onClick={saveItem} disabled={saving || uploading}
                                    className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-extrabold rounded-xl transition shadow-md disabled:opacity-50">
                                    {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save Product'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* RECEIVE STOCK MODAL */}
            {receivingFor && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200">
                        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                            <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                                <Package size={18} className="text-orange-500" /> Receive Stock
                            </h3>
                            <button onClick={() => { setReceivingFor(null); setStockForm(EMPTY_STOCK); }} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">{receivingFor.name}</p>

                        <div className="space-y-3">
                            {hasCase && (
                                <div className="flex bg-gray-100 rounded-xl p-1 mb-1">
                                    <button type="button" onClick={() => setStockForm({ ...stockForm, receivedAs: 'each' })}
                                        className={`flex-1 text-xs font-bold py-2 rounded-lg transition ${stockForm.receivedAs === 'each' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
                                        By Each
                                    </button>
                                    <button type="button" onClick={() => setStockForm({ ...stockForm, receivedAs: 'case' })}
                                        className={`flex-1 text-xs font-bold py-2 rounded-lg transition ${stockForm.receivedAs === 'case' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
                                        By {receivingFor.caseLabel || 'Carton'}
                                    </button>
                                </div>
                            )}

                            <Field label={stockForm.receivedAs === 'case' ? `${receivingFor.caseLabel || 'Cartons'} Received` : 'Quantity Received'}>
                                <input type="number" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} className="input" />
                            </Field>
                            <Field label={stockForm.receivedAs === 'case' ? `Cost Per ${receivingFor.caseLabel || 'Carton'} (KES)` : 'Cost Per Unit (KES)'}>
                                <input type="number" value={stockForm.costPerUnit} onChange={(e) => setStockForm({ ...stockForm, costPerUnit: e.target.value })} className="input" />
                            </Field>

                            {stockPreview && (
                                <p className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                                    = {stockPreview.pieces.toLocaleString()} pieces at KES {stockPreview.costEach.toFixed(2)}/piece
                                </p>
                            )}

                            <Field label="Expiry Date (optional)">
                                <input type="date" value={stockForm.expiryDate} onChange={(e) => setStockForm({ ...stockForm, expiryDate: e.target.value })} className="input" />
                            </Field>
                            <Field label="Supplier Note (optional)">
                                <input value={stockForm.supplierNote} onChange={(e) => setStockForm({ ...stockForm, supplierNote: e.target.value })} className="input" />
                            </Field>
                            <button onClick={submitStock} disabled={receiving}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                                {receiving ? 'Saving…' : 'Add to Stock'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {labelFor && <LabelPrintModal product={labelFor} onClose={() => setLabelFor(null)} />}

            <ConfirmModal
                open={!!pendingDelete}
                title="Delete product?"
                description={`Remove "${pendingDelete?.name}" from the catalog? This can't be undone.`}
                confirmLabel="Delete"
                tone="danger"
                loading={deleting}
                onConfirm={confirmDelete}
                onClose={() => setPendingDelete(null)}
            />

            <style>{`
                .input { width: 100%; background: rgb(249 250 251); border: 1px solid rgb(229 231 235); border-radius: 0.75rem; padding: 0.6rem 0.85rem; font-size: 0.875rem; color: rgb(31 41 55); }
                .input:focus { outline: none; border-color: rgb(249 115 22); background: white; box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1); }
                .input::placeholder { color: rgb(156 163 175); }
            `}</style>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
            {children}
        </div>
    );
                            }
