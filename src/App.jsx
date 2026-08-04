import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { routeForUser } from "./utils/routeForUser";
import LoginPage from "./pages/LoginPage";
import Admin from "./pages/Admin";
import CashierPage from "./pages/CashierPage";
import StorekeeperPage from "./pages/StorekeeperPage";
import CustomerPage from "./pages/CustomerPage";
import PublicDisplayPage from "./pages/PublicDisplayPage";
import OrdersPage from "./pages/OrdersPage";
import WalletPage from "./pages/WalletPage";
import ProfilePage from "./pages/ProfilePage";
import ProfileDetailsPage from "./pages/ProfileDetailsPage";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyResetCode from "./pages/VerifyResetCode";
import ResetPassword from "./pages/ResetPassword";
import StaffPage from "./pages/StaffPage";

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-400 text-sm">
      Loading…
    </div>
  );
}

function StaffRoute({ user, loading, allow, children }) {
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  const ok = allow === "admin" ? user.isAdmin : user.role === allow;
  if (!ok) return <Navigate to={routeForUser(user)} replace />;
  return children;
}

function AppRoutes() {
  const { user, loading, refetch } = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />

        <Route path="/home" element={<CustomerPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/details" element={<ProfileDetailsPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-reset-code" element={<VerifyResetCode />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/display/:branchId/:registerId" element={<PublicDisplayPage />} />

        <Route
          path="/login"
          element={
            loading ? (
              <LoadingScreen />
            ) : user ? (
              <Navigate to={routeForUser(user)} replace />
            ) : (
              <LoginPage onAuthed={refetch} />
            )
          }
        />

        <Route
          path="/admin"
          element={
            <StaffRoute user={user} loading={loading} allow="admin">
              <Admin />
            </StaffRoute>
          }
        />
        <Route
          path="/manager"
          element={
            <StaffRoute user={user} loading={loading} allow="branchManager">
              <Admin />
            </StaffRoute>
          }
        />
        <Route
          path="/cashier"
          element={
            <StaffRoute user={user} loading={loading} allow="cashier">
              <CashierPage />
            </StaffRoute>
          }
        />
        <Route
          path="/storekeeper"
          element={
            <StaffRoute user={user} loading={loading} allow="storekeeper">
              <StorekeeperPage />
            </StaffRoute>
          }
        />
        <Route
          path="/staff"
          element={
            <StaffRoute user={user} loading={loading} allow="staff">
              <StaffPage />
            </StaffRoute>
          }
        />

        <Route path="/dashboard" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>

      <ToastContainer position="top-right" theme="light" autoClose={3000} />
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
