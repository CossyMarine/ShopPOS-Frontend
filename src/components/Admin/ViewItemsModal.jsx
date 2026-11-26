import { X } from 'lucide-react';

export default function ViewItemsModal({ open, onClose, title, subtitle, items = [], total, payment }) {
    if (!open) return null;

    // On a credit bill that is still owing, cash/till figures are part-payments paid back so far
    const isCreditMethod = payment?.method === 'credit';
    const paidBackSoFar = Number(payment?.cashAmount || 0) + Number(payment?.tillAmount || 0);

    return (
        <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={onClose}
        >
            <div
                className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start border-b border-gray-200 pb-3 mb-4">
                    <div>
                        <h3 className="text-lg font-black text-gray-900">{title}</h3>
                        {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {items.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-6">No items to show</p>
                    ) : (
                        items.map((i, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
                                <span className="text-gray-700">
                                    {i.name} <span className="text-gray-400 font-semibold">× {i.qty}</span>
                                </span>
                                <span className="font-bold text-gray-900">KES {(i.qty * i.price).toLocaleString()}</span>
                            </div>
                        ))
                    )}
                </div>

                {total !== undefined && (
                    <div className="border-t border-gray-200 mt-4 pt-3 flex justify-between font-black text-gray-900">
                        <span>Total</span>
                        <span className="text-orange-600">KES {Number(total).toLocaleString()}</span>
                    </div>
                )}

                {payment && (
                    <div className="border-t border-gray-200 mt-4 pt-4 space-y-1.5 rounded-xl">
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1.5">
                            Payment Details
                        </p>

                        {payment.onCredit && (
                            <>
                                <PaymentRow
                                    label="Given on credit"
                                    value={`KES ${Number(payment.creditAmount || 0).toLocaleString()}`}
                                    rose
                                />
                                {payment.balance > 0 && (
                                    <PaymentRow
                                        label="Still owing"
                                        value={`KES ${Number(payment.balance).toLocaleString()}`}
                                        rose
                                    />
                                )}
                            </>
                        )}

                        {payment.method === 'cash' && (
                            <>
                                <PaymentRow label="Cash" value={`KES ${Number(payment.cashAmount || 0).toLocaleString()}`} />
                                {payment.changeGiven > 0 && (
                                    <PaymentRow label="Change" value={`KES ${Number(payment.changeGiven).toLocaleString()}`} accent />
                                )}
                            </>
                        )}

                        {payment.method === 'mpesa_till' && (
                            <PaymentRow label="Till" value={`KES ${Number(payment.tillAmount || 0).toLocaleString()}`} />
                        )}

                        {payment.method === 'both' && (
                            <>
                                <PaymentRow label="Cash" value={`KES ${Number(payment.cashAmount || 0).toLocaleString()}`} />
                                <PaymentRow label="Till" value={`KES ${Number(payment.tillAmount || 0).toLocaleString()}`} />
                            </>
                        )}

                        {isCreditMethod && paidBackSoFar > 0 && (
                            <>
                                {Number(payment.cashAmount) > 0 && (
                                    <PaymentRow label="Paid back in cash" value={`KES ${Number(payment.cashAmount).toLocaleString()}`} />
                                )}
                                {Number(payment.tillAmount) > 0 && (
                                    <PaymentRow label="Paid back by till" value={`KES ${Number(payment.tillAmount).toLocaleString()}`} />
                                )}
                            </>
                        )}

                        {payment.mpesaReceiptNumber && (
                            <PaymentRow label="M-Pesa Ref" value={payment.mpesaReceiptNumber} />
                        )}

                        {payment.paidAt && (
                            <PaymentRow
                                label={isCreditMethod ? 'Time Given' : 'Time Paid'}
                                value={new Date(payment.paidAt).toLocaleString()}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function PaymentRow({ label, value, accent, rose }) {
    return (
        <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">{label}</span>
            <span className={`font-bold ${accent ? 'text-emerald-600' : rose ? 'text-rose-600' : 'text-gray-900'}`}>{value}</span>
        </div>
    );
}
