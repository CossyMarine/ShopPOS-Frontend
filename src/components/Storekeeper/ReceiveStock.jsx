import { useEffect, useMemo, useRef, useState } from 'react';
import { Package, X, Search, Plus, Minus, Tag, Check, ChevronDown, ChevronUp, Settings, List } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { calcLine, calcDelivery, baseAbbr, stockOf, allowsDecimals, unitTable, r2 } from '../../utils/receivingMath';
import { money, num, breakdown, lastBatch, packsOf, cap } from './productManagementUtils';

const ceil5 = (x) => Math.ceil(x / 5) * 5;
const nid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
const TERMS = ['Cash on delivery', '7 days', '14 days', '30 days', '60 days'];
const blankInv = (by = '') => ({ supplier: '', saveSupplier: true, invoice: '', po: '', ddate: today(), driver: '', terms: 'Cash on delivery', recvBy: by, note: '', discPct: '', discAmt: '', delivery: '', vatOn: false, vatMode: 'excl', vatNR: false });

const unitList = (p) => [...packsOf(p).map((k) => ({ key: String(k._id), name: k.name, qty: k.qty })), { key: 'b', name: baseAbbr(p), qty: 1, base: true }];
const qtyOf = (p, key) => unitTable(p)[key]?.qty || 1;
const uLabel = (u) => (u.base ? `Single (${u.name})` : cap(u.name));
const bigKey = (p) => (packsOf(p)[0] ? String(packsOf(p)[0]._id) : 'b');
const discText = (p, d) => d.type === 'pct' ? `${num(d.val)}% off` : d.type === 'amt' ? `KES ${num(d.val)} off` : `Free: ${num(d.val)} ${unitTable(p)[d.unit]?.name || ''}`;

function newLine(p, key) {
    const k = key || bigKey(p), last = lastBatch(p)?.costPerUnit || 0, pp = {};
    (p.packs || []).forEach((x) => { pp[String(x._id)] = x.price || ''; });
    return { id: nid(), pid: p._id, mix: false, unit: k, qty: 1, q: {}, priceUnit: k, price: r2(last * qtyOf(p, k)) || '', discs: [], addD: false, dd: { type: 'pct', val: '', unit: k },
        exp: '', batch: '', rej: '', newPrice: p.sellingPrice, pp, open: !!p.perishable };
}
const toWire = (l) => ({
    product: l.pid,
    items: l.mix ? Object.entries(l.q).map(([key, qty]) => ({ key, qty })) : [{ key: l.unit, qty: l.qty }],
    priceUnit: l.priceUnit, price: l.price, discounts: l.discs.map(({ type, val, unit }) => ({ type, val, unit })),
    rejected: l.rej, expiryDate: l.exp || null, batchNo: l.batch, newPrice: l.newPrice, packPrices: l.pp,
});

function flagsFor(l, p, c) {
    const f = c.errors.map((e) => ['err', e]);
    if (l.exp) { const d = Math.round((new Date(l.exp) - new Date().setHours(0, 0, 0, 0)) / 864e5); if (d >= 0 && d <= 14) f.push(['warn', `Expires in ${d} day${d === 1 ? '' : 's'}.`]); }
    const last = lastBatch(p)?.costPerUnit;
    if (last > 0 && c.eff > 0) { const ch = (c.eff - last) / last * 100; if (Math.abs(ch) >= 10) f.push(['warn', `Cost ${ch > 0 ? 'up' : 'down'} ${Math.abs(ch).toFixed(0)}% (was ${money(last)}).`]); }
    const price = +l.newPrice > 0 ? +l.newPrice : p.sellingPrice;
    if (price > 0 && c.eff > 0) { const m = (price - c.eff) / price * 100; if (m < 0) f.push(['warn', 'Selling price below cost.']); else if (m < 10) f.push(['warn', `Margin only ${m.toFixed(1)}%.`]); }
    (p.packs || []).forEach((k) => { const raw = +l.pp[String(k._id)]; if (raw > 0 && c.eff > 0 && raw < c.eff * k.qty) f.push(['warn', `${cap(k.name)} price below cost (${money(c.eff * k.qty)}).`]); });
    if (c.freeBase > 0 && c.paid > 0) f.push(['info', `Real cost ${money(c.eff)} per ${baseAbbr(p)} with free units.`]);
    const after = stockOf(p) + c.added;
    if (p.maxLevel > 0 && after > p.maxLevel) f.push(['info', `Stock ${num(after)} is above max ${num(p.maxLevel)}.`]);
    if (c.rej > 0 && c.rej <= c.recv) f.push(['info', `${num(c.rej)} ${baseAbbr(p)} rejected, not added or charged.`]);
    return f;
}
const FLAG_CLS = { err: 'err', warn: 'warn', info: 'info' };

function Line({ l, p, c, flags, patch, onRemove, onEdit }) {
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
    const togglePriceTotal = () => (l.priceUnit === 'total' ? patch({ priceUnit: l.unit, price: r2(c.unitPrice * qtyOf(p, l.unit)) }) : patch({ priceUnit: 'total', price: r2(c.gross) }));
    const saveDisc = () => {
        const v = +l.dd.val;
        if (!(v > 0)) return toast.error('Enter a number above 0.');
        if (l.dd.type === 'pct' && v > 100) return toast.error('Percent cannot be above 100.');
        patch({ discs: [...l.discs, { id: nid(), type: l.dd.type, val: v, unit: l.dd.type === 'free' ? l.dd.unit : null }], addD: false, dd: { type: 'pct', val: '', unit: bigKey(p) } });
    };
    const target = (t) => {
        if (!(c.eff > 0)) return;
        const pp = {}; (p.packs || []).forEach((k) => { pp[String(k._id)] = ceil5(c.eff * k.qty / (1 - t / 100)); });
        patch({ newPrice: ceil5(c.eff / (1 - t / 100)), pp });
    };
    const margin = (+l.newPrice > 0 ? +l.newPrice : p.sellingPrice) > 0 && c.eff > 0 ? ((+l.newPrice || p.sellingPrice) - c.eff) / (+l.newPrice || p.sellingPrice) * 100 : null;
    const after = stockOf(p) + c.added;
    const pu = U.find((u) => u.key === l.priceUnit) || U.find((u) => u.key === l.unit) || U[U.length - 1];
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

            {/* quantity */}
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

            {/* price */}
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

            {/* discounts */}
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

            {/* more options */}
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

            {/* metrics */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                {[['Added', `+${num(c.added)} ${abbr}`], ['Stock after', `${num(after)} ${abbr}`], [`Cost / ${abbr}`, money(c.eff)]].map(([t, v]) => <div key={t} className="rounded-xl bg-gray-50 p-2.5"><p className="font-extrabold">{v}</p><p className="text-[10px] uppercase tracking-wider text-gray-500">{t}</p></div>)}
                <div className="rounded-xl bg-gray-50 p-2.5"><p className={`font-extrabold ${margin !== null && margin < 0 ? 'text-red-600' : margin !== null && margin < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>{margin === null ? '-' : `${margin.toFixed(1)}%`}</p><p className="text-[10px] uppercase tracking-wider text-gray-500">Margin</p></div>
                <div className="rounded-xl bg-brand-orange text-white p-2.5 col-span-2 sm:col-span-1"><p className="font-extrabold">KES {money(c.net)}</p><p className="text-[10px] uppercase tracking-wider opacity-90">Line total</p></div>
            </div>
            {c.added > 0 && hasPacks && <p className="text-[11px] text-gray-400 mt-1.5 text-right">Stock after = {breakdown(p, after)}</p>}
            <div className="mt-3 space-y-1.5">{flags.map((f, i) => <div key={i} className={`sk-flag ${FLAG_CLS[f[0]]}`}>{f[1]}</div>)}</div>
        </div>
    );
}

export default function ReceiveStock({ products, suppliers, branch, focusReq, onDone, onEditProduct, onCreateProduct }) {
    const { user } = useAuth();
    const key = `sk_recv_draft_${branch || 'x'}`;
    const [lines, setLines] = useState([]);
    const [inv, setInv] = useState(() => blankInv(user?.fullName || ''));
    const [focus, setFocus] = useState(null);
    const [search, setSearch] = useState('');
    const [showRes, setShowRes] = useState(false);
    const [showDel, setShowDel] = useState(false);
    const [saving, setSaving] = useState(false);
    const loaded = useRef(false);

    const active = useMemo(() => products.filter((p) => p.isActive !== false), [products]);
    const byId = useMemo(() => new Map(products.map((p) => [String(p._id), p])), [products]);

    // load draft once products are known
    useEffect(() => {
        if (loaded.current || !products.length) return;
        loaded.current = true;
        try {
            const d = JSON.parse(localStorage.getItem(key) || 'null');
            if (d?.lines) setLines(d.lines.filter((l) => byId.has(String(l.pid))));
            if (d?.inv) setInv((s) => ({ ...s, ...d.inv }));
        } catch { /* ignore */ }
    }, [products, byId, key]);
    useEffect(() => {
        if (!loaded.current) return;
        const t = setTimeout(() => { try { localStorage.setItem(key, JSON.stringify({ lines, inv })); } catch { /* ignore */ } }, 400);
        return () => clearTimeout(t);
    }, [lines, inv, key]);

    // keep lines valid when a product's packs change
    useEffect(() => {
        setLines((ls) => ls.map((l) => {
            const p = byId.get(String(l.pid)); if (!p) return l;
            const keys = unitList(p).map((u) => u.key);
            if (keys.includes(l.unit) && (l.priceUnit === 'total' || keys.includes(l.priceUnit))) return l;
            return { ...l, unit: 'b', priceUnit: l.priceUnit === 'total' ? 'total' : 'b', q: {}, mix: false, dd: { type: 'pct', val: '', unit: 'b' } };
        }));
    }, [byId]);

    const addLine = (p, k) => {
        if (p.isActive === false) return toast.error(`${p.name} is archived. Restore it first.`);
        const key2 = k || bigKey(p);
        setLines((ls) => {
            const ex = ls.find((l) => l.pid === p._id);
            if (!ex) return [...ls, newLine(p, key2)];
            return ls.map((l) => {
                if (l.id !== ex.id) return l;
                if (l.mix) return { ...l, q: { ...l.q, [key2]: r2((+l.q[key2] || 0) + 1) } };
                if (l.unit === key2) return { ...l, qty: r2((+l.qty || 0) + 1) };
                const q = {}; unitList(p).forEach((u) => { q[u.key] = 0; }); q[l.unit] = +l.qty || 0; q[key2] = 1;
                return { ...l, q, mix: true };
            });
        });
        if (!inv.supplier && p.supplier?.name) setInv((s) => ({ ...s, supplier: p.supplier.name }));
    };

    // "Receive" clicked on a product row
    useEffect(() => {
        if (!focusReq?.id) { setFocus(null); return; }
        const p = byId.get(String(focusReq.id)); if (!p) return;
        setFocus(p._id); addLine(p, focusReq.key); // eslint-disable-next-line
    }, [focusReq]);

    const hits = useMemo(() => {
        const q = search.trim().toLowerCase(); if (!q) return [];
        return active.filter((p) => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.barcode || '').includes(q) || (p.packs || []).some((k) => (k.barcode || '').includes(q))).slice(0, 6);
    }, [search, active]);

    const onEnter = (e) => {
        if (e.key !== 'Enter') return; e.preventDefault();
        const v = search.trim(); if (!v) return;
        let p = active.find((x) => x.barcode === v), k = 'b';
        if (!p) { p = active.find((x) => (x.packs || []).some((pk) => pk.barcode === v)); if (p) k = String(p.packs.find((pk) => pk.barcode === v)._id); }
        if (!p) p = hits[0], k = null;
        if (!p) { setShowRes(false); return onCreateProduct(v); }
        addLine(p, k); setSearch(''); setShowRes(false);
    };

    const addLow = () => {
        setFocus(null); let n = 0;
        const next = [...lines];
        active.filter((p) => stockOf(p) <= p.reorderLevel && !next.some((l) => l.pid === p._id)).forEach((p) => {
            const k = bigKey(p), l = newLine(p, k);
            const need = p.reorderQty > 0 ? p.reorderQty : p.maxLevel > stockOf(p) ? Math.ceil(p.maxLevel - stockOf(p)) : Math.max(1, Math.ceil(Math.max(p.reorderLevel * 2, p.reorderLevel + 1) - stockOf(p)));
            l.qty = Math.ceil(need / qtyOf(p, k)); next.push(l); n++;
        });
        setLines(next); toast[n ? 'success' : 'info'](n ? `${n} low-stock item${n > 1 ? 's' : ''} added. Change to what actually arrived.` : 'No more low-stock items.');
    };

    const patchLine = (id, patch) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));

    const supplierMatch = suppliers.find((s) => s.isActive !== false && s.name.trim().toLowerCase() === inv.supplier.trim().toLowerCase());
    const valid = lines.filter((l) => byId.has(String(l.pid)));
    const wire = { lines: valid.map(toWire), discPct: inv.discPct, discAmt: inv.discAmt, delivery: inv.delivery, vatOn: inv.vatOn, vatMode: inv.vatMode, vatNR: inv.vatNR };
    const D = valid.length ? calcDelivery(wire, byId) : null;
    const T = D?.totals || { gross: 0, lineDisc: 0, invDisc: 0, free: 0, vat: 0, delivery: 0, total: 0, saved: 0 };
    const flags = valid.map((l, i) => flagsFor(l, byId.get(String(l.pid)), D.L[i].c));
    const issues = []; valid.forEach((l, i) => flags[i].forEach((f) => { if (f[0] !== 'info') issues.push({ lvl: f[0], id: l.id, name: byId.get(String(l.pid)).name, msg: f[1] }); }));
    const visible = focus ? valid.filter((l) => l.pid === focus) : valid;
    const setI = (k, v) => setInv((s) => ({ ...s, [k]: v }));
    const dueNote = inv.terms === 'Cash on delivery' ? 'Payment: on delivery.' : `Payment due ${new Date(new Date(inv.ddate || today()).getTime() + parseInt(inv.terms, 10) * 864e5).toLocaleDateString()} (${inv.terms}).`;

    const confirmAll = async (allowDuplicate = false) => {
        if (!valid.length) return toast.error('Add at least one product first.');
        if (!branch) return toast.error('Select a branch first.');
        if (D.errors.length) return toast.error(D.errors[0]);
        if (!allowDuplicate && !window.confirm(`Add ${valid.length} product${valid.length > 1 ? 's' : ''} to stock?\nTotal to pay: KES ${money(T.total)}${T.saved > 0 ? `\nYou save: KES ${money(T.saved)}` : ''}${issues.filter((i) => i.lvl === 'warn').length ? `\n\n${issues.filter((i) => i.lvl === 'warn').length} warning(s) still open.` : ''}`)) return;
        setSaving(true);
        try {
            const { data } = await API.post('/goods-receipts', {
                ...wire, branch, allowDuplicate,
                supplier: supplierMatch?._id || null, supplierName: inv.supplier.trim(), createSupplier: !supplierMatch && !!inv.supplier.trim() && inv.saveSupplier,
                invoice: inv.invoice, po: inv.po, deliveryDate: inv.ddate, driver: inv.driver, terms: inv.terms, receivedByName: inv.recvBy, note: inv.note,
            });
            localStorage.removeItem(key);
            setLines([]); setFocus(null); setInv(blankInv(inv.recvBy));
            await onDone(data);
        } catch (er) {
            const d = er.response?.data;
            if (er.response?.status === 409 && d?.details?.duplicate) { if (window.confirm(`${d.message}\n\nReceive it again anyway?`)) { setSaving(false); return confirmAll(true); } }
            else toast.error(d?.message || 'Failed to receive stock');
        }
        setSaving(false);
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <div className="xl:col-span-2 space-y-5">
                {focus && byId.get(String(focus)) ? (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600">Receiving one product</p>
                        <h2 className="font-bold text-lg truncate">{byId.get(String(focus)).name}</h2>
                        <p className="text-xs text-gray-500">{valid.length > 1 ? `${valid.length - 1} other product(s) are hidden but still in this delivery.` : 'Fill in what arrived, then confirm.'}</p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            <button type="button" onClick={() => { setFocus(null); }} className="px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl flex items-center gap-1"><List size={13} />{valid.length > 1 ? 'Show all lines in this delivery' : 'Add another product'}</button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div><h2 className="font-bold text-lg">1. Add products you received</h2><p className="text-xs text-gray-500">Scan a barcode (pack barcodes work too) or search by name. New item? Create it here.</p></div>
                            <button type="button" onClick={addLow} className="px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl flex items-center gap-1"><Plus size={12} />Add low-stock items</button>
                        </div>
                        <div className="relative mt-4">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input className="input !pl-10 !py-3" placeholder="Scan barcode or search product" value={search}
                                onChange={(e) => { setSearch(e.target.value); setShowRes(true); }} onKeyDown={onEnter} onFocus={() => setShowRes(true)} onBlur={() => setTimeout(() => setShowRes(false), 150)} />
                            {showRes && search.trim() && (
                                <div className="absolute z-20 left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
                                    {hits.length ? hits.map((p) => (
                                        <button key={p._id} type="button" onMouseDown={(e) => { e.preventDefault(); addLine(p); setSearch(''); setShowRes(false); }} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-orange-50 border-b border-gray-100">
                                            <div className="min-w-0"><p className="font-medium text-sm truncate">{p.name}</p><p className="text-xs text-gray-400">{p.category} · buy in {packsOf(p).map((k) => k.name).concat(baseAbbr(p)).join(', ')}</p></div>
                                            <p className="text-xs shrink-0 text-gray-500">{num(stockOf(p))} {baseAbbr(p)}</p>
                                        </button>
                                    )) : <p className="px-4 pt-4 pb-2 text-sm text-gray-400">No product matches that.</p>}
                                    <button type="button" onMouseDown={(e) => { e.preventDefault(); setShowRes(false); onCreateProduct(search.trim()); setSearch(''); }} className="w-full flex items-center gap-2 text-left px-4 py-3 text-sm font-semibold text-orange-600 hover:bg-orange-50"><Plus size={14} />Create new product “{search.trim()}”</button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {visible.map((l) => {
                    const i = valid.indexOf(l), p = byId.get(String(l.pid));
                    return <Line key={l.id} l={l} p={p} c={D.L[i].c} flags={flags[i]} patch={(x) => patchLine(l.id, x)}
                        onRemove={() => { setLines((ls) => ls.filter((z) => z.id !== l.id)); if (focus === l.pid) setFocus(null); }} onEdit={() => onEditProduct(p)} />;
                })}
                {!valid.length && <div className="text-center py-14 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 text-sm"><Package size={44} className="mx-auto mb-2" />No products yet. Scan or search above.</div>}

                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <button type="button" onClick={() => setShowDel((v) => !v)} className="w-full flex items-center justify-between gap-3 p-5 text-left">
                        <div><h3 className="font-bold">2. Delivery details <span className="text-xs font-medium text-gray-400">(optional)</span></h3><p className="text-xs text-gray-500">Supplier, invoice number, driver and payment terms</p></div>
                        <div className="flex items-center gap-2">{(inv.supplier || inv.invoice || inv.po || inv.driver || inv.note) && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Added</span>}{showDel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
                    </button>
                    {showDel && (
                        <div className="px-5 pb-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                            <div className="col-span-2"><label className="sk-label">Supplier</label>
                                <input className="input" list="skSup" placeholder="Choose or type" value={inv.supplier} onChange={(e) => setI('supplier', e.target.value)} />
                                <datalist id="skSup">{suppliers.filter((s) => s.isActive !== false).map((s) => <option key={s._id} value={s.name} />)}</datalist>
                                {inv.supplier.trim() && !supplierMatch && <label className="flex items-center gap-2 text-xs text-gray-600 mt-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-orange-500" checked={inv.saveSupplier} onChange={(e) => setI('saveSupplier', e.target.checked)} /> New supplier: save to my supplier list</label>}</div>
                            <div><label className="sk-label">Invoice / delivery note no.</label><input className="input" value={inv.invoice} onChange={(e) => setI('invoice', e.target.value)} /></div>
                            <div><label className="sk-label">Purchase order</label><input className="input" value={inv.po} onChange={(e) => setI('po', e.target.value)} /></div>
                            <div><label className="sk-label">Delivery date</label><input type="date" className="input" value={inv.ddate} onChange={(e) => setI('ddate', e.target.value)} /></div>
                            <div><label className="sk-label">Driver / vehicle</label><input className="input" value={inv.driver} onChange={(e) => setI('driver', e.target.value)} /></div>
                            <div><label className="sk-label">Payment terms</label><select className="input" value={inv.terms} onChange={(e) => setI('terms', e.target.value)}>{TERMS.map((t) => <option key={t}>{t}</option>)}</select></div>
                            <div><label className="sk-label">Received by</label><input className="input" value={inv.recvBy} onChange={(e) => setI('recvBy', e.target.value)} /></div>
                            <div className="col-span-2"><label className="sk-label">Note</label><input className="input" placeholder="Anything unusual about this delivery" value={inv.note} onChange={(e) => setI('note', e.target.value)} /></div>
                            <p className="col-span-2 text-xs text-gray-500">{dueNote}</p>
                        </div>
                    )}
                </section>
            </div>

            <aside className="xl:sticky xl:top-4 space-y-5">
                <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <h2 className="font-bold text-lg mb-4">Invoice summary</h2>
                    <p className="sk-label">Discount on the whole invoice</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className="sk-label">Percent off</label><input type="number" min="0" max="100" step="any" className="input" placeholder="0" value={inv.discPct} onChange={(e) => setI('discPct', e.target.value)} /></div>
                        <div><label className="sk-label">KES off</label><input type="number" min="0" step="any" className="input" placeholder="0" value={inv.discAmt} onChange={(e) => setI('discAmt', e.target.value)} /></div>
                    </div>
                    <div className="flex gap-1.5 mt-2">{[2, 5, 10].map((q) => <button key={q} type="button" className="sk-chip" onClick={() => setI('discPct', String(q))}>{q}%</button>)}</div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div><label className="sk-label">Delivery charge (KES)</label><input type="number" min="0" step="any" className="input" placeholder="0" value={inv.delivery} onChange={(e) => setI('delivery', e.target.value)} /></div>
                        <div className="flex items-end"><label className="flex items-center gap-2 text-sm cursor-pointer pb-2"><input type="checkbox" className="w-4 h-4 accent-orange-500" checked={inv.vatOn} onChange={(e) => setI('vatOn', e.target.checked)} /> Add VAT (16%)</label></div>
                    </div>
                    {inv.vatOn && (
                        <div className="mt-3 space-y-2">
                            <select className="input" value={inv.vatMode} onChange={(e) => setI('vatMode', e.target.value)}><option value="excl">Invoice prices exclude VAT (add it)</option><option value="incl">Invoice prices already include VAT</option></select>
                            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-orange-500" checked={inv.vatNR} onChange={(e) => setI('vatNR', e.target.checked)} /> VAT is not recoverable, add it to my cost</label>
                        </div>
                    )}
                    <dl className="text-sm space-y-2 mt-5 pt-4 border-t border-gray-100">
                        {[['Invoice amount', money(T.gross)], ['Line discounts', `-${money(T.lineDisc)}`], ['Invoice discount', `-${money(T.invDisc)}`], ['Free goods (not charged)', money(T.free)], ['VAT', money(T.vat)], ['Delivery', money(T.delivery)]].map(([a, b]) => <div key={a} className="flex justify-between"><dt className="text-gray-500">{a}</dt><dd>{b}</dd></div>)}
                        <div className="flex justify-between pt-3 border-t border-gray-200 text-base"><dt className="font-bold">Total to pay</dt><dd className="font-extrabold text-brand-orange">KES {money(T.total)}</dd></div>
                    </dl>
                    {T.saved > 0 && <div className="mt-4 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold p-3 text-center">You save KES {money(T.saved)} on this delivery</div>}
                    <div className="mt-4 space-y-1.5">
                        {issues.slice(0, 5).map((i, k) => <button key={k} type="button" onClick={() => { setFocus(null); document.getElementById('top')?.scrollIntoView(); }} className={`sk-flag ${i.lvl} w-full text-left`}><span><b>{i.name}:</b> {i.msg}</span></button>)}
                        {issues.length > 5 && <p className="text-[11px] text-gray-400">+ {issues.length - 5} more</p>}
                    </div>
                    <button type="button" disabled={saving} onClick={() => confirmAll(false)} className="w-full mt-5 py-3.5 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-sm rounded-xl shadow-md disabled:opacity-50">{saving ? 'Saving…' : 'Confirm and add to stock'}</button>
                    <p className="text-[11px] text-gray-400 mt-2 text-center">Stock changes only when you confirm.</p>
                </section>
            </aside>
        </div>
    );
      }
