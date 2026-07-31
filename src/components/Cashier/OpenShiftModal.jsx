import { useState } from 'react';
import { toast } from 'react-toastify';
import { Wallet, X } from 'lucide-react';
import API from '../../api/axios';

export default function OpenShiftModal({ open, onClose, onOpened }) {
    const [openingFloat, setOpeningFloat] = useState('');
    const [saving, setSaving] = useState(false);

    if (!open) return null;

    const handleOpen = async () => {
        if (openingFloat === '' || isNaN(openingFloat) || Number(openingFloat) < 0) {
            return toast.error('Enter a valid opening float');
        }
        setSaving(true);
        try {
            await API.post('/shifts/open', { openingFloat: Number(openingFloat) });
            toast.success('Shift opened');
            onOpened();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to open shift');
        }
        setSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xs w-full p-6 shadow-2xl border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-base font-black text-gray-800 flex items-center gap-2">
                        <Wallet size={18} className="text-orange-500" /> Open Shift
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
                </div>
                <label className="text-xs font-semibold text-gray-400 mb-1 block">Opening Cash Float (KES)</label>
                <input
                    type="number"
                    autoFocus
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleOpen()}
                    placeholder="e.g. 2000"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-center focus:outline-none focus:border-orange-500"
                />
                <button onClick={handleOpen} disabled={saving}
                    className="w-full mt-4 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-50">
                    {saving ? 'Opening…' : 'Open Shift'}
                </button>
            </div>
        </div>
    );
}
