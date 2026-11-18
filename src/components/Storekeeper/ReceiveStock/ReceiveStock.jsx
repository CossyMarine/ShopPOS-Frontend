import { Package } from 'lucide-react';
import Line from './Line';
import ProductPicker from './ProductPicker';
import DeliveryDetails from './DeliveryDetails';
import InvoiceSummary from './InvoiceSummary';
import useReceiveStock from './useReceiveStock';

export default function ReceiveStock({ products, suppliers, branch, focusReq, onDone, onEditProduct, onCreateProduct }) {
    const r = useReceiveStock({ products, suppliers, branch, focusReq, onDone, onCreateProduct });
    const focusProduct = r.focus ? r.byId.get(String(r.focus)) : null;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <div className="xl:col-span-2 space-y-5">
                <ProductPicker focusProduct={focusProduct} validCount={r.valid.length}
                    search={r.search} setSearch={r.setSearch} showRes={r.showRes} setShowRes={r.setShowRes}
                    hits={r.hits} onEnter={r.onEnter} addLine={r.addLine} addLow={r.addLow}
                    onShowAll={() => r.setFocus(null)} onCreateProduct={onCreateProduct} />

                {r.visible.map((l, i) => {
                    const p = r.byId.get(String(l.pid));
                    return <Line key={l.id} l={l} p={p} c={r.D.L[i].c} flags={r.flags[i]} patch={(x) => r.patchLine(l.id, x)}
                        onRemove={() => r.removeLine(l)} onEdit={() => onEditProduct(p)} />;
                })}
                {!r.visible.length && <div className="text-center py-14 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 text-sm"><Package size={44} className="mx-auto mb-2" />No products yet. Scan or search above.</div>}

                <DeliveryDetails inv={r.inv} setI={r.setI} suppliers={suppliers} supplierMatch={r.supplierMatch}
                    showDel={r.showDel} setShowDel={r.setShowDel} dueNote={r.dueNote} />
            </div>

            <InvoiceSummary inv={r.inv} setI={r.setI} T={r.T} issues={r.issues} hiddenCount={r.hiddenCount} saving={r.saving}
                confirmLabel={focusProduct ? `Confirm ${focusProduct.name} and add to stock` : 'Confirm and add to stock'}
                onIssueClick={() => { r.setFocus(null); document.getElementById('top')?.scrollIntoView(); }}
                onConfirm={() => r.confirmAll(false)} />
        </div>
    );
              }
