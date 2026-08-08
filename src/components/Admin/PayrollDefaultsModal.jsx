// components/Admin/PayrollDefaultsModal.jsx
import { useState, useEffect } from 'react';
import { Settings, X } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';
import WageRateFields from './WageRateFields';

const empty = {
    wageType: 'monthly', hourlyRate: '', overtimeMultiplier: '1.5',
    dailyRateWeekday: '', dailyRateWeekend: '', monthlySalary: '', commissionRate: '',
    schedule: { shiftStart: '08:00', shiftEnd: '17:00', disburseAfterHours: 10, intervalDays: 7, payDay: 28 },
    assumeShiftCheck: true,
};

export default function PayrollDefaultsModal({ open, onClose, branchId }) {
    const [form, setForm] = useState(empty);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        API.get('/payroll-settings', { params: branchId ? { branch: branchId } : {} })
            .then((res) => setForm(res.data ? { ...empty, ...res.data } : empty))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [open, branchId]);

    if (!open) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            await API.put('/payroll-settings', { ...form, branch: branchId || null });
            toast.success('Default payroll settings saved');
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save defaults');
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                    <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                        <Settings size={18} className="text-orange-500" /> Default Payroll Settings
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>

                {loading ? <p className="text-sm text-gray-400 py-6 text-center">Loading…</p> : (
                    <div className="space-y-3">
                        <WageRateFields form={form} setForm={setForm} />

                        <label className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-xl">
                            <div>
                                <span className="text-xs font-bold text-gray-800 block">Assume shift check</span>
                                <span className="text-[10px] text-gray-500">
                                    If someone doesn't clock out, assume they worked the shift window above. Off = strictly require a real clock-out.
                                </span>
                            </div>
                            <input type="checkbox" checked={form.assumeShiftCheck}
                                onChange={(e) => setForm({ ...form, assumeShiftCheck: e.target.checked })}
                                className="w-4 h-4 accent-green-600 shrink-0 ml-3" />
                        </label>

                        <div className="flex gap-3 pt-2 border-t border-gray-100 mt-1">
                            <button onClick={onClose} disabled={saving} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold text-sm">Cancel</button>
                            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm disabled:opacity-50">
                                {saving ? 'Saving…' : 'Save Defaults'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
