import { useState } from 'react';
import { money } from './utils';

function StaffSalaryModal({ staff, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
                    <h3 className="text-sm font-extrabold text-gray-900">Staff Salary Breakdown</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm font-bold" aria-label="Close">✕</button>
                </div>
                <div className="p-5 space-y-3">
                    {staff.length === 0 && <p className="text-xs text-gray-400">No paid salaries in this range.</p>}
                    {staff.map((s, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{s.staffName}</p>
                                    <p className="text-[11px] text-gray-500">{s.jobTitle || s.role} · {s.period} · {s.wageType}</p>
                                </div>
                                <span className="text-sm font-extrabold text-brand-orange">{money(s.netPayable)}</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-600 mt-2">
                                <div>Base: <span className="font-bold text-gray-800">{money(s.baseEarnings)}</span></div>
                                <div>Extra: <span className="font-bold text-gray-800">{money(s.extraEarnings)}</span></div>
                                <div>Commission: <span className="font-bold text-gray-800">{money(s.commission)}</span></div>
                                <div>Tax: <span className="font-bold text-gray-800">{money(s.taxDeductions)}</span></div>
                            </div>
                            {s.customDeductions?.length > 0 && (
                                <div className="mt-2 text-[11px] text-gray-500">
                                    Other deductions: {s.customDeductions.map((d) => `${d.name} (${money(d.amount)})`).join(', ')}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function Salary({ salary }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-extrabold text-gray-900">Salary Payments This Range</h2>
                <button onClick={() => setOpen(true)} className="text-xs font-bold text-brand-orange hover:underline">
                    View staff breakdown
                </button>
            </div>
            {salary.upcomingPayouts.length === 0 ? (
                <p className="text-xs text-gray-400">No upcoming payout dates scheduled.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-left text-gray-500 border-b border-gray-100">
                                <th className="pb-2 font-bold">Staff</th>
                                <th className="pb-2 font-bold">Job Title</th>
                                <th className="pb-2 font-bold">Next Payout</th>
                                <th className="pb-2 font-bold text-right">Est. Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salary.upcomingPayouts.map((p) => (
                                <tr key={p.staffId} className="border-b border-gray-50">
                                    <td className="py-2 font-semibold text-gray-800">{p.staffName}</td>
                                    <td className="py-2 text-gray-500">{p.jobTitle || '—'}</td>
                                    <td className="py-2 text-gray-500">{p.nextPayoutDate ? new Date(p.nextPayoutDate).toLocaleDateString('en-KE') : '—'}</td>
                                    <td className="py-2 text-right font-bold text-gray-800">{money(p.estimatedAmount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {open && <StaffSalaryModal staff={salary.staffSalaryDetail} onClose={() => setOpen(false)} />}
        </div>
    );
}
