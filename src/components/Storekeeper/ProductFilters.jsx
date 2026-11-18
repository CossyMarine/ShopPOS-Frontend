import { Search } from 'lucide-react';

const STATUSES = ['All', 'In stock', 'Low', 'Out', 'Loss'];

export default function ProductFilters({ search, setSearch, filterPackaging, setFilterPackaging, filterCategory, setFilterCategory, filterStatus, setFilterStatus, categories }) {
    return (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
                <div className="relative w-full md:w-80">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><Search size={13} /></span>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, SKU, any barcode..."
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-orange" />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    <select value={filterPackaging} onChange={(e) => setFilterPackaging(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold px-3 py-2">
                        <option value="all">All packaging</option>
                        <option value="bulk">Has packs (box/carton/sack)</option>
                        <option value="single">Single unit only</option>
                    </select>
                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold px-3 py-2">
                        <option value="all">All categories</option>
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                    <button key={s} type="button" onClick={() => setFilterStatus(s)} className={`sk-chip ${filterStatus === s ? 'on' : ''}`}>{s}</button>
                ))}
            </div>
        </div>
    );
}
