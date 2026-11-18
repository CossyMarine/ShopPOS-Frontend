import { Minus, Plus } from 'lucide-react';
import { baseAbbr, allowsDecimals, r2 } from '../../../utils/receivingMath';
import { num } from '../productManagementUtils';
import { unitList, qtyOf, uLabel } from './helpers';

export default function LineQuantity({ l, p, c, patch }) {
    const U = unitList(p), abbr = baseAbbr(p), step = allowsDecimals(p) ? 'any' : '1', hasPacks = (p.packs || []).length > 0;
    const stepQty = (key, d) => (key === 's' ? patch({ qty: Math.max(0, r2((+l.qty || 0) + d)) }) : patch({ q: { ...l.q, [key]: Math.max(0, r2((+l.q[key] || 0) + d)) } }));
    const chooseUnit = (k) => patch({ unit: k, ...(l.priceUnit !== 'total' ? { price: r2(c.unitPrice * qtyOf(p, k)), priceUnit: k } : {}) });
    const toggleMix = () => {
        if (!l.mix) { const q = {}; U.forEach((u) => { q[u.key] = 0; }); q[l.unit] = +l.qty || 0; patch({ q, mix: true }); }
        else {
            const used = U.filter((u) => (+l.q[u.key] || 0) > 0), nk = used.length === 1 ? used[0].key : 'b';
            patch({ mix: false, unit: nk, qty: used.length === 1 ? +l.q[nk] || 0 : c.recv, ...(l.priceUnit !== 'total' ? { price: r2(c.unitPrice * qtyOf(p, nk)), priceUnit: nk } : {}) });
        }
    };

    return (
        <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
                <p className="sk-label !mb-0">{hasPacks ? (l.mix ? 'Quantity received, mixed units' : 'Bought in') : `Quantity received (${abbr})`}</p>
                {hasPacks && <button type="button" onClick={toggleMix} className="text-xs font-semibold text-orange-600">{l.mix ? 'Use one unit' : 'Mix units (e.g. 10 boxes + 12 pcs)'}</button>}
            </div>
            {hasPacks && !l.mix && <div className="sk-seg mb-3">{U.map((u) => <button key={u.key} type="button" className={l.unit === u.key ? 'on' : ''} onClick={() => chooseUnit(u.key)}>{uLabel(u)}</button>)}</div>}
            {!l.mix ? (
                <div className="flex items-center gap-2">
                    <button type="button" className="sk-stp" onClick={() => stepQty('s', -1)}><Minus size={16} /></button>
                    <input type="number" min="0" step={step} className="input !text-center !font-bold" value={l.qty} onChange={(e) => patch({ qty: +e.target.value || 0 })} />
                    <button type="button" className="sk-stp" onClick={() => stepQty('s', 1)}><Plus size={16} /></button>
                </div>
            ) : (
                <div className="space-y-2">
                    {U.map((u) => (
                        <div key={u.key} className="flex items-center gap-2">
                            <div className="w-24 shrink-0"><p className="text-sm font-semibold">{uLabel(u)}</p><p className="text-[11px] text-gray-400">{u.base ? 'single' : `= ${num(u.qty)} ${abbr}`}</p></div>
                            <button type="button" className="sk-stp" onClick={() => stepQty(u.key, -1)}><Minus size={16} /></button>
                            <input type="number" min="0" step={step} className="input !text-center !font-bold" value={l.q[u.key] || 0} onChange={(e) => patch({ q: { ...l.q, [u.key]: +e.target.value || 0 } })} />
                            <button type="button" className="sk-stp" onClick={() => stepQty(u.key, 1)}><Plus size={16} /></button>
                            <p className="w-20 text-right text-xs text-gray-500 shrink-0">{!u.base && (+l.q[u.key] || 0) > 0 ? `= ${num(l.q[u.key] * u.qty)} ${abbr}` : ''}</p>
                        </div>
                    ))}
                </div>
            )}
            <p className="mt-3 text-sm font-semibold rounded-xl bg-orange-50 text-orange-800 px-3 py-2">
                {c.recv > 0 ? `Received: ${c.bought.map((b) => `${num(b.qty)} ${b.name}`).join(' + ')} = ${num(c.recv)} ${abbr}` : 'Enter the quantity above.'}
            </p>
        </div>
    );
}
