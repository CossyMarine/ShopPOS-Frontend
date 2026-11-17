import { Pencil, Trash2, Package, Barcode, PackagePlus, AlertTriangle, Archive, ArchiveRestore } from 'lucide-react';
import { avgCostPerEach, money, earliestExpiry, isExpiringSoon, packsOf, breakdown, num, statusOf } from './productManagementUtils';
import { baseAbbr, stockOf } from '../../utils/receivingMath';

const STYLE = {
    'In stock': 'bg-green-50 text-green-700 border-green-200',
    Low: 'bg-amber-50 text-amber-700 border-amber-200',
    Out: 'bg-red-50 text-red-700 border-red-200',
    Archived: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function ProductTable({ products, canDelete, onReceiveStock, onReportLoss, onPrintLabel, onEdit, onArchive, onRestore, onDelete }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                            <th className="p-3.5">Product & Barcode</th>
                            <th className="p-3.5">Packs</th>
                            <th className="p-3.5">Avg cost</th>
                            <th className="p-3.5">Selling price / Profit</th>
                            <th className="p-3.5">Inventory</th>
                            <th className="p-3.5">Status</th>
                            <th className="p-3.5 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-medium">
                        {products.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-10 text-gray-400 font-bold">No products found</td></tr>
                        ) : products.map((item) => {
                            const abbr = baseAbbr(item), stock = stockOf(item), cost = avgCostPerEach(item);
                            const packs = packsOf(item), status = statusOf(item), expiry = earliestExpiry(item);
                            const profit = (item.sellingPrice || 0) - cost;
                            const archived = item.isActive === false;
                            return (
                                <tr key={item._id} className={`hover:bg-gray-50/80 transition ${archived ? 'opacity-60' : ''}`}>
                                    <td className="p-3.5">
                                        <p className="font-extrabold text-gray-900 leading-tight">{item.name}</p>
                                        <span className="text-[10px] font-mono font-bold text-gray-400 flex items-center gap-1"><Barcode size={10} /> {item.barcode || '—'}</span>
                                        <span className="text-[10px] text-gray-400">{item.category}{item.sku ? ` · ${item.sku}` : ''}{item.supplier?.name ? ` · ${item.supplier.name}` : ''}</span>
                                    </td>
                                    <td className="p-3.5">
                                        {packs.length ? (
                                            <div className="space-y-1">
                                                {packs.map((k) => (
                                                    <span key={k._id} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 w-fit">
                                                        <Package size={10} /> 1 {k.name} = {k.qty} {abbr}{k.price ? ` · ${money(k.price)}` : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold">Single unit</span>}
                                    </td>
                                    <td className="p-3.5">
                                        {cost > 0 ? (
                                            <div>
                                                <span className="font-bold text-gray-700">{money(cost)} / {abbr}</span>
                                                {packs.slice(0, 2).map((k) => <p key={k._id} className="text-[10px] text-gray-500">{money(cost * k.qty)} / {k.name}</p>)}
                                            </div>
                                        ) : <span className="text-[10px] text-gray-400 italic">No stock received yet</span>}
                                    </td>
                                    <td className="p-3.5">
                                        <p className="font-black text-brand-orange">{money(item.sellingPrice)} <span className="text-[10px] text-gray-400 font-normal">/ {abbr}</span></p>
                                        {cost > 0 && <p className={`text-[10px] font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{profit >= 0 ? '+' : ''}{money(profit)} profit/{abbr}</p>}
                                    </td>
                                    <td className="p-3.5">
                                        <p className="font-black text-gray-900">{num(stock)} {abbr}</p>
                                        {packs.length > 0 && stock > 0 && <span className="text-[10px] text-gray-500 font-semibold">{breakdown(item, stock)}</span>}
                                    </td>
                                    <td className="p-3.5 space-y-1">
                                        <span className={`block border px-2 py-0.5 rounded-md text-[10px] font-extrabold w-fit ${STYLE[status]}`}>{status}</span>
                                        {expiry && <span className={`block px-2 py-0.5 rounded text-[10px] font-extrabold w-fit ${isExpiringSoon(expiry) ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>Exp {new Date(expiry).toLocaleDateString()}</span>}
                                    </td>
                                    <td className="p-3.5">
                                        <div className="flex items-center justify-center gap-1">
                                            {!archived && <>
                                                <button onClick={() => onReceiveStock(item)} title="Receive stock" className="p-1.5 rounded-lg bg-gray-100 hover:bg-green-600 hover:text-white"><PackagePlus size={13} /></button>
                                                <button onClick={() => onReportLoss(item)} title="Report loss / damage / theft" className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-600 hover:text-white"><AlertTriangle size={13} /></button>
                                                <button onClick={() => onPrintLabel(item)} title="Print barcode label" className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-600 hover:text-white"><Barcode size={13} /></button>
                                            </>}
                                            <button onClick={() => onEdit(item)} title="Edit" className="p-1.5 rounded-lg bg-gray-100 hover:bg-orange-500 hover:text-white"><Pencil size={13} /></button>
                                            {archived
                                                ? <button onClick={() => onRestore(item)} title="Restore" className="p-1.5 rounded-lg bg-gray-100 hover:bg-green-600 hover:text-white"><ArchiveRestore size={13} /></button>
                                                : <button onClick={() => onArchive(item)} title="Archive (hide, keep history)" className="p-1.5 rounded-lg bg-gray-100 hover:bg-amber-500 hover:text-white"><Archive size={13} /></button>}
                                            {canDelete && <button onClick={() => onDelete(item)} title="Delete permanently" className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-600 hover:text-white"><Trash2 size={13} /></button>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
