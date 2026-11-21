import { PackageX } from 'lucide-react';
import { money } from './utils';

export default function DeadStock({ dead, days, setDays }) {
    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <PackageX size={16} className="text-red-500" />
                    <h2 className="text-sm font-extrabold text-gray-900">Dead Stock</h2>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 font-semibold">No sales in</span>
                    <select
                        value={days} onChange={(e) => setDays(Number(e.target.value))}
                        className="text-[11px] font-bold border border-gray-200 rounded-lg px-2 py-1 bg-gray-50"
                    >
                        {[14, 30, 60, 90].map((n) => <option key={n} value={n}>{n} days</option>)}
                    </select>
                </div>
            </div>
            {dead.items.length === 0 ? (
                <p className="text-xs text-gray-400">Nothing has been sitting idle past this threshold. Good sign.</p>
            ) : (
                <>
                    <p className="text-xs text-gray-500 mb-3">
                        <span className="font-black text-red-500">{money(dead.totalValueTiedUp)}</span> tied up across {dead.items.length} product{dead.items.length !== 1 ? 's' : ''}
                    </p>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {dead.items.map((it) => (
                            <div key={it.productId} className="flex items-center justify-between p-2.5 bg-red-50/50 rounded-lg border border-red-100">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-800 truncate">{it.productName}</p>
                                    <p className="text-[11px] text-gray-500">
                                        {it.category}{it.branchName ? ` · ${it.branchName}` : ''} · {it.currentStock} in stock
                                    </p>
                                </div>
                                <div className="text-right shrink-0 pl-2">
                                    <p className="text-xs font-bold text-red-500">{money(it.stockValue)}</p>
                                    <p className="text-[10px] text-gray-400">
                                        {it.daysSinceLastSale === null ? 'Never sold' : `${it.daysSinceLastSale}d since last sale`}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
