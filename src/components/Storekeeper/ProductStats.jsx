import { Package, PackagePlus, TriangleAlert, Wallet, TrendingUp } from 'lucide-react';
import { money } from './productManagementUtils';

export default function ProductStats({ stats }) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Total SKUs</span>
                    <p className="text-xl font-black text-gray-900 mt-0.5">{stats.totalSkus}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center text-lg">
                    <Package size={18} />
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Bulk / Carton Items</span>
                    <p className="text-xl font-black text-indigo-600 mt-0.5">{stats.bulkCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg">
                    <PackagePlus size={18} />
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Low / Out of Stock</span>
                    <p className="text-xl font-black text-amber-600 mt-0.5">{stats.lowCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
                    <TriangleAlert size={18} />
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Stock Value (Cost)</span>
                    <p className="text-xl font-black text-gray-900 mt-0.5">{money(stats.stockValue)} KES</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center text-lg">
                    <Wallet size={18} />
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Potential Profit</span>
                    <p className="text-xl font-black text-green-600 mt-0.5">{money(stats.potentialProfit)} KES</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-lg">
                    <TrendingUp size={18} />
                </div>
            </div>
        </div>
    );
}
