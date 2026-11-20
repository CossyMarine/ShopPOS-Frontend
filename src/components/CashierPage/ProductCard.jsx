export default function ProductCard({ product: p, qtyInCart, isOnline, currency, onAdd }) {
    const stock = p.currentStock ?? 0;
    // Online: what's left after what's already in the cart.
    // Offline: cached stock only (offline sales aren't capped).
    const left = isOnline ? stock - qtyInCart : stock;
    const blocked = stock <= 0 || left <= 0;
    const promo = p.activePromotion;

    return (
        <button onClick={() => onAdd(p)} disabled={blocked}
            className="relative text-left p-2.5 bg-white rounded-xl border border-gray-200 hover:border-brand-orange hover:shadow-md transition flex flex-col disabled:opacity-40">
            {qtyInCart > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-brand-orange text-white text-[11px] font-black flex items-center justify-center shadow-md ring-2 ring-white z-10">
                    {qtyInCart}
                </span>
            )}
            {promo && (
                <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10">
                    {promo.type === 'percent_off' ? `-${promo.value}%` : `-${promo.value} ${currency}`}
                </span>
            )}
            <div className="w-full h-28 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden mb-1.5">
                {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-[10px] font-black text-gray-400 text-center px-1 leading-tight">{p.name}</span>
                )}
            </div>
            <h4 className="text-xs font-bold text-gray-800 line-clamp-2">{p.name}</h4>
            <div className="mt-1.5 flex justify-between items-center">
                {promo ? (
                    <span className="flex items-baseline gap-1">
                        <span className="text-xs font-extrabold text-red-500">{promo.effectivePrice} {currency}</span>
                        <span className="text-[9px] text-gray-400 line-through">{p.sellingPrice}</span>
                    </span>
                ) : (
                    <span className="text-xs font-extrabold text-brand-orange">{p.sellingPrice} {currency}</span>
                )}
                <span className={`text-[9px] font-bold px-1 rounded ${left > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {stock <= 0 ? 'Out' : left <= 0 ? 'Max' : left}
                </span>
            </div>
        </button>
    );
}
