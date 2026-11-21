import { useState, useEffect, useMemo } from 'react';
import Filters from './Filters';
import SummaryCards from './SummaryCards';
import SalesProfitChart from './SalesProfitChart';
import VatSection from './VatSection';
import { TopItems, StuckItems, SlowItems } from './Lists';
import { BranchPerformance, CategoryMargin } from './Breakdowns';
import DeadStock from './DeadStock';
import Salary from './Salary';
import useAnalytics from './useAnalytics';
import { fetchDeadStock } from './api';
import { buildView } from './utils';
import { EMPTY_DEAD } from './constants';

export default function AnalyticsPage({ branch } = {}) {
    const [range, setRange] = useState('today');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [deadDays, setDeadDays] = useState(30);
    const [dead, setDead] = useState(EMPTY_DEAD);

    const { data, margin, vat, loading, error, reload } = useAnalytics({ branch, range, from, to });
    const view = useMemo(() => buildView(data, vat), [data, vat]);

    // Dead stock is its own thing: all-time last sale, not range-bound.
    useEffect(() => {
        fetchDeadStock(deadDays, branch).then(setDead).catch(() => {
            // Non-critical, the rest of the page still works without it.
        });
    }, [deadDays, branch]);

    return (
        <div className="space-y-6">
            <Filters
                range={range} setRange={setRange}
                from={from} to={to} setFrom={setFrom} setTo={setTo}
                loading={loading} onRefresh={reload}
            />

            {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-lg">{error}</div>
            )}
            {vat.failed && (
                <div className="p-3 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold rounded-lg">
                    VAT details could not be loaded, so VAT figures are hidden. Press Refresh to try again.
                </div>
            )}

            <SummaryCards view={view} overview={data} />
            <SalesProfitChart view={view} />
            <VatSection vat={vat} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopItems items={data.topItems} />
                <BranchPerformance branches={data.branchPerformance} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <StuckItems items={data.stuckItems} />
                <SlowItems items={data.slowMovingItems} />
            </div>

            <CategoryMargin margin={margin} vatOn={view.vOn} />
            <DeadStock dead={dead} days={deadDays} setDays={setDeadDays} />
            <Salary salary={data.salary} />
        </div>
    );
}
