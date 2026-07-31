import { NavLink } from "react-router-dom";
import { Store, Receipt, Wallet, User } from "lucide-react";

const tabs = [
  { to: "/home", label: "Shop", icon: Store },
  { to: "/orders", label: "Orders", icon: Receipt },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/profile", label: "Profile", icon: User },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-stone-200 flex items-center justify-around z-40">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 flex-1 h-full text-xs font-semibold transition-colors ${
              isActive ? "text-orange-500" : "text-stone-400"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
