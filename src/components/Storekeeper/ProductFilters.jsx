import { Search } from 'lucide-react';

export default function ProductFilters({
    search, setSearch,
    filterPackaging, setFilterPackaging,
    filterCategory, setFilterCategory,
    categories,
}) {
    return (
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative w-full md:w-80">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                    <Search size={13} />
                </span>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search SKU, Product, Barcode..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-brand-orange transition"
                />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select value={filterPackaging} onChange={(e) => setFilterPackaging(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold px-3 py-2 focus:outline-none focus:border-brand-orange">
                    <option value="all">All Packaging Types</option>
                    <option value="bulk">Bulk / Carton Items Only</option>
                    <option value="single">Single Unit Items Only</option>
                </select>

                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold px-3 py-2 focus:outline-none focus:border-brand-orange">
                    <option value="all">All Categories</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
        </div>
    );
}
