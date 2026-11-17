import { useMemo, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { money, num } from './productManagementUtils';

const fmt = (d) => new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function ReceiptModal({ r, fresh, onClose }) {
    const t = r.totals || {};
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 my-6 shadow-2xl">
                <button onClick={onClose} className="float-right text-gray-400"><X size={20} /></button>
                <div className="text-center">
                    {fresh && <CheckCircle2 size={44} className="mx-auto text-emerald-500" />}
                    <h3 className="text-xl font-extrabold mt-1">{fresh ? 'Stock received' : 'Goods received'}</h3>
                    <p className="text-sm text-orange-600 font-semibold mt-1">{r.no}</p>
                    <p className="text-xs text-gray-500">{fmt(r.createdAt || r.deliveryDate)}{r.supplierName ? ` · ${r.supplierName}` : ''}{r.invoice ? ` · Invoice ${r.invoice}` : ''}</p>
                    {(r.receivedByName || r.receivedBy?.fullName) && <p className="text-xs text-gray-400">Received by {r.receivedByName || r.receivedBy.fullName}{r.driver ? ` · ${r.driver}` : ''}</p>}
                </div>
                <div className="mt-5 divide-y divide-gray-100">
                    {r.lines.map((l, i) => (
                        <div key={i} className="py-3">
                            <div className="flex justify-between gap-3"><p className="font-semibold text-sm">{l.name}</p><p className="font-bold text-sm text-emerald-600 shrink-0">+{num(l.addedBase)} {l.base}</p></div>
                            <p className="text-xs text-gray-500">
                                Bought: {l.boughtText || `${num(l.receivedBase)} ${l.base}`}{l.freeBase > 0 ? ` + ${num(l.freeBase)} ${l.base} free` : ''}{l.rejectedBase > 0 ? ` · ${num(l.rejectedBase)} rejected` : ''}
                                {' · '}stock {num(l.stockBefore)} → {num(l.stockAfter)} · cost {money(l.effCost)} per {l.base}{l.discount > 0 ? ` · saved KES ${money(l.discount)}` : ''}
                                {l.batchNo ? ` · batch ${l.batchNo}` : ''}{l.expiryDate ? ` · exp ${new Date(l.expiryDate).toLocaleDateString()}` : ''}
                            </p>
                        </div>
                    ))}
                </div>
                <dl className="text-sm space-y-1.5 mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between"><dt className="text-gray-500">Invoice amount</dt><dd>{money(t.gross)}</dd></div>
                    {t.lineDisc + t.invDisc > 0 && <div className="flex justify-between"><dt className="text-gray-500">Discounts</dt><dd>-{money(t.lineDisc + t.invDisc)}</dd></div>}
                    {t.vat > 0 && <div className="flex justify-between"><dt className="text-gray-500">VAT</dt><dd>{money(t.vat)}</dd></div>}
                    {t.delivery > 0 && <div className="flex justify-between"><dt className="text-gray-500">Delivery</dt><dd>{money(t.delivery)}</dd></div>}
                    <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-200"><dt>Total to pay</dt><dd>KES {money(t.total)}</dd></div>
                </dl>
                {r.dueDate && <p className="text-xs text-center text-gray-500 mt-2">Payment due {new Date(r.dueDate).toLocaleDateString()} ({r.terms})</p>}
                {t.saved > 0 && <p className="mt-3 text-center text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-xl p-2">You saved KES {money(t.saved)} on this delivery</p>}
                {r.note && <p className="mt-3 text-xs text-gray-500">Note: {r.note}</p>}
                <button onClick={onClose} className="w-full mt-5 py-2.5 bg-brand-orange text-white font-bold text-sm rounded-xl">Done</button>
            </div>
        </div>
    );
}

export default function ReceiptHistory({ receipts, suppliers, supplierFilter, setSupplierFilter }) {
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(null);
    const list = useMemo(() => receipts.filter((r) => (!supplierFilter || String(r.supplier) === supplierFilter)
        && (!q.trim() || `${r.no} ${r.supplierName} ${r.invoice}`.toLowerCase().includes(q.trim().toLowerCase()))), [receipts, q, supplierFilter]);
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
                <input className="input flex-1 min-w-[200px]" placeholder="Search GRN, supplier or invoice" value={q} onChange={(e) => setQ(e.target.value)} />
                <select className="input !w-auto" value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
                    <option value="">All suppliers</option>{suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
            </div>
            {list.length === 0 ? <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 text-sm">No deliveries yet. Confirmed receipts appear here.</div>
                : list.map((r) => (
                    <button key={r._id} type="button" onClick={() => setOpen(r)} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 w-full text-left flex items-center justify-between gap-4 hover:ring-2 hover:ring-orange-200">
                        <div className="min-w-0">
                            <p className="font-bold text-orange-600 text-sm">{r.no}</p>
                            <p className="font-semibold truncate">{r.supplierName || 'Supplier not recorded'}{r.invoice ? ` · ${r.invoice}` : ''}</p>
                            <p className="text-xs text-gray-400">{fmt(r.createdAt)} · {r.lines.length} product{r.lines.length > 1 ? 's' : ''}{r.dueDate ? ` · due ${new Date(r.dueDate).toLocaleDateString()}` : ''}</p>
                        </div>
                        <div className="text-right shrink-0"><p className="font-extrabold">KES {money(r.totals?.total)}</p>{r.totals?.saved > 0 && <p className="text-xs font-semibold text-emerald-600">saved {money(r.totals.saved)}</p>}</div>
                    </button>
                ))}
            {open && <ReceiptModal r={open} onClose={() => setOpen(null)} />}
        </div>
    );
}
