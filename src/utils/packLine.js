// Shared pack + portion helpers (cashier tiles, cart, receipts).

// Price of ONE pack: its own price, or pieces × piece price when left on auto.
export const packPriceOf = (p, k) => (k.price > 0 ? k.price : k.qty * p.sellingPrice);

// Same, after the product's active promotion (promotions apply per pack sold).
export const packPromoPrice = (p, k) => {
    const base = packPriceOf(p, k), promo = p.activePromotion;
    if (!promo) return base;
    const off = promo.type === 'percent_off' ? base * (promo.value / 100) : Math.min(promo.value, base);
    return Number(Math.max(0, base - off).toFixed(2));
};

// Base units inside ONE sold unit (pack or portion). Plain pieces = 1.
export const unitQtyOf = (i) => i.packQty || i.portionQty || 1;
// Base units a cart line uses in total (rounded to dodge 0.1+0.2 float noise).
export const baseQtyOf = (i) => Number((i.quantity * unitQtyOf(i)).toFixed(3));

// Price of ONE portion after the product's active promotion (promotions apply per portion sold).
export const portionPromoPrice = (p, k) => {
    const promo = p.activePromotion;
    if (!promo) return k.price;
    const off = promo.type === 'percent_off' ? k.price * (promo.value / 100) : Math.min(promo.value, k.price);
    return Number(Math.max(0, k.price - off).toFixed(2));
};

// ONE place that turns a cart line into the item the server expects.
// Used by live checkout AND the offline queue.
export const toSaleItem = (c) => {
    const base = { productId: c.productId, productName: c.productName, imageUrl: c.imageUrl, vatClass: c.vatClass };
    if (c.packId) return { ...base, packId: c.packId, packName: c.packName, packQty: c.packQty, packCount: c.quantity,
        quantity: c.quantity * c.packQty, unitPrice: c.unitPrice / c.packQty, lineTotal: c.unitPrice * c.quantity };
    if (c.portionId) return { ...base, portionId: c.portionId, portionName: c.portionName, portionQty: c.portionQty, portionCount: c.quantity,
        quantity: Number((c.quantity * c.portionQty).toFixed(3)), unitPrice: c.unitPrice / c.portionQty, lineTotal: c.unitPrice * c.quantity };
    return { ...base, quantity: c.quantity, unitPrice: c.unitPrice, lineTotal: c.unitPrice * c.quantity };
};

// Receipt / history display for a saved order line.
export const lineLabel = (i) =>
    i.packId ? `${i.productName} (${i.packName} of ${i.packQty})`
    : i.portionId ? `${i.productName} (${i.portionName})`
    : i.productName;

export const lineQtyPrice = (i) => {
    if (i.packId && i.packCount) return { qty: i.packCount, price: Number((i.lineTotal / i.packCount).toFixed(2)) };
    if (i.portionId && i.portionCount) return { qty: i.portionCount, price: Number((i.lineTotal / i.portionCount).toFixed(2)) };
    return { qty: i.quantity, price: i.unitPrice };
};
