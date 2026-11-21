import { money, isDay, scrollToId } from './utils';

const TONE = { red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-700', gray: 'bg-gray-100 text-gray-600' };

export default function Attention({ view, costs, till, dead, onPickDay }) {
    const items = [];
    const worst = view.trend.filter((d) => d.profit < 0 && isDay(d.date)).sort((a, b) => a.profit - b.profit);
    if (worst.length) items.push(['red', `${worst.length} loss day${worst.length > 1 ? 's' : ''} in this period. The worst was ${worst[0].label} at ${money(worst[0].profit)}.`, 'Open report', () => onPickDay(worst[0].date)]);

    const pending = costs.totals.pendingLossReports;
    if (pending) items.push(['amber', `${pending} stock loss report${pending > 1 ? 's are' : ' is'} waiting for manager approval.`, 'See records', () => scrollToId('ap-audit')]);

    if (costs.totals.belowCostLines) items.push(['red', `${costs.totals.belowCostLines} sale line${costs.totals.belowCostLines > 1 ? 's' : ''} sold below cost, losing ${money(costs.totals.belowCostLoss)} of margin.`, 'See records', () => scrollToId('ap-audit')]);

    const short = (till?.rows || []).filter((r) => r.difference < -50);
    if (short.length) items.push(['amber', `The till was short on ${short.length} closed shift${short.length > 1 ? 's' : ''}, ${money(-short.reduce((s, r) => s + r.difference, 0))} in total.`, 'See till check', () => scrollToId('ap-till')]);

    if (dead.totalValueTiedUp > 0) items.push(['gray', `${money(dead.totalValueTiedUp)} of cash is tied up in stock that has not sold for ${dead.thresholdDays || 30} days or more.`, 'See items', () => scrollToId('ap-dead')]);

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <h2 className="text-sm font-extrabold text-gray-900">Needs Your Attention</h2>
            {items.length === 0 ? (
                <p className="text-xs text-gray-400 mt-2">Nothing needs attention right now.</p>
            ) : (
                <ul className="mt-2 divide-y divide-gray-100">
                    {items.map(([tone, text, btn, act], i) => (
                        <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                            <div className="flex items-start gap-3">
                                <span className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${TONE[tone]}`} style={{ background: 'currentColor' }} />
                                <span className="text-sm text-gray-700">{text}</span>
                            </div>
                            <button onClick={act} className="text-xs font-bold text-gray-700 underline underline-offset-2 whitespace-nowrap">{btn}</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
              }
