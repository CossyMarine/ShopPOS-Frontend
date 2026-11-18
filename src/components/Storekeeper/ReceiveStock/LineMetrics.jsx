import { baseAbbr, stockOf } from '../../../utils/receivingMath';
import { money, num, breakdown } from '../productManagementUtils';
import { FLAG_CLS } from './helpers';

export default function LineMetrics({ l, p, c, flags }) {
    const abbr = baseAbbr(p), hasPacks = (p.packs || []).length > 0;
    const margin = (+l.newPrice > 0 ? +l.newPrice : p.sellingPrice) > 0 && c.eff > 0 ? ((+l.newPrice || p.sellingPrice) - c.eff) / (+l.newPrice || p.sellingPrice) * 100 : null;
    const after = stockOf(p) + c.added;

    return (
        <>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                {[['Added', `+${num(c.added)} ${abbr}`], ['Stock after', `${num(after)} ${abbr}`], [`Cost / ${abbr}`, money(c.eff)]].map(([t, v]) => <div key={t} className="rounded-xl bg-gray-50 p-2.5"><p className="font-extrabold">{v}</p><p className="text-[10px] uppercase tracking-wider text-gray-500">{t}</p></div>)}
                <div className="rounded-xl bg-gray-50 p-2.5"><p className={`font-extrabold ${margin !== null && margin < 0 ? 'text-red-600' : margin !== null && margin < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>{margin === null ? '-' : `${margin.toFixed(1)}%`}</p><p className="text-[10px] uppercase tracking-wider text-gray-500">Margin</p></div>
                <div className="rounded-xl bg-brand-orange text-white p-2.5 col-span-2 sm:col-span-1"><p className="font-extrabold">KES {money(c.net)}</p><p className="text-[10px] uppercase tracking-wider opacity-90">Line total</p></div>
            </div>
            {c.added > 0 && hasPacks && <p className="text-[11px] text-gray-400 mt-1.5 text-right">Stock after = {breakdown(p, after)}</p>}
            <div className="mt-3 space-y-1.5">{flags.map((f, i) => <div key={i} className={`sk-flag ${FLAG_CLS[f[0]]}`}>{f[1]}</div>)}</div>
        </>
    );
}
