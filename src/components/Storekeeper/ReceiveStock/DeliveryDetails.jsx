import { ChevronDown, ChevronUp } from 'lucide-react';
import { TERMS } from './helpers';

export default function DeliveryDetails({ inv, setI, suppliers, supplierMatch, showDel, setShowDel, dueNote }) {
    return (
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button type="button" onClick={() => setShowDel((v) => !v)} className="w-full flex items-center justify-between gap-3 p-5 text-left">
                <div><h3 className="font-bold">2. Delivery details <span className="text-xs font-medium text-gray-400">(optional)</span></h3><p className="text-xs text-gray-500">Supplier, invoice number, driver and payment terms</p></div>
                <div className="flex items-center gap-2">{(inv.supplier || inv.invoice || inv.etimsNo || inv.po || inv.driver || inv.note) && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Added</span>}{showDel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</div>
            </button>
            {showDel && (
                <div className="px-5 pb-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="sk-label">Supplier</label>
                        <input className="input" list="skSup" placeholder="Choose or type" value={inv.supplier} onChange={(e) => setI('supplier', e.target.value)} />
                        <datalist id="skSup">{suppliers.filter((s) => s.isActive !== false).map((s) => <option key={s._id} value={s.name} />)}</datalist>
                        {inv.supplier.trim() && !supplierMatch && <label className="flex items-center gap-2 text-xs text-gray-600 mt-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-orange-500" checked={inv.saveSupplier} onChange={(e) => setI('saveSupplier', e.target.checked)} /> New supplier: save to my supplier list</label>}</div>
                    <div><label className="sk-label">Invoice / delivery note no.</label><input className="input" value={inv.invoice} onChange={(e) => setI('invoice', e.target.value)} /></div>
                    {/* CHANGED: needed to claim input VAT */}
                    <div><label className="sk-label">Supplier eTIMS / tax invoice no.</label><input className="input" value={inv.etimsNo} onChange={(e) => setI('etimsNo', e.target.value)} /></div>
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
    );
}
