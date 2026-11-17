import { useState } from 'react';
import { Plus, Pencil, Archive, ArchiveRestore, Trash2, Truck, Phone, Mail, X } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { money } from './productManagementUtils';

const TERMS = ['Cash on delivery', '7 days', '14 days', '30 days', '60 days'];
const EMPTY = { name: '', contactPerson: '', phone: '', email: '', address: '', kraPin: '', paymentTerms: 'Cash on delivery', note: '' };

function SupplierModal({ supplier, branch, onClose, onSaved }) {
    const [f, setF] = useState(supplier ? { ...EMPTY, ...supplier } : EMPTY);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
    const save = async () => {
        if (!f.name.trim()) return setErr('Enter the supplier name.');
        setSaving(true);
        try {
            const body = { name: f.name.trim(), contactPerson: f.contactPerson, phone: f.phone, email: f.email, address: f.address, kraPin: f.kraPin, paymentTerms: f.paymentTerms, note: f.note, branch };
            if (supplier) await API.put(`/suppliers/${supplier._id}`, body); else await API.post('/suppliers', body);
            toast.success(supplier ? 'Supplier updated' : 'Supplier added');
            await onSaved();
        } catch (e) { setErr(e.response?.data?.message || 'Failed to save supplier'); }
        setSaving(false);
    };
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 my-6 shadow-2xl">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4"><h3 className="font-extrabold text-base">{supplier ? 'Edit supplier' : 'New supplier'}</h3><button onClick={onClose}><X size={20} className="text-gray-400" /></button></div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2"><label className="sk-label">Supplier name *</label><input className="input font-bold" value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
                    <div><label className="sk-label">Contact person</label><input className="input" value={f.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} /></div>
                    <div><label className="sk-label">Phone</label><input className="input" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></div>
                    <div className="col-span-2"><label className="sk-label">Email</label><input className="input" value={f.email} onChange={(e) => set('email', e.target.value)} /></div>
                    <div className="col-span-2"><label className="sk-label">Address</label><input className="input" value={f.address} onChange={(e) => set('address', e.target.value)} /></div>
                    <div><label className="sk-label">KRA PIN</label><input className="input" value={f.kraPin} onChange={(e) => set('kraPin', e.target.value)} /></div>
                    <div><label className="sk-label">Payment terms</label><select className="input" value={f.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)}>{TERMS.map((t) => <option key={t}>{t}</option>)}</select></div>
                    <div className="col-span-2"><label className="sk-label">Note</label><input className="input" value={f.note} onChange={(e) => set('note', e.target.value)} /></div>
                </div>
                {err && <div className="sk-flag err mt-4">{err}</div>}
                <div className="mt-5 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-xs font-bold rounded-xl">Cancel</button>
                    <button onClick={save} disabled={saving} className="px-5 py-2 bg-brand-orange text-white text-xs font-extrabold rounded-xl disabled:opacity-50">{saving ? 'Saving…' : 'Save supplier'}</button>
                </div>
            </div>
        </div>
    );
}

export default function SuppliersManager({ suppliers, branch, canDelete, refresh, onViewDeliveries }) {
    const [modal, setModal] = useState(null); // {supplier|null}
    const [showArchived, setShowArchived] = useState(false);
    const [q, setQ] = useState('');
    const list = suppliers.filter((s) => (showArchived ? s.isActive === false : s.isActive !== false) && (!q.trim() || s.name.toLowerCase().includes(q.trim().toLowerCase())));

    const setActive = async (s, isActive) => {
        try { await API.put(`/suppliers/${s._id}`, { isActive }); toast.success(isActive ? 'Supplier restored' : 'Supplier archived'); refresh(); }
        catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    };
    const remove = async (s) => {
        if (!window.confirm(`Delete "${s.name}"? This can't be undone.`)) return;
        try { await API.delete(`/suppliers/${s._id}`); toast.success('Supplier deleted'); refresh(); }
        catch (e) { toast.error(e.response?.data?.message || 'Failed to delete'); }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
                <input className="input flex-1 min-w-[200px]" placeholder="Search suppliers" value={q} onChange={(e) => setQ(e.target.value)} />
                <button onClick={() => setShowArchived((v) => !v)} className={`sk-chip ${showArchived ? 'on' : ''}`}>Archived</button>
                <button onClick={() => (branch ? setModal({ supplier: null }) : toast.error('Select a branch first'))} className="px-4 py-2 bg-brand-orange text-white text-sm font-extrabold rounded-xl flex items-center gap-2"><Plus size={15} />New supplier</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {list.length === 0 && <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-400 text-sm lg:col-span-2">No suppliers yet. Add one here, or tick "save to my supplier list" when receiving stock.</div>}
                {list.map((s) => (
                    <div key={s._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0"><p className="font-bold flex items-center gap-2"><Truck size={15} className="text-brand-orange" />{s.name}</p>
                                <p className="text-xs text-gray-500">{s.contactPerson || 'No contact person'} · {s.paymentTerms}</p></div>
                            <div className="text-right shrink-0"><p className="font-extrabold text-sm">KES {money(s.purchases?.total)}</p><p className="text-[11px] text-gray-400">{s.purchases?.count || 0} deliver{s.purchases?.count === 1 ? 'y' : 'ies'}</p></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 space-y-0.5">
                            {s.phone && <p className="flex items-center gap-1.5"><Phone size={11} />{s.phone}</p>}
                            {s.email && <p className="flex items-center gap-1.5"><Mail size={11} />{s.email}</p>}
                            {s.purchases?.last && <p>Last delivery: {new Date(s.purchases.last).toLocaleDateString()}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4">
                            <button onClick={() => onViewDeliveries(s)} className="px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl">Deliveries</button>
                            <button onClick={() => setModal({ supplier: s })} className="px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl flex items-center gap-1"><Pencil size={12} />Edit</button>
                            {s.isActive === false
                                ? <button onClick={() => setActive(s, true)} className="px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl flex items-center gap-1"><ArchiveRestore size={12} />Restore</button>
                                : <button onClick={() => setActive(s, false)} className="px-3 py-2 text-xs font-bold border border-gray-200 rounded-xl flex items-center gap-1"><Archive size={12} />Archive</button>}
                            {canDelete && <button onClick={() => remove(s)} className="px-3 py-2 text-xs font-bold border border-red-200 text-red-600 rounded-xl flex items-center gap-1"><Trash2 size={12} />Delete</button>}
                        </div>
                    </div>
                ))}
            </div>
            {modal && <SupplierModal supplier={modal.supplier} branch={branch} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await refresh(); }} />}
        </div>
    );
}
