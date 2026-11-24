import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { estimateCartVat } from '../utils';
import { packPriceOf, packPromoPrice, portionPromoPrice, baseQtyOf, unitQtyOf } from '../../../utils/packLine';

// The second argument is the pack OR portion id ('pc' = a plain piece/base unit).
export const lineKeyOf = (productId, unitId) => `${productId}:${unitId || 'pc'}`;

export default function useCart({ products, isOnline, vatSettings }) {
    const [cart, setCart] = useState([]);

    // Live stock (in BASE units) for a product from the loaded catalog
    const stockOf = (productId) => products.find((p) => p._id === productId)?.currentStock;
    // Base units of one product already in the cart, across its piece line, pack lines AND portion lines
    const piecesInCart = (productId) => Number(cart.reduce((s, i) => (i.productId === productId ? s + baseQtyOf(i) : s), 0).toFixed(3));

    // While online, the cart can never hold more base units than are on the shelf.
    // Offline sales are not capped: they already happened and the server reconciles.
    const addToCart = (product, qty = 1, pack = null, portion = null) => {
        const unit = pack || portion;
        const size = unit ? unit.qty : 1;
        const abbr = product.unit?.abbreviation || 'pcs';
        const stock = product.currentStock ?? 0;
        const have = piecesInCart(product._id);
        if (isOnline && Number((have + qty * size).toFixed(3)) > stock) {
            toast.warning(stock < size
                ? `Not enough ${product.name} for ${unit ? unit.name : 'one'} (${stock} ${abbr} left)`
                : `Only ${stock} ${abbr} of ${product.name} in stock${have ? ` (${have} already in cart)` : ''}`);
            return;
        }

        const key = lineKeyOf(product._id, unit?._id);
        const unitPrice = pack ? packPromoPrice(product, pack)
            : portion ? portionPromoPrice(product, portion)
            : (product.activePromotion?.effectivePrice ?? product.sellingPrice);
        const originalPrice = pack ? packPriceOf(product, pack) : portion ? portion.price : product.sellingPrice;

        setCart((prev) => {
            const existing = prev.find((i) => i.lineKey === key);
            if (existing) {
                return prev.map((i) => (i.lineKey === key
                    ? { ...i, quantity: i.quantity + qty, lineTotal: i.unitPrice * (i.quantity + qty) } : i));
            }
            return [...prev, {
                lineKey: key,
                productId: product._id,
                productName: product.name,
                displayName: pack ? `${product.name} · ${pack.name} of ${pack.qty}`
                    : portion ? `${product.name} · ${portion.name}` : product.name,
                imageUrl: (pack?.imageUrl || product.imageUrl) || null,   // pack photo, else product photo
                packId: pack?._id || null, packName: pack?.name || null, packQty: pack?.qty || null,
                portionId: portion?._id || null, portionName: portion?.name || null, portionQty: portion?.qty || null,
                unitPrice, originalPrice,        // per sellable unit (per pack / per portion for those lines)
                promotionName: product.activePromotion?.name || null,
                quantity: qty,                   // packs for pack lines, portions for portion lines, base units otherwise
                lineTotal: unitPrice * qty,
                vatClass: product.vatClass || 'standard',
            }];
        });
    };

    const updateQty = (lineKey, delta) => {
        const item = cart.find((i) => i.lineKey === lineKey);
        if (!item) return;
        const stock = stockOf(item.productId);
        const extra = delta * unitQtyOf(item);
        if (isOnline && delta > 0 && stock != null && Number((piecesInCart(item.productId) + extra).toFixed(3)) > stock) {
            toast.warning(`Only ${stock} pcs of ${item.productName} in stock`);
            return;
        }
        setCart((prev) => prev
            .map((i) => (i.lineKey === lineKey ? { ...i, quantity: i.quantity + delta, lineTotal: i.unitPrice * (i.quantity + delta) } : i))
            .filter((i) => i.quantity > 0));
    };

    const removeItem = (lineKey) => setCart((prev) => prev.filter((i) => i.lineKey !== lineKey));
    const clearCart = () => setCart([]);

    // ---- Totals ----
    const totalQty = cart.reduce((sum, i) => sum + i.quantity, 0);
    const { vatEnabled, vatAmount, netSubtotal, totalDue } = useMemo(
        () => estimateCartVat(cart, vatSettings),
        [cart, vatSettings]
    );

    return {
        cart, stockOf, piecesInCart, addToCart, updateQty, removeItem, clearCart,
        totalQty, vatEnabled, vatAmount, netSubtotal, totalDue,
    };
}
