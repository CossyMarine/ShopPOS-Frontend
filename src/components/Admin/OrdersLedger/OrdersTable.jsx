import { Eye, Clock, Gift, ChevronLeft, ChevronRight } from "lucide-react";
import StatusPill from "./StatusPill";

export default function OrdersTable({
    tab,
    rows,
    loading,
    allLoading,
    balanceDue,
    rowHighlight,
    setViewing,
    setSelected,
    setRewardPayTarget,

    allPage,
    allTotalPages,
    allTotal,
    fetchAllReceipts,

    showRewardButton = true,
}) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="text-gray-400 font-semibold border-b border-gray-100">
                            <th className="p-3">Bill ID</th>
                            <th className="p-3">Branch</th>
                            <th className="p-3">Cashier</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Balance Due</th>
                            <th className="p-3">Date</th>
                            {tab === "all" && <th className="p-3">Status</th>}
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 text-gray-600">
                        {(tab === "all" ? allLoading : loading) ? (
                            <tr>
                                <td colSpan={8} className="p-6 text-center text-gray-400 font-medium">
                                    Loading...
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="p-6 text-center text-gray-400 font-medium">
                                    No {tab === "all" ? "" : tab === "pending-online" ? "pending online" : tab} receipts
                                </td>
                            </tr>
                        ) : (
                            rows.map((r) => (
                                <tr
                                    key={r._id}
                                    className={`transition-colors ${
                                        tab === "all" ? rowHighlight(r.status) : "hover:bg-gray-50/70"
                                    }`}
                                >
                                    <td className="p-3 font-bold text-orange-500">
                                        {r.billId}
                                        {r.pendingManualPayments?.length > 0 && (
                                            <span className="ml-2 inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide bg-amber-100 text-amber-700 border border-amber-200 align-middle">
                                                <Clock size={9} />
                                                Confirm Pending
                                            </span>
                                        )}
                                    </td>

                                    <td className="p-3 font-semibold text-gray-800">{r.branch?.name || "—"}</td>

                                    <td className="p-3 font-medium">{r.cashierName || "—"}</td>

                                    <td className="p-3 font-bold text-gray-800">KES {r.subtotal.toLocaleString()}</td>

                                    <td className="p-3 font-semibold text-gray-600">KES {balanceDue(r).toLocaleString()}</td>

                                    <td className="p-3 text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</td>

                                    {tab === "all" && (
                                        <td className="p-3">
                                            <StatusPill status={r.status} />
                                        </td>
                                    )}

                                    <td className="p-3 text-right space-x-3 whitespace-nowrap">
                                        <button
                                            onClick={() => setViewing(r)}
                                            className="inline-flex items-center gap-1 text-gray-400 hover:text-orange-500 text-xs font-semibold transition-colors"
                                        >
                                            <Eye size={14} />
                                            View
                                        </button>

                                        {["unpaid", "partial"].includes(r.status) && (
                                            <>
                                                <button
                                                    onClick={() => setSelected(r)}
                                                    className="text-emerald-600 hover:text-emerald-700 text-xs font-bold transition-colors"
                                                >
                                                    Pay
                                                </button>

                                                {showRewardButton && (
                                                    <button
                                                        onClick={() => setRewardPayTarget(r)}
                                                        className="inline-flex items-center gap-1 text-purple-600 hover:text-purple-700 text-xs font-bold transition-colors"
                                                    >
                                                        <Gift size={13} />
                                                        Reward
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {tab === "all" && allTotalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                    <button
                        onClick={() => fetchAllReceipts(Math.max(1, allPage - 1))}
                        disabled={allPage <= 1}
                        className="flex items-center gap-1 text-xs font-bold text-gray-500 disabled:opacity-30 hover:text-orange-500"
                    >
                        <ChevronLeft size={14} />
                        Prev
                    </button>

                    <span className="text-xs font-semibold text-gray-500">
                        Page {allPage} of {allTotalPages} · {allTotal} bills
                    </span>

                    <button
                        onClick={() => fetchAllReceipts(Math.min(allTotalPages, allPage + 1))}
                        disabled={allPage >= allTotalPages}
                        className="flex items-center gap-1 text-xs font-bold text-gray-500 disabled:opacity-30 hover:text-orange-500"
                    >
                        Next
                        <ChevronRight size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}
