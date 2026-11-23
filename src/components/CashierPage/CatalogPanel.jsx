import BarcodeInput from './BarcodeInput';
import CategoryTabs from './CategoryTabs';
import ProductCard from './ProductCard';
import useBarcodeScan from './hooks/useBarcodeScan';
import useCategoryFilter from './hooks/useCategoryFilter';
import { lineKeyOf } from './hooks/useCart';

export default function CatalogPanel({ branch, products, cart, isOnline, currency, onAddToCart }) {
    const { barcode, setBarcode, barcodeRef, handleBarcodeSubmit } = useBarcodeScan({
        branch,
        products,
        addToCart: onAddToCart,
    });
    const { categories, category, setCategory, visibleProducts } = useCategoryFilter(products);

    // One tile for the piece, then one tile per pack (smallest pack first)
    const tiles = visibleProducts.flatMap((p) => [
        { key: p._id, p, pack: null },
        ...[...(p.packs || [])].sort((a, b) => a.qty - b.qty)
            .map((k) => ({ key: `${p._id}:${k._id}`, p, pack: k })),
    ]);

    return (
        <section className="w-3/5 flex flex-col border-r border-gray-200 bg-white overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-gray-50/50 space-y-2.5">
                <BarcodeInput
                    inputRef={barcodeRef}
                    value={barcode}
                    onChange={setBarcode}
                    onSubmit={handleBarcodeSubmit}
                />
                <CategoryTabs categories={categories} selected={category} onSelect={setCategory} />
            </div>

            <div className="flex-1 p-3 overflow-y-auto">
                <div className="grid grid-cols-3 xl:grid-cols-4 gap-2.5">
                    {tiles.map(({ key, p, pack }) => (
                        <ProductCard
                            key={key}
                            product={p}
                            pack={pack}
                            qtyInCart={cart.find((i) => i.lineKey === lineKeyOf(p._id, pack?._id))?.quantity || 0}
                            usedPieces={cart.reduce((s, i) => (i.productId === p._id ? s + i.quantity * (i.packQty || 1) : s), 0)}
                            isOnline={isOnline}
                            currency={currency}
                            onAdd={onAddToCart}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
