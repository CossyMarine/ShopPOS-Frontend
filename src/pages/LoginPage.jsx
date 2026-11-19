import { useState } from "react";
import { useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, Leaf, Gift, Check, Star } from "lucide-react";
import LoginForm from "../components/LoginForm";
import RegisterForm from "../components/RegisterForm";
import { routeForUser } from "../utils/routeForUser";
import heroImg from "../assets/supermarket-login.png";

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

  const features = [
    { icon: ShoppingCart, label: "Easy shopping", sub: "Quick checkout" },
    { icon: Leaf, label: "Fresh stock", sub: "Daily supplies" },
    { icon: Gift, label: "Rewards", sub: "Earn on every buy" },
  ];

  return (
    <div className="min-h-screen bg-white flex font-sans">
      {/* LEFT: form panel */}
      <main className="flex-1 flex items-center justify-center px-5 py-10 relative overflow-hidden bg-white">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-24 w-96 h-96 bg-emerald-50 rounded-full blur-3xl pointer-events-none" />

        <div className="relative w-full max-w-md">
          {/* Brand */}
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
              <ShoppingCart size={22} />
            </div>
            <div className="leading-tight">
              <div className="text-xl font-extrabold tracking-tight text-stone-900">
                Chemalug <span className="text-orange-500">Mugundoi</span>
              </div>
              <div className="text-[11px] font-bold uppercase tracking-[.25em] text-stone-400">
                Supermarket
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6 text-center lg:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-stone-500 mt-1.5">
              {tab === "login"
                ? "Sign in to continue."
                : "Shop faster, track orders and earn rewards on every purchase."}
            </p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl p-2 shadow-[0_30px_60px_-20px_rgba(28,25,23,.25)] border border-stone-100">
            <div className="flex bg-stone-100 rounded-2xl p-1">
              {[
                { id: "login", label: "Log in" },
                { id: "register", label: "Sign up" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition ${
                    tab === t.id
                      ? "bg-white text-orange-600 shadow-sm"
                      : "text-stone-400 hover:text-stone-600"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {tab === "login" ? (
                <LoginForm
                  onSuccess={handleAuthSuccess}
                  onSwitchToRegister={() => setTab("register")}
                />
              ) : (
                <RegisterForm
                  onSuccess={handleAuthSuccess}
                  onSwitchToLogin={() => setTab("login")}
                />
              )}
            </div>
          </div>

          <p className="text-center text-[11px] text-stone-400 mt-5">
            Secure session. Your sign-in is stored in a protected cookie.
          </p>
        </div>
      </main>

      {/* RIGHT: image panel — pure white fading into the image */}
      <aside className="hidden lg:block relative w-1/2 overflow-hidden bg-stone-900">
        <img
          src={heroImg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => e.currentTarget.remove()}
        />
        {/* white -> transparent, left to right */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, #ffffff 0%, rgba(255,255,255,.85) 18%, rgba(255,255,255,0) 65%)",
          }}
        />
        {/* dark fade at the bottom for text */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(12,10,9,.85) 0%, rgba(12,10,9,0) 50%)",
          }}
        />

        <div className="relative z-10 h-full flex flex-col justify-end p-12 pl-24 text-white">
          <div className="max-w-md ml-auto">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/25 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Fresh every day
            </span>
            <h2 className="text-4xl font-extrabold leading-[1.1] tracking-tight">
              Everything you need,
              <br />
              <span className="text-orange-300">under one roof.</span>
            </h2>
            <p className="mt-3 text-white/85 text-sm leading-relaxed">
              Shop faster, track your orders and earn cashback on every purchase at
              Chemalug Mugundoi Supermarket.
            </p>

            <div className="mt-6 grid grid-cols-3 gap-3">
              {features.map((f) => (
                <div
                  key={f.label}
                  className="rounded-2xl p-3.5 bg-white/15 backdrop-blur-md border border-white/25"
                >
                  <f.icon size={20} />
                  <div className="text-sm font-semibold mt-1.5">{f.label}</div>
                  <div className="text-[11px] text-white/75">{f.sub}</div>
                </div>
              ))}
            </div>

            <p className="mt-6 text-xs text-white/60">
              © {new Date().getFullYear()} Chemalug Mugundoi Supermarket
            </p>
          </div>
        </div>

        {/* Floating chips */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-24 right-10 z-10 rounded-2xl px-4 py-3 text-white text-xs font-semibold flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/25"
        >
          <span className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check size={14} />
          </span>
          Order paid
        </motion.div>
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
          className="absolute top-[40%] right-6 z-10 rounded-2xl px-4 py-3 text-white text-xs font-semibold flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/25"
        >
          <span className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center">
            <Star size={14} />
          </span>
          Cashback added
        </motion.div>
      </aside>
    </div>
  );
}
