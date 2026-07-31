import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserCircle2,
  LogOut,
  Phone,
  Mail,
  ShieldCheck,
  Camera,
  UserCog,
  Receipt,
  Wallet,
  PhoneCall,
  ChevronRight,
  UserPlus,
  LogIn,
  LayoutDashboard,
  Award,
  Coins,
  Sparkles,
  Zap
} from "lucide-react";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../hooks/useAuth";
import { routeForUser } from "../utils/routeForUser";
import API from "../api/axios";

function initials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "U"
  );
}

function formatJoinDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

const STAFF_ROLE_LABEL = {
  branchManager: "Branch Manager",
  cashier: "Cashier",
  storekeeper: "Storekeeper",
};

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [wallet, setWallet] = useState(null);
  const [callNumber, setCallNumber] = useState(null);

  const isStaff = !!user && (user.isAdmin || (user.role && user.role !== "customer"));

  useEffect(() => {
    if (!user || isStaff) return;
    API.get("/wallet/me")
      .then((res) => setWallet(res.data))
      .catch(() => {});
  }, [user, isStaff]);

  useEffect(() => {
    API.get("/settings/public")
      .then((res) => setCallNumber(res.data.callNumber))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400 font-semibold text-sm">
        Syncing your profile…
      </div>
    );
  }

  // ---------- Guest view: Login / Register ----------
  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 pb-24 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 text-4xl mb-5 border border-orange-100">
          <UserCircle2 size={40} />
        </div>
        <h1 className="text-xl font-black text-stone-900 mb-2">Account Required</h1>
        <p className="text-stone-500 text-sm mb-8 max-w-xs">
          Sign in to track your orders, pay bills from your wallet, and earn loyalty points.
        </p>

        <div className="w-full max-w-xs space-y-3">
          <Link
            to="/login"
            state={{ from: "/profile" }}
            className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm"
          >
            <LogIn size={18} />
            Log In
          </Link>
          <Link
            to="/login?tab=register"
            state={{ from: "/profile" }}
            className="w-full inline-flex items-center justify-center gap-2 bg-white border border-stone-200 hover:border-orange-300 hover:text-orange-600 text-stone-700 font-bold py-3.5 rounded-xl transition-colors shadow-sm"
          >
            <UserPlus size={18} />
            Register
          </Link>
        </div>

        <BottomNav />
      </div>
    );
  }

  // ---------- Logged-in view ----------
  const joined = formatJoinDate(user.createdAt);
  const missingEmail = !user.email;
  const missingPhone = !user.phone;

  const loyaltyPoints = wallet?.points ?? 0;
  const targetPoints = wallet?.targetPoints || 500;
  const progressPercent = Math.min((loyaltyPoints / targetPoints) * 100, 100);

  const staffLabel = user.isAdmin ? "Super Admin" : STAFF_ROLE_LABEL[user.role] || "Staff";

  const options = [
    ...(isStaff
      ? [{
          icon: LayoutDashboard,
          title: "POS Dashboard",
          subtitle: `Open your ${staffLabel} workspace`,
          onClick: () => navigate(routeForUser(user)),
        }]
      : [
          {
            icon: Receipt,
            title: "My Order History",
            subtitle: "Track live status updates and past receipts",
            onClick: () => navigate("/orders"),
          },
          {
            icon: Wallet,
            title: "Wallet & Rewards",
            subtitle: "Pay bills, view points, and redeem rewards",
            onClick: () => navigate("/wallet"),
          },
        ]
    ),
    {
      icon: UserCog,
      title: "Personal Details",
      subtitle: "Update account name, notification email, and phone contact",
      onClick: () => navigate("/profile/details"),
    },
    ...(callNumber
      ? [{
          icon: PhoneCall,
          title: "Call to Manage",
          subtitle: `Speak to us directly — ${callNumber}`,
          onClick: () => { window.location.href = `tel:${callNumber}`; },
        }]
      : [{
          icon: PhoneCall,
          title: "Help & Support Desk",
          subtitle: "Review help topics or reach support",
          onClick: () => navigate("/profile/support"),
        }]
    ),
  ];

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      <main className="max-w-md mx-auto px-5 pt-8 space-y-5">

        {/* HERO CARD */}
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 text-center relative overflow-hidden">
          <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${isStaff ? 'from-stone-900 to-stone-700' : 'from-orange-500 to-orange-400'}`} />

          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className={`w-24 h-24 border-4 border-white rounded-full flex items-center justify-center text-3xl font-black shadow-md ${isStaff ? 'bg-stone-100 text-stone-800' : 'bg-orange-50 text-orange-500'}`}>
              {initials(user.fullName)}
            </div>
            <button className={`absolute bottom-0 right-0 text-white w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-md transition-colors ${isStaff ? 'bg-stone-800 hover:bg-stone-900' : 'bg-orange-500 hover:bg-orange-600'}`}>
              <Camera size={13} />
            </button>
          </div>

          <h2 className="text-2xl font-black text-stone-900">{user.fullName}</h2>

          <div className="mt-2.5">
            {isStaff ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-stone-700 bg-stone-100 border border-stone-200 px-3 py-1 rounded-full">
                <UserCog size={11} /> {staffLabel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 border border-orange-100 px-3 py-1 rounded-full">
                <ShieldCheck size={11} /> Verified Customer
              </span>
            )}
          </div>

          {joined && <p className="text-xs text-stone-400 mt-2.5">Member since {joined}</p>}
        </div>

        {/* MISSING CONTACT PROMPT — shown until the user has both email and phone on file */}
        {(missingEmail || missingPhone) && (
          <button
            onClick={() => navigate("/profile/details")}
            className="w-full bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-orange-100/60 transition-colors"
          >
            <span className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center shrink-0 text-white">
              {missingEmail ? <Mail size={16} /> : <Phone size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-orange-900">
                Add your {missingEmail && missingPhone ? "email or phone" : missingEmail ? "email" : "phone number"}
              </p>
              <p className="text-xs text-orange-700/80">
                Keep your account secure and reachable — takes a second.
              </p>
            </div>
            <ChevronRight size={16} className="text-orange-400 shrink-0" />
          </button>
        )}

        {/* REWARDS CARD */}
        {!isStaff ? (
          <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-neutral-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden border border-stone-800">
            <div className="absolute -right-6 -bottom-6 text-stone-700/20 pointer-events-none transform rotate-12">
              <Award size={140} />
            </div>

            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="text-[10px] uppercase bg-orange-500 text-white px-2 py-0.5 rounded-md font-black tracking-widest flex items-center gap-1 w-fit">
                  <Sparkles size={10} /> Babylon Rewards
                </span>
                <p className="text-xs text-stone-400 mt-1.5 font-medium">Available Balance</p>
                <h3 className="text-2xl font-black tracking-tight mt-0.5 flex items-baseline gap-1.5 text-orange-400">
                  {loyaltyPoints} <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">Points</span>
                </h3>
              </div>
              <div className="bg-stone-800/80 p-2 rounded-xl border border-stone-700/50 text-orange-400">
                <Coins size={20} />
              </div>
            </div>

            <div className="space-y-2 relative z-10">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-stone-300">Next Reward Progress</span>
                <span className="text-stone-400">{loyaltyPoints} / {targetPoints} pts</span>
              </div>
              <div className="w-full bg-stone-700 rounded-full h-2 overflow-hidden p-0.5 border border-stone-800">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-400 font-medium pt-1">
                {loyaltyPoints >= targetPoints
                  ? "You can redeem your points against a bill now!"
                  : `Earn ${targetPoints - loyaltyPoints} more points to unlock redemption`}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-orange-600 to-amber-500 text-white rounded-3xl p-5 shadow-md relative overflow-hidden">
            <div className="absolute -right-6 -bottom-6 text-white/10 pointer-events-none transform rotate-12">
              <Zap size={130} />
            </div>

            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-black tracking-wide uppercase text-white/90">{staffLabel}</h3>
                <p className="text-[11px] text-orange-100">Head to your dashboard for live stats</p>
              </div>
              <span className="bg-white/20 text-white text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider backdrop-blur-xs">
                {user.isAdmin ? "All Branches" : "Active"}
              </span>
            </div>
          </div>
        )}

        {/* CONTACT INFO CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="w-9 h-9 rounded-lg bg-stone-50 flex items-center justify-center shrink-0 border border-stone-100">
              <Mail size={15} className="text-stone-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">Account Email</p>
              <p className="text-stone-800 font-semibold truncate">{user.email || "No email address linked"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="w-9 h-9 rounded-lg bg-stone-50 flex items-center justify-center shrink-0 border border-stone-100">
              <Phone size={15} className="text-stone-400" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">Mobile Contact</p>
              <p className="text-stone-800 font-semibold truncate">{user.phone || "No phone number listed"}</p>
            </div>
          </div>
        </div>

        {/* NAVIGATION OPTIONS */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 divide-y divide-stone-100 overflow-hidden">
          {options.map(({ icon: Icon, title, subtitle, onClick }) => (
            <button
              key={title}
              onClick={onClick}
              className="w-full p-4 hover:bg-stone-50/70 transition-colors flex items-center justify-between text-left group"
            >
              <div className="flex items-center space-x-4 min-w-0 flex-1 pr-2">
                <div className={`w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center text-stone-500 transition-colors ${isStaff ? 'group-hover:text-stone-900 group-hover:bg-stone-100' : 'group-hover:text-orange-500 group-hover:bg-orange-50'}`}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className={`text-sm font-bold text-stone-800 transition-colors ${isStaff ? 'group-hover:text-stone-900' : 'group-hover:text-orange-600'}`}>{title}</h4>
                  <p className="text-xs text-stone-400 truncate">{subtitle}</p>
                </div>
              </div>
              <ChevronRight size={14} className={`text-stone-300 transition-colors ${isStaff ? 'group-hover:text-stone-900' : 'group-hover:text-orange-500'}`} />
            </button>
          ))}
        </div>

        {/* LOGOUT CONTROL BUTTON */}
        <button
          onClick={logout}
          className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-100 font-bold py-4 rounded-2xl shadow-sm transition-all flex items-center justify-center space-x-2 group active:scale-98"
        >
          <LogOut size={16} className="group-hover:translate-x-0.5 transition-transform" />
          <span>Secure Sign Out</span>
        </button>
      </main>

      <BottomNav />
    </div>
  );
            }
