import { useState } from 'react';
import { Package, TrendingDown, List } from 'lucide-react';
import Line from './Line';
import ProductPicker from './ProductPicker';
import DeliveryDetails from './DeliveryDetails';
import InvoiceSummary from './InvoiceSummary';
import useReceiveStock from './useReceiveStock';
import { lineProfit } from './helpers';

export default function ReceiveStock({ products, suppliers, branch, focusReq, onDone, onEditProduct, onCreateProduct, onProductsChanged }) {
    const r = useReceiveStock({ products, suppliers, branch, focusReq, onDone, onCreateProduct });
    const [lossOnly, setLossOnly] = useState(false);
    const focusProduct = r.focus ? r.byId.get(String(r.focus)) : null;

    const rows = r.D ? r.visible.map((l, i) => {
        const p = r.byId.get(String(l.pid));
        return { l, i, p, profit: lineProfit(l, p, r.D.L[i].c) };
    }) : [];
    const lossCount = rows.filter((x) => x.profit !== null && x.profit < 0).length;
    const shown = lossOnly ? rows.filter((x) => x.profit !== null && x.profit < 0) : rows;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <div className="xl:col-span-2 space-y-5">
                <ProductPicker focusProduct={focusProduct} validCount={r.valid.length}
                    search={r.search} setSearch={r.setSearch} showRes={r.showRes} setShowRes={r.setShowRes}
                    hits={r.hits} onEnter={r.onEnter} addLine={r.addLine} addLow={r.addLow}
                    onShowAll={() => r.setFocus(null)} onCreateProduct={onCreateProduct} />

                {rows.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => setLossOnly(false)} className={`sk-chip ${!lossOnly ? 'on' : ''}`}><List size={12} />All ({rows.length})</button>
                        <button type="button" onClick={() => setLossOnly(true)} className={`sk-chip ${lossOnly ? 'on' : ''}`}><TrendingDown size={12} />Loss only ({lossCount})</button>
                    </div>
                )}

                {shown.map(({ l, i, p }) => (
                    <Line key={l.id} l={l} p={p} c={r.D.L[i].c} flags={r.flags[i]} patch={(x) => r.patchLine(l.id, x)}
                        onRemove={() => r.removeLine(l)} onEdit={() => onEditProduct(p)} branch={branch} onImageChanged={onProductsChanged} />
                ))}
                {lossOnly && rows.length > 0 && !shown.length && <div className="text-center py-10 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-bold">No loss-making products in this delivery 🎉</div>}
                {!r.visible.length && <div className="text-center py-14 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 text-sm"><Package size={44} className="mx-auto mb-2" />No products yet. Scan or search above.</div>}

                <DeliveryDetails inv={r.inv} setI={r.setI} suppliers={suppliers} supplierMatch={r.supplierMatch}
                    showDel={r.showDel} setShowDel={r.setShowDel} dueNote={r.dueNote} />
            </div>

            <InvoiceSummary inv={r.inv} setI={r.setI} T={r.T} issues={r.issues} hiddenCount={r.hiddenCount} saving={r.saving}
                confirmLabel={focusProduct ? `Confirm ${focusProduct.name} and add to stock` : 'Confirm and add to stock'}
                onIssueClick={() => { r.setFocus(null); document.getElementById('top')?.scrollIntoView(); }}
                onConfirm={() => r.confirmAll(false)} />
            {r.confirmDialog}
        </div>
    );
}
