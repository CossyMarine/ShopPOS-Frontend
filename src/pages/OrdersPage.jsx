import { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import {
  Receipt,
  Clock,
  Eye,
  X,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  UserCircle2,
  LogIn,
  UserPlus,
  Wallet,
} from "lucide-react";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../hooks/useAuth";
import API from "../api/axios";

const SOCKET_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/api\/?$/, "");

const STATUS_STYLE = {
  unpaid: "bg-amber-100 text-amber-700",
  partial: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700",
  voided: "bg-red-100 text-red-700",
};
const STATUS_LABEL = { unpaid: "Unpaid", partial: "Partially Paid", paid: "Paid", voided: "Voided" };

function ItemImage({ src, alt }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-50 to-stone-100 border border-stone-200 flex items-center justify-center shrink-0">
        <ShoppingBag size={16} className="text-orange-300" />
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

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [receipts, setReceipts] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null);
  const [catalogImages, setCatalogImages] = useState({});

  const loadCatalogImages = () => {
    API.get("/customer/catalog")
      .then((res) => {
        const map = {};
        res.data.forEach((p) => { map[p.name.toLowerCase()] = p.imageUrl; });
        setCatalogImages(map);
      })
      .catch(() => {});
  };

  const loadBills = (targetPage = page) => {
    if (!user) return;
    setLoading(true);
    API.get("/wallet/history", { params: { page: targetPage, limit: 10 } })
      .then((res) => {
        setReceipts(res.data.receipts);
        setPage(res.data.page);
        setTotalPages(res.data.totalPages);
      })
      .catch(() => toast.error("Couldn't load your bills"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    loadCatalogImages();
    loadBills(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Live-refresh when a bill of ours changes (paid, partially paid, etc.)
  useEffect(() => {
    if (!user) return;
    const socket = io(SOCKET_URL);
    socket.on("receipt:paid", (receipt) => {
      if (String(receipt.customer) === String(user.id)) loadBills(page);
    });
    socket.on("receipt:updated", (receipt) => {
      if (String(receipt.customer) === String(user.id)) loadBills(page);
    });
    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, page]);

  const itemsWithImages = (receipt) =>
    (receipt?.items || []).map((i) => ({
      ...i,
      imageUrl: i.imageUrl || catalogImages[i.productName?.toLowerCase()] || null,
    }));

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center text-stone-400 font-semibold text-sm">
        Loading…
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
          Sign in to view your bills and payment history.
        </p>
        <div className="w-full max-w-xs space-y-3">
          <Link
            to="/login"
            state={{ from: "/orders" }}
            className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm"
          >
            <LogIn size={18} />
            Log In
          </Link>
          <Link
            to="/login?tab=register"
            state={{ from: "/orders" }}
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
    <div className="min-h-screen bg-stone-50 pb-24">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 px-5 py-4">
        <h1 className="text-lg font-black text-stone-900 flex items-center gap-2">
          <Receipt size={20} className="text-orange-500" /> Your Bills
        </h1>
      </header>

      <div className="max-w-2xl mx-auto px-5 mt-5">
        {loading && <p className="text-stone-400 text-sm">Loading…</p>}
        {!loading && receipts.length === 0 && (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center">
            <Clock size={28} className="text-orange-300 mx-auto mb-2" />
            <p className="text-stone-400 text-sm">No bills yet.</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {receipts.map((r) => (
            <div key={r._id} className="p-4 flex items-center justify-between text-sm gap-3">
              <div className="min-w-0">
                <p className="font-bold text-stone-900">{r.billId}</p>
                <p className="text-xs text-stone-400">{r.branch?.name} · {new Date(r.createdAt).toLocaleString()}</p>
                <button
                  onClick={() => setViewing(r)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-orange-500 mt-2"
                >
                  <Eye size={13} /> View Items
                </button>
              </div>
              <div className="text-right space-y-1 shrink-0">
                <p className="font-bold text-stone-900">KSh {Number(r.subtotal).toLocaleString()}</p>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${STATUS_STYLE[r.status] || "bg-stone-100 text-stone-600"}`}>
                  {STATUS_LABEL[r.status] || r.status}
                </span>
                {r.pendingManualPayments?.length > 0 && (
                  <span className="block text-[11px] text-amber-600 font-semibold ml-auto">
                    Payment pending confirmation
                  </span>
                )}
                {["unpaid", "partial"].includes(r.status) && !r.pendingManualPayments?.length && (
                  <button
                    onClick={() => navigate(`/wallet?bill=${encodeURIComponent(r.billId)}`)}
                    className="inline-flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg ml-auto transition-colors"
                  >
                    <Wallet size={12} /> Pay
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-2">
            <button
              onClick={() => loadBills(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 text-xs font-bold text-stone-500 disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <span className="text-xs font-semibold text-stone-500">Page {page} of {totalPages}</span>
            <button
              onClick={() => loadBills(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 text-xs font-bold text-stone-500 disabled:opacity-30"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* View bill modal — items with images */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-stone-100 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-stone-900">{viewing.billId}</h3>
                <p className="text-xs text-stone-400">{viewing.branch?.name} · {new Date(viewing.createdAt).toLocaleString()}</p>
              </div>
              <button onClick={() => setViewing(null)} className="text-stone-400 hover:text-stone-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {itemsWithImages(viewing).map((it, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <ItemImage src={it.imageUrl} alt={it.productName} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-800 truncate">{it.productName}</p>
                    <p className="text-xs text-stone-400">Qty {it.quantity} × KSh {Number(it.unitPrice).toLocaleString()}</p>
                  </div>
                  <p className="text-sm font-bold text-stone-900">KSh {Number(it.lineTotal).toLocaleString()}</p>
                </div>
              ))}
              <div className="border-t border-stone-100 pt-3 flex justify-between font-black text-stone-900">
                <span>Total</span>
                <span>KSh {Number(viewing.subtotal).toLocaleString()}</span>
              </div>
              {["unpaid", "partial"].includes(viewing.status) && (
                <button
                  onClick={() => { setViewing(null); navigate(`/wallet?bill=${encodeURIComponent(viewing.billId)}`); }}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
                >
                  <Wallet size={16} /> Pay This Bill
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
