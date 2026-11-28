import { money } from '../productManagementUtils';

// CHANGED: new prop vatCfg = { registered, rate }
export default function InvoiceSummary({ inv, setI, T, vatCfg, issues, hiddenCount, saving, confirmLabel, onIssueClick, onConfirm }) {
    return (
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
                    {/* CHANGED: the rate comes from Admin Settings instead of a fixed 16% */}
                    <div className="flex items-end"><label className="flex items-center gap-2 text-sm cursor-pointer pb-2"><input type="checkbox" className="w-4 h-4 accent-orange-500" checked={inv.vatOn} onChange={(e) => setI('vatOn', e.target.checked)} /> Add VAT ({vatCfg.rate}%)</label></div>
                </div>
                {inv.vatOn && (
                    <div className="mt-3 space-y-2">
                        <select className="input" value={inv.vatMode} onChange={(e) => setI('vatMode', e.target.value)}><option value="excl">Invoice prices exclude VAT (add it)</option><option value="incl">Invoice prices already include VAT</option></select>
                        {/* CHANGED: VAT now applies per line */}
                        <p className="text-[11px] text-gray-500">Applies to standard-rated lines only. Zero-rated and exempt lines get no VAT.</p>
                        {/* CHANGED: locked on when the shop is not VAT-registered */}
                        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-orange-500" checked={inv.vatNR} disabled={!vatCfg.registered} onChange={(e) => setI('vatNR', e.target.checked)} /> VAT is not recoverable, add it to my cost</label>
                        {!vatCfg.registered && <p className="text-[11px] text-amber-700">VAT is off in Settings, so this VAT can't be claimed and goes into cost.</p>}
                    </div>
                )}
                <dl className="text-sm space-y-2 mt-5 pt-4 border-t border-gray-100">
                    {[['Invoice amount', money(T.gross)], ['Line discounts', `-${money(T.lineDisc)}`], ['Invoice discount', `-${money(T.invDisc)}`], ['Free goods (not charged)', money(T.free)], ['VAT', money(T.vat)], ['Delivery', money(T.delivery)]].map(([a, b]) => <div key={a} className="flex justify-between"><dt className="text-gray-500">{a}</dt><dd>{b}</dd></div>)}
                    <div className="flex justify-between pt-3 border-t border-gray-200 text-base"><dt className="font-bold">Total to pay</dt><dd className="font-extrabold text-brand-orange">KES {money(T.total)}</dd></div>
                </dl>
                {/* CHANGED: says what happens to the VAT */}
                {inv.vatOn && T.vat > 0 && (
                    <p className="text-[11px] text-gray-500 mt-2">
                        {inv.vatNR ? 'This VAT is added to product cost.' : `KES ${money(T.vat)} will be claimed back against VAT collected on sales.`}
                    </p>
                )}
                {T.saved > 0 && <div className="mt-4 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold p-3 text-center">You save KES {money(T.saved)} on this delivery</div>}
                <div className="mt-4 space-y-1.5">
                    {issues.slice(0, 5).map((i, k) => <button key={k} type="button" onClick={onIssueClick} className={`sk-flag ${i.lvl} w-full text-left`}><span><b>{i.name}:</b> {i.msg}</span></button>)}
                    {issues.length > 5 && <p className="text-[11px] text-gray-400">+ {issues.length - 5} more</p>}
                </div>
                {hiddenCount > 0 && (
                    <div className="sk-flag info mt-4">Only this product will be saved. {hiddenCount} other product{hiddenCount > 1 ? 's stay' : ' stays'} in your draft until you finish {hiddenCount > 1 ? 'them' : 'it'}.</div>
                )}
                <button type="button" disabled={saving} onClick={onConfirm} className="w-full mt-5 py-3.5 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-sm rounded-xl shadow-md disabled:opacity-50">{saving ? 'Saving…' : confirmLabel}</button>
                <p className="text-[11px] text-gray-400 mt-2 text-center">Stock changes only when you confirm.</p>
            </section>
        </aside>
    );
}
