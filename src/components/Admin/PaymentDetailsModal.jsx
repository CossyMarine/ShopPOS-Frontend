import { X, ShieldCheck, User, UserCircle2, Mail, Phone, Clock, Landmark, Smartphone, Wallet, Gift, Layers } from 'lucide-react';

const METHOD_META = {
    cash:          { label: 'Cash',        icon: Wallet },
    mpesa_till:    { label: 'M-Pesa Till', icon: Smartphone },
    mpesa_paybill: { label: 'Paybill',     icon: Smartphone },
    mpesa_pochi:   { label: 'Pochi',       icon: Smartphone },
    mpesa_stk:     { label: 'STK Push',    icon: Smartphone },
    manual_till:   { label: 'Manual Till', icon: Landmark },
    reward:        { label: 'Reward',      icon: Gift },
    both:          { label: 'Split',       icon: Layers },
};

// Works out who paid — Admin/Staff, a registered Customer Account, or a Walk-in —
// and pulls the best contact detail (email, falling back to phone) to show.
function resolvePayer(payment, receipt) {
    const p = payment.paidBy;

    if (p) {
        if (p.isAdmin) {
            return { label: 'Admin', name: p.fullName, contact: p.email || p.phone || null, Icon: ShieldCheck };
        }
        if (p.role === 'customer') {
            return { label: 'Customer Account', name: p.fullName, contact: p.email || p.phone || null, Icon: UserCircle2 };
        }
        return { label: 'Staff', name: p.fullName, contact: p.email || p.phone || null, Icon: ShieldCheck };
    }

    // No linked user on this specific payment entry — fall back to the bill's
    // registered customer if there is one, otherwise it was a walk-in/guest.
    if (receipt?.customer) {
        return {
            label: 'Customer Account',
            name: receipt.customer.fullName,
            contact: receipt.customer.email || receipt.customer.phone || null,
            Icon: UserCircle2,
        };
    }

    // STK/wallet payments sometimes only leave a phone number on the receipt itself
    if (receipt?.mpesaPhone) {
        return { label: 'Walk-in / Guest', name: 'Walk-in customer', contact: receipt.mpesaPhone, Icon: User };
    }

    return { label: 'Walk-in / Guest', name: 'Walk-in customer', contact: null, Icon: User };
}

function PayerBadge({ label, Icon }) {
    const tone =
        label === 'Admin'
            ? 'bg-orange-500 text-white border-orange-500'
            : label === 'Staff'
            ? 'bg-orange-50 text-orange-700 border-orange-200'
            : label === 'Customer Account'
            ? 'bg-white text-orange-600 border-orange-300'
            : 'bg-gray-50 text-gray-500 border-gray-200';

    return (
        <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide border ${tone}`}>
            <Icon size={11} /> {label}
        </span>
    );
}

function PaymentRow({ payment, receipt, muted }) {
    const meta = METHOD_META[payment.method] || { label: payment.method || '—', icon: Wallet };
    const MethodIcon = meta.icon;
    const payer = resolvePayer(payment, receipt);

    return (
        <div className={`rounded-xl border p-3 ${muted ? 'border-amber-200 bg-amber-50/60' : 'border-orange-100 bg-white'}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
                <PayerBadge label={payer.label} Icon={payer.Icon} />
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wide border border-gray-200 text-gray-500 bg-gray-50">
                    <MethodIcon size={11} /> {meta.label}
                </span>
            </div>

            <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800 text-sm">{payer.name}</span>
                <span className="font-black text-orange-600 text-sm">
                    KES {Number(payment.amount).toLocaleString()}
                </span>
            </div>

            {payer.contact && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
                    {payer.contact.includes('@') ? <Mail size={12} /> : <Phone size={12} />}
                    {payer.contact}
                </div>
            )}

            {!payer.contact && (
                <div className="mt-1 text-xs text-gray-400 italic">No email or phone on file</div>
            )}

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <span className="text-[11px] text-gray-400">{payment.reference || 'No reference'}</span>
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                    <Clock size={11} />
                    {new Date(payment.paidAt || payment.submittedAt).toLocaleString()}
                </span>
            </div>
        </div>
    );
}

export default function PaymentDetailsModal({ open, onClose, receipt }) {
    if (!open || !receipt) return null;

    const payments = receipt.payments || [];
    const pending = receipt.pendingManualPayments || [];
    const balanceDue = Number((receipt.subtotal - (receipt.amountPaid || 0)).toFixed(2));

    return (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-50 px-4">
            <div className="bg-white border border-orange-100 rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-start p-6 pb-4 border-b border-orange-100">
                    <div>
                        <h3 className="text-lg font-black text-gray-800">{receipt.billId}</h3>
                        <p className="text-orange-500 text-xs font-semibold mt-0.5">
                            {receipt.branch?.name} {receipt.cashierName ? `· ${receipt.cashierName}` : ''}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-orange-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 pt-4 space-y-4 overflow-y-auto">
                    <div className="flex justify-between items-center bg-orange-50 rounded-xl p-3">
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-orange-400 font-bold">Total</p>
                            <p className="font-black text-gray-800">KES {Number(receipt.subtotal).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-orange-400 font-bold">Paid</p>
                            <p className="font-black text-gray-800">KES {Number(receipt.amountPaid || 0).toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-orange-400 font-bold">Balance</p>
                            <p className={`font-black ${balanceDue > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                KES {balanceDue.toLocaleString()}
                            </p>
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-2">
                            Payments ({payments.length})
                        </p>
                        <div className="space-y-2">
                            {payments.length === 0 ? (
                                <p className="text-gray-400 text-sm text-center py-4">No payments recorded yet</p>
                            ) : (
                                payments.map((p, idx) => <PaymentRow key={idx} payment={p} receipt={receipt} />)
                            )}
                        </div>
                    </div>

                    {pending.length > 0 && (
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-2">
                                Awaiting Confirmation ({pending.length})
                            </p>
                            <div className="space-y-2">
                                {pending.map((p, idx) => (
                                    <PaymentRow
                                        key={idx}
                                        muted
                                        payment={{ ...p, method: 'manual_till' }}
                                        receipt={receipt}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-orange-100">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold transition-colors shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
          }
