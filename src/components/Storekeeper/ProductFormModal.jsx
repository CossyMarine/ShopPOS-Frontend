import { useMemo, useRef, useState } from 'react';
import { Package, X, Wand2, Upload, Plus, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-toastify';
import imageCompression from 'browser-image-compression';
import API from '../../api/axios';
import { money, avgCostPerEach, num } from './productManagementUtils';
import { allowsDecimals } from '../../utils/receivingMath';

const PRESETS = [['Dozen', 12], ['Pack', 6], ['Box', 12], ['Carton', 24], ['Crate', 24], ['Tray', 30], ['Bale', 10], ['Bag', 25], ['Sack', 50], ['Tin', 12]];
const ceil5 = (x) => Math.ceil(x / 5) * 5;
const r2 = (n) => Math.round((+n || 0) * 100) / 100;
const uid = () => 'k' + Math.random().toString(36).slice(2, 9);
const randCode = () => '6291' + Math.floor(100000000 + Math.random() * 900000000);

export default function ProductFormModal({ product, initialName = '', units, categories, suppliers, branch, onClose, onSaved, onOpenUnitManager }) {
    const p = product;
    const fileRef = useRef();
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState('');
    const [more, setMore] = useState(false);
    const [decTouched, setDecTouched] = useState(!!p);
    const [f, setF] = useState(() => p ? {
        name: p.name, category: p.category || 'General', unit: p.unit?._id || p.unit || '', barcode: p.barcode || '',
        price: p.sellingPrice, costInput: '', costUnit: 'b', reorderLevel: p.reorderLevel || '', maxLevel: p.maxLevel || '', reorderQty: p.reorderQty || '',
        perishable: !!p.perishable, allowDecimals: allowsDecimals(p), sku: p.sku || '', description: p.description || '',
        supplier: p.supplier?._id || p.supplier || '', vatClass: p.vatClass || 'standard', imageUrl: p.imageUrl || '', imagePublicId: p.imagePublicId || '',
        isActive: p.isActive !== false, openQty: '', openUnit: 'b', openExp: '',
    } : {
        name: initialName, category: 'General', unit: '', barcode: '', price: '', costInput: '', costUnit: 'b', reorderLevel: '', maxLevel: '', reorderQty: '',
        perishable: false, allowDecimals: false, sku: '', description: '', supplier: '', vatClass: 'standard', imageUrl: '', imagePublicId: '',
        isActive: true, openQty: '', openUnit: 'b', openExp: '',
    });
    const [packs, setPacks] = useState(() => (p?.packs || []).map((k) => ({ key: String(k._id), _id: k._id, name: k.name, qty: k.qty, barcode: k.barcode || '', price: k.price || '' })));

    const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
    const unitObj = units.find((u) => u._id === f.unit);
    const abbr = unitObj?.abbreviation || 'unit';
    const okPacks = useMemo(() => packs.filter((k) => k.name.trim() && +k.qty > 1).sort((a, b) => a.qty - b.qty), [packs]);
    const qtyOf = (key) => (key === 'b' ? 1 : +(packs.find((k) => k.key === key)?.qty) || 1);

    // cost: new product = typed; existing = average of batches (read only)
    const costBase = p ? avgCostPerEach(p) : (+f.costInput > 0 ? +f.costInput / qtyOf(f.costUnit) : 0);
    const price = +f.price || 0;
    const margin = price > 0 && costBase > 0 ? (price - costBase) / price * 100 : null;
    const packPrice = (k) => (+k.price > 0 ? +k.price : price * (+k.qty || 0));

    const changeCostUnit = (key) => setF((s) => ({ ...s, costUnit: key, costInput: costBase > 0 ? r2(costBase * qtyOf(key)) : '' }));
    const setPack = (i, patch) => setPacks((ls) => ls.map((k, j) => (j === i ? { ...k, ...patch } : k)));
    const addPreset = (n, q) => {
        if (packs.some((k) => k.name.trim().toLowerCase() === n.toLowerCase())) return toast.error(`${n} is already added`);
        setPacks((ls) => [...ls, { key: uid(), name: n, qty: q, barcode: '', price: '' }]);
    };
    const onUnit = (v) => {
        setF((s) => ({ ...s, unit: v }));
        if (!decTouched) { const a = units.find((u) => u._id === v)?.abbreviation || ''; setF((s) => ({ ...s, unit: v, allowDecimals: /^(kg|g|l|ltr|ml|m)$/i.test(a) })); }
    };
    const margins = (t, markup) => {
        if (!(costBase > 0)) return toast.error('Enter the buying cost first');
        set('price', markup ? ceil5(costBase * (1 + t / 100)) : ceil5(costBase / (1 - t / 100)));
    };

    const upload = async (e) => {
        const file = e.target.files?.[0]; if (!file) return;
        if (file.size > 5 * 1024 * 1024) return toast.error('Max file size is 5MB');
        try {
            setUploading(true);
            const c = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1600, useWebWorker: true, initialQuality: 0.85 });
            const fd = new FormData(); fd.append('image', c, file.name);
            const res = await API.post('/products/upload-image', fd, { timeout: 30000 });
            setF((s) => ({ ...s, imageUrl: res.data.url, imagePublicId: res.data.publicId }));
        } catch (er) { toast.error(er.response?.data?.message || 'Image upload failed'); }
        setUploading(false);
    };

    const save = async (mode) => {
        setErr('');
        if (!branch) return setErr('Select a branch first.');
        if (!f.name.trim()) return setErr('Enter the product name.');
        if (!f.unit) return setErr('Choose the base unit.');
        if (!(price > 0)) return setErr(`Enter the selling price per ${abbr}.`);
        const seen = new Set();
        for (const k of packs) {
            const nm = k.name.trim();
            if (!nm) return setErr('Every pack needs a name.');
            if (!(+k.qty > 1) || !Number.isInteger(+k.qty)) return setErr(`${nm} must contain a whole number above 1.`);
            if (seen.has(nm.toLowerCase())) return setErr(`Pack names must be different. Check "${nm}".`);
            seen.add(nm.toLowerCase());
        }
        if (+f.maxLevel > 0 && +f.maxLevel <= (+f.reorderLevel || 0)) return setErr('Max level must be higher than the reorder level.');

        const payload = {
            name: f.name.trim(), category: f.category.trim() || 'General', unit: f.unit, barcode: f.barcode.trim() || undefined,
            sellingPrice: price, reorderLevel: +f.reorderLevel || 0, maxLevel: +f.maxLevel || 0, reorderQty: +f.reorderQty || 0,
            perishable: f.perishable, allowDecimals: f.allowDecimals, sku: f.sku.trim(), description: f.description.trim(),
            supplier: f.supplier || null, vatClass: f.vatClass, imageUrl: f.imageUrl || null, imagePublicId: f.imagePublicId || null,
            packs: packs.map((k) => ({ _id: k._id, name: k.name.trim(), qty: +k.qty, barcode: k.barcode.trim(), price: +k.price > 0 ? +k.price : null })),
            branch,
        };
        if (p) payload.isActive = f.isActive;
        else if (+f.openQty > 0) {
            const openBase = +f.openQty * qtyOf(f.openUnit);
            if (!f.allowDecimals && openBase % 1 !== 0) return setErr(`Stock on hand must be a whole number of ${abbr}.`);
            if (!(costBase > 0)) return setErr('Enter the buying cost for the opening stock.');
            payload.opening = { quantity: openBase, costPerUnit: costBase, expiryDate: f.openExp || null };
        }

        setSaving(true);
        try {
            const res = p ? await API.put(`/products/${p._id}`, payload) : await API.post('/products', payload);
            toast.success(p ? 'Product updated' : 'Product added');
            await onSaved(res.data, mode);
        } catch (er) { setErr(er.response?.data?.message || 'Failed to save product'); }
        setSaving(false);
    };

    const L = ({ children }) => <label className="sk-label">{children}</label>;
    const sec = 'text-sm font-extrabold text-gray-900 mb-3';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 my-6">
                <div className="flex justify-between items-start gap-3 pb-3 border-b border-gray-100">
                    <div>
                        <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2"><Package size={16} className="text-brand-orange" /> {p ? 'Edit product' : 'New product'}</h3>
                        <p className="text-xs text-gray-500">{p ? p.name : 'What it is, how you buy it and how you sell it.'}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>

                {/* live preview */}
                <div className="mt-4 rounded-2xl bg-stone-50 border border-stone-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="font-extrabold truncate">{f.name.trim() || 'Product name'}</p>
                            <p className="text-xs text-gray-500">{f.category || 'No category'} · base unit {abbr}{f.perishable ? ' · perishable' : ''}</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="font-extrabold">{price > 0 ? `KES ${money(price)}` : '-'} <span className="text-[11px] font-medium text-gray-400">per {abbr}</span></p>
                            <p className={`text-xs font-semibold ${margin !== null && margin < 0 ? 'text-red-600' : margin !== null && margin < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {margin === null ? 'Add cost to see margin' : `Margin ${margin.toFixed(1)}%`}
                            </p>
                        </div>
                    </div>
                    {okPacks.length > 0 && <div className="flex flex-wrap gap-1.5 mt-3">{okPacks.map((k) => <span key={k.key} className="sk-chip">1 {k.name.trim()} = {num(k.qty)} {abbr}{price > 0 || +k.price > 0 ? ` · ${money(packPrice(k))}` : ''}</span>)}</div>}
                </div>

                {/* 1. basics */}
                <div className="mt-5"><h4 className={sec}>1. Basics</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2"><L>Product name *</L><input className="input font-bold" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="Bar Soap 800g" /></div>
                        <div><L>Category *</L>
                            <input className="input font-bold" list="skCats" value={f.category} onChange={(e) => set('category', e.target.value)} placeholder="Dairy, Bakery..." />
                            <datalist id="skCats">{categories.map((c) => <option key={c} value={c} />)}</datalist></div>
                        <div><L>Base unit (smallest you sell) *</L>
                            {units.length === 0
                                ? <button type="button" onClick={onOpenUnitManager} className="w-full text-left text-xs font-bold text-orange-500 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">No units yet. Tap to add one →</button>
                                : <select className="input font-bold" value={f.unit} onChange={(e) => onUnit(e.target.value)}>
                                    <option value="">Select unit</option>
                                    {units.map((u) => <option key={u._id} value={u._id}>{u.name} ({u.abbreviation})</option>)}
                                </select>}</div>
                    </div>
                </div>

                {/* 2. prices & packs */}
                <div className="mt-5 pt-5 border-t border-gray-100"><h4 className={sec}>2. Prices and packs</h4>
                    {p ? (
                        <p className="text-xs text-gray-500 mb-3">Average buying cost now: <b>{costBase > 0 ? `${money(costBase)} per ${abbr}` : 'no stock received yet'}</b>. To change the buying cost, receive stock.</p>
                    ) : (
                        <div className="mb-3"><L>Buying cost</L>
                            {okPacks.length > 0 && (
                                <div className="sk-seg mb-2">
                                    <button type="button" className={f.costUnit === 'b' ? 'on' : ''} onClick={() => changeCostUnit('b')}>Per {abbr}</button>
                                    {okPacks.map((k) => <button key={k.key} type="button" className={f.costUnit === k.key ? 'on' : ''} onClick={() => changeCostUnit(k.key)}>Per {k.name.trim().toLowerCase()}</button>)}
                                </div>)}
                            <input type="number" min="0" step="any" className="input" placeholder="0" value={f.costInput} onChange={(e) => set('costInput', e.target.value)} />
                            {costBase > 0 && okPacks.length > 0 && <p className="text-xs text-gray-500 mt-1.5">{okPacks.map((k) => `1 ${k.name.trim()} costs ${money(costBase * k.qty)}`).join(' · ')}</p>}
                        </div>
                    )}

                    <L>Selling price per {abbr} *</L>
                    <input type="number" min="0" step="any" className="input font-bold" placeholder="0" value={f.price} onChange={(e) => set('price', e.target.value)} />
                    <div className="mt-2 text-xs">
                        {price > 0 && costBase > 0
                            ? (price < costBase ? <span className="sk-flag err inline-flex">Selling price is below cost.</span>
                                : <span className={`font-semibold ${margin < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>Margin {margin.toFixed(1)}% · Markup {((price - costBase) / costBase * 100).toFixed(1)}% · Profit {money(price - costBase)} per {abbr}</span>)
                            : <span className="text-gray-400">Enter a cost and a selling price to see the margin.</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-center mt-2">
                        <span className="text-[11px] text-gray-500">Margin:</span>{[15, 20, 25, 30].map((t) => <button key={t} type="button" className="sk-chip" onClick={() => margins(t, false)}>{t}%</button>)}
                        <span className="text-[11px] text-gray-500 ml-2">Markup:</span>{[20, 30, 40, 50].map((t) => <button key={t} type="button" className="sk-chip" onClick={() => margins(t, true)}>{t}%</button>)}
                    </div>

                    <div className="mt-5"><p className="sk-label">Packs (optional)</p>
                        <p className="text-xs text-gray-500 mb-3">How many <b>{abbr}</b> are inside each pack you buy or sell? Add a pack price only if a whole carton or sack sells at a different price.</p>
                        <div className="flex flex-wrap gap-1.5 mb-3">{PRESETS.map(([n, q]) => <button key={n} type="button" className="sk-chip" onClick={() => addPreset(n, q)}><Plus size={11} />{n} ({q})</button>)}</div>
                        <div className="space-y-3">
                            {packs.length === 0 && <p className="text-sm text-gray-400">No packs yet. Everything is bought as single {abbr}.</p>}
                            {packs.map((k, i) => {
                                const retail = price * (+k.qty || 0), pp = packPrice(k), nm = k.name.trim() || 'unit';
                                const mg = costBase > 0 && pp > 0 ? (pp - costBase * k.qty) / pp * 100 : null;
                                return (
                                    <div key={k.key} className="rounded-xl border border-gray-200 p-3 grid grid-cols-12 gap-2 items-end">
                                        <div className="col-span-5"><L>Pack name</L><input className="input" list="skPackNames" value={k.name} onChange={(e) => setPack(i, { name: e.target.value })} placeholder="Carton" /></div>
                                        <div className="col-span-4"><L>Contains ({abbr})</L><input type="number" min="2" step="1" className="input" value={k.qty} onChange={(e) => setPack(i, { qty: e.target.value })} /></div>
                                        <div className="col-span-3 flex justify-end"><button type="button" onClick={() => setPacks((ls) => ls.filter((_, j) => j !== i))} className="px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl flex items-center gap-1"><X size={12} />Remove</button></div>
                                        <div className="col-span-7"><L>Barcode on this pack (optional)</L>
                                            <div className="flex gap-2"><input className="input font-mono" inputMode="numeric" value={k.barcode} onChange={(e) => setPack(i, { barcode: e.target.value })} />
                                                <button type="button" onClick={() => setPack(i, { barcode: randCode() })} className="bg-gray-200 hover:bg-gray-300 px-3 rounded-xl"><Wand2 size={14} /></button></div></div>
                                        <div className="col-span-5"><L>Selling price per pack</L><input type="number" min="0" step="any" className="input" placeholder="Auto" value={k.price} onChange={(e) => setPack(i, { price: e.target.value })} /></div>
                                        <p className={`col-span-12 text-xs font-semibold rounded-lg px-3 py-1.5 ${mg !== null && mg < 0 ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>
                                            1 {nm} = {num(k.qty)} {abbr}{price > 0 ? ` · Retail ${num(k.qty)} × ${money(price)} = ${money(retail)} · ${nm} price ${money(pp)}${+k.price > 0 ? '' : ' (auto)'}` : ''}{mg !== null ? ` · Margin ${mg.toFixed(1)}%` : ''}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                        <datalist id="skPackNames">{PRESETS.map(([n]) => <option key={n} value={n} />)}</datalist>
                        <button type="button" onClick={() => setPacks((ls) => [...ls, { key: uid(), name: '', qty: 12, barcode: '', price: '' }])} className="mt-3 px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl flex items-center gap-1"><Plus size={12} />Add another unit</button>
                    </div>
                </div>

                {/* 3. stock rules */}
                <div className="mt-5 pt-5 border-t border-gray-100"><h4 className={sec}>3. Stock rules</h4>
                    <L>Reorder level ({abbr})</L>
                    <input type="number" min="0" step="any" className="input" placeholder="0" value={f.reorderLevel} onChange={(e) => set('reorderLevel', e.target.value)} />
                    <div className="space-y-2 mt-3 text-sm">
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-orange-500" checked={f.allowDecimals} onChange={(e) => { setDecTouched(true); set('allowDecimals', e.target.checked); }} /> Sold by weight or volume (allow decimals)</label>
                        <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-orange-500" checked={f.perishable} onChange={(e) => set('perishable', e.target.checked)} /> Perishable (expiry date required when receiving)</label>
                    </div>
                    {!p && (
                        <div className="mt-3 rounded-xl border border-gray-200 p-3">
                            <p className="sk-label">Stock on hand now (optional)</p>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="number" min="0" step="any" className="input" placeholder="0" value={f.openQty} onChange={(e) => set('openQty', e.target.value)} />
                                <select className="input" value={f.openUnit} onChange={(e) => set('openUnit', e.target.value)}>
                                    {[...okPacks].sort((a, b) => b.qty - a.qty).map((k) => <option key={k.key} value={k.key}>{k.name.trim()} ({num(k.qty)} {abbr})</option>)}
                                    <option value="b">{abbr}</option>
                                </select>
                            </div>
                            {+f.openQty > 0 && <input type="date" className="input mt-3" value={f.openExp} onChange={(e) => set('openExp', e.target.value)} />}
                            <p className="text-[11px] text-gray-400 mt-2">What is on your shelf today. Uses the buying cost above. For a new delivery use "Save and receive".</p>
                        </div>
                    )}
                </div>

                {/* more details */}
                <button type="button" onClick={() => setMore((m) => !m)} className="mt-5 text-sm font-semibold text-orange-600">{more ? 'Hide' : 'More'} details (barcode, VAT, supplier, max level)</button>
                {more && (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="col-span-2"><L>Barcode (single {abbr})</L>
                            <div className="flex gap-2"><input className="input font-mono" inputMode="numeric" value={f.barcode} onChange={(e) => set('barcode', e.target.value)} />
                                <button type="button" onClick={() => set('barcode', randCode())} className="bg-gray-200 hover:bg-gray-300 px-3 rounded-xl"><Wand2 size={14} /></button></div></div>
                        <div><L>SKU / product code</L><input className="input" value={f.sku} onChange={(e) => set('sku', e.target.value)} /></div>
                        <div><L>Default supplier</L>
                            <select className="input" value={f.supplier} onChange={(e) => set('supplier', e.target.value)}>
                                <option value="">None</option>{suppliers.filter((s) => s.isActive !== false).map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                            </select></div>
                        <div><L>VAT class</L>
                            <select className="input" value={f.vatClass} onChange={(e) => set('vatClass', e.target.value)}>
                                <option value="standard">Standard rated (16%)</option><option value="zero">Zero-rated (0%)</option><option value="exempt">Exempt</option>
                            </select></div>
                        <div><L>Max level ({abbr})</L><input type="number" min="0" step="any" className="input" value={f.maxLevel} onChange={(e) => set('maxLevel', e.target.value)} /></div>
                        <div className="col-span-2"><L>Suggested reorder quantity ({abbr})</L><input type="number" min="0" step="any" className="input" value={f.reorderQty} onChange={(e) => set('reorderQty', e.target.value)} /></div>
                        <div className="col-span-2"><L>Description</L><input className="input" value={f.description} onChange={(e) => set('description', e.target.value)} /></div>
                        <div className="col-span-2"><L>Product image (optional)</L>
                            {f.imageUrl && <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-200 mb-2"><img src={f.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" /><span className="text-xs text-gray-400 flex-1">Image attached</span><button type="button" onClick={() => setF((s) => ({ ...s, imageUrl: '', imagePublicId: '' }))}><X size={16} /></button></div>}
                            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} className="hidden" />
                            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-600 hover:border-orange-400 disabled:opacity-50">
                                {uploading ? <><ImageIcon size={15} className="animate-pulse" /> Uploading…</> : <><Upload size={15} /> {f.imageUrl ? 'Change image' : 'Upload from gallery'}</>}</button></div>
                        {p && <label className="col-span-2 flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-orange-500" checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Active (untick to archive: history is kept, hidden from search and receiving)</label>}
                    </div>
                )}

                {err && <div className="sk-flag err mt-4">{err}</div>}
                <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl">Cancel</button>
                    <button type="button" disabled={saving || uploading} onClick={() => save('only')} className="px-4 py-2 border border-gray-800 text-gray-900 text-xs font-extrabold rounded-xl disabled:opacity-50">{saving ? 'Saving…' : p ? 'Save' : 'Save only'}</button>
                    <button type="button" disabled={saving || uploading} onClick={() => save('receive')} className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-extrabold rounded-xl shadow-md disabled:opacity-50">Save and receive</button>
                </div>
            </div>
        </div>
    );
        }
