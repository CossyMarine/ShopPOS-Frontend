import { Search } from 'lucide-react';

export default function HistoryFilters({ search, setSearch, dateFrom, setDateFrom, dateTo, setDateTo }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-wrap gap-3 items-center shadow-sm">
            <div className="relative flex-1 min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by Bill ID or cashier..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-xs bg-gray-50 font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                />
            </div>
            <input
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
            />
            {(search || dateFrom || dateTo) && (
                <button
                    onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
                    className="text-xs font-bold text-gray-400 hover:text-red-500"
                >
                    Clear
                </button>
            )}
        </div>
    );
}
