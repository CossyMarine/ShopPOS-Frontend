import { useState, useEffect, useMemo, useCallback } from 'react';
import { Send, X, Users2, Wallet, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import { useBranch } from '../../context/BranchContext';
import { buildDeductionOptions, currentPeriod, money, PAYROLL_ROLE_OPTIONS } from '../../utils/payroll';

export default function GlobalPayoutModal({ open, onClose, staffUsers = [], onCompleted }) {
    const { branches, selectedBranch, isAdmin } = useBranch();

    const [role, setRole] = useState('all');
    const [branch, setBranch] = useState('');
    const [period, setPeriod] = useState(currentPeriod());
    const [applyDeductions, setApplyDeductions] = useState(true);
    const [selectedDeductionIds, setSelectedDeductionIds] = useState([]); // [] = all

    const [deductions, setDeductions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [running, setRunning] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (!open) return;
        setResult(null);
        setBranch(isAdmin ? (selectedBranch || '') : '');
        API.get('/deductions').then((res) => setDeductions(res.data || [])).catch(() => {});
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchSummary = useCallback(() => {
        if (!open) return;
        setSummaryLoading(true);
        const params = {};
        if (role !== 'all') params.role = role;
        if (isAdmin && branch) params.branch = branch;
        API.get('/payroll/summary', { params })
            .then((res) => setSummary(res.data))
            .catch(() => setSummary(null))
            .finally(() => setSummaryLoading(false));
    }, [open, role, branch, isAdmin]);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);

    const deductionOptions = useMemo(() => buildDeductionOptions(deductions, null), [deductions]);
    const isAllSelected = !selectedDeductionIds || selectedDeductionIds.length === 0;
    const checkedIds = isAllSelected ? deductionOptions.map((o) => o._id) : selectedDeductionIds;

    const toggleDeduction = (id) => {
        const current = isAllSelected ? deductionOptions.map((o) => o._id) : selectedDeductionIds;
        const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
        const allIds = deductionOptions.map((o) => o._id);
        const isNowAll = next.length === allIds.length && allIds.every((x) => next.includes(x));
        setSelectedDeductionIds(isNowAll ? [] : next);
    };

    const nameFor = (userId) => staffUsers.find((u) => String(u.id) === String(userId))?.fullName || 'Staff member';

    if (!open) return null;

    const runPayout = async () => {
        setRunning(true);
        setResult(null);
        try {
            const body = {
                period,
                role: role === 'all' ? undefined : role,
                branch: isAdmin && branch ? branch : undefined,
                applyDeductions,
            };
            if (applyDeductions && !isAllSelected) body.selectedDeductionIds = checkedIds;

            const res = await API.post('/payroll/run-bulk', body);
            setResult(res.data);
            if (res.data.count > 0) toast.success(`${res.data.count} payslip${res.data.count === 1 ? '' : 's'} ready — review and disburse below`);
            if (res.data.skippedCount > 0) toast.info(`${res.data.skippedCount} skipped — see details below`);
            if (res.data.count === 0 && res.data.skippedCount === 0) toast.info('No staff matched this filter');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to run payout');
        }
        setRunning(false);
    };

    const confirmAll = async () => {
        const ids = (result?.payslips || []).filter((p) => p.status === 'pending').map((p) => p._id);
        if (ids.length === 0) return;
        setConfirming(true);
        try {
            const res = await API.post('/payroll/confirm-bulk', { payslipIds: ids });
            toast.success(`Disbursed ${res.data.count} payout${res.data.count === 1 ? '' : 's'} — ${money(res.data.totalNet)} total`);
            setResult((r) => ({
                ...r,
                payslips: r.payslips.map((p) => res.data.confirmed.find((c) => c._id === p._id) || p),
            }));
            onCompleted?.();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to disburse payouts');
        }
        setConfirming(false);
    };

    const pendingCount = (result?.payslips || []).filter((p) => p.status === 'pending').length;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center px-6 pt-5 pb-3 border-b border-gray-100 sticky top-0 bg-white z-10">
                    <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                        <Send size={18} className="text-orange-500" /> Global Payout
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-xs text-gray-500">
                        Pay everyone with a wage profile at once, or narrow it down to just one role — cashiers, storekeepers, branch managers, or general staff.
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">Period</span>
                            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold px-3 py-2" />
                        </div>
                        {isAdmin && (
                            <div>
                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">Branch</span>
                                <select value={branch} onChange={(e) => setBranch(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold px-3 py-2">
                                    <option value="">All Branches</option>
                                    {branches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">Role</span>
                        <div className="flex flex-wrap gap-2">
                            {PAYROLL_ROLE_OPTIONS.map((r) => (
                                <button key={r.value} onClick={() => setRole(r.value)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                        role === r.value ? 'bg-orange-500 text-white' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-orange-400'
                                    }`}>
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 col-span-1">
                            <span className="text-[10px] font-black uppercase text-orange-700 tracking-wider block">Est. Monthly Payroll</span>
                            {summaryLoading ? (
                                <p className="text-sm font-bold text-orange-400 mt-1.5">Loading…</p>
                            ) : (
                                <p className="text-xl font-black text-orange-600 mt-0.5">{money(summary?.estMonthlyPayroll)}</p>
                            )}
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">In Scope</span>
                                <p className="text-lg font-black text-gray-900 mt-0.5">{summary?.count ?? '—'}</p>
                            </div>
                            <Users2 size={18} className="text-gray-300" />
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block">Unpaid / No Salary</span>
                                <p className="text-lg font-black text-purple-600 mt-0.5">{summary?.noSalaryCount ?? '—'}</p>
                            </div>
                            <Wallet size={18} className="text-gray-300" />
                        </div>
                    </div>

                    <label className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-xl">
                        <div>
                            <span className="text-xs font-bold text-gray-800 block">Apply statutory deductions</span>
                            <span className="text-[10px] text-gray-500">Turn off to pay everyone in scope their full gross this run — doesn't change anyone's saved settings</span>
                        </div>
                        <input type="checkbox" checked={applyDeductions}
                            onChange={(e) => setApplyDeductions(e.target.checked)}
                            className="w-4 h-4 accent-green-600 shrink-0 ml-3" />
                    </label>

                    {applyDeductions && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Which deductions apply this run</span>
                                {!isAllSelected && (
                                    <button type="button" onClick={() => setSelectedDeductionIds([])}
                                        className="text-[10px] font-bold text-orange-500 hover:text-orange-600">
                                        Select all
                                    </button>
                                )}
                            </div>
                            <p className="text-[10px] text-gray-400 -mt-1">
                                Default is all available deductions. Narrowing this down only restricts what's taken this run — each person's own deduction settings are unaffected.
                            </p>
                            {deductionOptions.map((opt) => (
                                <label key={opt._id} className="flex items-start gap-2 py-1 cursor-pointer">
                                    <input type="checkbox" checked={checkedIds.includes(opt._id)}
                                        onChange={() => toggleDeduction(opt._id)}
                                        className="w-3.5 h-3.5 accent-orange-500 mt-0.5 shrink-0" />
                                    <span className="flex-1">
                                        <span className="text-xs font-bold text-gray-800 block">{opt.name}</span>
                                        <span className="text-[10px] text-gray-400">
                                            {opt.calcType === 'percentage' ? `${opt.amount}%` : `${Number(opt.amount).toLocaleString()} KES flat`}
                                            {opt.note ? ` · ${opt.note}` : ''}
                                        </span>
                                    </span>
                                </label>
                            ))}
                        </div>
                    )}

                    <button onClick={runPayout} disabled={running}
                        className="w-full py-3 bg-gray-900 hover:bg-black text-white text-sm font-extrabold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                        {running ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                        {running ? 'Running payout…' : 'Run Payout'}
                    </button>

                    {result && (
                        <div className="space-y-3 pt-2 border-t border-gray-100">
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3.5 flex items-center justify-between">
                                <span className="text-xs font-black uppercase text-gray-700">Total Net This Run</span>
                                <span className="text-lg font-black text-orange-500">{money(result.totalNet)}</span>
                            </div>

                            {(result.payslips || []).length > 0 && (
                                <div>
                                    <h4 className="text-xs font-extrabold text-gray-700 mb-1.5">Payslips ({result.payslips.length})</h4>
                                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                                        {result.payslips.map((p) => (
                                            <div key={p._id} className="flex items-center justify-between px-3 py-2 text-xs bg-white">
                                                <span className="font-bold text-gray-800">{nameFor(p.user)}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-gray-900">{money(p.netPayable)}</span>
                                                    <span className={`flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded ${
                                                        p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {p.status === 'paid' ? <CheckCircle2 size={10} /> : <Clock3 size={10} />}
                                                        {p.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(result.skipped || []).length > 0 && (
                                <div>
                                    <h4 className="text-xs font-extrabold text-gray-700 mb-1.5">Skipped ({result.skipped.length})</h4>
                                    <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
                                        {result.skipped.map((s, i) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-2 text-xs bg-white">
                                                <span className="font-bold text-gray-800">{s.fullName || nameFor(s.userId)}</span>
                                                <span className="text-[10px] text-gray-400">{s.reason}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {pendingCount > 0 && (
                                <button onClick={confirmAll} disabled={confirming}
                                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white text-sm font-extrabold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                                    <Send size={15} /> {confirming ? 'Disbursing…' : `Confirm & Disburse All (${pendingCount})`}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
          }
