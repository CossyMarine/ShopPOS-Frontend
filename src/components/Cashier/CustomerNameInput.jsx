// src/components/Cashier/CustomerNameInput.jsx
import { useState, useEffect, useRef } from 'react';
import { User } from 'lucide-react';
import API from '../../api/axios';

// Text input that suggests the cashier's previous credit customers first.
export default function CustomerNameInput({ value, onChange, onPick, className = '', placeholder = 'Full name' }) {
    const [open, setOpen] = useState(false);
    const [list, setList] = useState([]);
    const boxRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => {
            API.get('/credits/mine/customers', { params: { q: value.trim() || undefined, limit: 8 } })
                .then((r) => setList(r.data.customers || []))
                .catch(() => setList([]));
        }, 200);
        return () => clearTimeout(t);
    }, [value, open]);

    useEffect(() => {
        const close = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', close);
        document.addEventListener('touchstart', close);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('touchstart', close);
        };
    }, []);

    const pick = (c) => {
        onChange(c.name);
        onPick?.(c);
        setOpen(false);
    };

    return (
        <div ref={boxRef} className="relative">
            <input
                value={value}
                onChange={(e) => { onChange(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                placeholder={placeholder}
                autoComplete="off"
                className={className}
            />
            {open && list.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                        Your customers
                    </p>
                    {list.map((c) => (
                        <button
                            key={c.name}
                            type="button"
                            onClick={() => pick(c)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-orange-50 border-t border-gray-100"
                        >
                            <span className="flex items-center gap-2 min-w-0">
                                <User size={15} className="text-gray-400 shrink-0" />
                                <span className="text-sm font-bold text-gray-900 truncate">{c.name}</span>
                            </span>
                            {c.owing > 0 && (
                                <span className="text-[11px] font-bold text-rose-600 shrink-0">
                                    owes KES {c.owing.toLocaleString()}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
