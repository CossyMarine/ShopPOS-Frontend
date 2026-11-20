import { Trash2 } from 'lucide-react';
import CartItem from './CartItem';
import CartSummary from './CartSummary';

export default function CartPanel({
    cart,
    currency,
    totalQty,
    vatEnabled,
    vatRate,
    vatAmount,
    netSubtotal,
    totalDue,
    checkingOut,
    onClear,
    onUpdateQty,
    onRemove,
    onCheckout,
}) {
    return (
        <section className="w-2/5 bg-gray-50 flex flex-col overflow-hidden">
            <div className="p-3.5 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
                <h2 className="font-extrabold text-sm text-gray-900">Current Checkout</h2>
                {cart.length > 0 && (
                    <button onClick={onClear} className="text-xs text-red-500 font-bold bg-red-50 px-2.5 py-1.5 rounded-lg">
                        <Trash2 size={13} className="inline mr-1" /> Clear
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {cart.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs py-10">Scan a barcode or tap a product</p>
                ) : (
                    <>
                        {cart.map((item) => (
                            <CartItem
                                key={item.productId}
                                item={item}
                                currency={currency}
                                onUpdateQty={onUpdateQty}
                                onRemove={onRemove}
                            />
                        ))}

                        {/* Total + Pay button sit right after the last product, not pinned to the screen bottom */}
                        <CartSummary
                            currency={currency}
                            totalQty={totalQty}
                            vatEnabled={vatEnabled}
                            vatRate={vatRate}
                            vatAmount={vatAmount}
                            netSubtotal={netSubtotal}
                            totalDue={totalDue}
                            checkingOut={checkingOut}
                            cartEmpty={cart.length === 0}
                            onCheckout={onCheckout}
                        />
                    </>
                )}
            </div>
        </section>
    );
}
