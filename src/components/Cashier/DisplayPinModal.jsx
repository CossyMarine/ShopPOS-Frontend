import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { MonitorSmartphone, X, ExternalLink } from "lucide-react";
import API from "../../api/axios";

const INPUT =
  "w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-center text-lg tracking-[.5em] font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500";

export default function DisplayPinModal({ onClose }) {
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ oldPin: "", pin: "", confirmPin: "" });
  const [saving, setSaving] = useState(false);

  const load = () =>
    API.get("/display/status").then((r) => setStatus(r.data)).catch(() => toast.error("Couldn't load Display settings"));
  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value.replace(/\D/g, "").slice(0, 6) }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await API.put("/display/pin", form);
      toast.success(status.pinSet ? "Display PIN changed" : "Display PIN set");
      setForm({ oldPin: "", pin: "", confirmPin: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't save PIN");
    }
    setSaving(false);
  };

  const field = (label, key, auto) => (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1">{label}</label>
      <input type="password" inputMode="numeric" autoComplete={auto} maxLength={6}
        value={form[key]} onChange={set(key)} className={INPUT} placeholder="••••••" required />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-extrabold text-gray-900">
            <MonitorSmartphone size={18} className="text-orange-500" /> Customer Display
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        {!status ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
        ) : (
          <>
            <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-xs text-gray-600">
              {status.till?.tillNumber ? (
                <>Till shown to customers: <b className="text-gray-900">{status.till.tillNumber}</b>
                  {status.till.tillName && <> · {status.till.tillName}</>}</>
              ) : (
                <>No till set. Customers won't see a Pay via M-Pesa box. Ask your admin.</>
              )}
            </div>

            <form onSubmit={save} className="space-y-3">
              <p className="text-xs text-gray-500">
                {status.pinSet
                  ? "Change your Display PIN."
                  : "Set a 6-digit PIN. Sign in on the Display screen with your email/phone and this PIN."}
              </p>
              {status.pinSet && field("Old PIN", "oldPin", "off")}
              {field(status.pinSet ? "New PIN" : "PIN", "pin", "new-password")}
              {field("Confirm PIN", "confirmPin", "new-password")}
              <button disabled={saving}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl">
                {saving ? "Saving…" : status.pinSet ? "Change PIN" : "Set PIN"}
              </button>
            </form>

            {status.pinSet && (
              <button onClick={() => window.open("/display?open=1", "_blank", "noopener")}
                className="w-full flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-2.5 rounded-xl text-sm">
                <ExternalLink size={15} /> Open Display on this device
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
              }
