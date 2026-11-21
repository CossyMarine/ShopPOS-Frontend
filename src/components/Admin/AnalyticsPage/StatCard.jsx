
const SIZE = {
    label: 'text-2xl md:text-4xl',  
    value: 'text-4xl md:text-6xl',  
    sub: 'text-xl md:text-4xl',     
};

export default function StatCard({ label, value, amount = null, sub = null }) {
    const negative = amount !== null && amount < 0;
    return (
        <div className="bg-white border border-gray-200 rounded-md p-8">
            <p className={`${SIZE.label} text-gray-500`}>{label}</p>
            <p className={`${SIZE.value} font-semibold mt-3 break-words ${negative ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
            {sub && <p className={`${SIZE.sub} text-gray-400 mt-3`}>{sub}</p>}
        </div>
    );
}
