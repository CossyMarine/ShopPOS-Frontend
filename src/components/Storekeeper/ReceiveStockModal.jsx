import { Package, X } from 'lucide-react';
import Field from './Field';

export default function ReceiveStockModal({
    receivingFor,
    stockForm,
    setStockForm,
    onClose,
    onSubmit,
    receiving,
    stockPreview,
    hasCase,
}) {
    if (!receivingFor) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                    <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                        <Package size={18} className="text-orange-500" /> Receive Stock
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={18} />
                    </button>
                </div>
                <p className="text-xs text-gray-500 mb-4">{receivingFor.name}</p>

                <div className="space-y-3">
                    {hasCase && (
                        <div className="flex bg-gray-100 rounded-xl p-1 mb-1">
                            <button type="button" onClick={() => setStockForm({ ...stockForm, receivedAs: 'each' })}
                                className={`flex-1 text-xs font-bold py-2 rounded-lg transition ${stockForm.receivedAs === 'each' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
                                By Each
                            </button>
                            <button type="button" onClick={() => setStockForm({ ...stockForm, receivedAs: 'case' })}
                                className={`flex-1 text-xs font-bold py-2 rounded-lg transition ${stockForm.receivedAs === 'case' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
                                By {receivingFor.caseLabel || 'Carton'}
                            </button>
                        </div>
                    )}

                    <Field label={stockForm.receivedAs === 'case' ? `${receivingFor.caseLabel || 'Cartons'} Received` : 'Quantity Received'}>
                        <input type="number" value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })} className="input" />
                    </Field>
                    <Field label={stockForm.receivedAs === 'case' ? `Cost Per ${receivingFor.caseLabel || 'Carton'} (KES)` : 'Cost Per Unit (KES)'}>
                        <input type="number" value={stockForm.costPerUnit} onChange={(e) => setStockForm({ ...stockForm, costPerUnit: e.target.value })} className="input" />
                    </Field>

                    {stockPreview && (
                        <p className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                            = {stockPreview.pieces.toLocaleString()} pieces at KES {stockPreview.costEach.toFixed(2)}/piece
                        </p>
                    )}

                    <Field label="Expiry Date (optional)">
                        <input type="date" value={stockForm.expiryDate} onChange={(e) => setStockForm({ ...stockForm, expiryDate: e.target.value })} className="input" />
                    </Field>
                    <Field label="Supplier Note (optional)">
                        <input value={stockForm.supplierNote} onChange={(e) => setStockForm({ ...stockForm, supplierNote: e.target.value })} className="input" />
                    </Field>
                    <button onClick={onSubmit} disabled={receiving}
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                        {receiving ? 'Saving…' : 'Add to Stock'}
                    </button>
                </div>
            </div>
        </div>
    );
}
