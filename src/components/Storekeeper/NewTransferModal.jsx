import { useState, useEffect, useMemo } from 'react';
import { X, Send, Search, Plus, Minus, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

// Builds a draft transfer: pick a destination branch, then pick products
// out of the SOURCE branch's own catalog with a quantity for each. Stock
// isn't touched here — that only happens on dispatch — so this is safe to
// leave half-filled and close without side effects.
export default function NewTransferModal({ open, onClose, fromBranch, branches, onCreated }) {
    const [toBranch, setToBranch] = useState('');
    const [note, setNote] = useState('');
    const [products, setProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [search, setSearch] = useState('');
    const [lines, setLines] = useState([]); // [{ product, name, unit, currentStock, quantitySent }]
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open || !fromBranch) return;
        setLoadingProducts(true);
        API.get('/products', { params: { branch: fromBranch } })
            .then((res) => setProducts(res.data.filter((p) => (p.currentStock ?? 0) > 0)))
            .catch(() => toast.error('Failed to load products for this branch'))
            .finally(() => setLoadingProducts(false));
    }, [open, fromBranch]);

    const reset = () => {
        setToBranch(''); setNote(''); setSearch(''); setLines([]);
    };

    if (!open) return null;

    const destinationOptions = branches.filter((b) => b._id !== fromBranch);

    const filtered = products.filter((p) =>
        !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search)
    );

    const addLine = (product) => {
        if (lines.some((l) => l.product === product._id)) return;
        setLines((prev) => [...prev, {
            product: product._id,
            name: product.name,
            unit: product.unit?.abbreviation || 'unit',
            currentStock: product.currentStock ?? 0,
            quantitySent: 1,
        }]);
    };

    const updateQty = (productId, qty) => {
        setLines((prev) => prev.map((l) => (l.product === productId ? { ...l, quantitySent: qty } : l)));
    };

    const removeLine = (productId) => setLines((prev) => prev.filter((l) => l.product !== productId));

    const totalUnits = useMemo(() => lines.reduce((s, l) => s + (Number(l.quantitySent) || 0), 0), [lines]);

    const submit = async () => {
        if (!toBranch) return toast.error('Select a destination branch');
        if (lines.length === 0) return toast.error('Add at least one product to transfer');
        for (const l of lines) {
            const qty = Number(l.quantitySent);
            if (!qty || qty <= 0) return toast.error(`Enter a valid quantity for ${l.name}`);
            if (qty > l.currentStock) return toast.error(`Only ${l.currentStock} ${l.unit} of ${l.name} available`);
        }

        setSaving(true);
        try {
            await API.post('/stock-transfers', {
                fromBranch,
                toBranch,
                note: note.trim(),
                lines: lines.map((l) => ({ product: l.product, quantitySent: Number(l.quantitySent) })),
            });
            toast.success('Transfer created as a draft — dispatch it when ready to send');
            reset();
            onCreated?.();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to create transfer');
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-200">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
                    <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                        <Send size={18} className="text-orange-500" /> New Stock Transfer
                    </h3>
                    <button onClick={() => { reset(); onClose(); }} className="text-gray-400 hover:text-gray-600">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Send To</label>
                        <select value={toBranch} onChange={(e) => setToBranch(e.target.value)} className="input">
                            <option value="">Select destination branch…</option>
                            {destinationOptions.map((b) => (
                                <option key={b._id} value={b._id}>{b.name}{b.isWarehouse ? ' (Warehouse)' : ''}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Note (optional)</label>
                        <input value={note} onChange={(e) => setNote(e.target.value)} className="input" placeholder="e.g. Weekly restock" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">Add Products</label>
                        <div className="relative mb-2">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or barcode…"
                                className="input pl-8" />
                        </div>
                        <div className="border border-gray-200 rounded-xl max-h-40 overflow-y-auto divide-y divide-gray-100">
                            {loadingProducts ? (
                                <p className="p-3 text-xs text-gray-400 text-center">Loading products…</p>
                            ) : filtered.length === 0 ? (
                                <p className="p-3 text-xs text-gray-400 text-center">No matching products with stock</p>
                            ) : filtered.slice(0, 30).map((p) => (
                                <button key={p._id} type="button" onClick={() => addLine(p)}
                                    disabled={lines.some((l) => l.product === p._id)}
                                    className="w-full flex items-center justify-between px-3 py-2 text-left text-xs hover:bg-orange-50 disabled:opacity-40 disabled:hover:bg-white">
                                    <span className="font-bold text-gray-800">{p.name}</span>
                                    <span className="text-gray-400 flex items-center gap-1">
                                        {p.currentStock} {p.unit?.abbreviation || ''}
                                        <Plus size={12} className="text-orange-500" />
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {lines.length > 0 && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1">Transfer Lines ({lines.length})</label>
                            <div className="space-y-2">
                                {lines.map((l) => (
                                    <div key={l.product} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate">{l.name}</p>
                                            <p className="text-[10px] text-gray-400">{l.currentStock} {l.unit} available</p>
                                        </div>
                                        <button type="button" onClick={() => updateQty(l.product, Math.max(1, (Number(l.quantitySent) || 1) - 1))}
                                            className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-500">
                                            <Minus size={12} />
                                        </button>
                                        <input type="number" value={l.quantitySent}
                                            onChange={(e) => updateQty(l.product, e.target.value)}
                                            className="w-16 text-center text-sm font-bold border border-gray-200 rounded-md py-1" />
                                        <button type="button" onClick={() => updateQty(l.product, (Number(l.quantitySent) || 0) + 1)}
                                            className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-500">
                                            <Plus size={12} />
                                        </button>
                                        <button type="button" onClick={() => removeLine(l.product)} className="text-gray-300 hover:text-red-500 ml-1">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-right">{totalUnits.toLocaleString()} total units</p>
                        </div>
                    )}
                </div>

                <div className="p-6 pt-4 border-t border-gray-100 shrink-0">
                    <button onClick={submit} disabled={saving}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                        {saving ? 'Creating…' : 'Create Draft Transfer'}
                    </button>
                </div>

                <style>{`
                    .input { width: 100%; background: rgb(249 250 251); border: 1px solid rgb(229 231 235); border-radius: 0.75rem; padding: 0.6rem 0.85rem; font-size: 0.875rem; color: rgb(31 41 55); }
                    .input:focus { outline: none; border-color: rgb(249 115 22); background: white; box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1); }
                `}</style>
            </div>
        </div>
    );
              }
