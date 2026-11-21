export default function StatCard({ label, value, icon: Icon, tone = 'text-gray-900', bg = 'bg-gray-50', sub = null }) {
    return (
        <div className="p-5 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon size={16} className={tone} />
                </div>
            </div>
            <p className={`text-2xl font-extrabold ${tone}`}>{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
    );
}
