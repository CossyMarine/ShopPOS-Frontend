import { ChevronDown, ChevronUp } from 'lucide-react';
import { baseAbbr, allowsDecimals } from '../../../utils/receivingMath';
import { money, packsOf } from '../productManagementUtils';
import { ceil5 } from './helpers';

export default function LineOptions({ l, p, c, patch }) {
    const abbr = baseAbbr(p), step = allowsDecimals(p) ? 'any' : '1', hasPacks = (p.packs || []).length > 0;
    const target = (t) => {
        if (!(c.eff > 0)) return;
        const pp = {}; (p.packs || []).forEach((k) => { pp[String(k._id)] = ceil5(c.eff * k.qty / (1 - t / 100)); });
        patch({ newPrice: ceil5(c.eff / (1 - t / 100)), pp });
    };

    return (
        <>
            <button type="button" onClick={() => patch({ open: !l.open })} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600">{l.open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}{l.open ? 'Hide' : 'More'} options (expiry, batch, damaged, selling prices)</button>
            {l.open && (
                <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
                    <div><label className="sk-label">Expiry date {p.perishable ? '*' : ''}</label><input type="date" className="input" value={l.exp} onChange={(e) => patch({ exp: e.target.value })} /></div>
                    <div><label className="sk-label">Batch / lot no.</label><input className="input" placeholder="Optional" value={l.batch} onChange={(e) => patch({ batch: e.target.value })} /></div>
                    <div><label className="sk-label">Damaged / rejected ({abbr})</label><input type="number" min="0" step={step} className="input" placeholder="0" value={l.rej} onChange={(e) => patch({ rej: e.target.value })} /></div>
                    <div><label className="sk-label">Selling price per {abbr}</label><input type="number" min="0" step="any" className="input" value={l.newPrice} onChange={(e) => patch({ newPrice: e.target.value })} /></div>
                    {packsOf(p).map((k) => (
                        <div key={k._id}><label className="sk-label">Selling price per {k.name.toLowerCase()}</label>
                            <input type="number" min="0" step="any" className="input" value={l.pp[String(k._id)] ?? ''} placeholder={money((+l.newPrice || p.sellingPrice) * k.qty)} onChange={(e) => patch({ pp: { ...l.pp, [String(k._id)]: e.target.value } })} /></div>
                    ))}
                    {hasPacks && <p className="col-span-2 text-[11px] text-gray-400 -mt-1">Pack prices are optional. Leave blank to charge the single price × the pieces in the pack.</p>}
                    <div className="col-span-2 flex flex-wrap gap-1.5 items-center"><span className="text-[11px] text-gray-500">Target margin{hasPacks ? ' (fills all prices)' : ''}:</span>{[15, 20, 25, 30].map((t) => <button key={t} type="button" className="sk-chip" onClick={() => target(t)}>{t}%</button>)}</div>
                </div>
            )}
        </>
    );
}
