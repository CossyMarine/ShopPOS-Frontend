import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import useStoreInfo from '../hooks/useStoreInfo';
import PaymentModal from '../components/Cashier/PaymentModal';
import OfflineCashPaymentModal from '../components/Cashier/OfflineCashPaymentModal';
import OfflineBanner from '../components/Cashier/OfflineBanner';
import CloseShiftModal from '../components/Cashier/CloseShiftModal';
import VoidRequestModal from '../components/Cashier/VoidRequestModal';
import HistoryModal from '../components/Cashier/HistoryModal';

import ShiftGate from '../components/CashierPage/ShiftGate';
import CashierHeader from '../components/CashierPage/CashierHeader';
import CatalogPanel from '../components/CashierPage/CatalogPanel';
import CartPanel from '../components/CashierPage/CartPanel';
import useShift from '../components/CashierPage/hooks/useShift';
import useProducts from '../components/CashierPage/hooks/useProducts';
import useVatSettings from '../components/CashierPage/hooks/useVatSettings';
import useCart from '../components/CashierPage/hooks/useCart';
import useCashierSocket from '../components/CashierPage/hooks/useCashierSocket';
import useOfflineSync from '../components/CashierPage/hooks/useOfflineSync';
import useCheckout from '../components/CashierPage/hooks/useCheckout';

export default function CashierPage() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { isOnline } = useOnlineStatus();
    const { storeName, currency } = useStoreInfo();

    const [showCloseShift, setShowCloseShift] = useState(false);
    const [showVoid, setShowVoid] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const { shift, shiftLoading, fetchShift } = useShift();
    const { products, fetchProducts } = useProducts(user.branch);
    const vatSettings = useVatSettings();

    const {
        cart, stockOf, addToCart, updateQty, removeItem, clearCart,
        totalQty, vatEnabled, vatAmount, netSubtotal, totalDue,
    } = useCart({ products, isOnline, vatSettings });

    useCashierSocket({ branch: user.branch, cart, onCatalogChange: fetchProducts });

    const { pendingSyncCount, syncing, runSync, refreshPendingCount } = useOfflineSync({ isOnline, fetchProducts });

    const {
        receipt, showPayment, checkingOut, showOfflinePayment, setShowOfflinePayment,
        handleCheckout, handleOfflineCashConfirm, handlePaymentComplete, handleCancelCheckout,
    } = useCheckout({
        cart, clearCart, shift, isOnline, stockOf,
        netSubtotal, totalDue, branch: user.branch, fetchProducts, refreshPendingCount,
    });

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (shiftLoading) return <div className="h-screen flex items-center justify-center text-gray-400 text-sm">Loading…</div>;

    // ---- Shift gate: cashier can't sell without an open shift ----
    if (!shift) return <ShiftGate onOpened={fetchShift} />;

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            <OfflineBanner
                isOnline={isOnline}
                pendingCount={pendingSyncCount}
                syncing={syncing}
                onSyncNow={runSync}
            />

            <CashierHeader
                storeName={storeName}
                user={user}
                onOpenHistory={() => setShowHistory(true)}
                onOpenVoid={() => setShowVoid(true)}
                onGoToDashboard={() => navigate('/home')}
                onLogout={handleLogout}
                onOpenCloseShift={() => setShowCloseShift(true)}
            />

            <div className="flex-1 flex overflow-hidden">
                <CatalogPanel
                    branch={user.branch}
                    products={products}
                    cart={cart}
                    isOnline={isOnline}
                    currency={currency}
                    onAddToCart={addToCart}
                />
                <CartPanel
                    cart={cart}
                    currency={currency}
                    totalQty={totalQty}
                    vatEnabled={vatEnabled}
                    vatRate={vatSettings?.rate}
                    vatAmount={vatAmount}
                    netSubtotal={netSubtotal}
                    totalDue={totalDue}
                    checkingOut={checkingOut}
                    onClear={clearCart}
                    onUpdateQty={updateQty}
                    onRemove={removeItem}
                    onCheckout={handleCheckout}
                />
            </div>

            {showPayment && receipt && (
                <PaymentModal receipt={receipt} onClose={handleCancelCheckout} onComplete={handlePaymentComplete} />
            )}
            <OfflineCashPaymentModal
                open={showOfflinePayment}
                onClose={() => setShowOfflinePayment(false)}
                totalDue={totalDue}
                onConfirm={handleOfflineCashConfirm}
            />
            <CloseShiftModal open={showCloseShift} shiftId={shift?._id} onClose={() => setShowCloseShift(false)}
                onClosed={() => { setShowCloseShift(false); navigate('/login'); logout(); }} />
            <VoidRequestModal open={showVoid} branch={user.branch} onClose={() => setShowVoid(false)} />
            <HistoryModal open={showHistory} branch={user.branch} onClose={() => setShowHistory(false)} />
        </div>
    );
}
