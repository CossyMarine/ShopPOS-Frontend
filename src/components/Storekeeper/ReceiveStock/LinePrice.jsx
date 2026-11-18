import { baseAbbr, unitTable, r2 } from '../../../utils/receivingMath';
import { money, num } from '../productManagementUtils';
import { unitList, qtyOf, uLabel } from './helpers';

export default function LinePrice({ l, p, c, patch }) {
    const U = unitList(p), abbr = baseAbbr(p);
    const togglePriceTotal = () => (l.priceUnit === 'total' ? patch({ priceUnit: l.unit, price: r2(c.unitPrice * qtyOf(p, l.unit)) }) : patch({ priceUnit: 'total', price: r2(c.gross) }));
    const pu = U.find((u) => u.key === l.priceUnit) || U.find((u) => u.key === l.unit) || U[U.length - 1];

    return (
        <div className="mt-5">
            <p className="sk-label">Price on the invoice</p>
            <div className="grid grid-cols-2 gap-3">
                <input type="number" min="0" step="any" className="input" placeholder="0" value={l.price} onChange={(e) => patch({ price: e.target.value })} />
                {l.mix
                    ? <select className="input" value={l.priceUnit} onChange={(e) => patch({ priceUnit: e.target.value, price: r2(e.target.value === 'total' ? c.gross : c.unitPrice * qtyOf(p, e.target.value)) })}>
                        {U.map((u) => <option key={u.key} value={u.key}>per {u.name.toLowerCase()}{u.base ? '' : ` (${num(u.qty)} ${abbr})`}</option>)}<option value="total">Line total</option></select>
                    : <div className="input !bg-gray-100 flex items-center text-gray-600">{l.priceUnit === 'total' ? 'Line total' : `per ${pu.name.toLowerCase()}`}</div>}
            </div>
            {!l.mix && <button type="button" onClick={togglePriceTotal} className="text-xs font-semibold text-orange-600 mt-2">{l.priceUnit === 'total' ? `Enter price per ${unitTable(p)[l.unit]?.name} instead` : 'Enter the line total instead'}</button>}
            {c.unitPrice > 0 && <p className="mt-2 text-xs text-gray-500">Works out to: {[...U].reverse().map((u) => `${uLabel(u)} ${money(c.unitPrice * u.qty)}`).join(' · ')}</p>}
        </div>
    );
}
