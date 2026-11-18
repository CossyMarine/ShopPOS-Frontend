import { Package, TriangleAlert, Wallet, TrendingUp, TrendingDown, Store } from 'lucide-react';
import { money, STORE_NAME } from './productManagementUtils';

const TONE = {
    orange: ['bg-orange-100 text-orange-600', 'bg-orange-500'], amber: ['bg-amber-100 text-amber-600', 'bg-amber-500'],
    slate: ['bg-slate-100 text-slate-700', 'bg-slate-600'], green: ['bg-green-100 text-green-600', 'bg-green-500'],
    red: ['bg-red-100 text-red-600', 'bg-red-500'],
};

export default function ProductStats({ stats }) {
    const cards = [
        { label: 'Total products', value: stats.totalSkus, sub: `${stats.bulkCount} sold in cartons / boxes`, icon: Package, tone: 'orange' },
        { label: 'Needs restocking', value: stats.lowCount, sub: stats.lowCount ? 'Low or out of stock' : 'Everything stocked', icon: TriangleAlert, tone: 'amber' },
        { label: 'Stock value (cost)', value: `KES ${money(stats.stockValue)}`, sub: 'What the shelves cost you', icon: Wallet, tone: 'slate' },
        { label: 'Potential profit', value: `KES ${money(stats.potentialProfit)}`, sub: `${stats.margin.toFixed(1)}% margin if all sells`, icon: TrendingUp, tone: 'green' },
        { label: 'Selling at a loss', value: stats.lossCount, sub: stats.lossCount ? 'Price is below cost' : 'No loss-making items', icon: TrendingDown, tone: 'red' },
    ];
    return (
        <div className="space-y-5">
            <div className="rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 flex items-center gap-4 shadow-[0_20px_40px_-12px_rgba(249,115,22,.55)]">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0"><Store size={28} /></div>
                <div className="min-w-0">
                    <h2 className="text-2xl sm:text-3xl font-black leading-tight">{STORE_NAME}</h2>
                    <p className="text-sm font-semibold text-orange-50">Storekeeper dashboard · {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {cards.map(({ label, value, sub, icon: Icon, tone }) => (
                    <div key={label} className="relative overflow-hidden bg-white rounded-3xl p-5 ring-1 ring-black/5 shadow-[0_10px_30px_-10px_rgba(0,0,0,.18)]">
                        <span className={`absolute top-0 left-0 right-0 h-1.5 ${TONE[tone][1]}`} />
                        <div className="flex items-start justify-between gap-2">
                            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">{label}</p>
                            <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${TONE[tone][0]}`}><Icon size={18} /></span>
                        </div>
                        <p className="text-2xl font-black text-gray-900 mt-2 break-words">{value}</p>
                        <p className="text-xs font-semibold text-gray-500 mt-1">{sub}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
