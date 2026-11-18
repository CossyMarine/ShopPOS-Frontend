import { TrendingUp, TrendingDown } from 'lucide-react';
import { baseAbbr } from '../../../utils/receivingMath';
import { money, num } from '../productManagementUtils';
import { lineProfit } from './helpers';

export default function LineProfit({ l, p, c }) {
    const profit = lineProfit(l, p, c);
    if (profit === null) return null;
    const price = +l.newPrice > 0 ? +l.newPrice : p.sellingPrice, abbr = baseAbbr(p), loss = profit < 0;
    return (
        <div className={`mt-4 rounded-2xl border p-4 ${loss ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="sk-label !mb-0">Profit on this stock</p>
                    <p className={`text-3xl font-black ${loss ? 'text-red-600' : 'text-emerald-600'}`}>{loss ? '-' : '+'}KES {money(Math.abs(profit))}</p>
                </div>
                {loss ? <TrendingDown size={30} className="text-red-400" /> : <TrendingUp size={30} className="text-emerald-400" />}
            </div>
            <p className="text-xs text-gray-500 mt-2">Sell {money(price)} − real cost {money(c.eff)} per {abbr} × {num(c.added)} {abbr}. Real cost already includes discounts, free units and transport.</p>
        </div>
    );
}
