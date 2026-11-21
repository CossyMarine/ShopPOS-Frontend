import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { money, isDay } from './utils';

const SALES = '#CBD5E1';
const GAIN = '#16A34A';
const LOSS = '#DC2626';

function ChartTip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="bg-gray-900 text-white text-xs rounded-md px-3 py-2 leading-relaxed shadow-lg">
            <p className="font-bold">{d.label}</p>
            <p>Sales: {money(d.sales)}</p>
            <p>Profit kept: {money(d.profit)}</p>
            {d.sales > 0 && <p className="text-gray-400">Per KES 100 sold: {((d.profit / d.sales) * 100).toFixed(1)}</p>}
            {isDay(d.date) && <p className="text-gray-400">Click for the day report</p>}
        </div>
    );
}

const Dot = ({ c }) => <span className="inline-block w-3 h-3 rounded-sm mr-1.5 align-middle" style={{ background: c }} />;

export default function SalesProfitChart({ view, selected, onPickDay }) {
    const rev = view.revenue || 1;
    const stock = (view.cost / rev) * 100;
    const vat = view.vatShare ? (view.vatCollected / rev) * 100 : 0;
    const lp = ((view.stockLoss + view.pettyCash) / rev) * 100;
    const pay = (view.salary / rev) * 100;
    const kept = 100 - stock - vat - lp - pay;
    const total = Math.max(100, stock + vat + lp + pay);
    const seg = (w, c) => <div style={{ width: `${(w / total) * 100}%`, background: c }} />;
    const lossDays = view.trend.filter((d) => d.profit < 0 && isDay(d.date)).sort((a, b) => a.profit - b.profit);

    const onChartClick = (s) => {
        const d = view.trend[Number(s?.activeTooltipIndex)];
        if (d && isDay(d.date)) onPickDay(d.date);
    };

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h2 className="text-sm font-extrabold text-gray-900">Sales and Profit Kept</h2>
                    <p className="text-xs text-gray-500">
                        Grey bar = what you sold. Coloured bar = what the shop kept after stock cost, losses and petty cash (before salaries, which are paid monthly).
                    </p>
                </div>
                <div className="text-xs text-gray-600 flex items-center gap-3">
                    <span><Dot c={SALES} />Sales</span>
                    <span><Dot c={GAIN} />Profit</span>
                    <span><Dot c={LOSS} />Loss</span>
                </div>
            </div>

            <div className="mt-4 rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-800">
                    Out of every KES 100 you sold,{' '}
                    {kept >= 0
                        ? <>you kept <span className="text-emerald-600">KES {kept.toFixed(1)}</span> after everything.</>
                        : <>you lost <span className="text-red-600">KES {Math.abs(kept).toFixed(1)}</span>: costs were higher than sales.</>}
                </p>
                <div className="flex h-3.5 rounded overflow-hidden mt-3 bg-gray-200">
                    {seg(stock, '#94A3B8')}
                    {vat > 0 && seg(vat, '#93C5FD')}
                    {seg(lp, '#E5A0A0')}
                    {seg(pay, kept < 0 ? LOSS : '#F2B66D')}
                    {kept > 0 && seg(kept, GAIN)}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-gray-600">
                    <span><Dot c="#94A3B8" />Paid for stock {stock.toFixed(1)}</span>
                    {vat > 0 && <span><Dot c="#93C5FD" />VAT {vat.toFixed(1)}</span>}
                    <span><Dot c="#E5A0A0" />Stock losses and petty cash {lp.toFixed(1)}</span>
                    <span><Dot c={kept < 0 ? LOSS : '#F2B66D'} />Salaries {pay.toFixed(1)}</span>
                    {kept > 0 && <span><Dot c={GAIN} />Kept {kept.toFixed(1)}</span>}
                </div>
            </div>

            <div className="mt-4">
                {view.trend.length === 0 ? (
                    <p className="text-xs text-gray-400 py-10 text-center">No sales in this range yet.</p>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={view.trend} barGap={2} onClick={onChartClick} style={{ cursor: 'pointer' }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip content={<ChartTip />} cursor={{ fill: '#f8fafc' }} />
                            <ReferenceLine y={0} stroke="#94A3B8" />
                            <Bar dataKey="sales" fill={SALES} radius={[3, 3, 0, 0]} />
                            <Bar dataKey="profit" radius={[3, 3, 0, 0]}>
                                {view.trend.map((d, i) => (
                                    <Cell key={i} fill={d.profit >= 0 ? GAIN : LOSS} stroke={d.date === selected ? '#0F172A' : 'none'} strokeWidth={2} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            {lossDays.length > 0 && (
                <div className="mt-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Loss days. Tap one to see why.</p>
                    <div className="flex flex-wrap gap-2">
                        {lossDays.slice(0, 8).map((d) => (
                            <button
                                key={d.date} onClick={() => onPickDay(d.date)}
                                className={`text-xs border rounded-md px-2 py-1 hover:bg-gray-50 ${d.date === selected ? 'border-gray-400 bg-gray-100' : 'border-gray-200'}`}
                            >
                                {d.label} <span className="text-red-600 font-bold">{money(d.profit)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
                    }
