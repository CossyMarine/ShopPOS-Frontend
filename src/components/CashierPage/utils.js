export function initialsOf(name = '') {
    return name.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
}

// Mirrors backend utils/vat.js buildOrderVat — used here only to show the
// cashier a live estimate before checkout. The server recomputes the real
// figures independently, so this never needs to be perfectly authoritative.
//
// Every line is calculated from unitPrice x quantity rather than a stored
// lineTotal, so the total can never drift out of sync with the quantities.
export function estimateCartVat(cart, vatSettings) {
    const rungUpTotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    if (!vatSettings?.enabled) {
        return { vatEnabled: false, vatAmount: 0, netSubtotal: rungUpTotal, totalDue: rungUpTotal };
    }

    const { rate, priceMode } = vatSettings;
    let vatAmount = 0;
    let netSubtotal = 0;

    for (const item of cart) {
        const lineTotal = item.unitPrice * item.quantity;
        if (item.vatClass === 'zero' || item.vatClass === 'exempt') {
            netSubtotal += lineTotal;
            continue;
        }
        if (priceMode === 'inclusive') {
            const net = lineTotal / (1 + rate / 100);
            vatAmount += lineTotal - net;
            netSubtotal += net;
        } else {
            vatAmount += lineTotal * (rate / 100);
            netSubtotal += lineTotal;
        }
    }

    vatAmount = Number(vatAmount.toFixed(2));
    netSubtotal = Number(netSubtotal.toFixed(2));
    const totalDue = priceMode === 'inclusive' ? rungUpTotal : Number((netSubtotal + vatAmount).toFixed(2));

    return { vatEnabled: true, vatAmount, netSubtotal, totalDue };
}
