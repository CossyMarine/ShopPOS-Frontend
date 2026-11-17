import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // Cashiers decide when to install updates.
      // This helps avoid interruptions during sales.
      registerType: "prompt",

      includeAssets: [
        "apple-touch-icon.png"
      ],

      manifest: {
        id: "/",

        name: "Chemaluck Mugundoi Supermarket",
        short_name: "Chemaluck",

        description:
          "Chemaluck Mugundoi Supermarket Point of Sale System. Manage sales, inventory, products and business operations.",

        lang: "en",

        start_url: "/login",
        scope: "/",

        display: "standalone",

        // Locked to portrait so the app doesn't rotate on phones.
        orientation: "portrait",

        theme_color: "#FF5722",
        background_color: "#FF5722",

        categories: [
          "business",
          "productivity"
        ],

        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },

      workbox: {
        // Files included in the service worker's precache.
        globPatterns: [
          "**/*.{js,css,html,svg,png,woff2,ico}"
        ],

        // Allow larger application bundles.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,

        cleanupOutdatedCaches: true,

        // SPA navigation fallback.
        navigateFallback: "/index.html",

        // Never serve API navigation requests from the service worker.
        navigateFallbackDenylist: [
          /^\/api\//
        ],

        runtimeCaching: [
          {
            // External fonts and CDN assets.
            urlPattern: ({ url }) =>
              url.origin === "https://fonts.googleapis.com" ||
              url.origin === "https://fonts.gstatic.com" ||
              url.origin === "https://cdnjs.cloudflare.com",

            handler: "StaleWhileRevalidate",

            options: {
              cacheName: "cdn-assets",

              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },

              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },

          {
            // Product images for faster loading and offline viewing.
            urlPattern: ({ request, url }) =>
              request.destination === "image" &&
              url.origin === self.location.origin,

            handler: "CacheFirst",

            options: {
              cacheName: "chemaluck-product-images",

              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },

              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],

  // Application is deployed at the domain root.
  base: "/",

  // Vite SPA routing.
  appType: "spa",

  build: {
    outDir: "dist",
    sourcemap: false
  },

  server: {
    port: 3000
  }
});
