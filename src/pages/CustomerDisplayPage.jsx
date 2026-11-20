import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/axios";
import { SOCKET_URL } from "../components/CashierPage/constants";

const PAID_HOLD_MS = 6000;
const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function CustomerDisplayPage() {
  const navigate = useNavigate();
  const [till, setTill] = useState(null);
  const [store, setStore] = useState("");
  const [view, setView] = useState({ phase: "idle" });
  const hold = useRef(null);
  const pending = useRef(null);

  // Keep the "Payment received" screen up for a few seconds before moving on
  const apply = useCallback((next) => {
    if (hold.current) { pending.current = next; return; }
    setView(next);
    if (next.phase === "bill" && next.bill?.status === "paid") {
      hold.current = setTimeout(() => {
        hold.current = null;
        setView(pending.current || { phase: "idle" });
        pending.current = null;
      }, PAID_HOLD_MS);
    }
  }, []);

  useEffect(() => {
    let socket;
    let dead = false;
    const toLogin = () => navigate("/login?display=1", { replace: true });

    (async () => {
      try {
        const me = await API.get("/display/me");
        if (dead) return;
        setTill(me.data.till);
        setStore(me.data.storeName || "");

        socket = io(SOCKET_URL);
        socket.on("connect", async () => {           // also runs on every reconnect → fresh ticket
          try {
            const t = await API.get("/display/socket-ticket");
            socket.emit("display:join", { ticket: t.data.ticket });
          } catch { toLogin(); }
        });
        socket.on("display:state", ({ till: t, ...snap }) => { setTill(t); apply(snap); });
        socket.on("display:cart", (p) => apply({ phase: "cart", ...p }));
        socket.on("display:bill", (p) => apply(p));
        socket.on("display:idle", () => apply({ phase: "idle" }));
        socket.on("display:till", setTill);
        socket.on("display:revoked", toLogin);
        socket.on("display:auth_error", toLogin);
      } catch { toLogin(); }
    })();

    return () => { dead = true; socket?.disconnect(); clearTimeout(hold.current); };
  }, [apply, navigate]);

  const signOut = async () => {
    if (!window.confirm("Sign this Display out?")) return;
    await API.post("/display/logout").catch(() => {});
    navigate("/login?display=1", { replace: true });
  };

  const { phase, cart = [], totals, bill } = view;
  const paid = phase === "bill" && bill?.status === "paid";

  return (
    <div className="h-screen flex flex-col bg-gray-100 select-none">
      {/* Constant top bar — till (and name if set) is ALWAYS visible */}
      <header className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0" onDoubleClick={signOut}>
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center font-black text-lg shrink-0">
            {(store || "B").charAt(0).toUpperCase()}
          </div>
          <h1 className="font-black text-lg truncate">{store || "Welcome"}</h1>
        </div>
        {till?.tillNumber && (
          <div className="text-right">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-orange-400">M-Pesa Till</p>
            <p className="text-3xl font-black tracking-wider leading-none">{till.tillNumber}</p>
            {till.tillName && <p className="text-xs font-semibold text-gray-300 mt-0.5">{till.tillName}</p>}
          </div>
        )}
      </header>

      {phase === "idle" && (
        <main className="flex-1 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-orange-50 via-white to-orange-100 text-center">
          <h2 className="text-4xl font-black text-gray-900">Welcome{store ? ` to ${store}` : ""}</h2>
          <p className="text-sm text-gray-500">Your items will appear here as the cashier scans them.</p>
        </main>
      )}

      {phase === "cart" && (
        <main className="flex-1 flex overflow-hidden">
          <section className="w-7/12 bg-white border-r border-gray-200 overflow-y-auto p-4 space-y-2.5">
            {cart.map((i, idx) => (
              <div key={`${i.productId}-${idx}`} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-white border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {i.imageUrl
                      ? <img src={i.imageUrl} alt="" className="w-full h-full object-cover" />
                      : <span className="font-black text-orange-500">{i.productName.charAt(0)}</span>}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-extrabold text-gray-900 truncate">{i.productName}</h3>
                    <span className="text-xs text-gray-500">{fmt(i.unitPrice)} × {i.quantity}</span>
                  </div>
                </div>
                <span className="text-base font-black text-orange-600 shrink-0 pl-3">{fmt(i.lineTotal)}</span>
              </div>
            ))}
          </section>
          <Totals totals={totals} label="Running total" />
        </main>
      )}

      {phase === "bill" && !paid && (
        <main className="flex-1 flex overflow-hidden">
          <section className="w-7/12 bg-white border-r border-gray-200 overflow-y-auto p-4 space-y-1.5">
            {cart.map((i, idx) => (
              <div key={idx} className="flex justify-between text-sm py-1.5 text-gray-700">
                <span className="truncate pr-3">{i.productName} <span className="text-gray-400">× {i.quantity}</span></span>
                <span className="font-bold shrink-0">{fmt(i.lineTotal)}</span>
              </div>
            ))}
          </section>
          <section className="w-5/12 bg-gray-900 text-white flex flex-col justify-center gap-4 p-8">
            <span className="text-xs font-black uppercase tracking-widest text-orange-400">Bill {bill.billId}</span>
            <p className="text-6xl font-black">{fmt(bill.status === "partial" ? bill.balanceDue : bill.totalDue)} <span className="text-2xl text-orange-500">KES</span></p>
            {bill.status === "partial" && <p className="text-sm text-amber-300 font-bold">Balance due (paid so far: {fmt(bill.amountPaid)})</p>}
            {bill.vatEnabled && (
              <div className="text-sm text-gray-300 space-y-1 border-t border-gray-700 pt-3">
                <div className="flex justify-between"><span>Subtotal</span><span>{fmt(bill.subtotal)} KES</span></div>
                <div className="flex justify-between"><span>VAT ({bill.vatRate}%)</span><span>{fmt(bill.vatAmount)} KES</span></div>
              </div>
            )}
            {till?.tillNumber
              ? <p className="text-center text-sm text-gray-300">Pay via M-Pesa Till <b className="text-white">{till.tillNumber}</b>, or hand cash/card to the cashier</p>
              : <p className="text-center text-sm text-gray-300">Please pay the cashier</p>}
          </section>
        </main>
      )}

      {paid && (
        <main className="flex-1 flex flex-col items-center justify-center gap-3 bg-emerald-50 text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500 text-white text-5xl flex items-center justify-center">✓</div>
          <h2 className="text-3xl font-black text-emerald-700">Payment received</h2>
          <p className="text-emerald-600 font-semibold">Thank you for shopping with us!</p>
        </main>
      )}
    </div>
  );
}

function Totals({ totals, label }) {
  if (!totals) return null;
  return (
    <section className="w-5/12 bg-gray-900 text-white flex flex-col justify-between p-8">
      <div>
        <span className="text-xs font-extrabold uppercase tracking-widest text-gray-400">{label}</span>
        <p className="text-6xl font-black mt-2">{fmt(totals.totalDue)} <span className="text-2xl text-orange-500">KES</span></p>
        <p className="text-xs text-gray-400 mt-1">{totals.totalQty} item{totals.totalQty === 1 ? "" : "s"}</p>
        {totals.vatEnabled && (
          <div className="mt-5 text-sm text-gray-300 space-y-1 border-t border-gray-700 pt-3">
            <div className="flex justify-between"><span>Subtotal</span><span>{fmt(totals.subtotal)} KES</span></div>
            <div className="flex justify-between">
              <span>VAT ({totals.vatRate}%{totals.priceMode === "inclusive" ? " incl." : ""})</span>
              <span>{fmt(totals.vatAmount)} KES</span>
            </div>
          </div>
        )}
      </div>
      <p className="text-center text-xs text-gray-400">Thank you for shopping with us</p>
    </section>
  );
}
