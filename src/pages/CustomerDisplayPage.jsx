import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import API from "../api/axios";
import { SOCKET_URL } from "../components/CashierPage/constants";
import logo from "../Assets/logo.png";

const PAID_HOLD_MS = 6000;
const fmt = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function CustomerDisplayPage() {
  const navigate = useNavigate();
  const [till, setTill] = useState(null);
  const [store, setStore] = useState("");
  const [view, setView] = useState({ phase: "idle" });
  const hold = useRef(null);
  const pending = useRef(null);

  // Keep the "Payment received" screen up for a few seconds before resetting
  const apply = useCallback((next) => {
    if (hold.current) {
      pending.current = next;
      return;
    }
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
        socket.on("connect", async () => {
          try {
            const t = await API.get("/display/socket-ticket");
            socket.emit("display:join", { ticket: t.data.ticket });
          } catch {
            toLogin();
          }
        });
        socket.on("display:state", ({ till: t, ...snap }) => {
          setTill(t);
          apply(snap);
        });
        socket.on("display:cart", (p) => apply({ phase: "cart", ...p }));
        socket.on("display:bill", (p) => apply(p));
        socket.on("display:idle", () => apply({ phase: "idle" }));
        socket.on("display:till", setTill);
        socket.on("display:revoked", toLogin);
        socket.on("display:auth_error", toLogin);
      } catch {
        toLogin();
      }
    })();

    return () => {
      dead = true;
      socket?.disconnect();
      clearTimeout(hold.current);
    };
  }, [apply, navigate]);

  const signOut = async () => {
    if (!window.confirm("Sign this Display out?")) return;
    await API.post("/display/logout").catch(() => {});
    navigate("/login?display=1", { replace: true });
  };

  const { phase, cart = [], totals, bill } = view;
  const paid = phase === "bill" && bill?.status === "paid";

  return (
    <div className="h-screen flex flex-col bg-gray-50 text-gray-900 select-none antialiased">
      {/* CONSTANT LIGHT HEADER — Logo, Store Name, and Prominent M-Pesa Till */}
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div
          className="flex items-center gap-4 min-w-0 cursor-pointer"
          onDoubleClick={signOut}
          title="Double-click to sign out display"
        >
          <div className="h-14 w-14 rounded-2xl bg-orange-50 border border-orange-200 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
            <img
              src={logo}
              alt={store || "Store Logo"}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-black text-xl sm:text-2xl text-gray-900 tracking-tight truncate">
              {store || "Babylon POS"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Customer Checkout Display
              </span>
            </div>
          </div>
        </div>

        {/* ALWAYS LARGE & VISIBLE M-PESA TILL BADGE */}
        {till?.tillNumber && (
          <div className="flex items-center gap-4 bg-orange-50 border-2 border-orange-500/30 rounded-2xl px-5 py-2.5 shadow-xs">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-600" />
                <p className="text-xs font-black uppercase tracking-widest text-orange-600">
                  M-Pesa Buy Goods Till
                </p>
              </div>
              <p className="text-3xl sm:text-4xl font-black text-gray-900 tracking-wider leading-none mt-1">
                {till.tillNumber}
              </p>
              {till.tillName && (
                <p className="text-sm font-extrabold text-gray-700 uppercase tracking-wide mt-1">
                  {till.tillName}
                </p>
              )}
            </div>
          </div>
        )}
      </header>

      {/* PHASE 1: IDLE WELCOME SCREEN */}
      {phase === "idle" && (
        <main className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-orange-50/70 via-white to-orange-100/50 text-center">
          <div className="w-28 h-28 rounded-3xl bg-white border border-orange-200 p-4 shadow-lg flex items-center justify-center mb-6">
            <img
              src={logo}
              alt={store || "Store Logo"}
              className="w-full h-full object-contain"
            />
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight">
            Welcome{store ? ` to ${store}` : ""}
          </h2>
          <p className="text-base sm:text-lg text-gray-500 mt-3 max-w-md font-medium">
            Your scanned items and total bill will appear right here.
          </p>

          {till?.tillNumber && (
            <div className="mt-8 bg-white border-2 border-orange-200 rounded-3xl px-8 py-5 shadow-md">
              <p className="text-xs font-black uppercase tracking-widest text-orange-600">
                Pay Easily via M-Pesa Till
              </p>
              <p className="text-5xl font-black text-gray-900 tracking-wider mt-1">
                {till.tillNumber}
              </p>
              {till.tillName && (
                <p className="text-base font-extrabold text-gray-700 uppercase mt-1">
                  {till.tillName}
                </p>
              )}
            </div>
          )}
        </main>
      )}

      {/* PHASE 2: LIVE CART SCANNING */}
      {phase === "cart" && (
        <main className="flex-1 flex overflow-hidden">
          {/* Left: High-Visibility Scanned Items */}
          <section className="w-7/12 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">
                Scanned Items
              </h2>
              <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-extrabold">
                {totals?.totalQty || cart.reduce((s, i) => s + i.quantity, 0)} Items
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {cart.map((i, idx) => (
                <div
                  key={`${i.productId}-${idx}`}
                  className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-orange-50 border border-orange-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {i.imageUrl ? (
                        <img
                          src={i.imageUrl}
                          alt={i.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-black text-orange-500">
                          {i.productName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-extrabold text-gray-900 truncate">
                        {i.productName}
                      </h3>
                      <p className="text-sm font-semibold text-gray-500 mt-0.5">
                        {fmt(i.unitPrice)} KES <span className="text-orange-600 font-bold">× {i.quantity}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-4">
                    <span className="text-lg sm:text-xl font-black text-gray-900">
                      {fmt(i.lineTotal)}
                    </span>
                    <span className="block text-[11px] font-bold text-gray-400 uppercase">
                      KES
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Right: Clean Light Total Panel */}
          <Totals totals={totals} label="Running Total" till={till} />
        </main>
      )}

      {/* PHASE 3: FINAL BILL & PAYMENT */}
      {phase === "bill" && !paid && (
        <main className="flex-1 flex overflow-hidden">
          {/* Left: Itemized Order List */}
          <section className="w-7/12 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">
                Order Summary
              </h2>
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-extrabold">
                Bill #{bill.billId}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
              {cart.map((i, idx) => (
                <div
                  key={idx}
                  className="bg-white px-4 py-3.5 rounded-xl border border-gray-200 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {i.imageUrl ? (
                        <img
                          src={i.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-black text-orange-500">
                          {i.productName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                        {i.productName}
                      </p>
                      <p className="text-xs font-semibold text-gray-500">
                        {fmt(i.unitPrice)} × {i.quantity}
                      </p>
                    </div>
                  </div>
                  <span className="text-base font-black text-gray-900 shrink-0 pl-3">
                    {fmt(i.lineTotal)} KES
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Right: Light Payment & Total Due Panel */}
          <section className="w-5/12 bg-white flex flex-col justify-between p-8">
            <div>
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-600 text-xs font-black uppercase tracking-widest">
                  {bill.status === "partial" ? "Partial Payment" : "Awaiting Payment"}
                </span>
                <span className="text-xs font-bold text-gray-400">
                  Bill #{bill.billId}
                </span>
              </div>

              <div className="mt-6">
                <p className="text-xs font-extrabold uppercase tracking-widest text-gray-400">
                  {bill.status === "partial" ? "Remaining Balance Due" : "Total Amount Due"}
                </p>
                <p className="text-5xl sm:text-6xl font-black text-gray-900 mt-2 tracking-tight">
                  {fmt(bill.status === "partial" ? bill.balanceDue : bill.totalDue)}{" "}
                  <span className="text-2xl font-extrabold text-orange-500">KES</span>
                </p>
              </div>

              {bill.status === "partial" && (
                <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600 font-medium">
                    <span>Original Bill Total</span>
                    <span className="font-bold text-gray-900">{fmt(bill.totalDue)} KES</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Amount Paid</span>
                    <span>− {fmt(bill.amountPaid)} KES</span>
                  </div>
                </div>
              )}
            </div>

            {/* M-Pesa Payment Instruction Card */}
            {till?.tillNumber ? (
              <div className="rounded-3xl bg-gradient-to-br from-orange-50 to-orange-100/70 border-2 border-orange-300 p-6 text-center shadow-xs">
                <p className="text-xs font-black uppercase tracking-widest text-orange-600">
                  Lipa Na M-Pesa • Buy Goods Till
                </p>
                <p className="text-4xl sm:text-5xl font-black text-gray-900 tracking-wider mt-2">
                  {till.tillNumber}
                </p>
                {till.tillName && (
                  <p className="text-base font-extrabold text-gray-800 uppercase mt-1">
                    {till.tillName}
                  </p>
                )}
                <p className="text-xs font-semibold text-gray-500 mt-3">
                  Or pay via Cash / Card at the counter
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5 text-center">
                <p className="text-sm font-bold text-gray-700">
                  Please complete payment with the cashier
                </p>
              </div>
            )}
          </section>
        </main>
      )}

      {/* PHASE 4: PAYMENT RECEIVED CONFIRMATION */}
      {paid && (
        <main className="flex-1 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 text-center p-8">
          <div className="w-24 h-24 rounded-full bg-emerald-500 text-white text-5xl font-black flex items-center justify-center shadow-lg shadow-emerald-500/25">
            ✓
          </div>
          <h2 className="text-4xl font-black text-emerald-800 tracking-tight">
            Payment Received
          </h2>
          <p className="text-lg text-emerald-700 font-semibold">
            Thank you for shopping{store ? ` at ${store}` : " with us"}!
          </p>
        </main>
      )}
    </div>
  );
}

function Totals({ totals, label, till }) {
  if (!totals) return null;
  return (
    <section className="w-5/12 bg-white flex flex-col justify-between p-8">
      <div>
        <span className="text-xs font-black uppercase tracking-widest text-orange-600">
          {label}
        </span>
        <p className="text-5xl sm:text-6xl font-black text-gray-900 mt-2 tracking-tight">
          {fmt(totals.totalDue)}{" "}
          <span className="text-2xl font-extrabold text-orange-500">KES</span>
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold">
          <span>Total Quantity:</span>
          <span className="text-gray-900 font-black">
            {totals.totalQty} item{totals.totalQty === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {till?.tillNumber && (
          <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 text-center">
            <p className="text-[11px] font-black uppercase tracking-widest text-orange-600">
              M-Pesa Till Number
            </p>
            <p className="text-3xl font-black text-gray-900 tracking-wider mt-0.5">
              {till.tillNumber}
            </p>
            {till.tillName && (
              <p className="text-xs font-extrabold text-gray-700 uppercase mt-0.5">
                {till.tillName}
              </p>
            )}
          </div>
        )}
        <p className="text-center text-sm font-semibold text-gray-400">
          Thank you for shopping with us
        </p>
      </div>
    </section>
  );
}
