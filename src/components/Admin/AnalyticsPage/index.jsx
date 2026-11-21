import { useState, useEffect, useMemo } from 'react';
import Filters from './Filters';
import SummaryCards from './SummaryCards';
import Attention from './Attention';
import SalesProfitChart from './SalesProfitChart';
import MoneyFlow from './MoneyFlow';
import DailyRecord from './DailyRecord';
import DayReport from './DayReport';
import VatSection from './VatSection';
import { TopItems, StuckItems, SlowItems } from './Lists';
import { BranchPerformance, CategoryMargin } from './Breakdowns';
import StaffAccountability from './StaffAccountability';
import TillCheck from './TillCheck';
import DeadStock from './DeadStock';
import Salary from './Salary';
import AuditTrail from './AuditTrail';
import useAnalytics from './useAnalytics';
import useFetch from './useFetch';
import { fetchDeadStock } from './api';
import { buildView, isDay, scrollToId } from './utils';
import { EMPTY_DEAD } from './constants';

export default function AnalyticsPage({ branch } = {}) {
    const [range, setRange] = useState('today');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [tick, setTick] = useState(0); // bumped by Refresh so every section reloads
    const [day, setDay] = useState(null);
    const [deadDays, setDeadDays] = useState(30);
    const [dead, setDead] = useState(EMPTY_DEAD);

    const { data, margin, vat, costs, loading, error, reload } = useAnalytics({ branch, range, from, to });
    const view = useMemo(() => buildView(data, vat, costs), [data, vat, costs]);

    // Shared query for the sections that load their own data
    const ready = range !== 'custom' || (from && to);
    const params = useMemo(() => ({
        range, ...(range === 'custom' ? { from, to } : {}), ...(branch ? { branch } : {}), _t: tick,
    }), [range, from, to, branch, tick]);
    const { data: till } = useFetch('/analytics/till', params, !!ready);

    // Dead stock is its own thing: all-time last sale, not range-bound.
    useEffect(() => {
        fetchDeadStock(deadDays, branch).then((d) => setDead({ ...d, thresholdDays: deadDays })).catch(() => {
            // Non-critical, the rest of the page still works without it.
        });
    }, [deadDays, branch, tick]);

    // Default the day report to the worst loss day, or the latest day
    useEffect(() => {
        const days = view.trend.filter((d) => isDay(d.date));
        if (!days.length) { setDay(null); return; }
        setDay((cur) => {
            if (cur && days.some((d) => d.date === cur)) return cur;
            const worst = days.filter((d) => d.profit < 0).sort((a, b) => a.profit - b.profit)[0];
            return (worst || days[days.length - 1]).date;
        });
    }, [view.trend]);

    const pickDay = (d) => { setDay(d); scrollToId('ap-day'); };
    const refresh = () => { setTick((t) => t + 1); reload(); };

    return (
        <div className="space-y-6">
            <Filters
                range={range} setRange={setRange}
                from={from} to={to} setFrom={setFrom} setTo={setTo}
                loading={loading} onRefresh={refresh}
            />

            {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-lg">{error}</div>}
            {vat.failed && (
                <div className="p-3 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold rounded-lg">
                    VAT details could not be loaded, so VAT figures are hidden. Press Refresh to try again.
                </div>
            )}
            {costs.failed && (
                <div className="p-3 bg-amber-50 border border-amber-100 text-amber-700 text-xs font-bold rounded-lg">
                    Stock losses and petty cash could not be loaded, so the net result may look better than it is. Press Refresh to try again.
                </div>
            )}

            <SummaryCards view={view} overview={data} />
            <Attention view={view} costs={costs} till={till} dead={dead} onPickDay={pickDay} />
            <SalesProfitChart view={view} selected={day} onPickDay={pickDay} />
            <MoneyFlow view={view} />
            <DailyRecord view={view} selected={day} onPickDay={pickDay} />
            <div id="ap-day"><DayReport date={day} branch={branch} /></div>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {ready && <StaffAccountability params={params} />}
                <div id="ap-till"><TillCheck till={till} /></div>
            </div>

            <div id="ap-dead"><DeadStock dead={dead} days={deadDays} setDays={setDeadDays} /></div>
            <Salary salary={data.salary} />
            <div id="ap-audit">{ready && <AuditTrail params={params} onPickDay={pickDay} />}</div>
        </div>
    );
}
