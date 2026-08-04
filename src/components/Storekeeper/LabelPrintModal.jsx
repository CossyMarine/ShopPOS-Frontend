import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { X, Printer, Store, ChevronDown } from 'lucide-react';
import API from '../../api/axios';
import { useBranch } from '../../context/BranchContext';

// Physical size of the thermal label roll. Change this if your printer uses
// a different label size — it's the only "layout" constant in this file.
const LABEL_WIDTH_MM = 50;

// Picks the correct barcode symbology for the value instead of forcing
// everything through CODE128 — proper module/digit spacing per format.
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
  const { isAdmin, branches, selectedBranch } = useBranch();

  // Admin: pick which branch's name prints on the label (defaults to
  // whatever they currently have selected, or the first branch on record).
  const [adminBranchId, setAdminBranchId] = useState(selectedBranch || '');
  // Storekeeper/cashier/manager: resolved automatically from their own account.
  const [myBranchName, setMyBranchName] = useState('');
  const [loadingBranch, setLoadingBranch] = useState(true);
  const [copies, setCopies] = useState(1);

  useEffect(() => {
    if (isAdmin) {
      if (!adminBranchId && branches.length > 0) setAdminBranchId(branches[0]._id);
      setLoadingBranch(false);
      return;
    }
    API.get('/branches/mine')
      .then((res) => setMyBranchName(res.data?.name || ''))
      .catch(() => setMyBranchName(''))
      .finally(() => setLoadingBranch(false));
  }, [isAdmin, branches, adminBranchId]);

  const storeName = isAdmin
    ? branches.find((b) => b._id === adminBranchId)?.name || 'Select a branch'
    : myBranchName || 'Your Branch';

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
          {isAdmin && (
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Branch</label>
              <div className="relative">
                <Store size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-orange pointer-events-none" />
                <select
                  value={adminBranchId}
                  onChange={(e) => setAdminBranchId(e.target.value)}
                  className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 pl-8 pr-7 py-2.5 focus:outline-none focus:bg-white focus:border-brand-orange transition cursor-pointer"
                >
                  {branches.length === 0 && <option value="">No branches found</option>}
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {loadingBranch ? (
            <div className="w-64 mx-auto h-32 flex items-center justify-center text-xs text-gray-400">
              Loading label…
            </div>
          ) : (
            <LabelCard product={product} storeName={storeName} />
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
              disabled={!product.barcode || (isAdmin && !adminBranchId)}
              className="px-5 py-2 bg-brand-orange hover:bg-brand-orange-hover text-white text-xs font-extrabold rounded-xl transition shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <Printer size={14} />
              <span>Send to Thermal Printer</span>
            </button>
          </div>
        </div>
      </div>

      <div className="print-only">
        {product.barcode &&
          Array.from({ length: copyCount }).map((_, i) => (
            <div className="print-page" key={i}>
              <LabelCard product={product} storeName={storeName} />
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
