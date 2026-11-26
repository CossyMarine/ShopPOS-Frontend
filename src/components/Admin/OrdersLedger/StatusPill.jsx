export default function StatusPill({ status }) {
    const styles = {
        unpaid: 'bg-amber-50 text-amber-700 border-amber-200',
        partial: 'bg-blue-50 text-blue-700 border-blue-200',
        paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        credit: 'bg-rose-50 text-rose-700 border-rose-200',
        voided: 'bg-red-50 text-red-600 border-red-200',
    };
    return (
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${styles[status] || styles.unpaid}`}>
            {status === 'credit' ? 'on credit' : status}
        </span>
    );
}
