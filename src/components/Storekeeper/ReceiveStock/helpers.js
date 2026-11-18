import { baseAbbr, stockOf, unitTable, r2 } from '../../../utils/receivingMath';
import { money, num, lastBatch, packsOf, cap } from '../productManagementUtils';

export const ceil5 = (x) => Math.ceil(x / 5) * 5;
export const nid = () => Math.random().toString(36).slice(2, 9);
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
export const TERMS = ['Cash on delivery', '7 days', '14 days', '30 days', '60 days'];
export const blankInv = (by = '') => ({ supplier: '', saveSupplier: true, invoice: '', po: '', ddate: today(), driver: '', terms: 'Cash on delivery', recvBy: by, note: '', discPct: '', discAmt: '', delivery: '', vatOn: false, vatMode: 'excl', vatNR: false });

export const unitList = (p) => [...packsOf(p).map((k) => ({ key: String(k._id), name: k.name, qty: k.qty })), { key: 'b', name: baseAbbr(p), qty: 1, base: true }];
export const qtyOf = (p, key) => unitTable(p)[key]?.qty || 1;
export const uLabel = (u) => (u.base ? `Single (${u.name})` : cap(u.name));
export const bigKey = (p) => (packsOf(p)[0] ? String(packsOf(p)[0]._id) : 'b');
export const discText = (p, d) => d.type === 'pct' ? `${num(d.val)}% off` : d.type === 'amt' ? `KES ${num(d.val)} off` : `Free: ${num(d.val)} ${unitTable(p)[d.unit]?.name || ''}`;

export function newLine(p, key) {
    const k = key || bigKey(p), last = lastBatch(p)?.costPerUnit || 0, pp = {};
    (p.packs || []).forEach((x) => { pp[String(x._id)] = x.price || ''; });
    return { id: nid(), pid: p._id, mix: false, unit: k, qty: 1, q: {}, priceUnit: k, price: r2(last * qtyOf(p, k)) || '', discs: [], addD: false, dd: { type: 'pct', val: '', unit: k },
        exp: '', batch: '', rej: '', newPrice: p.sellingPrice, pp, open: !!p.perishable };
}

export const toWire = (l) => ({
    product: l.pid,
    items: l.mix ? Object.entries(l.q).map(([key, qty]) => ({ key, qty })) : [{ key: l.unit, qty: l.qty }],
    priceUnit: l.priceUnit, price: l.price, discounts: l.discs.map(({ type, val, unit }) => ({ type, val, unit })),
    rejected: l.rej, expiryDate: l.exp || null, batchNo: l.batch, newPrice: l.newPrice, packPrices: l.pp,
});

export function flagsFor(l, p, c) {
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
export const FLAG_CLS = { err: 'err', warn: 'warn', info: 'info' };
