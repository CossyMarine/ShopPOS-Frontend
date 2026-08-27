// Weighted-average buying price per "each" unit, derived from remaining batches.
export function avgCostPerEach(product) {
    const batches = product.batches || [];
    const totalQty = batches.reduce((s, b) => s + b.quantity, 0);
    if (!totalQty) return 0;
    const totalCost = batches.reduce((s, b) => s + b.quantity * b.costPerUnit, 0);
    return totalCost / totalQty;
}

export const money = (n) => (Number(n) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export const earliestExpiry = (product) => {
    const dated = (product.batches || []).filter((b) => b.expiryDate);
    if (!dated.length) return null;
    return dated.reduce((min, b) => (new Date(b.expiryDate) < new Date(min) ? b.expiryDate : min), dated[0].expiryDate);
};

export const isExpiringSoon = (date) => date && (new Date(date) - Date.now()) < 3 * 24 * 60 * 60 * 1000;

export const EMPTY_FORM = {
    name: '', barcode: '', category: 'General', unit: '',
    sellingPrice: '', reorderLevel: '',
    isBulk: false, packSize: '10', caseLabel: 'Carton', caseBarcode: '', casePrice: '',
    imageUrl: '', imagePublicId: '',
    openingQty: '', openingCost: '', openingReceivedAs: 'each',openingExpiryDate: '',
    vatClass: 'standard',
};
export const EMPTY_STOCK = { quantity: '', costPerUnit: '', expiryDate: '', supplierNote: '', receivedAs: 'each' };
export const EMPTY_UNIT = { name: '', abbreviation: '' };
