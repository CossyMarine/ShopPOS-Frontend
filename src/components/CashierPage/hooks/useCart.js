import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { estimateCartVat } from '../utils';
import { packPriceOf, packPromoPrice } from '../../../utils/packLine';

export const lineKeyOf = (productId, packId) => `${productId}:${packId || 'pc'}`;
const piecesOf = (i) => i.quantity * (i.packQty || 1);

export default function useCart({ products, isOnline, vatSettings }) {
    const [cart, setCart] = useState([]);

    // Live stock (in PIECES) for a product from the loaded catalog
    const stockOf = (productId) => products.find((p) => p._id === productId)?.currentStock;
    // Pieces of one product already in the cart, across its piece line AND its pack lines
    const piecesInCart = (productId) => cart.reduce((s, i) => (i.productId === productId ? s + piecesOf(i) : s), 0);

    // While online, the cart can never hold more pieces than are on the shelf.
    // Offline sales are not capped: they already happened and the server reconciles.
    const addToCart = (product, qty = 1, pack = null) => {
        const size = pack ? pack.qty : 1;
        const stock = product.currentStock ?? 0;
        const have = piecesInCart(product._id);
        if (isOnline && have + qty * size > stock) {
            toast.warning(
                stock < size
                    ? `Not enough ${product.name} for a ${pack ? pack.name : 'piece'} (${stock} pcs left)`
                    : `Only ${stock} pcs of ${product.name} in stock${have ? ` (${have} already in cart)` : ''}`
            );
            return;
        }

        const key = lineKeyOf(product._id, pack?._id);
        const unitPrice = pack ? packPromoPrice(product, pack) : (product.activePromotion?.effectivePrice ?? product.sellingPrice);
        const originalPrice = pack ? packPriceOf(product, pack) : product.sellingPrice;

        setCart((prev) => {
            const existing = prev.find((i) => i.lineKey === key);
            if (existing) {
                return prev.map((i) => (i.lineKey === key
                    ? { ...i, quantity: i.quantity + qty, lineTotal: i.unitPrice * (i.quantity + qty) }
                    : i));
            }
            return [...prev, {
                lineKey: key,
                productId: product._id,
                productName: product.name,
                displayName: pack ? `${product.name} · ${pack.name} of ${pack.qty}` : product.name,
                imageUrl: (pack?.imageUrl || product.imageUrl) || null,   // pack photo, else product photo
                packId: pack?._id || null,
                packName: pack?.name || null,
                packQty: pack?.qty || null,
                unitPrice,                       // per sellable unit (per pack for pack lines)
                originalPrice,
                promotionName: product.activePromotion?.name || null,
                quantity: qty,                   // packs for pack lines, pieces otherwise
                lineTotal: unitPrice * qty,
                vatClass: product.vatClass || 'standard',
            }];
        });
    };

    const updateQty = (lineKey, delta) => {
        const item = cart.find((i) => i.lineKey === lineKey);
        if (!item) return;
        const stock = stockOf(item.productId);
        const extra = delta * (item.packQty || 1);
        if (isOnline && delta > 0 && stock != null && piecesInCart(item.productId) + extra > stock) {
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
