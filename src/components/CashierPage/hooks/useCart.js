import { useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import { estimateCartVat } from '../utils';

export default function useCart({ products, isOnline, vatSettings }) {
    const [cart, setCart] = useState([]);

    // Live stock for a product from the loaded catalog (undefined if not found)
    const stockOf = (productId) => products.find((p) => p._id === productId)?.currentStock;

    // While online, the cart can never hold more than is on the shelf. Offline
    // sales are deliberately not capped: they already happened in the real
    // world and the server reconciles them when they sync.
    const addToCart = (product, qty = 1) => {
        const stock = product.currentStock ?? 0;
        const have = cart.find((i) => i.productId === product._id)?.quantity || 0;
        if (isOnline && have + qty > stock) {
            toast.warning(
                stock <= 0
                    ? `${product.name} is out of stock`
                    : `Only ${stock} ${product.name} in stock${have ? ` (${have} already in cart)` : ''}`
            );
            return;
        }

        // Price at the moment of adding, factoring in any active promotion —
        // this is a live preview, but the server recomputes it independently
        // at checkout regardless, so this is purely for the cashier's screen.
        const effectivePrice = product.activePromotion?.effectivePrice ?? product.sellingPrice;
        setCart((prev) => {
            const existing = prev.find((i) => i.productId === product._id);
            if (existing) {
                return prev.map((i) => (i.productId === product._id
                    ? { ...i, quantity: i.quantity + qty, lineTotal: i.unitPrice * (i.quantity + qty) }
                    : i));
            }
            return [...prev, {
                productId: product._id,
                productName: product.name,
                imageUrl: product.imageUrl || null,
                unitPrice: effectivePrice,
                originalPrice: product.sellingPrice,
                promotionName: product.activePromotion?.name || null,
                quantity: qty,
                lineTotal: effectivePrice * qty,
                vatClass: product.vatClass || 'standard',
            }];
        });
    };

    const updateQty = (productId, delta) => {
        const item = cart.find((i) => i.productId === productId);
        if (!item) return;
        const stock = stockOf(productId);
        if (isOnline && delta > 0 && stock != null && item.quantity + delta > stock) {
            toast.warning(`Only ${stock} ${item.productName} in stock`);
            return;
        }
        setCart((prev) => prev
            .map((i) => (i.productId === productId ? { ...i, quantity: i.quantity + delta, lineTotal: i.unitPrice * (i.quantity + delta) } : i))
            .filter((i) => i.quantity > 0));
    };

    const removeItem = (productId) => setCart((prev) => prev.filter((i) => i.productId !== productId));
    const clearCart = () => setCart([]);

    // ---- Totals ----
    const totalQty = cart.reduce((sum, i) => sum + i.quantity, 0);
    const { vatEnabled, vatAmount, netSubtotal, totalDue } = useMemo(
        () => estimateCartVat(cart, vatSettings),
        [cart, vatSettings]
    );

    return {
        cart, stockOf, addToCart, updateQty, removeItem, clearCart,
        totalQty, vatEnabled, vatAmount, netSubtotal, totalDue,
    };
                                                                    }
