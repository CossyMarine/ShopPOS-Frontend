import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', tone = 'default', loading = false, onConfirm, onClose }) {
    if (!open) return null;
    const danger = tone === 'danger';
    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${danger ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                    <AlertTriangle size={22} />
                </div>
                <h3 className="text-xl font-black text-gray-900">{title}</h3>
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{description}</p>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} disabled={loading} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">{cancelLabel}</button>
                    <button onClick={onConfirm} disabled={loading} className={`flex-1 py-3 rounded-xl text-sm font-extrabold text-white disabled:opacity-50 ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-brand-orange hover:bg-brand-orange-hover'}`}>{loading ? 'Working…' : confirmLabel}</button>
                </div>
            </div>
        </div>
    );
}
