import { Wallet, TrendingUp, TrendingDown, Users, CircleDollarSign, Award, Store } from 'lucide-react';
import StatCard from './StatCard';
import { money } from './utils';

export default function SummaryCards({ view, overview }) {
    const { totals, salary, topBranch } = overview;
    const keptOk = view.kept >= 0;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
                label={view.revenueLabel} value={money(view.revenue)} icon={Wallet}
                tone="text-blue-600" bg="bg-blue-50"
                sub={view.vOn ? `Includes ${money(view.vatCollected)} VAT` : null}
            />
            <StatCard label={view.profitLabel} value={money(view.grossProfit)} icon={TrendingUp} tone="text-emerald-600" bg="bg-emerald-50" sub="Revenue minus cost of goods" />
            <StatCard label="Salary Payments" value={money(view.salary)} icon={Users} tone="text-amber-600" bg="bg-amber-50" sub={`${salary.payoutCount} payslip(s)`} />
            <StatCard
                label="Net Result" value={money(view.kept)}
                icon={keptOk ? TrendingUp : TrendingDown}
                tone={keptOk ? 'text-emerald-600' : 'text-red-600'}
                bg={keptOk ? 'bg-emerald-50' : 'bg-red-50'}
                sub="After stock losses, petty cash and salaries"
            />
            <StatCard label="Est. Next Payroll" value={money(totals.estNextPayroll)} icon={CircleDollarSign} tone="text-indigo-600" bg="bg-indigo-50" />
            {topBranch ? (
                <StatCard label="Top Branch" value={topBranch.branchName} icon={Award} tone="text-brand-orange" bg="bg-brand-orange-light" sub={money(topBranch.revenue)} />
            ) : (
                <StatCard label="Units Sold" value={totals.unitsSold} icon={Store} tone="text-gray-700" bg="bg-gray-100" />
            )}
        </div>
    );
}
