// src/lib/socket.js
import { io } from "socket.io-client";
import API from "../api/axios";

const stripApi = (u) => u.replace(/\/api\/?$/, "");

// Sockets must connect to the backend DIRECTLY — Vercel's /api rewrite
// doesn't proxy websockets. Set VITE_SOCKET_URL (or VITE_API_URL) on Vercel;
// in production it falls back to the Render backend, never to localhost.
export const SOCKET_URL = stripApi(
  import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    (import.meta.env.PROD ? "https://shoppos-backend.onrender.com" : "http://localhost:5000")
);

// Authenticated socket for signed-in staff screens.
// The cookie is first-party to the Vercel domain, so it is NOT sent to the
// backend host. Instead we fetch a short-lived ticket through /api (which
// carries the cookie) and pass it in the handshake. The auth callback runs on
// every connect AND reconnect, so a dropped connection always gets a fresh ticket.
export function createSocket() {
  return io(SOCKET_URL, {
    auth: (cb) => {
      API.get("/socket/ticket")
        .then((res) => cb({ ticket: res.data.ticket }))
        .catch(() => cb({})); // anonymous: connects, but can join no rooms
    },
  });
}
