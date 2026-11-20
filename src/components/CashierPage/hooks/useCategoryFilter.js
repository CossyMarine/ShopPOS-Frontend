import { useState, useMemo, useEffect } from 'react';

export default function useCategoryFilter(products) {
    const [category, setCategory] = useState('All');

    // Categories are derived from whatever products actually exist for this
    // branch — never hardcoded, so new categories show up automatically.
    const categories = useMemo(
        () => ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort()],
        [products]
    );

    // Reset back to "All" if the currently selected category no longer exists
    // (e.g. it was renamed/removed, or the branch's catalog changed).
    useEffect(() => {
        if (category !== 'All' && !categories.includes(category)) setCategory('All');
    }, [categories, category]);

    const visibleProducts = category === 'All' ? products : products.filter((p) => p.category === category);

    return { categories, category, setCategory, visibleProducts };
}
