import { useState } from 'react';
import useFetch from './useFetch';
import { money, fmtTime, fmtLongDay, niceReason } from './utils';

// Follow-up notes are kept in this browser only. If several managers need to
// share them, they need a small model on the server.
const KEY = 'shoppos_followups';
const loadNotes = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };

const Tbl = ({ head, rows, empty }) => (
    rows.length === 0 ? <p className="text-xs text-gray-400">{empty}</p> : (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
                <thead><tr className="text-[10px] font-black uppercase text-gray-400 tracking-wider border-b border-gray-100">{head.map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
                <tbody>{rows}</tbody>
            </table>
        </div>
    )
);
const Td = ({ children, cls = '' }) => <td className={`py-2 pr-3 whitespace-nowrap ${cls}`}>{children}</td>;
const Sub = ({ children }) => <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mt-5 mb-2">{children}</p>;

export default function DayReport({ date, branch }) {
    const { data: d, loading, error } = useFetch('/analytics/day', { date, ...(branch ? { branch } : {}) }, !!date);
    const [notes, setNotes] = useState(loadNotes);
    const setNote = (k, patch) => {
        const next = { ...notes, [k]: { s: 'Not reviewed', n: '', ...notes[k], ...patch } };
        setNotes(next);
        try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage full or blocked */ }
    };

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Day report</p>
            {!date && <p className="text-xs text-gray-400 mt-2">Pick a day from the chart or the daily record to see what happened.</p>}
            {date && loading && !d && <p className="text-xs text-gray-400 mt-2">Loading…</p>}
            {error && <p className="text-xs text-red-600 font-bold mt-2">{error}</p>}
            {date && d && d.date === date && (() => {
                const loss = d.result < 0;
                const max = Math.max(1, ...d.causes.map((c) => c.impact));
                return (
                    <>
                        <h2 className={`text-lg font-extrabold mt-1 ${loss ? 'text-red-600' : 'text-emerald-600'}`}>
                            On {fmtLongDay(date)} the shop made a {loss ? 'loss' : 'profit'} of {money(Math.abs(d.result))} before salaries.
                        </h2>
                        <p className="text-sm text-gray-600 mt-1 max-w-3xl">
                            Selling goods earned {money(d.grossProfit)} after paying for the stock. Then {money(d.stockLoss + d.pettyCash)} went out for stock losses and petty cash.
                            {d.causes[0] ? ` The biggest reason it was worse than a usual day: ${d.causes[0].label.toLowerCase()}, about ${money(d.causes[0].impact)} worse than usual.` : d.hasBaseline ? ' Nothing stands out against the last 30 days.' : ''}
                            {d.vatOn ? ' Figures here are before VAT.' : ''}
                        </p>

                        {d.creditGiven > 0 && (
                            <div className="mt-3 text-xs rounded-lg bg-rose-50 text-rose-800 p-3">
                                {money(d.creditGiven)} of this day's sales ({d.creditCount} bill{d.creditCount > 1 ? 's' : ''}) was given on credit. It counts as sold on this day, but the money has not come in yet.
                            </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                            {[['Profit from selling goods', d.grossProfit, ''], ['minus Stock losses', d.stockLoss, ''], ['minus Petty cash', d.pettyCash, ''], ['equals Result', d.result, loss ? 'text-red-600' : 'text-emerald-600']].map(([l, v, c]) => (
                                <div key={l} className="rounded-lg bg-gray-50 p-3"><p className="text-[11px] text-gray-500">{l}</p><p className={`font-extrabold mt-1 ${c}`}>{money(v)}</p></div>
                            ))}
                        </div>
                        {d.pendingReports > 0 && (
                            <div className="mt-3 text-xs rounded-lg bg-amber-50 text-amber-800 p-3">
                                {d.pendingReports} stock loss report{d.pendingReports > 1 ? 's' : ''} from this day {d.pendingReports > 1 ? 'are' : 'is'} waiting for approval and not counted yet.
                            </div>
                        )}

                        <Sub>Why it was worse than a usual day (compared with the 30 days before)</Sub>
                        {!d.hasBaseline && <p className="text-xs text-gray-400">Not enough earlier days to compare with yet.</p>}
                        {d.hasBaseline && d.causes.length === 0 && <p className="text-xs text-gray-400">No single reason stands out.</p>}
                        {d.causes.map((c, i) => {
                            const f = notes[`${date}|${c.key}`] || { s: 'Not reviewed', n: '' };
                            return (
                                <div key={c.key} className="py-3 border-t border-gray-100">
                                    <div className="flex justify-between gap-3">
                                        <p className="text-sm font-bold text-gray-900">{i + 1}. {c.label}</p>
                                        <p className="text-sm font-bold text-red-600 whitespace-nowrap">{money(c.impact)} worse than usual</p>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded mt-2"><div className="h-1.5 rounded bg-red-500" style={{ width: `${(c.impact / max) * 100}%` }} /></div>
                                    <p className="text-xs text-gray-600 mt-2">Today {money(c.actual)}, usual {money(c.normal)}. {c.why}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <select value={f.s} onChange={(e) => setNote(`${date}|${c.key}`, { s: e.target.value })} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5">
                                            {['Not reviewed', 'Investigating', 'Resolved'].map((o) => <option key={o}>{o}</option>)}
                                        </select>
                                        <input
                                            value={f.n} onChange={(e) => setNote(`${date}|${c.key}`, { n: e.target.value })}
                                            placeholder="Follow-up note, for example who was asked and what they said"
                                            className="flex-1 min-w-[220px] text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-brand-orange"
                                        />
                                    </div>
                                </div>
                            );
                        })}

                        <Sub>Stock loss reports ({d.records.losses.length})</Sub>
                        <Tbl head={['Time', 'Item', 'Qty', 'Reason', 'Cost', 'Reported by', 'Reviewed by', 'Status', 'Photo']} empty="None recorded."
                            rows={d.records.losses.map((l) => (
                                <tr key={l.id} className="border-b border-gray-50">
                                    <Td>{fmtTime(l.time)}</Td><Td>{l.product}{l.note && <span className="block text-[11px] text-gray-500">{l.note}</span>}</Td>
                                    <Td>{l.qty}</Td><Td>{niceReason(l.reason)}</Td><Td cls="font-mono">{l.cost ? money(l.cost) : '-'}</Td>
                                    <Td>{l.by}</Td><Td>{l.reviewer || '-'}</Td><Td>{l.status}</Td><Td>{l.photo ? 'Attached' : 'None'}</Td>
                                </tr>
                            ))} />

                        <Sub>Void requests ({d.records.voids.length})</Sub>
                        <Tbl head={['Time', 'Bill', 'Amount', 'Reason', 'Cashier', 'Approved by', 'Status']} empty="None recorded."
                            rows={d.records.voids.map((v, i) => (
                                <tr key={i} className="border-b border-gray-50">
                                    <Td>{fmtTime(v.time)}</Td><Td>{v.bill}</Td><Td cls="font-mono">{money(v.amount)}</Td><Td>{v.reason}</Td>
                                    <Td>{v.by}</Td><Td>{v.reviewer || '-'}</Td><Td>{v.status}</Td>
                                </tr>
                            ))} />

                        <Sub>Sales made below cost ({d.records.below.length})</Sub>
                        <Tbl head={['Time', 'Bill', 'Item', 'Qty', 'Sold at', 'Cost', 'Margin lost', 'Cashier']} empty="None recorded."
                            rows={d.records.below.map((b, i) => (
                                <tr key={i} className="border-b border-gray-50">
                                    <Td>{fmtTime(b.time)}</Td><Td>{b.bill}</Td><Td>{b.product}</Td><Td>{b.qty}</Td>
                                    <Td cls="font-mono">{money(b.sold)}</Td><Td cls="font-mono">{money(b.cost)}</Td>
                                    <Td cls="font-mono text-red-600 font-bold">{money(b.loss)}</Td><Td>{b.by}</Td>
                                </tr>
                            ))} />
                    </>
                );
            })()}
        </div>
    );
                        }
