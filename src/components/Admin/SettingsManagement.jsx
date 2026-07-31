import { useState, useEffect } from 'react';
import { Save, RefreshCw, Landmark, MessageCircle, Gift } from 'lucide-react';
import { toast } from 'react-toastify';
import API from '../../api/axios';

const EMPTY = {
    tillNumber: '',
    tillName: '',
    whatsappNumber: '',
    callNumber: '',
    reward: {
        enabled: false,
        cashbackPercent: 0,
        pointValueKes: 1,
        targetPoints: 0,
        description: '',
    },
};

export default function SettingsManagement() {
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await API.get('/settings');
            setForm({
                tillNumber: res.data.tillNumber || '',
                tillName: res.data.tillName || '',
                whatsappNumber: res.data.whatsappNumber || '',
                callNumber: res.data.callNumber || '',
                reward: {
                    enabled: !!res.data.reward?.enabled,
                    cashbackPercent: res.data.reward?.cashbackPercent ?? 0,
                    pointValueKes: res.data.reward?.pointValueKes ?? 1,
                    targetPoints: res.data.reward?.targetPoints ?? 0,
                    description: res.data.reward?.description || '',
                },
            });
        } catch (err) {
            console.error('Failed to fetch settings', err);
            toast.error('Failed to load settings');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const setReward = (patch) => setForm((f) => ({ ...f, reward: { ...f.reward, ...patch } }));

    const handleSave = async () => {
        setSaving(true);
        try {
            await API.patch('/settings', form);
            toast.success('Settings saved');
        } catch (err) {
            console.error('Failed to save settings', err);
            toast.error(err.response?.data?.message || 'Failed to save settings');
        }
        setSaving(false);
    };

    if (loading) {
        return <p className="text-gray-400 text-sm">Loading settings…</p>;
    }

    return (
        <div className="space-y-8 bg-gray-50 text-gray-800">
            <div className="flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800">Settings</h2>
                    <p className="text-sm text-gray-500">Payment channels, contact numbers, and the reward program</p>
                </div>
                <button
                    onClick={fetchSettings}
                    className="flex items-center gap-1.5 bg-white border border-gray-200 hover:border-orange-500/40 text-gray-500 hover:text-orange-500 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
                >
                    <RefreshCw size={14} />
                    Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Payment & contact */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
                    <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2">
                        <Landmark size={16} className="text-orange-500" />
                        Manual Till Payment
                    </h3>
                    <Field label="Till Number">
                        <input
                            value={form.tillNumber}
                            onChange={(e) => setForm({ ...form, tillNumber: e.target.value })}
                            placeholder="e.g. 123456"
                            className="input"
                        />
                    </Field>
                    <Field label="Till Name (optional)">
                        <input
                            value={form.tillName}
                            onChange={(e) => setForm({ ...form, tillName: e.target.value })}
                            placeholder="e.g. Buy Goods - Babylon Supermarket"
                            className="input"
                        />
                    </Field>

                    <h3 className="text-base font-black text-gray-800 border-b border-gray-100 pb-3 pt-2 flex items-center gap-2">
                        <MessageCircle size={16} className="text-orange-500" />
                        Contact Numbers
                    </h3>
                    <Field label="WhatsApp Number">
                        <input
                            value={form.whatsappNumber}
                            onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
                            placeholder="e.g. 254712345678"
                            className="input"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Powers the bouncing WhatsApp icon on the Customer Portal home page</p>
                    </Field>
                    <Field label="Call / Manage Number">
                        <input
                            value={form.callNumber}
                            onChange={(e) => setForm({ ...form, callNumber: e.target.value })}
                            placeholder="e.g. 254712345678"
                            className="input"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Shown as "Call to manage" on the customer profile page</p>
                    </Field>
                </div>

                {/* Reward program */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                            <Gift size={16} className="text-orange-500" />
                            Reward Program
                        </h3>
                        <button
                            onClick={() => setReward({ enabled: !form.reward.enabled })}
                            className={`relative w-11 h-6 rounded-full transition-colors ${form.reward.enabled ? 'bg-orange-500' : 'bg-gray-300'}`}
                        >
                            <span
                                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                    form.reward.enabled ? 'translate-x-5' : 'translate-x-0.5'
                                }`}
                            />
                        </button>
                    </div>

                    <Field label="Cashback %">
                        <input
                            type="number"
                            min="0"
                            max="100"
                            value={form.reward.cashbackPercent}
                            onChange={(e) => setReward({ cashbackPercent: parseFloat(e.target.value) || 0 })}
                            className="input"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">% of every payment converted to reward points</p>
                    </Field>

                    <Field label="Point Value (KES)">
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={form.reward.pointValueKes}
                            onChange={(e) => setReward({ pointValueKes: parseFloat(e.target.value) || 1 })}
                            className="input"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">
                            KES value of 1 point on redemption — e.g. 1 (1 pt = KSh 1) or 100 (1 pt = KSh 100)
                        </p>
                    </Field>

                    <Field label="Redemption Target (points)">
                        <input
                            type="number"
                            min="0"
                            value={form.reward.targetPoints}
                            onChange={(e) => setReward({ targetPoints: parseInt(e.target.value) || 0 })}
                            className="input"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Minimum balance a customer needs before they can redeem</p>
                    </Field>

                    <Field label="Description">
                        <textarea
                            value={form.reward.description}
                            onChange={(e) => setReward({ description: e.target.value })}
                            placeholder="e.g. Earn 1 point for every 10 KES spent — redeem 2000+ points against any bill."
                            rows={3}
                            className="input"
                        />
                        <p className="text-[11px] text-gray-400 mt-1">Shown to customers on their wallet page</p>
                    </Field>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-sm"
                >
                    <Save size={16} />
                    {saving ? 'Saving…' : 'Save Settings'}
                </button>
            </div>

            <style>{`
                .input {
                    width: 100%;
                    background: rgb(249 250 251);
                    border: 1px solid rgb(229 231 235);
                    border-radius: 0.75rem;
                    padding: 0.6rem 0.85rem;
                    font-size: 0.875rem;
                    color: rgb(31 41 55);
                }
                .input:focus {
                    outline: none;
                    border-color: rgb(249 115 22);
                    background: white;
                    box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1);
                }
                .input::placeholder {
                    color: rgb(156 163 175);
                }
            `}</style>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">{label}</label>
            {children}
        </div>
    );
                            }
