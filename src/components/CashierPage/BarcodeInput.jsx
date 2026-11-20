import { Barcode } from 'lucide-react';

export default function BarcodeInput({ inputRef, value, onChange, onSubmit }) {
    return (
        <div className="relative">
            <Barcode size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-orange" />
            <input
                ref={inputRef}
                autoFocus
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
                placeholder="Scan barcode or type item…"
                className="w-full pl-11 pr-20 py-2.5 bg-white border-2 border-brand-orange/30 rounded-xl text-sm font-semibold focus:outline-none focus:border-brand-orange"
            />
            <button onClick={onSubmit} className="absolute right-1.5 top-1.5 bottom-1.5 bg-brand-orange hover:bg-brand-orange-hover text-white px-3 rounded-lg text-xs font-bold">
                Add
            </button>
        </div>
    );
}
