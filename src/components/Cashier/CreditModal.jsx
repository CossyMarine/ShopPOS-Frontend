// src/components/Cashier/CreditModal.jsx
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { X, BookOpen, ChevronLeft, ChevronDown, ChevronUp, Search, User } from 'lucide-react';
import API from '../../api/axios';
import { formatKenyanDateTime } from '../../utils/formatDate';
import { lineLabel, lineQtyPrice } from '../../utils/packLine';
import CreditPayModal from './CreditPayModal';

const round2 = (n) => Number(Number(n).toFixed(2));

// The logged-in cashier's own credit: customers -> their bills -> pay.
export default function CreditModal({ open, onClose, initialName, onChanged }) {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState('');

    const [selected, setSelected] = useState(null);   // customer name
    const [records, setRecords] = useState([]);
    const [recLoading, setRecLoading] = useState(false);
    const [expanded, setExpanded] = useState(null);
    const [paying, setPaying] = useState(null);       // { single? }

    const loadCustomers = useCallback(() => {
        setLoading(true);
        return API.get('/credits/mine/customers', { params: { outstanding: 'true' } })
            .then((r) => setCustomers(r.data.customers || []))
            .catch(() => toast.error("Couldn't load credit customers"))
            .finally(() => setLoading(false));
    }, []);

    const loadRecords = useCallback((name) => {
        setRecLoading(true);
        return API.get('/credits/mine', { params: { name } })
            .then((r) => setRecords(r.data.credits || []))
            .catch(() => toast.error("Couldn't load this customer's bills"))
            .finally(() => setRecLoading(false));
    }, []);

    useEffect(() => {
        if (!open) return;
        setQ('');
        setExpanded(null);
        setPaying(null);
        loadCustomers();
        if (initialName) { setSelected(initialName); loadRecords(initialName); }
        else { setSelected(null); setRecords([]); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;

    const openCustomer = (name) => { setSelected(name); setExpanded(null); loadRecords(name); };

    const afterPay = async () => {
        setPaying(null);
        await loadCustomers();
        await loadRecords(selected);
        onChanged?.();
    };

    const bal = (r) => round2(r.amount - r.amountPaid);
    const totalOwing = round2(records.reduce((s, r) => s + bal(r), 0));
    const shown = customers.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-6">
            <div className="bg-white rounded-2xl w-full max-w-2xl h-[90vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">

                <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/60">
                    <div className="flex items-center gap-2 min-w-0">
                        {selected && (
                            <button onClick={() => { setSelected(null); setRecords([]); }} className="text-gray-500 p-1">
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <h3 className="font-black text-base text-gray-900 flex items-center gap-2 truncate">
                            <BookOpen size={19} className="text-rose-500 shrink-0" />
                            {selected ? selected : 'My Credit'}
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
                </div>

                {/* ---- Customer list ---- */}
                {!selected && (
                    <>
                        <div className="px-4 pt-3 shrink-0">
                            <div className="relative">
                                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Search customer…"
                                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-orange"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                            {loading && <p className="text-center text-gray-400 text-xs py-8">Loading…</p>}
                            {!loading && shown.length === 0 && (
                                <p className="text-center text-gray-400 text-xs font-semibold py-10">
                                    No customers owing on credit
                                </p>
                            )}
                            {shown.map((c) => (
                                <button
                                    key={c.name}
                                    onClick={() => openCustomer(c.name)}
                                    className="w-full border border-gray-200 rounded-xl p-3 flex items-center justify-between gap-3 text-left hover:bg-gray-50"
                                >
                                    <span className="flex items-center gap-2 min-w-0">
                                        <User size={16} className="text-gray-400 shrink-0" />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-black text-gray-900 truncate">{c.name}</span>
                                            <span className="block text-[11px] text-gray-500 font-medium">
                                                {c.billCount} bill(s){c.phone ? ` · ${c.phone}` : ''}
                                            </span>
                                        </span>
                                    </span>
                                    <span className="text-sm font-black text-rose-600 shrink-0">
                                        KES {c.owing.toLocaleString()}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* ---- One customer's bills ---- */}
                {selected && (
                    <>
                        <div className="px-4 pt-3 shrink-0">
                            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-bold text-rose-600">Total owing</p>
                                    <p className="text-lg font-black text-gray-900">KES {totalOwing.toLocaleString()}</p>
                                    <p className="text-[10px] text-gray-500 font-semibold">{records.length} receipt(s)</p>
                                </div>
                                <button
                                    onClick={() => setPaying({})}
                                    disabled={!records.length}
                                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-extrabold px-4 py-2.5 rounded-xl disabled:opacity-40"
                                >
                                    Pay all
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                            {recLoading && <p className="text-center text-gray-400 text-xs py-8">Loading…</p>}
                            {!recLoading && records.length === 0 && (
                                <p className="text-center text-green-600 text-xs font-bold py-10">All cleared 🎉</p>
                            )}
                            {records.map((r) => {
                                const items = r.receipt?.items || [];
                                const isOpen = expanded === r._id;
                                return (
                                    <div key={r._id} className="border border-gray-200 rounded-xl p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-gray-900">{r.billId}</p>
                                                <p className="text-[11px] text-gray-500 font-medium">
                                                    {formatKenyanDateTime(r.createdAt)}
                                                </p>
                                                <p className="text-[11px] font-semibold text-gray-600 mt-1">
                                                    Total KES {r.amount.toLocaleString()}
                                                    {r.amountPaid > 0 && ` · Paid ${r.amountPaid.toLocaleString()}`}
                                                </p>
                                                <p className="text-xs font-black text-rose-600">
                                                    Balance KES {bal(r).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => setPaying({ single: r })}
                                                    className="bg-green-600 hover:bg-green-700 text-white text-[11px] font-extrabold px-3 py-1.5 rounded-lg"
                                                >
                                                    Pay
                                                </button>
                                                <button
                                                    onClick={() => setExpanded(isOpen ? null : r._id)}
                                                    className="flex items-center justify-center gap-1 text-[11px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg"
                                                >
                                                    Items {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                </button>
                                            </div>
                                        </div>

                                        {isOpen && (
                                            <div className="mt-2.5 pt-2.5 border-t border-gray-100 space-y-1.5">
                                                {items.map((it, idx) => {
                                                    const l = lineQtyPrice(it);
                                                    return (
                                                        <div key={idx} className="flex justify-between text-xs">
                                                            <span className="font-semibold text-gray-700">
                                                                {lineLabel(it)} <span className="text-gray-400">× {l.qty}</span>
                                                            </span>
                                                            <span className="font-bold text-gray-900">KES {it.lineTotal.toLocaleString()}</span>
                                                        </div>
                                                    );
                                                })}
                                                {r.settlements?.length > 0 && (
                                                    <div className="pt-1.5 border-t border-dashed border-gray-200">
                                                        {r.settlements.map((s, i) => (
                                                            <p key={i} className="text-[11px] text-green-700 font-semibold">
                                                                Paid KES {s.amount.toLocaleString()} ({s.method.replace('_', ' ')}) · {formatKenyanDateTime(s.paidAt)}
                                                            </p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {paying && (
                <CreditPayModal
                    customerName={selected}
                    records={records}
                    single={paying.single}
                    onClose={() => setPaying(null)}
                    onDone={afterPay}
                />
            )}
        </div>
    );
      }
