import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import API from '../../../api/axios';
import { useAuth } from '../../../hooks/useAuth';
import { calcDelivery, stockOf, r2 } from '../../../utils/receivingMath';
import { money } from '../productManagementUtils';
import { today, blankInv, unitList, qtyOf, bigKey, newLine, toWire, flagsFor } from './helpers';
import useConfirm from '../useConfirm';
import useVatSettings from '../../CashierPage/hooks/useVatSettings'; // CHANGED

export default function useReceiveStock({ products, suppliers, branch, focusReq, onDone, onCreateProduct }) {
    const { user } = useAuth();
    const key = `sk_recv_draft_${branch || 'x'}`;
    const [confirm, confirmDialog] = useConfirm();
    const [lines, setLines] = useState([]);
    const [inv, setInv] = useState(() => blankInv(user?.fullName || ''));
    const [focus, setFocus] = useState(null);
    const [search, setSearch] = useState('');
    const [showRes, setShowRes] = useState(false);
    const [showDel, setShowDel] = useState(false);
    const [saving, setSaving] = useState(false);
    const loaded = useRef(false);

    // CHANGED: VAT settings from Admin Settings (null until loaded)
    const vatSettings = useVatSettings();
    const registered = !!vatSettings?.enabled;
    const vatRate = Number(vatSettings?.rate) > 0 ? Number(vatSettings.rate) : 16;

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
    const removeLine = (l) => { setLines((ls) => ls.filter((z) => z.id !== l.id)); if (focus === l.pid) setFocus(null); };

    const supplierMatch = suppliers.find((s) => s.isActive !== false && s.name.trim().toLowerCase() === inv.supplier.trim().toLowerCase());
    const valid = lines.filter((l) => byId.has(String(l.pid)));
    // Lines being saved right now: only the focused product in
    // "receive one product" mode, otherwise the whole delivery.
    const visible = focus ? valid.filter((l) => l.pid === focus) : valid;
    const hiddenCount = valid.length - visible.length;

    // CHANGED: effective VAT values.
    // - vatOn follows Admin Settings until the storekeeper clicks the box
    // - if the shop is not VAT-registered, VAT can't be claimed, so it always goes into cost
    // (the server enforces the same rules, this keeps the screen in step with it)
    const vatOn = inv.vatTouched ? inv.vatOn : registered;
    const vatNR = vatSettings && !registered ? true : inv.vatNR;

    const wire = { lines: visible.map(toWire), discPct: inv.discPct, discAmt: inv.discAmt, delivery: inv.delivery, vatOn, vatMode: inv.vatMode, vatNR, vatRate };
    const D = visible.length ? calcDelivery(wire, byId) : null;
    const T = D?.totals || { gross: 0, lineDisc: 0, invDisc: 0, free: 0, exVat: 0, vat: 0, delivery: 0, total: 0, saved: 0 };
    const flags = visible.map((l, i) => flagsFor(l, byId.get(String(l.pid)), D.L[i].c));
    const issues = []; visible.forEach((l, i) => flags[i].forEach((f) => { if (f[0] !== 'info') issues.push({ lvl: f[0], id: l.id, name: byId.get(String(l.pid)).name, msg: f[1] }); }));

    // CHANGED: clicking the VAT box marks it as the storekeeper's own choice
    const setI = (k, v) => setInv((s) => ({ ...s, [k]: v, ...(k === 'vatOn' ? { vatTouched: true } : {}) }));
    const dueNote = inv.terms === 'Cash on delivery' ? 'Payment: on delivery.' : `Payment due ${new Date(new Date(inv.ddate || today()).getTime() + parseInt(inv.terms, 10) * 864e5).toLocaleDateString()} (${inv.terms}).`;

    const confirmAll = async (allowDuplicate = false) => {
        if (!visible.length) return toast.error('Add at least one product first.');
        if (!branch) return toast.error('Select a branch first.');
        if (D.errors.length) return toast.error(D.errors[0]);
        const warns = issues.filter((i) => i.lvl === 'warn').length;
        if (!allowDuplicate && !(await confirm({
            title: `Add ${visible.length} product${visible.length > 1 ? 's' : ''} to stock?`,
            description: `Total to pay: KES ${money(T.total)}${T.saved > 0 ? `\nYou save: KES ${money(T.saved)}` : ''}${warns ? `\n\n${warns} warning(s) still open.` : ''}${hiddenCount ? `\n\n${hiddenCount} other product(s) stay in your draft.` : ''}`,
            confirmLabel: 'Add to stock',
        }))) return;
        setSaving(true);
        try {
            const { data } = await API.post('/goods-receipts', {
                ...wire, branch, allowDuplicate,
                supplier: supplierMatch?._id || null, supplierName: inv.supplier.trim(), createSupplier: !supplierMatch && !!inv.supplier.trim() && inv.saveSupplier,
                invoice: inv.invoice, etimsNo: inv.etimsNo, po: inv.po, deliveryDate: inv.ddate, driver: inv.driver, terms: inv.terms, receivedByName: inv.recvBy, note: inv.note, // CHANGED: etimsNo
            });
            // Remove only the lines that were saved. Other lines stay in the draft.
            const savedIds = new Set(visible.map((l) => l.id));
            const rest = lines.filter((l) => !savedIds.has(l.id));
            setLines(rest);
            if (!rest.length) localStorage.removeItem(key);
            setFocus(null);
            setInv(blankInv(inv.recvBy));
            if (rest.length) toast.info(`${rest.length} other product${rest.length > 1 ? 's are' : ' is'} still in your draft.`);
            await onDone(data);
        } catch (er) {
            const d = er.response?.data;
            if (er.response?.status === 409 && d?.details?.duplicate) {
                setSaving(false);
                if (await confirm({
                    title: 'Possible duplicate delivery',
                    description: `${d.message}\n\nReceive it again anyway?`,
                    confirmLabel: 'Receive again',
                    tone: 'danger',
                })) return confirmAll(true);
                return;
            } else toast.error(d?.message || 'Failed to receive stock');
        }
        setSaving(false);
    };

    return {
        byId, focus, setFocus, search, setSearch, showRes, setShowRes, showDel, setShowDel, saving,
        inv: { ...inv, vatOn, vatNR }, // CHANGED: the screen sees the effective VAT values
        vatCfg: { registered, rate: vatRate }, // CHANGED
        setI, hits, onEnter, addLine, addLow, patchLine, removeLine,
        supplierMatch, valid, visible, hiddenCount, D, T, flags, issues, dueNote, confirmAll,
        confirmDialog,
    };
                }
