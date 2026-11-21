import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Layers } from 'lucide-react';
import { money } from './utils';

export function BranchPerformance({ branches }) {
    if (!branches.length) return null;
    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-sm font-extrabold text-gray-900 mb-4">Branch Performance</h2>
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={branches}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="branchName" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => money(v)} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="#FF5722" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

const marginTone = (m) => (m >= 20 ? 'bg-green-50 text-green-600' : m >= 0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600');

export function CategoryMargin({ margin, vatOn }) {
    const { categories, totals } = margin;
    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
                <Layers size={16} className="text-brand-orange" />
                <h2 className="text-sm font-extrabold text-gray-900">Margin by Category</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
                Selling a lot is not the same as earning a lot. Margin is the profit on each shilling sold.
                {vatOn && ' Category, branch and item figures are before VAT.'}
            </p>
            {categories.length === 0 ? (
                <p className="text-xs text-gray-400">No sales in this range yet.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className="border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                                <th className="py-2 pr-3">Category</th>
                                <th className="py-2 pr-3 text-right">Revenue</th>
                                <th className="py-2 pr-3 text-right">Cost</th>
                                <th className="py-2 pr-3 text-right">Profit</th>
                                <th className="py-2 text-right">Margin</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {categories.map((c) => (
                                <tr key={c.category}>
                                    <td className="py-2 pr-3 font-bold text-gray-800">{c.category}</td>
                                    <td className="py-2 pr-3 text-right font-mono text-gray-600">{money(c.revenue)}</td>
                                    <td className="py-2 pr-3 text-right font-mono text-gray-400">{money(c.cost)}</td>
                                    <td className={`py-2 pr-3 text-right font-mono font-bold ${c.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{money(c.profit)}</td>
                                    <td className="py-2 text-right">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${marginTone(c.marginPct)}`}>{c.marginPct}%</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-gray-200 font-black text-gray-900">
                                <td className="py-2 pr-3">Total</td>
                                <td className="py-2 pr-3 text-right font-mono">{money(totals.revenue)}</td>
                                <td className="py-2 pr-3 text-right font-mono">{money(totals.cost)}</td>
                                <td className="py-2 pr-3 text-right font-mono">{money(totals.profit)}</td>
                                <td className="py-2 text-right">{totals.marginPct}%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}
        </div>
    );
}
