import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Wallet,
  UserCircle2,
  LogIn,
  UserPlus,
  Coins,
  Search,
  UtensilsCrossed,
  X,
  Smartphone,
  Landmark,
  Gift,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../hooks/useAuth";
import API from "../api/axios";

function BillItemImage({ src, alt }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-50 to-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
        <UtensilsCrossed size={16} className="text-orange-300" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      className="w-12 h-12 rounded-lg object-cover border border-stone-200 shrink-0"
    />
  );
}

export default function WalletPage() {
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [wallet, setWallet] = useState(null);
  const [settings, setSettings] = useState(null);
  const [mode, setMode] = useState("mine"); // "mine" | "other"
  const [billIdInput, setBillIdInput] = useState("");
  const [identifierInput, setIdentifierInput] = useState("");
  const [resolving, setResolving] = useState(false);

  const [activeBill, setActiveBill] = useState(null); // resolved bill for the payment modal
  const [payMethod, setPayMethod] = useState("stk"); // "stk" | "manual" | "reward"
  const [payAmount, setPayAmount] = useState("");
  const [payPhone, setPayPhone] = useState("");
  const [payReference, setPayReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stkPending, setStkPending] = useState(false);
  const pollRef = useRef(null);

  const loadWallet = useCallback(() => {
    if (!user) return;
    API.get("/wallet/me")
      .then((res) => setWallet(res.data))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    API.get("/settings/public")
      .then((res) => setSettings(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const openBillForPayment = (billSummary) => {
    setActiveBill(billSummary);
    setPayAmount(String(billSummary.balanceDue));
    setPayPhone("");
    setPayReference("");
    setPayMethod("stk");
    setStkPending(false);
  };

  // Quick-pay from the Orders page links here as /wallet?bill=BILL-ID
  useEffect(() => {
    const billFromUrl = searchParams.get("bill");
    if (!billFromUrl || !user) return;
    setBillIdInput(billFromUrl);
    API.post("/wallet/resolve-bill", { billId: billFromUrl.trim() })
      .then((res) => openBillForPayment(res.data))
      .catch((err) => toast.error(err.response?.data?.message || "Couldn't find that bill"))
      .finally(() => {
        searchParams.delete("bill");
        setSearchParams(searchParams, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleResolveBill = async () => {
    if (!billIdInput.trim()) {
      toast.error("Enter the Bill ID");
      return;
    }
    if (mode === "other" && !identifierInput.trim()) {
      toast.error("Enter the customer's registered email or phone");
      return;
    }
    setResolving(true);
    try {
      const res = await API.post("/wallet/resolve-bill", {
        billId: billIdInput.trim(),
        identifier: mode === "other" ? identifierInput.trim() : undefined,
      });
      openBillForPayment(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't find that bill");
    } finally {
      setResolving(false);
    }
  };

  const closeModal = () => {
    clearInterval(pollRef.current);
    setActiveBill(null);
    setStkPending(false);
  };

  const validateAmount = () => {
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid amount");
      return null;
    }
    if (amt > activeBill.balanceDue) {
      toast.error(`Amount exceeds the balance due (KSh ${activeBill.balanceDue})`);
      return null;
    }
    return amt;
  };

  const handlePayManual = async () => {
    const amt = validateAmount();
    if (!amt) return;
    if (!payReference.trim()) {
      toast.error("Enter the M-Pesa code or your full name");
      return;
    }
    setSubmitting(true);
    try {
      const res = await API.post("/wallet/pay/manual", {
        receiptId: activeBill.receiptId,
        amount: amt,
        reference: payReference.trim(),
      });
      toast.success(res.data.message || "Payment recorded");
      closeModal();
      loadWallet();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const pollStkStatus = (receiptId) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await API.get(`/wallet/pay/stk/${receiptId}/status`);
        if (res.data.status === "success") {
          clearInterval(pollRef.current);
          toast.success("Payment received!");
          setStkPending(false);
          setActiveBill(null);
          loadWallet();
        } else if (res.data.status === "failed") {
          clearInterval(pollRef.current);
          setStkPending(false);
          toast.error(res.data.receipt?.mpesaResultDesc || "Payment was not completed");
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
  };

  const handlePayStk = async () => {
    const amt = validateAmount();
    if (!amt) return;
    if (!payPhone.trim()) {
      toast.error("Enter the M-Pesa phone number");
      return;
    }
    setSubmitting(true);
    try {
      const res = await API.post("/wallet/pay/stk", {
        receiptId: activeBill.receiptId,
        amount: amt,
        phone: payPhone.trim(),
      });
      toast.success(res.data.message || "STK push sent");
      setStkPending(true);
      pollStkStatus(activeBill.receiptId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't initiate payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayReward = async () => {
    setSubmitting(true);
    try {
      const res = await API.post("/wallet/pay/reward", { receiptId: activeBill.receiptId });
      toast.success(res.data.message || "Reward applied");
      closeModal();
      loadWallet();
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't redeem points");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400 font-semibold text-sm">
        Loading wallet…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 pb-24 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 text-4xl mb-5 border border-orange-100">
          <UserCircle2 size={40} />
        </div>
        <h1 className="text-xl font-black text-stone-900 mb-2">Account Required</h1>
        <p className="text-stone-500 text-sm mb-8 max-w-xs">
          Sign in to access your wallet, pay bills, and earn reward points.
        </p>
        <div className="w-full max-w-xs space-y-3">
          <Link
            to="/login"
            state={{ from: "/wallet" }}
            className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm"
          >
            <LogIn size={18} />
            Log In
          </Link>
          <Link
            to="/login?tab=register"
            state={{ from: "/wallet" }}
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

  return (
    <div className="min-h-screen bg-stone-50 pb-28">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 px-5 py-4">
        <h1 className="text-lg font-black text-stone-900 flex items-center gap-2">
          <Wallet size={20} className="text-orange-500" /> Wallet
        </h1>
      </header>

      <main className="max-w-md mx-auto px-5 pt-5 space-y-5">
        {/* REWARD BALANCE CARD */}
        <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-neutral-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden border border-stone-800">
          <div className="absolute -right-6 -bottom-6 text-stone-700/20 pointer-events-none transform rotate-12">
            <Coins size={130} />
          </div>
          <p className="text-xs text-stone-400 font-medium">Reward Points Balance</p>
          <h3 className="text-3xl font-black tracking-tight mt-1 text-orange-400">
            {wallet?.points ?? 0} <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">pts</span>
          </h3>
          <p className="text-xs text-stone-400 mt-1">
            ≈ KSh {(wallet?.redeemableKes ?? 0).toLocaleString()}
            {wallet?.targetPoints ? ` · redeem from ${wallet.targetPoints} pts` : ""}
          </p>
          {wallet?.rewardDescription && (
            <p className="text-[11px] text-stone-300 mt-2 border-t border-stone-700 pt-2">{wallet.rewardDescription}</p>
          )}
        </div>

        {/* PAY A BILL */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-5 space-y-4">
          <h2 className="font-black text-stone-900 text-sm">Pay a Bill</h2>

          <div className="flex gap-2">
            <button
              onClick={() => setMode("mine")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                mode === "mine" ? "bg-orange-500 text-white" : "bg-stone-50 text-stone-500 border border-stone-200"
              }`}
            >
              My Bill
            </button>
            <button
              onClick={() => setMode("other")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${
                mode === "other" ? "bg-orange-500 text-white" : "bg-stone-50 text-stone-500 border border-stone-200"
              }`}
            >
              Pay for Someone
            </button>
          </div>

          {mode === "other" && (
            <input
              type="text"
              placeholder="Their registered email or phone"
              value={identifierInput}
              onChange={(e) => setIdentifierInput(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          )}

          <input
            type="text"
            placeholder="Bill ID (e.g. #B0042)"
            value={billIdInput}
            onChange={(e) => setBillIdInput(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          />

          <button
            onClick={handleResolveBill}
            disabled={resolving}
            className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-700 disabled:bg-stone-400 text-white font-bold py-3 rounded-xl transition-colors"
          >
            <Search size={16} />
            {resolving ? "Looking up…" : "Find Bill"}
          </button>
        </div>

        {/* MY UNPAID / PARTIAL BILLS */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 divide-y divide-stone-100 overflow-hidden">
          <div className="p-4">
            <h2 className="font-black text-stone-900 text-sm">My Unpaid Bills</h2>
          </div>
          {(!wallet || wallet.bills.length === 0) && (
            <p className="p-4 text-sm text-stone-400">You're all settled up — nothing owing.</p>
          )}
          {wallet?.bills.map((b) => {
            const balanceDue = Number((b.subtotal - (b.amountPaid || 0)).toFixed(2));
            const hasPending = (b.pendingManualPayments?.length || 0) > 0;
            return (
              <div key={b._id} className="p-4 flex items-center justify-between text-sm">
                <div>
                  <p className="font-bold text-stone-900">{b.billId}</p>
                  <p className="text-xs text-stone-400 capitalize">{b.status} · KSh {balanceDue.toLocaleString()} due</p>
                  {hasPending && (
                    <p className="text-[11px] text-amber-600 font-semibold mt-0.5">Payment pending confirmation</p>
                  )}
                </div>
                <button
                  onClick={() =>
                    openBillForPayment({
                      receiptId: b._id,
                      billId: b.billId,
                      customerId: user.id,
                      customerName: user.fullName,
                      status: b.status,
                      items: b.items.map((i) => ({ ...i, imageUrl: null })),
                      subtotal: b.subtotal,
                      amountPaid: b.amountPaid || 0,
                      balanceDue,
                      hasPendingManualPayment: hasPending,
                    })
                  }
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                >
                  Pay
                </button>
              </div>
            );
          })}
        </div>
      </main>

      {/* PAYMENT MODAL */}
      {activeBill && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-stone-100 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-stone-900">{activeBill.billId}</h3>
                <p className="text-xs text-stone-400">{activeBill.customerName}</p>
              </div>
              <button onClick={closeModal} className="text-stone-400 hover:text-stone-700">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {activeBill.hasPendingManualPayment && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-lg p-3">
                  You already submitted a till payment for this bill — it's waiting for the restaurant to confirm it.
                  You can still submit another payment if needed.
                </div>
              )}

              {/* Items */}
              <div className="space-y-2">
                {activeBill.items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <BillItemImage src={it.imageUrl} alt={it.productName} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800 truncate">{it.productName}</p>
                      <p className="text-xs text-stone-400">Qty {it.quantity} × KSh {Number(it.unitPrice).toLocaleString()}</p>
                    </div>
                    <p className="text-sm font-bold text-stone-900">KSh {Number(it.lineTotal).toLocaleString()}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-stone-100 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal</span>
                  <span>KSh {activeBill.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>Already paid</span>
                  <span>KSh {activeBill.amountPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-black text-stone-900 text-base pt-1">
                  <span>Balance Due</span>
                  <span>KSh {activeBill.balanceDue.toLocaleString()}</span>
                </div>
              </div>

              {stkPending ? (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                  <Loader2 size={28} className="text-orange-500 animate-spin" />
                  <p className="text-sm font-semibold text-stone-700">Enter your M-Pesa PIN on your phone…</p>
                  <p className="text-xs text-stone-400">This checks automatically every few seconds</p>
                </div>
              ) : (
                <>
                  {/* Method tabs */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPayMethod("stk")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                        payMethod === "stk" ? "bg-orange-500 text-white" : "bg-stone-50 text-stone-500 border border-stone-200"
                      }`}
                    >
                      <Smartphone size={14} /> STK Push
                    </button>
                    <button
                      onClick={() => setPayMethod("manual")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                        payMethod === "manual" ? "bg-orange-500 text-white" : "bg-stone-50 text-stone-500 border border-stone-200"
                      }`}
                    >
                      <Landmark size={14} /> Till
                    </button>
                    {wallet?.canRedeem && (
                      <button
                        onClick={() => setPayMethod("reward")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                          payMethod === "reward" ? "bg-orange-500 text-white" : "bg-stone-50 text-stone-500 border border-stone-200"
                        }`}
                      >
                        <Gift size={14} /> Reward
                      </button>
                    )}
                  </div>

                  {payMethod !== "reward" && (
                    <div>
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">Amount (KSh)</label>
                      <input
                        type="number"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        max={activeBill.balanceDue}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                      <p className="text-[11px] text-stone-400 mt-1">
                        Full or partial — up to KSh {activeBill.balanceDue.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {payMethod === "stk" && (
                    <div>
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">M-Pesa Phone Number</label>
                      <input
                        type="tel"
                        placeholder="07XXXXXXXX"
                        value={payPhone}
                        onChange={(e) => setPayPhone(e.target.value)}
                        className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                  )}

                  {payMethod === "manual" && (
                    <div className="space-y-3">
                      {settings?.tillNumber && (
                        <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm">
                          <p className="text-xs text-stone-400">Pay to Till Number</p>
                          <p className="font-black text-stone-900 text-lg">{settings.tillNumber}</p>
                          {settings.tillName && <p className="text-xs text-stone-500">{settings.tillName}</p>}
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                          M-Pesa Code or Your Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. QGH7X8Y1Z or Jane Wanjiru"
                          value={payReference}
                          onChange={(e) => setPayReference(e.target.value)}
                          className="w-full border border-stone-300 rounded-lg px-3 py-2.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        />
                      </div>
                    </div>
                  )}

                  {payMethod === "reward" && (
                    <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 text-center">
                      <CheckCircle2 size={22} className="text-orange-500 mx-auto mb-1" />
                      <p className="text-sm font-semibold text-stone-800">
                        Apply up to {wallet.points} pts (KSh {wallet.redeemableKes.toLocaleString()}) to this bill
                      </p>
                    </div>
                  )}

                  <button
                    onClick={payMethod === "stk" ? handlePayStk : payMethod === "manual" ? handlePayManual : handlePayReward}
                    disabled={submitting}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-stone-400 text-white font-bold py-3.5 rounded-xl transition-colors"
                  >
                    {submitting ? "Processing…" : "Confirm Payment"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
            }
