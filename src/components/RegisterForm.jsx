import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { Check, X, Loader2, User, Phone, Mail, Lock } from "lucide-react";
import API from "../api/axios";

const FIELD =
  "w-full bg-stone-50 border rounded-2xl pl-10 py-3 text-sm text-stone-900 font-medium placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:bg-white transition-all";
const OK = "border-stone-200 focus:ring-orange-500/30 focus:border-orange-500";
const BAD = "border-red-300 focus:ring-red-200 focus:border-red-400";
const LABEL = "block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5";
const ICON = "absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400";

export default function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const [method, setMethod] = useState("phone"); // "phone" | "email"
  const [contact, setContact] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [contactStatus, setContactStatus] = useState(null); // "checking" | "available" | "taken" | null
  const debounceRef = useRef(null);

  // Live-check contact (email/phone) availability as the person types
  useEffect(() => {
    if (!contact.trim()) return setContactStatus(null);
    clearTimeout(debounceRef.current);
    setContactStatus("checking");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await API.get("/auth/check-availability", {
          params: { field: method, value: contact.trim() },
        });
        setContactStatus(res.data.available ? "available" : "taken");
      } catch {
        setContactStatus(null);
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [contact, method]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (contactStatus === "taken") {
      toast.error(`This ${method} is already registered`);
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/auth/register-customer", {
        fullName,
        method,
        contact,
        password,
      });
      toast.success("Account created!");
      onSuccess?.(res.data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't create account");
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ status }) => {
    if (status === "checking") return <Loader2 size={16} className="animate-spin text-stone-400" />;
    if (status === "available") return <Check size={16} className="text-green-500" />;
    if (status === "taken") return <X size={16} className="text-red-500" />;
    return null;
  };

  const mismatch = confirmPassword && confirmPassword !== password;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Full name */}
      <div>
        <label className={LABEL}>Full name</label>
        <div className="relative">
          <div className={ICON}><User size={16} /></div>
          <input
            type="text"
            placeholder="Jane Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
            className={`${FIELD} ${OK} pr-4`}
          />
        </div>
      </div>

      {/* Method */}
      <div>
        <span className={LABEL}>Sign up with</span>
        <div className="flex bg-stone-100 rounded-xl p-1">
          {["phone", "email"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMethod(m); setContact(""); setContactStatus(null); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                method === m ? "bg-orange-500 text-white" : "text-stone-500"
              }`}
            >
              {m === "phone" ? "Phone" : "Email"}
            </button>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div>
        <label className={LABEL}>{method === "phone" ? "Phone number" : "Email address"}</label>
        <div className="relative">
          <div className={ICON}>
            {method === "phone" ? <Phone size={16} /> : <Mail size={16} />}
          </div>
          <input
            type={method === "phone" ? "tel" : "email"}
            placeholder={method === "phone" ? "07XX XXX XXX" : "you@example.com"}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            required
            autoComplete={method === "phone" ? "tel" : "email"}
            className={`${FIELD} pr-10 ${contactStatus === "taken" ? BAD : OK}`}
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <StatusIcon status={contactStatus} />
          </span>
        </div>
        {contactStatus === "taken" && (
          <p className="text-xs text-red-500 mt-1.5">
            This {method} is already registered.{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="underline font-semibold"
            >
              Log in instead
            </button>
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className={LABEL}>Password</label>
        <div className="relative">
          <div className={ICON}><Lock size={16} /></div>
          <input
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className={`${FIELD} ${OK} pr-4`}
          />
        </div>
      </div>

      {/* Confirm */}
      <div>
        <label className={LABEL}>Confirm password</label>
        <div className="relative">
          <div className={ICON}><Check size={16} /></div>
          <input
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className={`${FIELD} pr-4 ${mismatch ? BAD : OK}`}
          />
        </div>
        {mismatch && <p className="text-xs text-red-500 mt-1.5">Passwords don't match.</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-all shadow-[0_10px_20px_-8px_rgba(249,115,22,.6)]"
      >
        {loading ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-xs font-semibold text-stone-500">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-orange-500 font-bold hover:text-orange-600 transition-colors underline underline-offset-2"
        >
          Log in
        </button>
      </p>
    </form>
  );
}
