// utils/offlineSync.js
import API from '../api/axios';
import { getQueuedSales, deleteQueuedSale, putQueuedSale, getQueuedSaleCount } from './offlineDb';

// Builds the local record for one offline sale — everything finalizeSale
// needs on the server, captured NOW while it's still accurate, since the
// device may not reconnect for hours.
export function buildOfflineSale({ cart, branch, customerId, customerName, shiftId, amountPaid }) {
    return {
        clientSaleId: crypto.randomUUID(),
        items: cart.map(({ productId, productName, imageUrl, quantity, unitPrice, lineTotal, vatClass, promotionName, originalPrice }) => ({
            productId, productName, imageUrl, quantity, unitPrice, lineTotal, vatClass,
            promotionName: promotionName || null,
            originalUnitPrice: originalPrice ?? unitPrice,
        })),
        branch,
        customer: customerId || null,
        customerName: customerName || null,
        soldAt: new Date().toISOString(),
        shiftId,
        cashPayment: { amountPaid: Number(amountPaid) },
        queuedAt: new Date().toISOString(),
    };
}

export async function queueOfflineSale(sale) {
    await putQueuedSale(sale);
    return sale;
}

export { getQueuedSaleCount };

// Sends every queued sale to the server in one request. Each one is
// resolved independently server-side, so a single bad line never blocks
// the rest of the backlog. Successes and duplicates (already-synced sales
// being resent because a previous sync got interrupted) are cleared from
// the local queue; failures stay queued for the next attempt.
export async function syncOfflineQueue() {
    const queued = await getQueuedSales();
    if (queued.length === 0) return { synced: 0, duplicate: 0, failed: 0, discrepancies: 0 };

    // Oldest first — sells in the order they actually happened, which
    // matters for FIFO stock deduction being applied in a sane sequence.
    const sales = [...queued].sort((a, b) => new Date(a.soldAt) - new Date(b.soldAt));

    const res = await API.post('/orders/sync-batch', { sales });
    const { results, summary } = res.data;

    await Promise.all(
        results
            .filter((r) => r.status === 'synced' || r.status === 'duplicate')
            .map((r) => deleteQueuedSale(r.clientSaleId))
    );

    const failures = results.filter((r) => r.status === 'failed');
    return { ...summary, failures };
}
