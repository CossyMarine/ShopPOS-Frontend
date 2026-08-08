import { useState } from 'react';
import { FileText, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import ConfirmModal from './ConfirmModal';

const currentPeriod = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function PayslipModal({ employee, onClose }) {
    const [period, setPeriod] = useState(currentPeriod());
    const [slip, setSlip] = useState(null);
    const [running, setRunning] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    if (!employee) return null;

    const handlePeriodChange = (val) => {
        setPeriod(val);
        setSlip(null); // don't show stale numbers from the previous period
    };

    const runPayroll = async () => {
        setRunning(true);
        setSlip(null);
        try {
            const res = await API.post('/payroll/run', { userId: employee.id, period });
            setSlip(res.data);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to run payroll');
        }
        setRunning(false);
    };

    const disburse = async () => {
        setConfirming(true);
        try {
            const res = await API.post(`/payroll/${slip._id}/confirm`);
            setSlip(res.data);
            toast.success('Payout disbursed');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to disburse payout');
        }
        setConfirming(false);
        setConfirmOpen(false);
    };

    const row = (label, value, tone = 'text-gray-900') => (
        <div className="flex justify-between py-1.5 border-b border-gray-100 text-xs">
            <span className="text-gray-600">{label}</span>
            <span className={`font-bold ${tone}`}>{value}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-3 border-b border-gray-100 mb-4">
                    <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                        <FileText size={18} className="text-orange-500" /> Payslip — {employee.fullName}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
                </div>

                <div className="flex gap-2 mb-4">
                    <input type="month" value={period} onChange={(e) => handlePeriodChange(e.target.value)}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold px-3 py-2" />
                    <button onClick={runPayroll} disabled={running}
                        className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-extrabold rounded-xl disabled:opacity-50">
                        {running ? 'Running…' : 'Run Payroll'}
                    </button>
                </div>

                {slip && (
                    <div className="space-y-4">
                        {slip.noSalary && (
                            <div className="bg-purple-50 border border-purple-200 text-purple-700 text-[11px] font-bold rounded-xl px-3 py-2">
                                This staff member is marked as unpaid (No Salary) — nothing is owed.
                            </div>
                        )}

                        <div className="space-y-1">
                            {row('Base Earnings', `${Math.round(slip.baseEarnings).toLocaleString()} KES`)}
                            {row('Overtime / Weekend Extras', `+${Math.round(slip.extraEarnings).toLocaleString()} KES`, 'text-green-600')}
                            {row('Commission', `+${Math.round(slip.commission).toLocaleString()} KES`, 'text-green-600')}
                            {row('Unpaid Leave Deduction', `-${Math.round(slip.leaveDeduction).toLocaleString()} KES`, 'text-red-500')}
                            {row('Statutory Tax & Levies', `-${Math.round(slip.taxDeductions).toLocaleString()} KES`, 'text-red-500')}
                            {(slip.customDeductions || []).map((d, i) => (
                                <div key={i}>{row(d.name, `-${Math.round(d.amount).toLocaleString()} KES`, 'text-red-500')}</div>
                            ))}
                        </div>

                        <div className="bg-orange-50 p-3.5 rounded-xl border border-orange-200 flex justify-between items-center">
                            <span className="text-xs font-black uppercase text-gray-700">Net Payable</span>
                            <span className="text-lg font-black text-orange-500">{Math.round(slip.netPayable).toLocaleString()} KES</span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className={`text-[10px] font-extrabold px-2 py-1 rounded ${
                                slip.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>{slip.status.toUpperCase()}</span>

                            {slip.status === 'pending' && (
                                <button onClick={() => setConfirmOpen(true)} disabled={confirming}
                                    className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-extrabold rounded-xl transition shadow-md flex items-center gap-2 disabled:opacity-50">
                                    <Send size={13} /> Disburse Payout
                                </button>
                            )}
                        </div>
                    </div>
                )}

                <ConfirmModal
                    open={confirmOpen}
                    title="Disburse this payout?"
                    description={slip ? `Pay ${employee.fullName} ${Math.round(slip.netPayable).toLocaleString()} KES for ${period}? This marks the payslip as paid.` : ''}
                    confirmLabel="Disburse"
                    loading={confirming}
                    onConfirm={disburse}
                    onClose={() => setConfirmOpen(false)}
                />
            </div>
        </div>
    );
                }
