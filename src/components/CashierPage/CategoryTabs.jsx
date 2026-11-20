// CATEGORY FILTERS — built from live product data, not hardcoded
export default function CategoryTabs({ categories, selected, onSelect }) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
            {categories.map((c) => (
                <button key={c} onClick={() => onSelect(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                        selected === c
                            ? 'bg-brand-orange text-white shadow-sm'
                            : 'bg-gray-200 text-gray-700 hover:bg-brand-orange-light hover:text-brand-orange'
                    }`}>
                    {c === 'All' ? 'All Items' : c}
                </button>
            ))}
        </div>
    );
}
