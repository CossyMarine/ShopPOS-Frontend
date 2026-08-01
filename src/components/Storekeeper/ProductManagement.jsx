import { useState, useEffect, useRef } from 'react';
import { Pencil, Trash2, Plus, Package, X, Upload, Image as ImageIcon, PackagePlus, Barcode, Boxes } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ConfirmModal from '../Admin/ConfirmModal';
import { useAuth } from '../../hooks/useAuth';
import LabelPrintModal from './LabelPrintModal';

const EMPTY_FORM = {
    name: '', barcode: '', category: 'General', unit: '',
    sellingPrice: '', casePrice: '', reorderLevel: '',
    packSize: '1', caseLabel: 'Carton', caseBarcode: '',
    imageUrl: '', imagePublicId: '',
    // Opening stock — only used when creating a NEW product, sent as a
    // follow-up receive-stock call right after the product is saved.
    openingQty: '', openingCost: '', openingReceivedAs: 'each',
};
const EMPTY_STOCK = { quantity: '', costPerUnit: '', expiryDate: '', supplierNote: '', receivedAs: 'each' };
const EMPTY_UNIT = { name: '', abbreviation: '' };

export default function ProductManagement() {
    const { user } = useAuth(); // user.branch — storekeeper is always scoped to their own branch
    const [products, setProducts] = useState([]);
    const [units, setUnits] = useState([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [editingId, setEditingId] = useState(null);
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
    const hasCasePricing = packSizeNum > 1;

    const startEdit = (item) => {
        setEditingId(item._id);
        setForm({
            ...EMPTY_FORM,
            name: item.name,
            barcode: item.barcode || '',
            category: item.category,
            unit: item.unit?._id || item.unit || '',
            sellingPrice: item.sellingPrice,
            casePrice: item.casePrice ?? '',
            reorderLevel: item.reorderLevel || '',
            packSize: String(item.packSize || 1),
            caseLabel: item.caseLabel || 'Carton',
            caseBarcode: item.caseBarcode || '',
            imageUrl: item.imageUrl || '',
            imagePublicId: item.imagePublicId || '',
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setForm(EMPTY_FORM);
        if (fileRef.current) fileRef.current.value = '';
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

    const saveItem = async () => {
        if (!form.name || !form.sellingPrice || !form.unit) {
            return toast.error('Name, unit and selling price are required');
        }
        if (form.openingQty && !form.openingCost && form.openingCost !== 0) {
            return toast.error('Enter the buying price for the opening stock, or leave both blank');
        }

        setSaving(true);
        try {
            const payload = {
                name: form.name,
                barcode: form.barcode || undefined,
                category: form.category || 'General',
                unit: form.unit,
                sellingPrice: parseFloat(form.sellingPrice),
                casePrice: hasCasePricing && form.casePrice !== '' ? parseFloat(form.casePrice) : null,
                reorderLevel: form.reorderLevel ? parseFloat(form.reorderLevel) : 0,
                packSize: packSizeNum,
                caseLabel: hasCasePricing ? (form.caseLabel || 'Carton') : 'Carton',
                caseBarcode: hasCasePricing ? (form.caseBarcode || null) : null,
                imageUrl: form.imageUrl || null,
                imagePublicId: form.imagePublicId || null,
                branch: user.branch,
            };

            if (editingId) {
                await API.put(`/products/${editingId}`, payload);
                toast.success('Product updated');
            } else {
                const created = await API.post('/products', payload);

                // Opening stock — quantity + buying price entered right here,
                // rather than forcing a second trip to "Receive Stock".
                if (form.openingQty) {
                    await API.post(`/products/${created.data._id}/receive-stock`, {
                        quantity: parseFloat(form.openingQty),
                        costPerUnit: parseFloat(form.openingCost),
                        receivedAs: hasCasePricing ? form.openingReceivedAs : 'each',
                    });
                    toast.success('Product added with opening stock');
                } else {
                    toast.success('Product added — remember to receive its opening stock');
                }
            }
            cancelEdit();
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

    // Live preview for the Opening Stock block on the Add Product form
    const openQtyNum = parseFloat(form.openingQty) || 0;
    const openCostNum = parseFloat(form.openingCost) || 0;
    const openingPreview = hasCasePricing && form.openingReceivedAs === 'case' && openQtyNum > 0
        ? { pieces: openQtyNum * packSizeNum, costEach: openCostNum / packSizeNum }
        : null;

    return (
        <div className="space-y-8 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Products & Stock</h2>
                    <p className="text-sm text-gray-500">Add products, receive stock batches, print labels, and track expiry</p>
                </div>
                <button
                    onClick={() => setShowUnitManager((v) => !v)}
                    className="flex items-center gap-2 bg-white border border-gray-200 hover:border-orange-400 text-sm font-bold text-gray-700 hover:text-orange-500 px-4 py-2 rounded-xl shadow-sm transition-colors"
                >
                    <Boxes size={15} /> Manage Units
                </button>
            </div>

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
                            className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                        >
                            <Plus size={15} /> {savingUnit ? 'Adding…' : 'Add Unit'}
                        </button>
                    </div>
                    {units.length === 0 ? (
                        <p className="text-xs text-gray-400 font-medium">No units yet — add one above before creating products.</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {units.map((u) => (
                                <span
                                    key={u._id}
                                    className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-full pl-3 pr-1.5 py-1 text-xs font-bold text-gray-700"
                                >
                                    {u.name} ({u.abbreviation})
                                    <button
                                        onClick={() => removeUnit(u)}
                                        disabled={deletingUnitId === u._id}
                                        title="Remove unit"
                                        className="text-gray-400 hover:text-red-500 disabled:opacity-40"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-6 h-fit shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                        <h3 className="text-base font-black text-gray-800">{editingId ? 'Edit Product' : 'Add Product'}</h3>
                        {editingId && (
                            <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    <div className="space-y-4">
                        <Field label="Product Name">
                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Sugar, Fresh Milk 500ml" className="input" />
                        </Field>

                        <Field label="Barcode (each)">
                            <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                placeholder="Scan or type EAN-13" className="input font-mono" />
                        </Field>

                        <Field label="Category">
                            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                                placeholder="Dairy, Bakery, Pantry..." className="input" />
                        </Field>

                        <Field label="Unit (sold loose as)">
                            {units.length === 0 ? (
                                <button
                                    type="button"
                                    onClick={() => setShowUnitManager(true)}
                                    className="w-full text-left text-xs font-bold text-orange-500 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 hover:bg-orange-100"
                                >
                                    No units yet — tap to add one first →
                                </button>
                            ) : (
                                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input">
                                    <option value="">Select unit</option>
                                    {units.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.abbreviation})</option>)}
                                </select>
                            )}
                        </Field>

                        <Field label={`Selling Price per ${unitAbbr} (KES)`}>
                            <input type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })}
                                placeholder="e.g. 180" className="input" />
                        </Field>

                        <Field label="Reorder Level">
                            <input type="number" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                                placeholder="Alert when stock drops below this" className="input" />
                        </Field>

                        <div className="border border-dashed border-gray-200 rounded-xl p-3 space-y-3 bg-gray-50/50">
                            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                Also bought/sold whole? (sack, carton, box — optional)
                            </p>
                            <Field label={`${unitAbbr} per ${form.caseLabel || 'Carton'}`}>
                                <input
                                    type="number"
                                    min="1"
                                    value={form.packSize}
                                    onChange={(e) => setForm({ ...form, packSize: e.target.value })}
                                    placeholder="1 = sold loose only, no whole-unit pricing"
                                    className="input"
                                />
                            </Field>
                            {hasCasePricing && (
                                <>
                                    <Field label="What do you call it?">
                                        <input
                                            value={form.caseLabel}
                                            onChange={(e) => setForm({ ...form, caseLabel: e.target.value })}
                                            placeholder="Sack, Carton, Crate, Box..."
                                            className="input"
                                        />
                                    </Field>
                                    <Field label={`Selling Price per whole ${form.caseLabel || 'Carton'} (KES)`}>
                                        <input
                                            type="number"
                                            value={form.casePrice}
                                            onChange={(e) => setForm({ ...form, casePrice: e.target.value })}
                                            placeholder="e.g. 6000 — set independently, not auto-calculated"
                                            className="input"
                                        />
                                        <p className="text-[11px] text-gray-400 mt-1">
                                            Not forced to equal {unitAbbr} price × {form.packSize || 1} — bulk pricing is its own number.
                                        </p>
                                    </Field>
                                    <Field label={`${form.caseLabel || 'Carton'} Barcode (optional)`}>
                                        <input
                                            value={form.caseBarcode}
                                            onChange={(e) => setForm({ ...form, caseBarcode: e.target.value })}
                                            placeholder="Separate barcode printed on the whole unit"
                                            className="input font-mono"
                                        />
                                    </Field>
                                </>
                            )}
                        </div>

                        {!editingId && (
                            <div className="border border-dashed border-green-200 rounded-xl p-3 space-y-3 bg-green-50/40">
                                <p className="text-[11px] font-bold text-green-700 uppercase tracking-wide">
                                    Opening Stock (optional — what you actually bought)
                                </p>

                                {hasCasePricing && (
                                    <div className="flex bg-white rounded-xl p-1 border border-green-100">
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, openingReceivedAs: 'each' })}
                                            className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition ${form.openingReceivedAs === 'each' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500'}`}
                                        >
                                            By {unitAbbr}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm({ ...form, openingReceivedAs: 'case' })}
                                            className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition ${form.openingReceivedAs === 'case' ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500'}`}
                                        >
                                            By {form.caseLabel || 'Carton'}
                                        </button>
                                    </div>
                                )}

                                <Field label={hasCasePricing && form.openingReceivedAs === 'case' ? `${form.caseLabel || 'Cartons'} Bought` : `Quantity Bought (${unitAbbr})`}>
                                    <input
                                        type="number"
                                        value={form.openingQty}
                                        onChange={(e) => setForm({ ...form, openingQty: e.target.value })}
                                        placeholder="e.g. 1"
                                        className="input"
                                    />
                                </Field>
                                <Field label={hasCasePricing && form.openingReceivedAs === 'case' ? `Buying Price per ${form.caseLabel || 'Carton'} (KES)` : `Buying Price per ${unitAbbr} (KES)`}>
                                    <input
                                        type="number"
                                        value={form.openingCost}
                                        onChange={(e) => setForm({ ...form, openingCost: e.target.value })}
                                        placeholder="e.g. 5000"
                                        className="input"
                                    />
                                </Field>

                                {openingPreview && (
                                    <p className="text-xs font-bold text-green-700 bg-white border border-green-200 rounded-lg px-3 py-2">
                                        = {openingPreview.pieces.toLocaleString()} {unitAbbr} at KES {openingPreview.costEach.toFixed(2)}/{unitAbbr}
                                    </p>
                                )}
                                <p className="text-[11px] text-gray-400">
                                    Leave blank to add the product without stock — you can receive stock later from the catalog.
                                </p>
                            </div>
                        )}

                        <Field label="Product Image (optional — falls back to name)">
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
                        </Field>

                        <button onClick={saveItem} disabled={saving || uploading}
                            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 mt-2">
                            <Plus size={16} /> {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Product'}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 mb-4">
                        Catalog ({products.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[640px] overflow-y-auto pr-1">
                        {products.length === 0 ? (
                            <p className="text-gray-400 text-sm col-span-full text-center py-10 font-medium">No products yet</p>
                        ) : (
                            products.map((item) => {
                                const stock = item.currentStock ?? 0;
                                const low = item.reorderLevel > 0 && stock <= item.reorderLevel;
                                const expiry = earliestExpiry(item);
                                const packSize = item.packSize || 1;
                                return (
                                    <div key={item._id} className="border border-gray-200 rounded-xl p-4 bg-gray-50/50 hover:border-orange-500/40 transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-xs font-black text-gray-400 text-center px-1 leading-tight">{item.name}</span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-gray-800 text-sm truncate">{item.name}</h4>
                                                <p className="text-xs text-orange-500 font-bold mt-0.5">
                                                    KES {item.sellingPrice?.toLocaleString()}/{item.unit?.abbreviation || 'unit'}
                                                    {packSize > 1 && item.casePrice != null && (
                                                        <span className="text-gray-400 font-semibold"> · KES {item.casePrice.toLocaleString()}/{item.caseLabel}</span>
                                                    )}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${low ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                                                        {stock} {item.unit?.abbreviation || ''} in stock
                                                    </span>
                                                    {packSize > 1 && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                                            {packSize}/{item.caseLabel || 'Carton'}
                                                        </span>
                                                    )}
                                                    {expiry && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isExpiringSoon(expiry) ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>
                                                            Exp {new Date(expiry).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                                            <button onClick={() => { setReceivingFor(item); setStockForm(EMPTY_STOCK); }} title="Receive stock"
                                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 py-1.5 rounded-lg">
                                                <PackagePlus size={14} /> Stock
                                            </button>
                                            <button onClick={() => setLabelFor(item)} title="Print barcode label"
                                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 py-1.5 rounded-lg">
                                                <Barcode size={14} /> Label
                                            </button>
                                            <button onClick={() => startEdit(item)} className="text-gray-400 hover:text-orange-500 p-1.5" title="Edit">
                                                <Pencil size={15} />
                                            </button>
                                            <button onClick={() => setPendingDelete(item)} className="text-gray-400 hover:text-red-500 p-1.5" title="Delete">
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

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
                                    <button
                                        type="button"
                                        onClick={() => setStockForm({ ...stockForm, receivedAs: 'each' })}
                                        className={`flex-1 text-xs font-bold py-2 rounded-lg transition ${stockForm.receivedAs === 'each' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
                                    >
                                        By Each
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setStockForm({ ...stockForm, receivedAs: 'case' })}
                                        className={`flex-1 text-xs font-bold py-2 rounded-lg transition ${stockForm.receivedAs === 'case' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}
                                    >
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
