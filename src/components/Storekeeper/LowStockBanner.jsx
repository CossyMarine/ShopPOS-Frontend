import { TriangleAlert, X } from 'lucide-react';

export default function LowStockBanner({ items, onDismiss }) {
    return (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <TriangleAlert size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-amber-800">
                    {items.length} item{items.length !== 1 ? 's' : ''} need{items.length === 1 ? 's' : ''} restocking
                </p>
                <p className="text-xs text-amber-700 font-medium truncate">
                    {items.map((p) => p.name).join(', ')}
                </p>
            </div>
            <button onClick={onDismiss} className="text-amber-500 hover:text-amber-700 shrink-0">
                <X size={16} />
            </button>
        </div>
    );
}
