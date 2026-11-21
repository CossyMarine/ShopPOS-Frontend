import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { PackageX, Clock } from 'lucide-react';
import { money } from './utils';

export function TopItems({ items }) {
    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-sm font-extrabold text-gray-900 mb-4">Most Performing Items</h2>
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={items} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="productName" width={110} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v) => money(v)} />
                    <Bar dataKey="revenue" fill="#FF5722" radius={[0, 4, 4, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}

function ItemList({ title, icon: Icon, iconTone, items, empty, row }) {
    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <Icon size={16} className={iconTone} />
                <h2 className="text-sm font-extrabold text-gray-900">{title}</h2>
            </div>
            {items.length === 0 ? (
                <p className="text-xs text-gray-400">{empty}</p>
            ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">{items.map(row)}</div>
            )}
        </div>
    );
}

export const StuckItems = ({ items }) => (
    <ItemList
        title="Stuck Items (zero sales)" icon={PackageX} iconTone="text-red-500" items={items}
        empty="No stuck items in this range."
        row={(it) => (
            <div key={it.productId} className="flex items-center justify-between p-2.5 bg-red-50/50 rounded-lg border border-red-100">
                <div>
                    <p className="text-xs font-bold text-gray-800">{it.productName}</p>
                    <p className="text-[11px] text-gray-500">{it.category}</p>
                </div>
                <span className="text-xs font-bold text-red-500">{it.currentStock} in stock</span>
            </div>
        )}
    />
);

export const SlowItems = ({ items }) => (
    <ItemList
        title="Slow-Moving Items" icon={Clock} iconTone="text-amber-500" items={items}
        empty="No slow-moving items in this range."
        row={(it) => (
            <div key={it.productId} className="flex items-center justify-between p-2.5 bg-amber-50/50 rounded-lg border border-amber-100">
                <div>
                    <p className="text-xs font-bold text-gray-800">{it.productName}</p>
                    <p className="text-[11px] text-gray-500">{it.category}</p>
                </div>
                <span className="text-xs font-bold text-amber-600">{it.unitsSold} sold (avg {it.avgUnitsSold})</span>
            </div>
        )}
    />
);
