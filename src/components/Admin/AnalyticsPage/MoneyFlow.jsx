import { money } from './utils';

export default function MoneyFlow({ view }) {
    const paid = view.revenue || 1;
    const rows = [];
    if (view.vatShare) {
        rows.push(['Customers paid', view.revenue, 'total', 'Everything customers handed over, VAT included.']);
        rows.push(['VAT collected', view.vatCollected, 'minus', 'Belongs to the tax authority. Removed from profit.']);
        rows.push(['Net sales', view.netSales, 'total', 'Your real sales.']);
    } else {
        rows.push([view.vOn ? 'Customers paid' : 'Revenue', view.revenue, 'total', view.vOn ? 'VAT is kept inside profit in this view.' : 'What customers paid.']);
    }
    rows.push(['Cost of goods', view.cost, 'minus', 'What you paid suppliers for the items sold.']);
    rows.push(['Gross profit', view.grossProfit, 'total', 'What is left after paying for the stock.']);
    rows.push(['Stock losses', view.stockLoss, 'minus', 'Approved write-offs: damaged, expired, stolen, spilled.']);
    rows.push(['Petty cash', view.pettyCash, 'minus', 'Small cash spent from the till.']);
    rows.push(['Salaries', view.salary, 'minus', 'Payslips paid in this period.']);
    rows.push(['Net result', view.kept, 'final', 'What the shop kept or lost.']);

    let run = 0;
    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-sm font-extrabold text-gray-900">Where Every Shilling Went</h2>
            <p className="text-xs text-gray-500">Read from top to bottom. Each line either shows a total or takes something away from the line above.</p>
            <div className="mt-3">
                {rows.map(([label, v, type, note]) => {
                    let left = 0;
                    if (type === 'total') run = v;
                    else if (type === 'minus') { left = run - v; run -= v; }
                    const color = type === 'minus' ? '#E5A0A0' : type === 'final' ? (v >= 0 ? '#16A34A' : '#DC2626') : '#64748B';
                    const w = Math.max(0.4, (Math.abs(v) / paid) * 100);
                    const lf = (Math.max(0, left) / paid) * 100;
                    return (
                        <div key={label} className="grid grid-cols-12 items-center gap-2 py-2.5 border-t border-gray-100">
                            <div className="col-span-12 md:col-span-3">
                                <p className={`text-sm ${type === 'minus' ? 'text-gray-700' : 'font-bold text-gray-900'}`}>{label}</p>
                                <p className="text-[11px] text-gray-500 leading-snug">{note}</p>
                            </div>
                            <div className="col-span-8 md:col-span-6">
                                <div className="relative h-4 bg-gray-50 rounded">
                                    <div className="absolute top-0 h-4 rounded" style={{ left: `${lf}%`, width: `${w}%`, background: color }} />
                                </div>
                            </div>
                            <div className={`col-span-4 md:col-span-3 text-right text-sm font-mono ${type !== 'minus' ? 'font-bold' : ''} ${type === 'final' ? (v >= 0 ? 'text-emerald-600' : 'text-red-600') : ''}`}>
                                {type === 'minus' ? '- ' : ''}{money(v)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
