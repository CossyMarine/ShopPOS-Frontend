// utils/offlineDb.js
// Thin promise-based wrapper around IndexedDB — no dependency needed, the
// browser API is just verbose to use directly. Two stores:
//   - "saleQueue"     queued offline sales, waiting to sync. Keyed by
//                     clientSaleId so re-queuing the same sale is impossible.
//   - "productCache"  last-known product catalog, so the cashier can still
//                     see prices/stock and build a cart with zero connection.
const DB_NAME = 'shoppos-offline';
const DB_VERSION = 1;

function openDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('saleQueue')) {
                db.createObjectStore('saleQueue', { keyPath: 'clientSaleId' });
            }
            if (!db.objectStoreNames.contains('productCache')) {
                db.createObjectStore('productCache', { keyPath: '_id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function getStore(storeName, mode) {
    const db = await openDb();
    return db.transaction(storeName, mode).objectStore(storeName);
}

function reqToPromise(req) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

// ---- Sale queue ----
export const putQueuedSale = async (sale) => {
    const store = await getStore('saleQueue', 'readwrite');
    return reqToPromise(store.put(sale));
};

export const getQueuedSales = async () => {
    const store = await getStore('saleQueue', 'readonly');
    return reqToPromise(store.getAll());
};

export const deleteQueuedSale = async (clientSaleId) => {
    const store = await getStore('saleQueue', 'readwrite');
    return reqToPromise(store.delete(clientSaleId));
};

export const getQueuedSaleCount = async () => (await getQueuedSales()).length;

// ---- Product cache — overwritten wholesale on every successful online fetch ----
export const cacheProducts = async (products) => {
    const store = await getStore('productCache', 'readwrite');
    await Promise.all(products.map((p) => reqToPromise(store.put(p))));
};

export const getCachedProducts = async () => {
    const store = await getStore('productCache', 'readonly');
    return reqToPromise(store.getAll());
};
