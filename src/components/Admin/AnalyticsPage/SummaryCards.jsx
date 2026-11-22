import StatCard from './StatCard';
import { money } from './utils';

export default function SummaryCards({ view, overview }) {
    const { totals, salary, topBranch } = overview;
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <StatCard
                label={view.revenueLabel} value={money(view.revenue)} amount={view.revenue}
                sub={view.vOn ? `Includes ${money(view.vatCollected)} VAT` : 'What customers paid'}
            />
            <StatCard label={view.profitLabel} value={money(view.grossProfit)} amount={view.grossProfit} sub="Revenue minus cost of goods" />

            {/* Only when the VAT switch is on in Admin Settings */}
            {view.vOn && (
                <StatCard
                    label="VAT collected" value={money(view.vatCollected)}
                    sub={`${view.vatRate}% · ${money(view.vatPayable)} payable after input VAT`}
                />
            )}

            <StatCard label="Salary payments" value={money(view.salary)} amount={view.salary} sub={`${salary.payoutCount} payslip(s)`} />
            <StatCard label="Net result" value={money(view.kept)} amount={view.kept} sub="After losses, petty cash and salaries" />
            <StatCard label="Est. next payroll" value={money(totals.estNextPayroll)} amount={totals.estNextPayroll} sub="Based on current wage profiles" />
            {topBranch ? (
                <StatCard label="Top branch" value={topBranch.branchName} sub={money(topBranch.revenue)} />
            ) : (
                <StatCard label="Units sold" value={Number(totals.unitsSold || 0).toLocaleString('en-KE')} sub="Items rung up at the till" />
            )}
        </div>
    );
}
