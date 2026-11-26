export default function SummaryCards({ summary }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wider font-bold text-emerald-600">Paid Today</p>
                <h3 className="text-2xl font-black text-gray-800 mt-1">
                    KES {(summary.paidToday || 0).toLocaleString()}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{summary.paidTodayCount || 0} receipts</p>
            </div>
            <div className="bg-white border border-rose-200 rounded-2xl p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wider font-bold text-rose-600">On Credit Today</p>
                <h3 className="text-2xl font-black text-gray-800 mt-1">
                    KES {(summary.creditToday || 0).toLocaleString()}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{summary.creditTodayCount || 0} receipts, sold but still owing</p>
            </div>
            <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wider font-bold text-amber-600">Unpaid Today</p>
                <h3 className="text-2xl font-black text-gray-800 mt-1">
                    KES {(summary.unpaidToday || 0).toLocaleString()}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{summary.unpaidTodayCount || 0} receipts</p>
            </div>
        </div>
    );
}
