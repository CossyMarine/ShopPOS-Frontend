// src/hooks/useAuth.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../api/axios";

const AuthContext = createContext(null);

// Last user confirmed by the server. Only used as a fallback when /auth/me
// fails with NO response (device offline), so an installed PWA can reload
// the cashier screen without a connection. A real 401 clears it.
const USER_CACHE_KEY = "shoppos-last-user";

const readCachedUser = () => {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedUser = (user) => {
  try {
    if (user) localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_CACHE_KEY);
  } catch {
    /* storage may be unavailable — ignore */
  }
};

// Single shared source of truth for "who's logged in", read from the httpOnly
// cookie via GET /auth/me. Wrap the app once in <AuthProvider> so every
// component (App's route guards, ProfilePage, LoginPage, etc.) reads the
// SAME user state instead of each spinning up its own copy — that mismatch
// was why logging out on /profile didn't update App's routing state, so
// hitting /login right after showed a stale "logged in" user and redirected
// to /home instead of the login form.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    try {
      const res = await API.get("/auth/me");
      setUser(res.data.user);
      writeCachedUser(res.data.user);
    } catch (err) {
      if (!err.response) {
        // Offline / timeout: trust the last known user so the app still opens.
        // The next real API call re-validates the session (401 → /login).
        setUser(readCachedUser());
      } else {
        setUser(null);
        writeCachedUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const logout = async () => {
    try {
      await API.post("/auth/logout");
    } finally {
      setUser(null);
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        /* storage may be unavailable in some contexts — ignore */
      }
      if (typeof caches !== "undefined") {
        try {
          // Keep the service worker's precache (the offline app shell);
          // only clear runtime caches such as images.
          const keys = await caches.keys();
          await Promise.all(
            keys.filter((key) => !key.includes("precache")).map((key) => caches.delete(key))
          );
        } catch {
          /* Cache Storage unsupported — ignore */
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

// Same call signature as before: const { user, loading, logout } = useAuth();
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }
  return ctx;
}
