import { useState, useEffect, useCallback } from 'react';
import {
    ArrowLeft, Wallet, Clock, CalendarClock, FileText, Percent,
    Phone, Mail, Building2, CheckCircle2, XCircle, Send, RefreshCw,
} from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import WageProfileModal from './WageProfileModal';
import PayslipModal from './PayslipModal';

const PAYMENT_METHODS = [
    { value: 'mpesa', label: 'M-Pesa' },
    { value: 'bank', label: 'Bank Transfer' },
    { value: 'cash', label: 'Cash' },
];

const money = (n) => `${Math.round(n || 0).toLocaleString()} KES`;

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDateTime = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export default function StaffDetailView({ userId, onBack, onChanged }) {
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [wageModalOpen, setWageModalOpen] = useState(false);
    const [payslipModalOpen, setPayslipModalOpen] = useState(false);
    const [savingQuickField, setSavingQuickField] = useState(false);
    const [nextPayoutDraft, setNextPayoutDraft] = useState('');

    const fetchOverview = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.get(`/staff/${userId}/overview`);
            setOverview(res.data);
            setNextPayoutDraft(res.data.wageProfile?.nextPayoutDate ? res.data.wageProfile.nextPayoutDate.slice(0, 10) : '');
        } catch (err) {
            console.error('Failed to load staff overview', err);
            toast.error('Failed to load staff details');
        }
        setLoading(false);
    }, [userId]);

    useEffect(() => { fetchOverview(); }, [fetchOverview]);

    if (loading) {
        return (
            <div className="py-20 text-center text-gray-400">
                <RefreshCw size={22} className="mx-auto mb-2 animate-spin" />
                <p className="text-sm font-medium">Loading staff details…</p>
            </div>
        );
    }

    if (!overview) {
        return (
            <div className="py-20 text-center text-gray-400">
                <p className="text-sm font-medium">Couldn't load this staff member.</p>
                <button onClick={onBack} className="mt-3 text-xs font-bold text-orange-500">← Back to Staff</button>
            </div>
        );
    }

    const { user, wageProfile, estMonthlyGross, workHistory, leaveHistory, payslipHistory, currentPeriodPreview } = overview;

    // Quick-edit a single wage profile field (payment method / next payout date)
    // without opening the full Wage modal. PUT expects the full body, so we
    // merge onto whatever profile is already loaded.
    const quickSaveWageField = async (patch) => {
        if (!wageProfile) return toast.error('Set up a wage profile first');
        setSavingQuickField(true);
        try {
            const body = { ...wageProfile, ...patch };
            await API.put(`/wages/${userId}`, body);
            toast.success('Updated');
            fetchOverview();
            onChanged?.();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update');
        }
        setSavingQuickField(false);
    };

    const workLabel = user.role === 'cashier' ? 'Shifts' : 'Attendance';

    return (
        <div className="space-y-5">
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-orange-500">
                <ArrowLeft size={14} /> Back to Staff
            </button>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black text-gray-900">{user.fullName}</h2>
                    <p className="text-xs font-bold text-gray-500 mt-0.5">
                        {user.isAdmin ? 'Super Admin' : user.role}{user.jobTitle ? ` · ${user.jobTitle}` : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                        {user.email && <span className="flex items-center gap-1"><Mail size={12} /> {user.email}</span>}
                        {user.phone && <span className="flex items-center gap-1"><Phone size={12} /> {user.phone}</span>}
                        {user.branch?.name && <span className="flex items-center gap-1"><Building2 size={12} /> {user.branch.name}</span>}
                    </div>
                </div>
                <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {user.isActive ? 'Active' : 'Deactivated'}
                </span>
            </div>

            {!wageProfile ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-extrabold text-amber-800">No wage profile set up yet</p>
                        <p className="text-xs text-amber-700 mt-0.5">Set a wage type and rate to start running payroll for {user.fullName}.</p>
                    </div>
                    <button onClick={() => setWageModalOpen(true)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold rounded-xl shrink-0">
                        Set Up Wage
                    </button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Est. Monthly Gross</span>
                            <p className="text-lg font-black text-gray-900 mt-0.5">{money(estMonthlyGross)}</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">This Period (est.)</span>
                            <p className="text-lg font-black text-orange-500 mt-0.5">
                                {currentPeriodPreview ? money(currentPeriodPreview.netPayable) : '—'}
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Payment Method</span>
                            <select
                                value={wageProfile.paymentMethod}
                                disabled={savingQuickField}
                                onChange={(e) => quickSaveWageField({ paymentMethod: e.target.value })}
                                className="mt-1 w-full text-xs font-extrabold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-400"
                            >
                                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Next Payout</span>
                            <input
                                type="date"
                                value={nextPayoutDraft}
                                disabled={savingQuickField}
                                onChange={(e) => setNextPayoutDraft(e.target.value)}
                                onBlur={() => {
                                    const current = wageProfile.nextPayoutDate ? wageProfile.nextPayoutDate.slice(0, 10) : '';
                                    if (nextPayoutDraft !== current) quickSaveWageField({ nextPayoutDate: nextPayoutDraft || null });
                                }}
                                className="mt-1 w-full text-xs font-extrabold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-400"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                                <Wallet size={16} className="text-orange-500" /> Wage Configuration
                            </h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setWageModalOpen(true)}
                                    className="text-xs font-bold text-gray-600 hover:text-orange-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                                    Edit
                                </button>
                                <button onClick={() => setPayslipModalOpen(true)}
                                    className="text-xs font-extrabold text-white bg-gray-900 hover:bg-black rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                                    <FileText size={13} /> Run Payroll
                                </button>
                            </div>
                        </div>
                        {wageProfile.noSalary ? (
                            <p className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
                                Marked as unpaid staff — excluded from payroll entirely.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                <div>
                                    <span className="text-gray-400 font-bold block">Wage Type</span>
                                    <span className="font-extrabold text-gray-800 capitalize">{wageProfile.wageType}</span>
                                </div>
                                {wageProfile.wageType === 'hourly' && (
                                    <div>
                                        <span className="text-gray-400 font-bold block">Hourly Rate</span>
                                        <span className="font-extrabold text-gray-800">{money(wageProfile.hourlyRate)}/hr</span>
                                    </div>
                                )}
                                {wageProfile.wageType === 'daily' && (
                                    <div>
                                        <span className="text-gray-400 font-bold block">Daily Rate</span>
                                        <span className="font-extrabold text-gray-800">{money(wageProfile.dailyRateWeekday)}/day</span>
                                    </div>
                                )}
                                {wageProfile.wageType === 'monthly' && (
                                    <>
                                        <div>
                                            <span className="text-gray-400 font-bold block">Monthly Salary</span>
                                            <span className="font-extrabold text-gray-800">{money(wageProfile.monthlySalary)}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400 font-bold block">Sales Commission</span>
                                            <span className="font-extrabold text-gray-800">
                                                {wageProfile.commissionRate || 0}%
                                                {user.role !== 'cashier' && (
                                                    <span className="block text-[10px] font-semibold text-gray-400 normal-case">
                                                        no attributable sales for this role — always 0
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <span className="text-gray-400 font-bold block flex items-center gap-1">
                                        <Percent size={11} /> Deductions
                                    </span>
                                    <span className="font-extrabold text-gray-800">
                                        {wageProfile.applyStatutoryDeductions
                                            ? (wageProfile.selectedDeductions?.length ? `${wageProfile.selectedDeductions.length} selected` : 'All applied')
                                            : 'None'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {currentPeriodPreview && !wageProfile.noSalary && (
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                            <h3 className="font-extrabold text-sm text-gray-900 mb-3">
                                {currentPeriodPreview.period} — Earned So Far (live estimate)
                            </h3>
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between py-1 border-b border-gray-100">
                                    <span className="text-gray-500">Base Earnings</span>
                                    <span className="font-bold text-gray-800">{money(currentPeriodPreview.baseEarnings)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-100">
                                    <span className="text-gray-500">Overtime / Extras</span>
                                    <span className="font-bold text-green-600">+{money(currentPeriodPreview.extraEarnings)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-100">
                                    <span className="text-gray-500">Commission</span>
                                    <span className="font-bold text-green-600">+{money(currentPeriodPreview.commission)}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-100">
                                    <span className="text-gray-500">Deductions</span>
                                    <span className="font-bold text-red-500">
                                        -{money(currentPeriodPreview.taxDeductions + currentPeriodPreview.customDeductionsTotal)}
                                    </span>
                                </div>
                                <div className="flex justify-between pt-2">
                                    <span className="text-gray-900 font-black uppercase text-[11px]">Net So Far</span>
                                    <span className="font-black text-orange-500">{money(currentPeriodPreview.netPayable)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2 mb-3">
                    <Clock size={16} className="text-orange-500" /> Recent {workLabel}
                </h3>
                {workHistory.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No {workLabel.toLowerCase()} recorded yet</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {workHistory.map((w, i) => (
                            <div key={i} className="flex items-center justify-between py-2 text-xs">
                                <div>
                                    <span className="font-bold text-gray-800">{fmtDateTime(w.clockIn)}</span>
                                    <span className="text-gray-400"> → {w.clockOut ? fmtDateTime(w.clockOut) : 'still open'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {w.hours != null && <span className="font-bold text-gray-600">{w.hours}h</span>}
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${w.status === 'closed' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600'}`}>
                                        {w.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2 mb-3">
                    <CalendarClock size={16} className="text-orange-500" /> Leave History
                </h3>
                {leaveHistory.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No leave requests yet</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {leaveHistory.map((lv) => (
                            <div key={lv._id} className="flex items-center justify-between py-2 text-xs">
                                <div>
                                    <span className="font-bold text-gray-800 capitalize">{lv.type} leave</span>
                                    <span className="text-gray-400"> · {fmtDate(lv.from)} – {fmtDate(lv.to)}</span>
                                </div>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                    lv.status === 'approved' ? 'bg-green-100 text-green-700'
                                    : lv.status === 'rejected' ? 'bg-red-100 text-red-600'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                    {lv.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2 mb-3">
                    <FileText size={16} className="text-orange-500" /> Payment History
                </h3>
                {payslipHistory.length === 0 ? (
                    <p className="text-xs text-gray-400 py-4 text-center">No payslips run yet</p>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {payslipHistory.map((p) => (
                            <div key={p._id} className="flex items-center justify-between py-2 text-xs">
                                <span className="font-bold text-gray-800">{p.period}</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-black text-gray-900">{money(p.netPayable)}</span>
                                    <span className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                        p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {p.status === 'paid' ? <CheckCircle2 size={11} /> : <Send size={11} />}
                                        {p.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <WageProfileModal
                user={wageModalOpen ? { id: userId, fullName: user.fullName, role: user.role} : null}
                onClose={() => setWageModalOpen(false)}
                onSaved={() => { fetchOverview(); onChanged?.(); }}
            />

            <PayslipModal
                employee={payslipModalOpen ? { id: userId, fullName: user.fullName } : null}
                onClose={() => { setPayslipModalOpen(false); fetchOverview(); }}
            />
        </div>
    );
                                                           }
