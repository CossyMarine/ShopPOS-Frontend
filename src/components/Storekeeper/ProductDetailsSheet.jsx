import { useEffect, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import API from '../../api/axios';
import { avgCostPerEach, money, num, packsOf, breakdown, statusOf } from './productManagementUtils';
import { baseAbbr, stockOf } from '../../utils/receivingMath';

const TABS = [['receiving', 'Receiving history'], ['sales', 'Sales'], ['details', 'Details']];
const TONE = { 'In stock': 'text-green-600', Low: 'text-amber-600', Out: 'text-red-600', Archived: 'text-gray-500' };
const VAT_LABEL = { standard: 'Standard VAT', zero: 'Zero-rated', exempt: 'Exempt' };
const when = (d) => new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const day = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const signed = (n) => `${n >= 0 ? '' : '-'}${money(Math.abs(n))}`;

const Stat = ({ label, value, sub, tone = 'text-gray-900' }) => (
    <div className="bg-white rounded-2xl ring-1 ring-black/5 p-3.5">
        <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">{label}</p>
        <p className={`text-lg font-black mt-0.5 ${tone}`}>{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
);
const Row = ({ k, v }) => (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-100 last:border-0 text-sm">
        <span className="text-gray-500">{k}</span><span className="font-semibold text-gray-800 text-right">{v}</span>
    </div>
);

export default function ProductDetailsSheet({ product: p, branch, onClose }) {
    const [tab, setTab] = useState('receiving');
    const [data, setData] = useState(null);
    const [error, setError] = useState('');
    const [vat, setVat] = useState(null);

    useEffect(() => {
        let alive = true;
        setData(null); setError('');
        API.get(`/products/${p._id}/insights`, { params: branch ? { branch } : {} })
            .then((r) => alive && setData(r.data))
            .catch((e) => alive && setError(e.response?.data?.message || 'Could not load product details'));
        return () => { alive = false; };
    }, [p._id, branch]);

    useEffect(() => { API.get('/settings/public').then((r) => setVat(r.data.vat || null)).catch(() => setVat(null)); }, []);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    }, [onClose]);

    const abbr = baseAbbr(p), stock = stockOf(p), avg = avgCostPerEach(p), status = statusOf(p);

    // Price before VAT. Only differs when Admin Settings has VAT on AND prices include VAT.
    const inclusive = !!(vat?.enabled && vat.priceMode === 'inclusive' && p.vatClass === 'standard');
    const net = inclusive ? (p.sellingPrice || 0) / (1 + (vat.rate || 0) / 100) : (p.sellingPrice || 0);
    const unitProfit = avg > 0 ? net - avg : null;
    const margin = unitProfit !== null && net > 0 ? (unitProfit / net) * 100 : 0;

    const fifoId = useMemo(() => {
        const live = (data?.deliveries || []).filter((d) => d.remaining > 0)
            .sort((a, b) => new Date(a.receivedAt) - new Date(b.receivedAt));
        return live[0]?.id;
    }, [data]);

    const deliveries = data?.deliveries || [];
    const totalReceived = deliveries.reduce((s, d) => s + (d.quantity || 0), 0);
    const s = data?.sales;

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <section role="dialog" aria-modal="true" aria-label={`${p.name} details`}
                className="absolute bottom-0 inset-x-0 max-h-[92vh] bg-gray-100 rounded-t-3xl overflow-y-auto shadow-2xl
                    sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[480px] sm:max-h-none sm:rounded-none sm:rounded-l-3xl">
                <div className="sticky top-0 z-10 bg-gray-100/95 backdrop-blur px-5 pt-4 pb-3 border-b border-gray-200">
                    <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-3 sm:hidden" />
                    <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                            <h2 className="text-xl font-black text-gray-900 leading-tight break-words">{p.name}</h2>
                            <p className="text-sm text-gray-500">{p.category}{p.sku ? ` · ${p.sku}` : ''} · <span className={`font-bold ${TONE[status]}`}>{status}</span></p>
                        </div>
                        <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full bg-white ring-1 ring-black/5 grid place-items-center shrink-0"><X size={18} /></button>
                    </div>
                    <div className="flex gap-1.5 mt-3 overflow-x-auto">
                        {TABS.map(([k, t]) => (
                            <button key={k} onClick={() => setTab(k)}
                                className={`px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap ${tab === k ? 'bg-brand-orange text-white' : 'bg-white ring-1 ring-black/5 text-gray-500'}`}>{t}</button>
                        ))}
                    </div>
                </div>

                <div className="px-5 pt-4 pb-8">
                    {tab === 'receiving' && (
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <Stat label="In stock" value={`${num(stock)} ${abbr}`} sub={stock > 0 && packsOf(p).length ? breakdown(p, stock) : `Worth ${money(stock * avg)} at cost`} />
                            <Stat label="Selling price" value={money(p.sellingPrice)} sub={inclusive ? `${money(net)} before VAT` : ''} />
                            <Stat label="Average cost" value={avg > 0 ? money(avg) : '—'} sub="Of stock on the shelf" />
                            <Stat label={inclusive ? 'Profit / unit (excl. VAT)' : `Profit / ${abbr}`} value={unitProfit === null ? '—' : signed(unitProfit)}
                                sub={unitProfit === null ? '' : `${margin.toFixed(1)}% margin`} tone={unitProfit !== null && unitProfit < 0 ? 'text-red-600' : 'text-green-600'} />
                        </div>
                    )}

                    {!data && !error && <div className="py-12 grid place-items-center text-gray-400"><Loader2 className="animate-spin" /></div>}
                    {error && <p className="bg-red-50 text-red-700 text-sm font-semibold rounded-xl p-4">{error}</p>}

                    {data && tab === 'receiving' && (<>
                        <p className="text-xs text-gray-500 mb-3">{deliveries.length} {deliveries.length === 1 ? 'delivery' : 'deliveries'} · {num(totalReceived)} {abbr} received in total</p>
                        {deliveries.length === 0 && <p className="text-sm text-gray-500 bg-white rounded-2xl p-4">No deliveries recorded yet. Use Receive to add stock.</p>}
                        {deliveries.map((d) => {
                            const pu = net - d.costPerUnit, m = net > 0 ? (pu / net) * 100 : 0, sold = Math.max(0, d.quantity - d.remaining);
                            const pill = d.remaining === 0 ? ['Sold out', 'bg-gray-200 text-gray-500'] : d.id === fifoId ? ['Selling now', 'bg-orange-100 text-brand-orange'] : ['Waiting', 'bg-gray-200 text-gray-700'];
                            return (
                                <article key={d.id} className="bg-white rounded-2xl ring-1 ring-black/5 p-4 mb-3">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-900">{when(d.receivedAt)}</p>
                                            <p className="text-xs text-gray-500">{d.grn || 'Stock adjustment'}{d.batchNo ? ` · Batch ${d.batchNo}` : ''}{d.invoice ? ` · Invoice ${d.invoice}` : ''}</p>
                                        </div>
                                        <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full shrink-0 ${pill[1]}`}>{pill[0]}</span>
                                    </div>
                                    <div className="mt-3">
                                        {d.receivedBy && <Row k="Received by" v={d.receivedBy} />}
                                        {d.supplierName && <Row k="Supplier" v={d.supplierName} />}
                                        {d.note && <Row k="Note" v={d.note} />}
                                        {d.boughtText && <Row k="Bought as" v={d.boughtText} />}
                                        <Row k="Quantity" v={`${num(d.quantity)} received · ${num(d.remaining)} left (${num(sold)} sold)`} />
                                        <Row k="Cost per unit" v={money(d.costPerUnit)} />
                                        <Row k="Total cost" v={money(d.quantity * d.costPerUnit)} />
                                        <Row k="Profit per unit" v={<span className={pu >= 0 ? 'text-green-600' : 'text-red-600'}>{signed(pu)} ({m.toFixed(1)}%)</span>} />
                                        <Row k="Profit if all sold" v={<span className={pu >= 0 ? 'text-green-600' : 'text-red-600'}>{signed(pu * d.quantity)}</span>} />
                                        {d.expiryDate && <Row k="Expires" v={day(d.expiryDate)} />}
                                    </div>
                                </article>
                            );
                        })}
                    </>)}

                    {data && tab === 'sales' && (<>
                        <div className="grid grid-cols-2 gap-3">
                            <Stat label="Units sold, 30 days" value={num(s.units)}
                                sub={`${(s.units / 30).toFixed(1)} a day${s.creditUnits > 0 ? ` · ${num(s.creditUnits)} on credit` : ''}`} />
                            <Stat label={inclusive ? 'Sales (excl. VAT)' : 'Sales'} value={money(s.net)} sub={s.creditUnits > 0 ? 'Includes bills given on credit' : ''} />
                            <Stat label="Profit" value={signed(s.profit)} sub={s.net > 0 ? `${((s.profit / s.net) * 100).toFixed(1)}% margin` : ''} tone={s.profit >= 0 ? 'text-green-600' : 'text-red-600'} />
                            <Stat label="Days of stock left" value={s.units > 0 ? Math.floor(stock / (s.units / 30)) : 'No sales'}
                                sub={s.units > 0 ? 'at the current pace' : 'Nothing sold in 30 days'} tone={s.units === 0 ? 'text-amber-600' : 'text-gray-900'} />
                        </div>
                        <h3 className="font-black text-sm text-gray-800 mt-5 mb-2">Latest sales</h3>
                        {s.recent.length === 0
                            ? <p className="text-sm text-gray-500 bg-white rounded-2xl p-4">No sales in the last 30 days. Consider a promotion for this item.</p>
                            : s.recent.map((r) => (
                                <div key={r.billId + r.at} className="bg-white rounded-xl ring-1 ring-black/5 px-4 py-3 mb-2 flex justify-between gap-3 text-sm">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-gray-800">
                                            {r.billId}
                                            {r.onCredit && (
                                                <span className="ml-2 align-middle text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">On credit</span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-500">{when(r.at)}{r.cashier ? ` · ${r.cashier}` : ''}</p>
                                    </div>
                                    <p className="font-bold text-gray-900 shrink-0">{num(r.quantity)} × {money(r.unitPrice)}</p>
                                </div>
                            ))}
                    </>)}

                    {tab === 'details' && (
                        <div className="bg-white rounded-2xl ring-1 ring-black/5 px-4 py-1">
                            <Row k="Barcode" v={p.barcode || '—'} />
                            <Row k="SKU" v={p.sku || '—'} />
                            <Row k="Category" v={p.category || '—'} />
                            <Row k="Main supplier" v={p.supplier?.name || '—'} />
                            <Row k="VAT class" v={VAT_LABEL[p.vatClass] || '—'} />
                            <Row k="Perishable" v={p.perishable ? 'Yes' : 'No'} />
                            <Row k="Reorder level" v={p.reorderLevel > 0 ? `${num(p.reorderLevel)} ${abbr}` : 'Not set'} />
                            <Row k="Maximum level" v={p.maxLevel > 0 ? `${num(p.maxLevel)} ${abbr}` : 'Not set'} />
                            {packsOf(p).map((k) => <Row key={k._id} k={`${k.name} (${num(k.qty)} ${abbr})`} v={k.price ? money(k.price) : 'Auto price'} />)}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
                    }
