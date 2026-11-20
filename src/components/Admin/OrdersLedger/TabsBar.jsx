export default function TabsBar({
    tab,
    onSelectTab,
    unpaidCount,
    paidCount,
    allTotal,
    pendingOnlineCount,
}) {
    return (
        <div className="flex gap-2 flex-wrap">
            {["unpaid", "paid", "all", "pending-online", "shifts"].map((t) => (
                <button
                    key={t}
                    onClick={() => onSelectTab(t)}
                    className={`relative px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                        tab === t
                            ? "bg-orange-500 text-white shadow-md shadow-orange-500/10"
                            : "bg-white border border-gray-200 text-gray-600 hover:text-orange-500 shadow-sm"
                    }`}
                >
                    {t === "all"
                        ? `All (${allTotal})`
                        : t === "pending-online"
                        ? "Pending Online"
                        : t === "shifts"
                        ? "Shift History"
                        : `${t} (${t === "unpaid" ? unpaidCount : paidCount})`}

                    {t === "pending-online" && pendingOnlineCount > 0 && (
                        <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-black shadow">
                            {pendingOnlineCount > 9 ? "9+" : pendingOnlineCount}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
