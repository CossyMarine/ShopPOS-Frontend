import { Pencil, Trash2, Package, Barcode, PackagePlus } from 'lucide-react';
import { avgCostPerEach, money, earliestExpiry, isExpiringSoon } from './productManagementUtils';

export default function ProductTable({ products, onReceiveStock, onPrintLabel, onEdit, onDelete }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                            <th className="p-3.5">Product & Barcode</th>
                            <th className="p-3.5">Packaging</th>
                            <th className="p-3.5">Cost Structure</th>
                            <th className="p-3.5">Selling Price / Profit</th>
                            <th className="p-3.5">Current Inventory</th>
                            <th className="p-3.5">Status</th>
                            <th className="p-3.5 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-medium">
                        {products.length === 0 ? (
                            <tr><td colSpan={7} className="text-center py-10 text-gray-400 font-bold">No products found</td></tr>
                        ) : (
                            products.map((item) => {
                                const stock = item.currentStock ?? 0;
                                const packSize = item.packSize || 1;
                                const bulk = packSize > 1;
                                const cost = avgCostPerEach(item);
                                const caseCost = cost * packSize;
                                const unitProfit = (item.sellingPrice || 0) - cost;
                                const caseProfitCalc = item.casePrice != null ? item.casePrice - caseCost : null;
                                const expiry = earliestExpiry(item);
                                const out = stock === 0;
                                const low = !out && item.reorderLevel > 0 && stock <= item.reorderLevel;

                                return (
                                    <tr key={item._id} className="hover:bg-gray-50/80 transition">
                                        <td className="p-3.5">
                                            <p className="font-extrabold text-gray-900 leading-tight">{item.name}</p>
                                            <span className="text-[10px] font-mono font-bold text-gray-400 flex items-center gap-1">
                                                <Barcode size={10} /> {item.barcode || '—'}
                                            </span>
                                            <span className="text-[10px] text-gray-400">{item.category}</span>
                                        </td>

                                        <td className="p-3.5">
                                            {bulk ? (
                                                <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 w-fit">
                                                    <Package size={10} /> {item.caseLabel} ({packSize} {item.unit?.abbreviation || 'pcs'})
                                                </span>
                                            ) : (
                                                <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold w-fit">Single Unit</span>
                                            )}
                                        </td>

                                        <td className="p-3.5">
                                            {cost > 0 ? (
                                                bulk ? (
                                                    <div>
                                                        <p className="font-extrabold text-gray-900">{money(caseCost)} KES <span className="text-[10px] text-gray-400 font-normal">/ {item.caseLabel}</span></p>
                                                        <span className="text-[10px] font-semibold text-gray-500">({money(cost)} KES / {item.unit?.abbreviation || 'pc'})</span>
                                                    </div>
                                                ) : (
                                                    <span className="font-bold text-gray-600">{money(cost)} KES</span>
                                                )
                                            ) : (
                                                <span className="text-[10px] text-gray-400 italic">No stock received yet</span>
                                            )}
                                        </td>

                                        <td className="p-3.5">
                                            <p className="font-black text-brand-orange">
                                                {money(item.sellingPrice)} KES <span className="text-[10px] text-gray-400 font-normal">/ {item.unit?.abbreviation || 'unit'}</span>
                                            </p>
                                            {bulk && item.casePrice != null && (
                                                <p className="font-extrabold text-indigo-600 text-[11px]">
                                                    {money(item.casePrice)} KES <span className="text-[10px] text-gray-400 font-normal">/ {item.caseLabel}</span>
                                                </p>
                                            )}
                                            {cost > 0 ? (
                                                <div className="mt-1 space-y-0.5">
                                                    <p className={`text-[10px] font-bold ${unitProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                        {unitProfit >= 0 ? '+' : ''}{money(unitProfit)} KES profit/{item.unit?.abbreviation || 'unit'}
                                                    </p>
                                                    {bulk && caseProfitCalc != null && (
                                                        <p className={`text-[10px] font-bold ${caseProfitCalc >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                            {caseProfitCalc >= 0 ? '+' : ''}{money(caseProfitCalc)} KES profit/{item.caseLabel}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-[10px] text-gray-400 italic mt-1">Profit shown after stock is received</p>
                                            )}
                                        </td>

                                        <td className="p-3.5">
                                            {bulk ? (
                                                <div>
                                                    <p className="font-black text-gray-900">
                                                        {Math.floor(stock / packSize)} {item.caseLabel}{Math.floor(stock / packSize) !== 1 ? 's' : ''} + {stock % packSize} {item.unit?.abbreviation || 'pc'}
                                                    </p>
                                                    <span className="text-[10px] text-gray-500 font-semibold">({stock} {item.unit?.abbreviation || 'units'} total)</span>
                                                </div>
                                            ) : (
                                                <span className="font-black text-gray-900">{stock} {item.unit?.abbreviation || 'units'}</span>
                                            )}
                                        </td>

                                        <td className="p-3.5 space-y-1">
                                            {out && <span className="block bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md text-[10px] font-extrabold w-fit">Out of Stock</span>}
                                            {low && <span className="block bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-extrabold w-fit">Low Stock</span>}
                                            {!out && !low && <span className="block bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-md text-[10px] font-extrabold w-fit">In Stock</span>}
                                            {expiry && (
                                                <span className={`block px-2 py-0.5 rounded text-[10px] font-extrabold w-fit ${isExpiringSoon(expiry) ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    Exp {new Date(expiry).toLocaleDateString()}
                                                </span>
                                            )}
                                        </td>

                                        <td className="p-3.5">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => onReceiveStock(item)} title="Receive stock"
                                                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-green-600 hover:text-white text-gray-700 transition">
                                                    <PackagePlus size={13} />
                                                </button>
                                                <button onClick={() => onPrintLabel(item)} title="Print barcode label"
                                                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-700 transition">
                                                    <Barcode size={13} />
                                                </button>
                                                <button onClick={() => onEdit(item)} title="Edit"
                                                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-orange-500 hover:text-white text-gray-700 transition">
                                                    <Pencil size={13} />
                                                </button>
                                                <button onClick={() => onDelete(item)} title="Delete"
                                                    className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-600 hover:text-white text-gray-700 transition">
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
                                                        }
