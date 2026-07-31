import { Store, ChevronDown } from 'lucide-react';
import { useBranch } from '../../context/BranchContext';

export default function BranchSelector() {
    const { branches, selectedBranch, setSelectedBranch, isAdmin } = useBranch();

    // Branch Manager: fixed label, no picker — they never leave their branch
    if (!isAdmin) {
        const mine = branches.find((b) => b._id === selectedBranch);
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
                <Store size={13} className="text-brand-orange shrink-0" />
                <span className="truncate">{mine?.name || 'Your Branch'}</span>
            </div>
        );
    }

    return (
        <div className="relative">
            <Store size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-orange pointer-events-none" />
            <select
                value={selectedBranch || ''}
                onChange={(e) => setSelectedBranch(e.target.value || null)}
                className="w-full appearance-none bg-gray-100 border border-gray-300 rounded-lg text-xs font-bold text-gray-800 pl-8 pr-7 py-2 focus:outline-none focus:bg-white focus:border-brand-orange transition cursor-pointer"
            >
                <option value="">All Branches</option>
                {branches.map((b) => (
                    <option key={b._id} value={b._id}>{b.name}</option>
                ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
    );
}
