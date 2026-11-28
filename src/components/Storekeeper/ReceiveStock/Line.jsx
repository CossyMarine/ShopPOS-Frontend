import { X, Settings } from 'lucide-react';
import { baseAbbr, stockOf } from '../../../utils/receivingMath';
import { money, num, breakdown, lastBatch } from '../productManagementUtils';
import LineQuantity from './LineQuantity';
import LinePrice from './LinePrice';
import LineDiscounts from './LineDiscounts';
import LineProfit from './LineProfit';
import LineOptions from './LineOptions';
import LineMetrics from './LineMetrics';
import ProductImage from '../ProductImage';

// CHANGED: new props vatOn and vatRate
export default function Line({ l, p, c, flags, patch, onRemove, onEdit, branch, onImageChanged, vatOn, vatRate }) {
    const abbr = baseAbbr(p), hasPacks = (p.packs || []).length > 0;
    const last = lastBatch(p);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex gap-4 min-w-0">
                    <ProductImage product={p} branch={branch} onChanged={onImageChanged} compact />
                    <div className="min-w-0">
                        <p className="text-xl font-black leading-tight">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{p.category} · Now <b>{num(stockOf(p))} {abbr}</b>{hasPacks && stockOf(p) > 0 ? ` (${breakdown(p, stockOf(p))})` : ''} · Last cost <b>{last ? money(last.costPerUnit) : '-'}</b> per {abbr} · Price <b>{money(p.sellingPrice)}</b></p>
                    </div>
                </div>
                <div className="flex gap-1.5 items-center shrink-0">
                    <button type="button" onClick={onEdit} className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-xl flex items-center gap-1"><Settings size={13} />Product</button>
                    <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-600 p-2"><X size={20} /></button>
                </div>
            </div>

            <LineQuantity l={l} p={p} c={c} patch={patch} />
            <LinePrice l={l} p={p} c={c} patch={patch} />
            <LineDiscounts l={l} p={p} c={c} patch={patch} />
            <LineProfit l={l} p={p} c={c} />
            <LineOptions l={l} p={p} c={c} patch={patch} />

            {/* CHANGED: per-line VAT class. Defaults to the product's class; change it if the invoice says otherwise. */}
            {vatOn && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-gray-500">VAT on this line</span>
                    <select className="input !w-auto !py-1 text-xs" value={l.vatClass || p.vatClass || 'standard'} onChange={(e) => patch({ vatClass: e.target.value })}>
                        <option value="standard">Standard ({vatRate}%)</option>
                        <option value="zero">Zero-rated</option>
                        <option value="exempt">Exempt</option>
                    </select>
                    <span className="text-gray-500">{c.vat > 0 ? `VAT KES ${money(c.vat)}` : 'No VAT'}</span>
                </div>
            )}

            <LineMetrics l={l} p={p} c={c} flags={flags} />
        </div>
    );
}
