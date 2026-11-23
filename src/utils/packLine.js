// Shared pack helpers (cashier tiles, cart, receipts).

// Price of ONE pack: its own price, or pieces × piece price when left on auto.
export const packPriceOf = (p, k) => (k.price > 0 ? k.price : k.qty * p.sellingPrice);

// Same, after the product's active promotion (promotions apply per pack sold).
export const packPromoPrice = (p, k) => {
    const base = packPriceOf(p, k), promo = p.activePromotion;
    if (!promo) return base;
    const off = promo.type === 'percent_off' ? base * (promo.value / 100) : Math.min(promo.value, base);
    return Number(Math.max(0, base - off).toFixed(2));
};

// Receipt / history display for a saved order line.
export const lineLabel = (i) => (i.packId ? `${i.productName} (${i.packName} of ${i.packQty})` : i.productName);
export const lineQtyPrice = (i) => (i.packId && i.packCount
    ? { qty: i.packCount, price: Number((i.lineTotal / i.packCount).toFixed(2)) }
    : { qty: i.quantity, price: i.unitPrice });
