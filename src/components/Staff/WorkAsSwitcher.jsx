import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Boxes } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const SCREENS = {
  cashier:     { path: '/cashier',     label: 'Cashier',     Icon: ShoppingCart },
  storekeeper: { path: '/storekeeper', label: 'Storekeeper', Icon: Boxes },
};

// For a cashier/storekeeper the admin has given extra access to.
// Shows one button per screen they may use; the current one is highlighted.
// Same login, so everything they do is recorded under their own account.
export default function WorkAsSwitcher({ current }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  if (!user || user.isAdmin || !(user.extraRoles || []).length) return null;

  const screens = [user.role, ...user.extraRoles].filter((r) => SCREENS[r]);

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
      {screens.map((r) => {
        const { path, label, Icon } = SCREENS[r];
        const active = r === current;
        return (
          <button key={r} onClick={() => !active && navigate(path)} title={`Work as ${label}`}
            className={`flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded-md transition ${
              active ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-200'
            }`}>
            <Icon size={12} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
