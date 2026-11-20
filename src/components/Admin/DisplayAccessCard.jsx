import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { MonitorSmartphone, KeyRound } from "lucide-react";
import API from "../../api/axios";

const SOURCE = { cashier: "this cashier's till", branch: "the branch till", store: "the store till" };

export default function DisplayAccessCard({ userId }) {
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState({ tillNumber: "", tillName: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await API.get(`/display/cashiers/${userId}`);
      setInfo(r.data);
      setForm({ tillNumber: r.data.tillNumber, tillName: r.data.tillName });
    } catch { /* not a cashier / no access */ }
  }, [userId]);
  useEffect(() => { load(); }, [load]);

  if (!info) return null;

  const saveTill = async () => {
    setBusy(true);
    try {
      await API.patch(`/display/cashiers/${userId}/till`, form);
      toast.success("Display till saved");
      load();
    } catch (err) { toast.error(err.response?.data?.message || "Couldn't save till"); }
    setBusy(false);
  };

  const resetPin = async () => {
    if (!window.confirm("Reset this cashier's Display PIN? Every open Display will be signed out and they must set a new PIN.")) return;
    try {
      await API.post(`/display/cashiers/${userId}/reset-pin`);
      toast.success("PIN reset");
      load();
    } catch (err) { toast.error(err.response?.data?.message || "Couldn't reset PIN"); }
  };

  const r = info.resolved;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
      <h3 className="flex items-center gap-2 font-extrabold text-gray-900 text-sm">
        <MonitorSmartphone size={16} className="text-orange-500" /> Customer Display
      </h3>

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-xs font-bold text-gray-600">Till number
          <input value={form.tillNumber} onChange={(e) => setForm({ ...form, tillNumber: e.target.value.replace(/\D/g, "").slice(0, 7) })}
            placeholder="Empty = use branch / store till"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium" />
        </label>
        <label className="text-xs font-bold text-gray-600">Till name (optional)
          <input value={form.tillName} onChange={(e) => setForm({ ...form, tillName: e.target.value })}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium" />
        </label>
      </div>

      <p className="text-xs text-gray-500">
        {r.tillNumber
          ? <>Customers currently see <b>{r.tillNumber}</b>{r.tillName && ` (${r.tillName})`}, from {SOURCE[r.source]}.</>
          : "No till set anywhere. The Pay via M-Pesa box is hidden."}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={saveTill} disabled={busy}
          className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold disabled:opacity-60">Save till</button>
        <button onClick={resetPin} disabled={!info.pinSet}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold disabled:opacity-40">
          <KeyRound size={13} /> Reset Display PIN
        </button>
        <span className="text-[11px] text-gray-400">
          {info.lockedUntil ? "PIN locked after too many attempts" : info.pinSet ? "PIN is set" : "No PIN set yet"}
        </span>
      </div>
    </div>
  );
}
