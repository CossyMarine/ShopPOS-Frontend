import { money } from './utils';

// VAT figures are shown to 2 decimals (needed for filing). Other money stays whole shillings.
const m2 = (n) => {
    const v = Number(n || 0);
    return `${v < 0 ? '-' : ''}KES ${Math.abs(v).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const CLASS_NAMES = {
    standard: ['Standard-rated', 'VAT charged at the shop rate'],
    zero: ['Zero-rated', 'VAT charged at 0%. Tax paid on purchases can still be claimed'],
    exempt: ['Exempt', 'No VAT charged. Tax paid on purchases is usually not claimable'],
};

const Tile = ({ label, value, tone = 'bg-gray-50 text-gray-900' }) => (
    <div className={`rounded-lg p-3 ${tone}`}>
        <p className="text-xs opacity-70">{label}</p>
        <p className="font-extrabold mt-1">{value}</p>
    </div>
);

const day = (d) => (d ? new Date(d).toLocaleDateString('en-KE') : '');

export default function VatSection({ vat }) {
    if (!vat?.enabled || !vat.totals) return null;
    const { totals, byClass = [], coverage = {} } = vat;
    const owing = totals.payable >= 0;
    const netAll = byClass.reduce((s, c) => s + c.net, 0) || 1;
    const derived = coverage.derived;

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h2 className="text-sm font-extrabold text-gray-900">VAT and Tax on Goods</h2>
                    <p className="text-xs text-gray-500">VAT is collected for the government. It is not part of what the shop keeps.</p>
                </div>
                <div className="flex gap-2 text-[11px] font-bold">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Rate {vat.rate}%</span>
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        Prices {vat.priceMode === 'inclusive' ? 'include' : 'exclude'} VAT
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <Tile label="Output VAT (collected from customers)" value={m2(totals.vat)} />
                <Tile label="Input VAT (you can claim back)" value={m2(totals.claimable)} />
                <Tile label="Not claimable (added to cost)" value={m2(totals.notClaimable)} />
                <Tile
                    label={owing ? 'VAT payable (set aside)' : 'VAT you may get back'}
                    value={m2(Math.abs(totals.payable))}
                    tone={owing ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}
                />
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
                VAT payable = output VAT {m2(totals.vat)} − input VAT {m2(totals.claimable)} = <b>{m2(totals.payable)}</b>
            </p>

            <div className="grid md:grid-cols-3 gap-4 mt-4 text-xs text-gray-600">
                <p><span className="block font-bold text-gray-800 text-sm">1. Collected</span>VAT is added to standard-rated items. The shop holds this money for the government.</p>
                <p><span className="block font-bold text-gray-800 text-sm">2. Claimed back</span>Suppliers charge VAT on your deliveries. Unless marked not claimable, you can subtract it.</p>
                <p><span className="block font-bold text-gray-800 text-sm">3. Paid over</span>You pay the difference: VAT collected minus VAT claimed. Keep it apart from trading cash.</p>
            </div>

            <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b border-gray-100 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                            <th className="py-2 pr-3">VAT class</th>
                            <th className="py-2 pr-3 text-right">Net sales</th>
                            <th className="py-2 pr-3 text-right">VAT</th>
                            <th className="py-2 text-right">Share of sales</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {byClass.map((c) => {
                            const [name, note] = CLASS_NAMES[c.vatClass] || [c.vatClass, ''];
                            return (
                                <tr key={c.vatClass}>
                                    <td className="py-2 pr-3"><p className="font-bold text-gray-800">{name}</p><p className="text-[11px] text-gray-500">{note}</p></td>
                                    <td className="py-2 pr-3 text-right font-mono">{money(c.net)}</td>
                                    <td className="py-2 pr-3 text-right font-mono">{m2(c.vat)}</td>
                                    <td className="py-2 text-right font-mono">{((c.net / netAll) * 100).toFixed(1)}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {derived?.receipts > 0 && (
                <p className="text-[11px] text-gray-500 mt-3">
                    {derived.receipts} receipt{derived.receipts === 1 ? '' : 's'} ({day(derived.from)} to {day(derived.to)}) were sold while VAT was off.
                    Their VAT of {m2(totals.derivedVat)} is worked out from item prices, treating the price paid as VAT-inclusive. It was not collected separately.
                </p>
            )}
            <p className="text-[11px] text-gray-400 mt-1">Confirm final figures for filing with your accountant.</p>
        </div>
    );
}
