// Plain white box: thin border, no shadow, no icons, no colour.
export default function StatCard({ label, value, sub = null }) {
    return (
        <div className="bg-white border border-gray-200 rounded-md p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-semibold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
    );
}
