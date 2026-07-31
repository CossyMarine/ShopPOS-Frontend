import { useState } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import { 
  UtensilsCrossed, 
  ClipboardList, 
  Receipt, 
  TrendingUp, 
  ArrowLeft,
  Sparkles
} from "lucide-react";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import { routeForUser } from "../utils/routeForUser";

export default function LoginPage({ onAuthed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(
    searchParams.get("tab") === "register" ? "register" : "login"
  );

  const handleAuthSuccess = async (user) => {
    await onAuthed?.();
    const isStaff = user.isAdmin || ["cashier", "storekeeper", "branchManager"].includes(user.role);
    if (isStaff) {
      navigate(routeForUser(user), { replace: true });
    } else {
      navigate(location.state?.from || "/home", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex font-sans">
      {/* Left panel — Branding & Value Props */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-stone-900 border-r border-stone-800 p-12 relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <UtensilsCrossed size={20} />
          </div>
          <span className="font-black text-2xl tracking-tight text-white">
            Resto<span className="text-orange-500">POS</span>
          </span>
        </div>

        <div className="relative z-10 my-auto py-12">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles size={12} /> Next-Gen Restaurant Management
          </span>
          <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6 tracking-tight">
            Your restaurant,<br />
            <span className="text-orange-500">fully in control.</span>
          </h2>
          <p className="text-stone-400 text-base leading-relaxed max-w-md font-medium">
            // Line ~58, replace the marketing copy:
Seamlessly coordinate every register, branch, and storekeeper task—all from one lightning-fast terminal.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-3 gap-4 relative z-10">
          {[
            { icon: ClipboardList, label: "Live Orders", sub: "Instant Sync" },
            { icon: Receipt, label: "E-Receipts", sub: "Fast Billing" },
            { icon: TrendingUp, label: "Revenue", sub: "Real-time Metrics" },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-stone-800/60 border border-stone-700/50 backdrop-blur-xs rounded-2xl p-4 transition-all hover:border-stone-600"
            >
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center mb-2">
                <item.icon size={18} />
              </div>
              <div className="text-white text-sm font-bold">{item.label}</div>
              <div className="text-stone-400 text-[11px] font-medium">{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — Form Container */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative">
        {/* Mobile Header Branding */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md">
            <UtensilsCrossed size={18} />
          </div>
          <span className="font-black text-2xl text-white tracking-tight">
            Resto<span className="text-orange-500">POS</span>
          </span>
        </div>

        <div className="w-full max-w-sm">
          {/* Section Heading */}
          <div className="mb-6 text-center lg:text-left">
            <h1 className="text-2xl lg:text-3xl font-black text-white mb-2 tracking-tight">
              {tab === "login" ? "Welcome back" : "Create an account"}
            </h1>
            <p className="text-stone-400 text-sm font-medium">
              {tab === "login"
                ? "Sign in — staff and customer accounts both work here."
                : "Sign up to start tracking orders and earning rewards."}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-stone-100">
            {/* Tab Selector */}
            <div className="flex border-b border-stone-100 bg-stone-50/50 p-1">
              {[
                { id: "login", label: "Log In" },
                { id: "register", label: "Sign Up" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all rounded-2xl ${
                    tab === t.id
                      ? "bg-white text-orange-600 shadow-xs"
                      : "text-stone-400 hover:text-stone-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Active Form Body */}
            <div className="p-6">
              {tab === "login" ? (
                <LoginForm
                  onSuccess={handleAuthSuccess}
                  onSwitchToRegister={() => setTab("register")}
                />
              ) : (
                <RegisterForm onSuccess={handleAuthSuccess} />
              )}
            </div>
          </div>

          {/* Footer Direct Nav Actions */}
          <div className="mt-6 text-center space-y-3">
            <p className="text-xs font-semibold text-stone-400">
              Here to order food instead?{" "}
              <Link
                to="/home"
                className="text-orange-400 font-bold hover:text-orange-300 transition-colors underline underline-offset-2"
              >
                Go to customer menu
              </Link>
            </p>

            <button
              onClick={() => navigate("/home")}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-300 transition-colors py-1"
            >
              <ArrowLeft size={14} /> Back to main home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
