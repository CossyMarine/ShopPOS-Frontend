import { X, Settings } from 'lucide-react';
import { baseAbbr, stockOf } from '../../../utils/receivingMath';
import { money, num, breakdown, lastBatch } from '../productManagementUtils';
import LineQuantity from './LineQuantity';
import LinePrice from './LinePrice';
import LineDiscounts from './LineDiscounts';
import LineOptions from './LineOptions';
import LineMetrics from './LineMetrics';

export default function Line({ l, p, c, flags, patch, onRemove, onEdit }) {
    const abbr = baseAbbr(p), hasPacks = (p.packs || []).length > 0;
    const last = lastBatch(p);

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-lg font-extrabold leading-tight">{p.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{p.category} · Now <b>{num(stockOf(p))} {abbr}</b>{hasPacks && stockOf(p) > 0 ? ` (${breakdown(p, stockOf(p))})` : ''} · Last cost <b>{last ? money(last.costPerUnit) : '-'}</b> per {abbr} · Price <b>{money(p.sellingPrice)}</b></p>
                </div>
                <div className="flex gap-1.5 items-center shrink-0">
                    <button type="button" onClick={onEdit} className="px-3 py-1.5 text-xs font-bold border border-gray-200 rounded-xl flex items-center gap-1"><Settings size={13} />Product</button>
                    <button type="button" onClick={onRemove} className="text-gray-400 hover:text-red-600 p-2"><X size={20} /></button>
                </div>
            </div>

            <LineQuantity l={l} p={p} c={c} patch={patch} />
            <LinePrice l={l} p={p} c={c} patch={patch} />
            <LineDiscounts l={l} p={p} c={c} patch={patch} />
            <LineOptions l={l} p={p} c={c} patch={patch} />
            <LineMetrics l={l} p={p} c={c} flags={flags} />
        </div>
    );
}
