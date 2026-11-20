import BarcodeInput from './BarcodeInput';
import CategoryTabs from './CategoryTabs';
import ProductCard from './ProductCard';
import useBarcodeScan from './hooks/useBarcodeScan';
import useCategoryFilter from './hooks/useCategoryFilter';

export default function CatalogPanel({ branch, products, cart, isOnline, currency, onAddToCart }) {
    const { barcode, setBarcode, barcodeRef, handleBarcodeSubmit } = useBarcodeScan({
        branch,
        products,
        addToCart: onAddToCart,
    });
    const { categories, category, setCategory, visibleProducts } = useCategoryFilter(products);

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
                    {visibleProducts.map((p) => (
                        <ProductCard
                            key={p._id}
                            product={p}
                            qtyInCart={cart.find((i) => i.productId === p._id)?.quantity || 0}
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
