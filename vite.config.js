import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt" = a new version never reloads the page mid-sale;
      // the cashier taps "Update" when ready.
      registerType: "prompt",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "ShopPOS",
        short_name: "ShopPOS",
        description: "Point of sale for the supermarket — works offline.",
        start_url: "/login", // logged-in users are routed to their role page
        scope: "/",
        display: "standalone",
        orientation: "any",
        theme_color: "#FF5722",
        background_color: "#000000",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // xlsx + recharts bundles are big
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//], // API is never served from the SW
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com" ||
              url.origin === "https://fonts.gstatic.com" ||
              url.origin === "https://cdnjs.cloudflare.com",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "cdn-assets",
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Product images, so the cashier's grid still looks right offline
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  base: "/",
  build: {
    outDir: "dist",
  },
  server: {
    port: 3000,
    historyApiFallback: true,
  },
});
