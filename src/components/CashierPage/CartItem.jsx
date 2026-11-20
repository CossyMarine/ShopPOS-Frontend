import { Plus, Minus, X } from 'lucide-react';

export default function CartItem({ item, currency, onUpdateQty, onRemove }) {
    return (
        <div className="bg-white p-2.5 rounded-xl border border-gray-200 flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-2">
                <h4 className="text-xs font-bold text-gray-900 truncate">{item.productName}</h4>
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                    {item.unitPrice} {currency} × {item.quantity}
                    {item.promotionName && (
                        <span className="text-[9px] bg-red-50 text-red-500 font-bold px-1 rounded">{item.promotionName}</span>
                    )}
                </span>
            </div>
            <div className="flex items-center gap-1.5">
                <button onClick={() => onUpdateQty(item.productId, -1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><Minus size={12} /></button>
                <span className="text-xs font-extrabold w-5 text-center">{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.productId, 1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><Plus size={12} /></button>
                <span className="text-xs font-extrabold text-brand-orange w-14 text-right">{item.unitPrice * item.quantity}</span>
                <button onClick={() => onRemove(item.productId)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
            </div>
        </div>
    );
}
