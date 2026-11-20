import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ShoppingCart, Boxes } from 'lucide-react';
import { useBranch } from '../../context/BranchContext';

// Super Admin only. Takes the admin into the Cashier or Storekeeper screen
// WITHOUT changing who he is — same login, same session — so every sale,
// shift, stock receipt or adjustment he makes there is recorded under his own
// account. The branch he has selected here is the branch he works in.
export default function ViewSwitcher() {
    const navigate = useNavigate();
    const { selectedBranch } = useBranch();

    const go = (path) => {
        if (!selectedBranch) return toast.error('Select a branch first (not "All Branches")');
        navigate(path);
    };

    const btn =
        'flex-1 flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition';

    return (
        <div>
            <p className="text-[10px] uppercase tracking-[.14em] text-slate-400 mb-1.5">Work as</p>
            <div className="flex gap-2">
                <button onClick={() => go('/cashier')} className={btn}>
                    <ShoppingCart size={13} /> Cashier
                </button>
                <button onClick={() => go('/storekeeper')} className={btn}>
                    <Boxes size={13} /> Storekeeper
                </button>
            </div>
        </div>
    );
}
