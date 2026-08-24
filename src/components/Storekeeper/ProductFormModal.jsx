import { Package, X, Wand2, Upload, Image as ImageIcon } from 'lucide-react';
import { money } from './productManagementUtils';

export default function ProductFormModal({
    open,
    editingId,
    form,
    setForm,
    units,
    categories,
    isBulk,
    unitAbbr,
    uploading,
    saving,
    fileRef,
    onToggleBulk,
    onGenerateBarcode,
    onImageUpload,
    onRemoveImage,
    onClose,
    onSave,
    onOpenUnitManager,
    showProfitPreview,
    modalCostPerEach,
    eachProfit,
    modalCasePrice,
    caseProfit,
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                    <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                        <Package size={16} className="text-brand-orange" /> {editingId ? 'Edit Product' : 'Add New Product'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
                                <button type="button" onClick={onOpenUnitManager}
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
                            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">VAT Class</label>
                            <select
                                value={form.vatClass || 'standard'}
                                onChange={(e) => setForm({ ...form, vatClass: e.target.value })}
                                className="input font-bold"
                            >
                                <option value="standard">Standard-rated (VAT applies)</option>
                                <option value="zero">Zero-rated (e.g. maize flour, milk, bread)</option>
                                <option value="exempt">Exempt (outside VAT scope)</option>
                            </select>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Barcode (each)</label>
                            <div className="flex gap-1">
                                <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                                    placeholder="Scan or type EAN-13" className="input font-mono font-bold" />
                                <button type="button" onClick={onGenerateBarcode} title="Generate barcode"
                                    className="bg-gray-200 hover:bg-gray-300 px-3 rounded-xl">
                                    <Wand2 size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* BULK TOGGLE CARD */}
                    <div className="bg-orange-50/60 border border-orange-200 p-3.5 rounded-2xl">
                        <label className="flex items-center space-x-3 cursor-pointer">
                            <input type="checkbox" checked={isBulk} onChange={onToggleBulk}
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
                                    <button type="button" onClick={onRemoveImage} className="text-gray-400 hover:text-red-500 shrink-0">
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onImageUpload} className="hidden" />
                            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-orange-400 hover:text-orange-500 disabled:opacity-50">
                                {uploading ? <><ImageIcon size={15} className="animate-pulse" /> Uploading…</> : <><Upload size={15} /> {form.imageUrl ? 'Change image' : 'Upload from gallery'}</>}
                            </button>
                        </div>
                    </div>

                    <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition">Cancel</button>
                        <button type="button" onClick={onSave} disabled={saving || uploading}
                            className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-extrabold rounded-xl transition shadow-md disabled:opacity-50">
                            {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save Product'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
                    }
