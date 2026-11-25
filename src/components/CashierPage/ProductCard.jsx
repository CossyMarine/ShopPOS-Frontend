import { packPriceOf, packPromoPrice, portionPromoPrice } from '../../utils/packLine';

export default function ProductCard({ product: p, pack = null, portion = null, qtyInCart, usedPieces, isOnline, currency, onAdd }) {
    const unit = pack || portion;                       // the pack OR portion this tile sells (null = base unit)
    const size = unit ? unit.qty : 1;
    const abbr = p.unit?.abbreviation || 'pcs';
    const stockPieces = p.currentStock ?? 0;
    // Online: what's left after what's already in the cart. Offline: cached stock only.
    const leftPieces = isOnline ? stockPieces - usedPieces : stockPieces;
    // Sellable units (packs, portions or base units). The toFixed avoids float noise: 0.3 ÷ 0.1 must be 3, not 2.
    const count = (x) => Math.floor(Number((x / size).toFixed(6)));
    const stock = count(stockPieces);
    const left = count(leftPieces);
    const blocked = stock <= 0 || left <= 0;
    const promo = p.activePromotion;

    const price = pack
        ? packPromoPrice(p, pack)
        : portion
            ? portionPromoPrice(p, portion)
            : (promo?.effectivePrice ?? p.sellingPrice);
    const original = pack ? packPriceOf(p, pack) : portion ? portion.price : p.sellingPrice;
    const image = (pack?.imageUrl || p.imageUrl) || null;      // pack photo, else product photo
    const badge = stock <= 0
        ? (unit && stockPieces > 0 ? `Need ${size} ${abbr}` : 'Out')
        : left <= 0 ? 'Max' : left;

    return (
        <button onClick={() => onAdd(p, 1, pack, portion)} disabled={blocked}
            className="relative text-left p-2.5 bg-white rounded-xl border border-gray-200 hover:border-brand-orange hover:shadow-md transition flex flex-col disabled:opacity-40">
            {qtyInCart > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-brand-orange text-white text-[11px] font-black flex items-center justify-center shadow-md ring-2 ring-white z-10">
                    {qtyInCart}
                </span>
            )}
            {pack && (
                <span className="absolute top-3.5 left-3.5 bg-gray-900 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full z-10">
                    {pack.name} × {pack.qty}
                </span>
            )}
            {portion && (
                <span className="absolute top-3.5 left-3.5 bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full z-10">
                    {portion.name}
                </span>
            )}
            {promo && (
                <span className="absolute top-3.5 right-3.5 bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full z-10">
                    {promo.type === 'percent_off' ? `-${promo.value}%` : `-${promo.value} ${currency}`}
                </span>
            )}
            <div className="w-full h-28 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden mb-1.5">
                {image ? (
                    <img src={image} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-[10px] font-black text-gray-400 text-center px-1 leading-tight">{p.name}</span>
                )}
            </div>
            <h4 className="text-xs font-bold text-gray-800 line-clamp-2">
                {pack ? `${p.name} · ${pack.name} of ${pack.qty}` : portion ? `${p.name} · ${portion.name}` : p.name}
            </h4>
            <div className="mt-1.5 flex justify-between items-center">
                {price !== original ? (
                    <span className="flex items-baseline gap-1">
                        <span className="text-xs font-extrabold text-red-500">{price} {currency}</span>
                        <span className="text-[9px] text-gray-400 line-through">{original}</span>
                    </span>
                ) : (
                    <span className="text-xs font-extrabold text-brand-orange">{price} {currency}</span>
                )}
                <span className={`text-[9px] font-bold px-1 rounded ${left > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {badge}
                </span>
            </div>
        </button>
    );
}
