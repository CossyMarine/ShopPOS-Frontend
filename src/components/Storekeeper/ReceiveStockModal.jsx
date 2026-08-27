import { useState } from 'react';
import { Package, X, Search, ArrowLeft } from 'lucide-react';
import Field from './Field';

// Most recently received batch for a product — "last buying price" for the
// picker list. Batches aren't guaranteed to be push-ordered in every code
// path that touches them (transfers, stock counts), so this sorts by
// receivedAt rather than trusting array order.
function lastBatch(product) {
    const batches = product.batches || [];
    if (batches.length === 0) return null;
    return [...batches].sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt))[0];
}

export default function ReceiveStockModal({
    receivingFor,   // row-triggered: product already chosen, go straight to the form
    pickerOpen,     // standalone-triggered: search first, no product chosen yet
    productOptions,
    onPickProduct,
    stockForm,
    setStockForm,
    onClose,
    onSubmit,
    receiving,
    stockPreview,
    hasCase,
}) {
    const [search, setSearch] = useState('');

    if (!receivingFor && !pickerOpen) return null;

    // ---- Step 1: search & pick (only when opened standalone) ----
    if (!receivingFor) {
        const filtered = (productOptions || []).filter((p) =>
            !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode || '').includes(search)
        );

        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200">
                    <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 shrink-0">
                        <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                            <Package size={18} className="text-orange-500" /> Receive Stock
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-4 pb-2 shrink-0">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search product by name or barcode…"
                                className="input pl-8" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
                        {filtered.length === 0 ? (
                            <p className="text-xs text-gray-400 text-center py-8">No matching products</p>
                        ) : filtered.slice(0, 50).map((p) => {
                            const last = lastBatch(p);
                            return (
                                <button key={p._id} type="button" onClick={() => onPickProduct(p)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-200 hover:border-orange-400 hover:bg-orange-50 text-left transition">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                                        <p className="text-[10px] text-gray-400">{p.category}</p>
                                    </div>
                                    <div className="text-right shrink-0 pl-2">
                                        <p className="text-[11px] font-bold text-gray-700">
                                            {(p.currentStock ?? 0).toLocaleString()} in stock
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {last ? `Last bought @ ${last.costPerUnit.toFixed(2)} KES` : 'No purchases yet'}
                                        </p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <style>{`
                    .input { width: 100%; background: rgb(249 250 251); border: 1px solid rgb(229 231 235); border-radius: 0.75rem; padding: 0.6rem 0.85rem; font-size: 0.8rem; }
                    .input:focus { outline: none; border-color: rgb(249 115 22); background: white; }
                `}</style>
            </div>
        );
    }

    // ---- Step 2: quantity / cost / expiry — unchanged from before, just
    // reachable from either the picker above or a direct per-row click ----
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                    <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                        {pickerOpen && (
                            <button onClick={() => onPickProduct(null)} className="text-gray-400 hover:text-gray-600 mr-1">
                                <ArrowLeft size={16} />
                            </button>
                        )}
                        <Package size={18} className="text-orange-500" /> Receive Stock
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={18} />
                    </button>
                </div>
                <p className="text-xs text-gray-500 mb-4">{receivingFor.name}</p>

                {(() => {
                    const last = lastBatch(receivingFor);
                    return (
                        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3">
                            <span>{(receivingFor.currentStock ?? 0).toLocaleString()} currently in stock</span>
                            <span>{last ? `Last bought @ ${last.costPerUnit.toFixed(2)} KES` : 'No prior purchases'}</span>
                        </div>
                    );
                })()}

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
                    <button onClick={onSubmit} disabled={receiving}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                        {receiving ? 'Saving…' : 'Add to Stock'}
                    </button>
                </div>
            </div>
        </div>
    );
}
