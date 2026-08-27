import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Boxes, PackagePlus } from 'lucide-react';
import { toast } from 'react-toastify';
import imageCompression from 'browser-image-compression';
import API from '../../api/axios';
import ConfirmModal from '../Admin/ConfirmModal';
import { useAuth } from '../../hooks/useAuth';
import LabelPrintModal from './LabelPrintModal';

import { EMPTY_FORM, EMPTY_STOCK, EMPTY_UNIT, avgCostPerEach } from './productManagementUtils';
import ProductStats from './ProductStats';
import LowStockBanner from './LowStockBanner';
import UnitManager from './UnitManager';
import ProductFilters from './ProductFilters';
import ProductTable from './ProductTable';
import ProductFormModal from './ProductFormModal';
import ReceiveStockModal from './ReceiveStockModal';
import StockAdjustmentModal from './StockAdjustmentModal';

export default function ProductManagement({ branch }) {
    const { user } = useAuth();
    // Storekeeper/branchManager are locked to their own branch (user.branch).
    // Super Admin uses whichever branch is selected in the dashboard header —
    // passed down as the `branch` prop, and persisted in the DB so it's
    // restored automatically on refresh/relogin instead of resetting.
    const effectiveBranch = branch || user.branch;
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
    const [showReceivePicker, setShowReceivePicker] = useState(false);
    const [labelFor, setLabelFor] = useState(null);
    const [adjustingFor, setAdjustingFor] = useState(null);

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
            const res = await API.get('/products', { params: effectiveBranch ? { branch: effectiveBranch } : {} });
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

    // Re-fetch whenever the admin switches branch in the header
    useEffect(() => { fetchProducts(); fetchUnits(); }, [effectiveBranch]);

    const selectedUnit = units.find((u) => u._id === form.unit);
    const unitAbbr = selectedUnit?.abbreviation || 'unit';
    const packSizeNum = parseInt(form.packSize, 10) || 1;
    const isBulk = form.isBulk;

    const categories = useMemo(
        () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
        [products]
    );

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

    const openAddModal = () => {
        if (!effectiveBranch) return toast.error('Select a branch first');
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
            vatClass: item.vatClass || 'standard',
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

        try {
            setUploading(true);

            const compressed = await imageCompression(file, {
                maxSizeMB: 1,
                maxWidthOrHeight: 1600,
                useWebWorker: true,
                initialQuality: 0.85,
            });

            const formData = new FormData();
            formData.append('image', compressed, file.name);

            const res = await API.post('/products/upload-image', formData, { timeout: 30000 });
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
        if (!effectiveBranch) return toast.error('Select a branch first');
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
                branch: effectiveBranch,
                vatClass: form.vatClass || 'standard',
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
                        expiryDate: form.openingExpiryDate || null,
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

    const hasCase = receivingFor && (receivingFor.packSize || 1) > 1;
    const stockQtyNum = parseFloat(stockForm.quantity) || 0;
    const stockCostNum = parseFloat(stockForm.costPerUnit) || 0;
    const stockPreview = hasCase && stockForm.receivedAs === 'case' && stockQtyNum > 0
        ? { pieces: stockQtyNum * receivingFor.packSize, costEach: stockCostNum / receivingFor.packSize }
        : null;

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
                        onClick={() => setShowReceivePicker(true)}
                        className="flex items-center gap-2 bg-white border border-gray-200 hover:border-orange-400 text-sm font-bold text-gray-700 hover:text-orange-500 px-4 py-2 rounded-xl shadow-sm transition-colors"
                    >
                        <PackagePlus size={15} /> Receive Stock
                    </button>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-hover text-white px-4 py-2 rounded-xl text-sm font-extrabold shadow-sm transition"
                    >
                        <Plus size={16} /> Add New Product
                    </button>
                </div>
            </div>

            {branch !== undefined && !branch && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold rounded-xl px-4 py-3">
                    You're viewing All Branches — pick a branch above to add products or receive stock.
                </div>
            )}

            <ProductStats stats={stats} />

            {showLowStockBanner && lowStockItems.length > 0 && (
                <LowStockBanner items={lowStockItems} onDismiss={() => setShowLowStockBanner(false)} />
            )}

            {showUnitManager && (
                <UnitManager
                    units={units}
                    unitForm={unitForm}
                    setUnitForm={setUnitForm}
                    onAdd={addUnit}
                    savingUnit={savingUnit}
                    deletingUnitId={deletingUnitId}
                    onRemove={removeUnit}
                />
            )}

            <ProductFilters
                search={search}
                setSearch={setSearch}
                filterPackaging={filterPackaging}
                setFilterPackaging={setFilterPackaging}
                filterCategory={filterCategory}
                setFilterCategory={setFilterCategory}
                categories={categories}
            />

            <ProductTable
                products={filteredProducts}
                onReceiveStock={(item) => { setReceivingFor(item); setStockForm(EMPTY_STOCK); }}
                onReportLoss={(item) => setAdjustingFor(item)}
                onPrintLabel={(item) => setLabelFor(item)}
                onEdit={startEdit}
                onDelete={(item) => setPendingDelete(item)}
            />

            <ProductFormModal
                open={showProductModal}
                editingId={editingId}
                form={form}
                setForm={setForm}
                units={units}
                categories={categories}
                isBulk={isBulk}
                unitAbbr={unitAbbr}
                uploading={uploading}
                saving={saving}
                fileRef={fileRef}
                onToggleBulk={toggleBulk}
                onGenerateBarcode={generateRandomBarcode}
                onImageUpload={handleImageUpload}
                onRemoveImage={removeImage}
                onClose={closeProductModal}
                onSave={saveItem}
                onOpenUnitManager={() => setShowUnitManager(true)}
                showProfitPreview={showProfitPreview}
                modalCostPerEach={modalCostPerEach}
                eachProfit={eachProfit}
                modalCasePrice={modalCasePrice}
                caseProfit={caseProfit}
            />

            <ReceiveStockModal
                receivingFor={receivingFor}
                pickerOpen={showReceivePicker}
                productOptions={products}
                onPickProduct={(item) => {
                    if (item) {
                        setReceivingFor(item);
                        setStockForm(EMPTY_STOCK);
                        setShowReceivePicker(false);
                    } else {
                        // back-arrow from the form (only reachable when opened via
                        // the picker) — deselect and show the search list again
                        setReceivingFor(null);
                        setShowReceivePicker(true);
                    }
                }}
                stockForm={stockForm}
                setStockForm={setStockForm}
                onClose={() => { setReceivingFor(null); setStockForm(EMPTY_STOCK); setShowReceivePicker(false); }}
                onSubmit={submitStock}
                receiving={receiving}
                stockPreview={stockPreview}
                hasCase={hasCase}
            />

            <StockAdjustmentModal
                product={adjustingFor}
                open={!!adjustingFor}
                onClose={() => setAdjustingFor(null)}
                onSubmitted={fetchProducts}
            />

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
