// src/api/axios.js
import axios from "axios";

// In production, call "/api" on our own domain. Vercel rewrites it to the
// Render backend (see vercel.json), so the auth cookie is first-party and
// isn't blocked on new devices/browsers. In dev, talk to the backend directly.
const API = axios.create({
  baseURL: import.meta.env.PROD
    ? "/api"
    : (import.meta.env.VITE_API_URL || "http://localhost:5000/api"),
  timeout: 15000,
  withCredentials: true, // send/receive the httpOnly auth cookie
});

// Nuke Content-Type from all default header slots at creation time
delete API.defaults.headers.common["Content-Type"];
delete API.defaults.headers.post["Content-Type"];
delete API.defaults.headers.patch["Content-Type"];
delete API.defaults.headers.put["Content-Type"];

API.interceptors.request.use(
  (config) => {
    if (config.data instanceof FormData) {
      config.headers["Content-Type"] = undefined;
    } else {
      config.headers["Content-Type"] = "application/json";
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Redirect to staff login on session expiry — but NOT for the /auth/me
// identity check, since a 401 there just means "nobody's logged in yet",
// which is the normal state on public pages like /home.
// The Display's /display/me check is exempt too, so the Display can handle
// its own 401 instead of being bounced to the staff login.
API.interceptors.response.use(
  (res) => res,
  (error) => {
    const isMeCheck = error.config?.url?.includes("/auth/me") || error.config?.url?.includes("/display/me");

    if (error.code === "ECONNABORTED" || !error.response) {
      console.warn("Network error or timeout:", error.message);
    } else if (error.response?.status === 401 && !isMeCheck) {
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    } else if (error.response?.status !== 401) {
      console.error("API Error:", error?.response?.data || error.message);
    }

    return Promise.reject(error);
  }
);

export default API;
