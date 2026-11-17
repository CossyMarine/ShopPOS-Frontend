import { baseAbbr, stockOf } from '../../utils/receivingMath';

export function avgCostPerEach(product) {
    const batches = product.batches || [];
    const totalQty = batches.reduce((s, b) => s + b.quantity, 0);
    if (!totalQty) return 0;
    return batches.reduce((s, b) => s + b.quantity * b.costPerUnit, 0) / totalQty;
}
export const money = (n) => (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
export const num = (n) => (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });
export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
export const plural = (s, n) => (n === 1 ? s : /(s|x|ch|sh)$/i.test(s) ? s + 'es' : s + 's');

export const earliestExpiry = (product) => {
    const dated = (product.batches || []).filter((b) => b.expiryDate);
    if (!dated.length) return null;
    return dated.reduce((min, b) => (new Date(b.expiryDate) < new Date(min) ? b.expiryDate : min), dated[0].expiryDate);
};
export const isExpiringSoon = (date) => date && (new Date(date) - Date.now()) < 3 * 24 * 60 * 60 * 1000;

export const packsOf = (p) => [...(p.packs || [])].sort((a, b) => b.qty - a.qty);

// 252 pcs -> "10 Boxes + 12 pcs"
export function breakdown(p, base) {
    let rest = Math.round(base * 1000) / 1000;
    const parts = [];
    packsOf(p).forEach((k) => {
        const n = Math.floor(rest / k.qty + 1e-9);
        if (n > 0) { parts.push(`${n} ${plural(k.name, n)}`); rest = Math.round((rest - n * k.qty) * 1000) / 1000; }
    });
    if (rest > 0 || !parts.length) parts.push(`${num(rest)} ${baseAbbr(p)}`);
    return parts.join(' + ');
}

export const lastBatch = (p) => {
    const b = p.batches || [];
    return b.length ? [...b].sort((x, y) => new Date(y.receivedAt) - new Date(x.receivedAt))[0] : null;
};

export const statusOf = (p) => {
    const s = stockOf(p);
    if (p.isActive === false) return 'Archived';
    if (s <= 0) return 'Out';
    if (p.reorderLevel > 0 && s <= p.reorderLevel) return 'Low';
    return 'In stock';
};

export const EMPTY_UNIT = { name: '', abbreviation: '' };
