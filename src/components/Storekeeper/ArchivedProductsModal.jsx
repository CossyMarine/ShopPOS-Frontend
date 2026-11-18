import { useState } from 'react';
import { X, ArchiveRestore, Trash2, Search, Archive } from 'lucide-react';
import { num } from './productManagementUtils';
import { baseAbbr, stockOf } from '../../utils/receivingMath';

export default function ArchivedProductsModal({ items, canDelete, onRestore, onDelete, onClose }) {
    const [q, setQ] = useState('');
    const list = items.filter((p) => !q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()));
    return (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-2xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3"><span className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Archive size={18} /></span>
                        <div><h3 className="text-lg font-black">Archived products</h3><p className="text-xs text-gray-500">{items.length} archived</p></div></div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X size={18} /></button>
                </div>
                <div className="p-4 border-b border-gray-100 relative">
                    <Search size={14} className="absolute left-7 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="input !pl-9" placeholder="Search archived products" value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
                <div className="overflow-y-auto divide-y divide-gray-100">
                    {list.length === 0 && <p className="text-center text-gray-400 font-bold py-12">No archived products</p>}
                    {list.map((p) => (
                        <div key={p._id} className="flex items-center gap-3 p-4">
                            <div className="h-14 w-14 rounded-xl bg-gray-100 overflow-hidden shrink-0">{p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />}</div>
                            <div className="min-w-0 flex-1"><p className="font-extrabold text-gray-900 truncate">{p.name}</p><p className="text-xs text-gray-500">{p.category} · {num(stockOf(p))} {baseAbbr(p)}</p></div>
                            <button onClick={() => onRestore(p)} className="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-bold flex items-center gap-1"><ArchiveRestore size={13} />Restore</button>
                            {canDelete && <button onClick={() => onDelete(p)} className="px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white text-xs font-bold flex items-center gap-1"><Trash2 size={13} />Delete</button>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
