import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer } from 'lucide-react';
import API from '../../api/axios';

// Physical size of the thermal label roll. Change this if your printer uses
// a different label size — it's the only "layout" constant in this file.
const LABEL_WIDTH_MM = 50;

// Picks the correct barcode symbology for the value instead of forcing
// everything through CODE128. This is what makes the printed barcode look
// like a real retail barcode (EAN-13 for 13-digit codes, UPC for 12, etc.)
// with properly spaced digits, instead of a generic squeezed-looking one.
function detectBarcodeFormat(value) {
  if (/^\d{13}$/.test(value)) return 'EAN13';
  if (/^\d{12}$/.test(value)) return 'UPC';
  if (/^\d{8}$/.test(value)) return 'EAN8';
  return 'CODE128';
}

function BarcodeSvg({ value, className }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!value || !ref.current) return;
    const format = detectBarcodeFormat(value);
    // Wider bars for short numeric codes so the digits underneath have room
    // to breathe; narrower for long/alphanumeric codes so they still fit.
    const moduleWidth = value.length > 13 ? 1.6 : 2.4;

    const opts = {
      format,
      width: moduleWidth,
      height: 60,
      displayValue: true,
      font: 'monospace',
      fontSize: 16,
      textMargin: 6,
      margin: 10,
      background: 'transparent',
    };

    try {
      JsBarcode(ref.current, value, opts);
    } catch {
      // Falls back to CODE128 if the value isn't valid for the detected
      // format (e.g. a 13-digit code that fails the EAN-13 checksum)
      JsBarcode(ref.current, value, { ...opts, format: 'CODE128' });
    }
  }, [value]);

  return <svg ref={ref} className={className} style={{ maxWidth: '100%', height: 'auto' }} />;
}

function LabelCard({ product, storeName }) {
  return (
    <div className="label-card bg-white border-2 border-dashed border-gray-300 p-4 rounded-xl text-center flex flex-col items-center justify-center mx-auto w-64 shadow-inner">
      <p className="text-[10px] font-black uppercase text-gray-800 tracking-wider">{storeName}</p>
      <p className="text-xs font-extrabold text-gray-900 mt-0.5 truncate max-w-full">{product.name}</p>
      {product.barcode ? (
        <BarcodeSvg value={product.barcode} className="my-1.5" />
      ) : (
        <p className="text-[10px] text-gray-400 my-2">No barcode set for this product</p>
      )}
      <div className="flex justify-between w-full text-[11px] font-black border-t border-gray-200 pt-1 mt-1">
        <span className="text-gray-500">PRICE:</span>
        <span className="text-brand-orange">
          {product.sellingPrice != null ? `${product.sellingPrice.toLocaleString()} KES` : '—'}
        </span>
      </div>
    </div>
  );
}

export default function LabelPrintModal({ product, onClose }) {
  const [storeName, setStoreName] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [copies, setCopies] = useState(1);

  useEffect(() => {
    API.get('/settings')
      .then((res) => setStoreName(res.data.storeName || ''))
      .catch(() => setStoreName(''))
      .finally(() => setLoadingSettings(false));
  }, []);

  const copyCount = Math.min(Math.max(parseInt(copies, 10) || 1, 1), 100);
  const handlePrint = () => product.barcode && window.print();

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="no-print bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200">
        <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
          <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
            <Printer size={16} className="text-brand-orange" /> Print Barcode Label
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {loadingSettings ? (
            <div className="w-64 mx-auto h-32 flex items-center justify-center text-xs text-gray-400">
              Loading label…
            </div>
          ) : (
            <LabelCard product={product} storeName={storeName || 'Your Store'} />
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
              Number of Labels to Print
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-2 border-t border-gray-100">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl">
              Cancel
            </button>
            <button
              onClick={handlePrint}
              disabled={!product.barcode}
              className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-extrabold rounded-xl transition shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Printer size={14} />
              <span>Send to Thermal Printer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print-only area — repeats the label "copies" times so the printer
          feeds one label per copy instead of only ever printing one */}
      <div className="print-only">
        {product.barcode &&
          Array.from({ length: copyCount }).map((_, i) => (
            <div className="print-page" key={i}>
              <LabelCard product={product} storeName={storeName || 'Your Store'} />
            </div>
          ))}
      </div>

      <style>{`
        .print-only { display: none; }
        @media print {
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .print-only, .print-only * { visibility: visible; }
          .print-only { display: block; position: fixed; top: 0; left: 0; width: 100%; }
          .print-page {
            width: ${LABEL_WIDTH_MM}mm;
            page-break-after: always;
            display: flex;
            justify-content: center;
            padding: 2mm 0;
          }
          .print-page .label-card { width: 100%; border: none; box-shadow: none; border-radius: 0; }
          @page { size: ${LABEL_WIDTH_MM}mm auto; margin: 0; }
        }
      `}</style>
    </div>
  );
}
