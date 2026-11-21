import StatCard from './StatCard';
import { money } from './utils';

export default function SummaryCards({ view, overview }) {
    const { totals, salary, topBranch } = overview;
    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatCard
                label={view.revenueLabel} value={money(view.revenue)}
                sub={view.vOn ? `Includes ${money(view.vatCollected)} VAT` : 'What customers paid'}
            />
            <StatCard label={view.profitLabel} value={money(view.grossProfit)} sub="Revenue minus cost of goods" />
            <StatCard label="Salary payments" value={money(view.salary)} sub={`${salary.payoutCount} payslip(s)`} />
            <StatCard label="Net result" value={money(view.kept)} sub="After losses, petty cash and salaries" />
            <StatCard label="Est. next payroll" value={money(totals.estNextPayroll)} sub="Based on current wage profiles" />
            {topBranch ? (
                <StatCard label="Top branch" value={topBranch.branchName} sub={money(topBranch.revenue)} />
            ) : (
                <StatCard label="Units sold" value={Number(totals.unitsSold || 0).toLocaleString('en-KE')} sub="Items rung up at the till" />
            )}
        </div>
    );
}
