export default function CartSummary({
    currency,
    totalQty,
    vatEnabled,
    vatRate,
    vatAmount,
    netSubtotal,
    totalDue,
    checkingOut,
    cartEmpty,
    onCheckout,
}) {
    return (
        <div className="pt-1 space-y-2.5">
            <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-1.5">
                {vatEnabled && (
                    <>
                        <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                            <span>Subtotal</span>
                            <span>{netSubtotal.toLocaleString()} {currency}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                            <span>VAT ({vatRate}%)</span>
                            <span>{vatAmount.toLocaleString()} {currency}</span>
                        </div>
                        <div className="border-t border-dashed border-gray-200" />
                    </>
                )}
                <div className="flex justify-between items-center">
                    <span className="text-sm font-extrabold text-gray-900">Total ({totalQty} items)</span>
                    <span className="text-xl font-black text-brand-orange">{totalDue.toLocaleString()} {currency}</span>
                </div>
            </div>
            <button onClick={onCheckout} disabled={checkingOut || cartEmpty}
                className="w-full py-3 bg-brand-orange hover:bg-brand-orange-hover text-white rounded-xl text-sm font-extrabold disabled:opacity-50">
                {checkingOut ? 'Starting…' : 'Purchase / Checkout'}
            </button>
        </div>
    );
}
