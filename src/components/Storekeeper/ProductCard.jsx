import { Barcode, PackagePlus, AlertTriangle, Pencil, Archive, Trash2, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { avgCostPerEach, money, num, earliestExpiry, isExpiringSoon, packsOf, breakdown, statusOf, unitProfit, lastStockProfit } from './productManagementUtils';
import { baseAbbr, stockOf } from '../../utils/receivingMath';
import ProductImage from './ProductImage';

const STATUS = {
    'In stock': 'bg-green-100 text-green-700', Low: 'bg-amber-100 text-amber-700', Out: 'bg-red-100 text-red-700',
};

export default function ProductCard({ p, branch, canDelete, onChanged, onReceiveStock, onReportLoss, onPrintLabel, onEdit, onArchive, onDelete }) {
    const abbr = baseAbbr(p), stock = stockOf(p), cost = avgCostPerEach(p), packs = packsOf(p);
    const status = statusOf(p), expiry = earliestExpiry(p), up = unitProfit(p), last = lastStockProfit(p);
    const lastLoss = last !== null && last < 0;
    const act = 'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-gray-100 text-gray-700 hover:text-white transition';

    return (
        <article className="bg-white rounded-3xl p-6 ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1.5
            shadow-[0_1px_2px_rgba(0,0,0,.05),0_14px_28px_-8px_rgba(0,0,0,.14),0_40px_70px_-20px_rgba(0,0,0,.22)]
            hover:shadow-[0_2px_4px_rgba(0,0,0,.06),0_22px_40px_-8px_rgba(0,0,0,.18),0_60px_90px_-20px_rgba(0,0,0,.28)]">
            <div className="flex gap-5">
                <ProductImage product={p} branch={branch} onChanged={onChanged} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xl font-black text-gray-900 leading-tight break-words">{p.name}</h3>
                        <span className={`shrink-0 px-3 py-1 rounded-full text-xs font-extrabold ${STATUS[status]}`}>{status}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-500 mt-1">{p.category}{p.sku ? ` · ${p.sku}` : ''}{p.supplier?.name ? ` · ${p.supplier.name}` : ''}</p>
                    <p className="text-xs font-mono font-bold text-gray-400 flex items-center gap-1 mt-0.5"><Barcode size={12} />{p.barcode || '—'}</p>
                    <p className="text-3xl font-black text-gray-900 mt-3 leading-none">{num(stock)} <span className="text-base font-bold text-gray-500">{abbr}</span></p>
                    {packs.length > 0 && stock > 0 && <p className="text-sm font-semibold text-gray-500 mt-1">{breakdown(p, stock)}</p>}
                </div>
            </div>

            {packs.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                    {packs.map((k) => <span key={k._id} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-extrabold"><Package size={12} />1 {k.name} = {k.qty} {abbr}{k.price ? ` · ${money(k.price)}` : ''}</span>)}
                </div>
            )}

            <div className="grid grid-cols-3 gap-3 mt-5">
                <div className="rounded-2xl bg-gray-50 p-3"><p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Avg cost</p><p className="text-lg font-black text-gray-800 mt-0.5">{cost > 0 ? money(cost) : '—'}</p></div>
                <div className="rounded-2xl bg-orange-50 p-3"><p className="text-[11px] font-black uppercase tracking-wider text-orange-400">Price</p><p className="text-lg font-black text-brand-orange mt-0.5">{money(p.sellingPrice)}</p></div>
                <div className={`rounded-2xl p-3 ${up !== null && up < 0 ? 'bg-red-50' : 'bg-green-50'}`}><p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Profit / {abbr}</p>
                    <p className={`text-lg font-black mt-0.5 ${up !== null && up < 0 ? 'text-red-600' : 'text-green-600'}`}>{up === null ? '—' : `${up >= 0 ? '+' : '-'}${money(Math.abs(up))}`}</p></div>
            </div>

            <div className={`mt-3 rounded-2xl p-4 flex items-center justify-between gap-3 ${last === null ? 'bg-gray-50' : lastLoss ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                <div>
                    <p className="text-[11px] font-black uppercase tracking-wider text-gray-500">Profit on last stock</p>
                    <p className="text-[11px] text-gray-400">after discounts and transport</p>
                </div>
                {last === null ? <span className="text-gray-400 font-bold">—</span> : (
                    <p className={`text-2xl font-black flex items-center gap-1.5 ${lastLoss ? 'text-red-600' : 'text-emerald-600'}`}>
                        {lastLoss ? <TrendingDown size={20} /> : <TrendingUp size={20} />}{last >= 0 ? '+' : '-'}{money(Math.abs(last))}
                    </p>
                )}
            </div>
            {expiry && <p className={`mt-3 inline-block px-3 py-1 rounded-full text-xs font-extrabold ${isExpiringSoon(expiry) ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>Expires {new Date(expiry).toLocaleDateString()}</p>}

            <div className="grid grid-cols-3 gap-2 mt-5">
                <button onClick={() => onReceiveStock(p)} className={`${act} hover:bg-green-600`}><PackagePlus size={14} />Receive</button>
                <button onClick={() => onEdit(p)} className={`${act} hover:bg-brand-orange`}><Pencil size={14} />Edit</button>
                <button onClick={() => onReportLoss(p)} className={`${act} hover:bg-red-600`}><AlertTriangle size={14} />Loss</button>
                <button onClick={() => onPrintLabel(p)} className={`${act} hover:bg-blue-600`}><Barcode size={14} />Label</button>
                <button onClick={() => onArchive(p)} className={`${act} hover:bg-amber-500`}><Archive size={14} />Archive</button>
                {canDelete && <button onClick={() => onDelete(p)} className={`${act} hover:bg-red-600`}><Trash2 size={14} />Delete</button>}
            </div>
        </article>
    );
}
