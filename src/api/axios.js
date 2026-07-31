// src/api/axios.js
import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://shoppos-backend.onrender.com/api",
  timeout: 10000,
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
API.interceptors.response.use(
  (res) => res,
  (error) => {
    const isMeCheck = error.config?.url?.includes("/auth/me");

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
