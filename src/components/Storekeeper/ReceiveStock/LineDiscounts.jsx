import { Check, Plus, Tag, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { allowsDecimals } from '../../../utils/receivingMath';
import { money } from '../productManagementUtils';
import { unitList, uLabel, bigKey, discText, nid } from './helpers';

export default function LineDiscounts({ l, p, c, patch }) {
    const U = unitList(p), step = allowsDecimals(p) ? 'any' : '1';
    const saveDisc = () => {
        const v = +l.dd.val;
        if (!(v > 0)) return toast.error('Enter a number above 0.');
        if (l.dd.type === 'pct' && v > 100) return toast.error('Percent cannot be above 100.');
        patch({ discs: [...l.discs, { id: nid(), type: l.dd.type, val: v, unit: l.dd.type === 'free' ? l.dd.unit : null }], addD: false, dd: { type: 'pct', val: '', unit: bigKey(p) } });
    };

    return (
        <div className="mt-5">
            <p className="sk-label">Discounts</p>
            {l.discs.length > 0 && <div className="flex flex-wrap gap-1.5">{l.discs.map((d) => {
                const amt = c.discounts[l.discs.indexOf(d)]?.amount || 0;
                return <span key={d.id} className="inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full text-xs font-semibold bg-orange-50 border border-orange-200 text-orange-800"><Tag size={11} />{discText(p, d)}{amt > 0 ? ` · ${money(amt)}` : ''}
                    <button type="button" onClick={() => patch({ discs: l.discs.filter((x) => x.id !== d.id) })} className="p-1 rounded-full hover:bg-orange-200"><X size={11} /></button></span>;
            })}</div>}
            {l.addD ? (
                <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
                    <div className="flex flex-wrap gap-1.5">{[['pct', '% off'], ['amt', 'KES off'], ['free', 'Free units']].map(([k, t]) => <button key={k} type="button" className={`sk-chip ${l.dd.type === k ? 'on' : ''}`} onClick={() => patch({ dd: { ...l.dd, type: k } })}>{t}</button>)}</div>
                    <div className="grid grid-cols-2 gap-3">
                        <input type="number" min="0" step={l.dd.type === 'free' ? step : 'any'} className="input" placeholder="0" value={l.dd.val} onChange={(e) => patch({ dd: { ...l.dd, val: e.target.value } })} />
                        {l.dd.type === 'free' ? <select className="input" value={l.dd.unit} onChange={(e) => patch({ dd: { ...l.dd, unit: e.target.value } })}>{U.map((u) => <option key={u.key} value={u.key}>{uLabel(u)}</option>)}</select> : <div />}
                    </div>
                    <div className="flex gap-2"><button type="button" onClick={saveDisc} className="px-3 py-2 bg-brand-orange text-white text-xs font-bold rounded-xl flex items-center gap-1"><Check size={13} />Save discount</button>
                        <button type="button" onClick={() => patch({ addD: false })} className="px-3 py-2 border border-gray-200 text-xs font-bold rounded-xl">Cancel</button></div>
                </div>
            ) : <button type="button" onClick={() => patch({ addD: true })} className={`px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl flex items-center gap-1 ${l.discs.length ? 'mt-3' : ''}`}><Plus size={12} />Add discount</button>}
            {(c.disc > 0 || c.freeValue > 0) && <p className="text-xs font-semibold text-emerald-600 mt-2">{[c.disc > 0 && `Saved KES ${money(c.disc)}`, c.freeValue > 0 && `Free goods worth KES ${money(c.freeValue)}`].filter(Boolean).join(' · ')}</p>}
        </div>
    );
}
