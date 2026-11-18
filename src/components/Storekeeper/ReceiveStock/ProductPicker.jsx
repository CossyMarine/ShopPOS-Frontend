import { Search, Plus, List } from 'lucide-react';
import { baseAbbr, stockOf } from '../../../utils/receivingMath';
import { num, packsOf } from '../productManagementUtils';

export default function ProductPicker({ focusProduct, validCount, search, setSearch, showRes, setShowRes, hits, onEnter, addLine, addLow, onShowAll, onCreateProduct }) {
    if (focusProduct) {
        return (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600">Receiving one product</p>
                <h2 className="font-bold text-lg truncate">{focusProduct.name}</h2>
                <p className="text-xs text-gray-500">{validCount > 1 ? `${validCount - 1} other product(s) are hidden but still in this delivery.` : 'Fill in what arrived, then confirm.'}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                    <button type="button" onClick={onShowAll} className="px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl flex items-center gap-1"><List size={13} />{validCount > 1 ? 'Show all lines in this delivery' : 'Add another product'}</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="font-bold text-lg">1. Add products you received</h2><p className="text-xs text-gray-500">Scan a barcode (pack barcodes work too) or search by name. New item? Create it here.</p></div>
                <button type="button" onClick={addLow} className="px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl flex items-center gap-1"><Plus size={12} />Add low-stock items</button>
            </div>
            <div className="relative mt-4">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input className="input !pl-10 !py-3" placeholder="Scan barcode or search product" value={search}
                    onChange={(e) => { setSearch(e.target.value); setShowRes(true); }} onKeyDown={onEnter} onFocus={() => setShowRes(true)} onBlur={() => setTimeout(() => setShowRes(false), 150)} />
                {showRes && search.trim() && (
                    <div className="absolute z-20 left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
                        {hits.length ? hits.map((p) => (
                            <button key={p._id} type="button" onMouseDown={(e) => { e.preventDefault(); addLine(p); setSearch(''); setShowRes(false); }} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-orange-50 border-b border-gray-100">
                                <div className="min-w-0"><p className="font-medium text-sm truncate">{p.name}</p><p className="text-xs text-gray-400">{p.category} · buy in {packsOf(p).map((k) => k.name).concat(baseAbbr(p)).join(', ')}</p></div>
                                <p className="text-xs shrink-0 text-gray-500">{num(stockOf(p))} {baseAbbr(p)}</p>
                            </button>
                        )) : <p className="px-4 pt-4 pb-2 text-sm text-gray-400">No product matches that.</p>}
                        <button type="button" onMouseDown={(e) => { e.preventDefault(); setShowRes(false); onCreateProduct(search.trim()); setSearch(''); }} className="w-full flex items-center gap-2 text-left px-4 py-3 text-sm font-semibold text-orange-600 hover:bg-orange-50"><Plus size={14} />Create new product “{search.trim()}”</button>
                    </div>
                )}
            </div>
        </div>
    );
}
