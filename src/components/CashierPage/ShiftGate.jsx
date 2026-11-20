import { useState } from 'react';
import { Lock } from 'lucide-react';
import OpenShiftModal from '../Cashier/OpenShiftModal';

// ---- Shift gate: cashier can't sell without an open shift ----
export default function ShiftGate({ onOpened }) {
    const [showOpenShift, setShowOpenShift] = useState(false);

    return (
        <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
            <Lock size={32} className="text-brand-orange" />
            <p className="text-gray-600 font-semibold">Open your shift to start selling</p>
            <button onClick={() => setShowOpenShift(true)} className="bg-brand-orange hover:bg-brand-orange-hover text-white px-6 py-2.5 rounded-xl text-sm font-bold">
                Open Shift
            </button>
            <OpenShiftModal
                open={showOpenShift}
                onClose={() => setShowOpenShift(false)}
                onOpened={() => { setShowOpenShift(false); onOpened(); }}
            />
        </div>
    );
}
