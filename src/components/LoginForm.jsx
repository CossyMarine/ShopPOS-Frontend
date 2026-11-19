import { useState } from "react";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import API from "../api/axios";

const FIELD =
  "w-full bg-stone-50 border border-stone-200 rounded-2xl pl-10 py-3 text-sm text-stone-900 font-medium placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 focus:bg-white transition-all";
const LABEL = "block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5";

export default function LoginForm({ onSuccess, onSwitchToRegister }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post("/auth/login", { identifier, password });
      toast.success(`Welcome back, ${res.data.user.fullName}`);
      onSuccess?.(res.data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid login credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email / Phone */}
      <div>
        <label className={LABEL}>Email or phone</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <User size={16} />
          </div>
          <input
            type="text"
            placeholder="jane@mail.com or 07XX XXX XXX"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoFocus
            autoComplete="username"
            className={`${FIELD} pr-4`}
          />
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={`${LABEL} !mb-0`}>Password</label>
          <Link
            to="/forgot-password"
            className="text-xs text-orange-500 font-bold hover:text-orange-600 transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <Lock size={16} />
          </div>
          <input
            type={showPass ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={`${FIELD} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors p-1"
            aria-label={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-all shadow-[0_10px_20px_-8px_rgba(249,115,22,.6)] flex items-center justify-center gap-2 group active:scale-[0.99]"
      >
        <span>{loading ? "Signing in…" : "Sign in"}</span>
        {!loading && (
          <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        )}
      </button>

      <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider text-stone-400">
        <span className="flex-1 h-px bg-stone-200" />
        or
        <span className="flex-1 h-px bg-stone-200" />
      </div>

      <Link
        to="/home"
        className="block text-center text-sm font-semibold py-3 rounded-2xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition"
      >
        Continue shopping as guest
      </Link>

      <p className="text-center text-xs font-semibold text-stone-500">
        New here?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-orange-500 font-bold hover:text-orange-600 transition-colors underline underline-offset-2"
        >
          Create an account
        </button>
      </p>
    </form>
  );
          }
