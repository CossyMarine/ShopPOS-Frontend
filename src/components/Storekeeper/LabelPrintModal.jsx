import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer } from 'lucide-react';

export default function LabelPrintModal({ product, onClose }) {
    const svgRef = useRef();

    useEffect(() => {
        if (product.barcode && svgRef.current) {
            JsBarcode(svgRef.current, product.barcode, {
                format: 'CODE128',
                width: 2,
                height: 50,
                displayValue: true,
                fontSize: 12,
                margin: 6,
            });
        }
    }, [product]);

    const handlePrint = () => window.print();

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xs w-full p-6 shadow-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-black text-gray-800">Print Label</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                <div id="label-print-area" className="border border-dashed border-gray-300 rounded-lg p-3 text-center">
                    <p className="text-xs font-bold text-gray-800 truncate">{product.name}</p>
                    <p className="text-xs text-orange-500 font-black mb-2">KES {product.sellingPrice?.toLocaleString()}</p>
                    {product.barcode ? (
                        <svg ref={svgRef}></svg>
                    ) : (
                        <p className="text-[10px] text-gray-400">No barcode set for this product</p>
                    )}
                </div>

                <button onClick={handlePrint} disabled={!product.barcode}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                    <Printer size={16} /> Print Label
                </button>
            </div>

            {/* Print-only styling — hides everything except the label when printing */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #label-print-area, #label-print-area * { visibility: visible; }
                    #label-print-area { position: fixed; top: 0; left: 0; width: 58mm; }
                }
            `}</style>
        </div>
    );
}
