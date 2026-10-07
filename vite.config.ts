import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "Hard 21",
        short_name: "Hard 21",
        description: "Hard 21 — تحدي لتطوير الذات",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,json}"],
        navigateFallback: "/index.html",
        // /native-bridge.html must be served as itself, never rewritten to the
        // SPA shell: it is the OAuth return page, and if the app booted there
        // the Supabase client would try to exchange the PKCE code in the
        // browser, where the verifier does not exist, instead of leaving it
        // for the native app.
        navigateFallbackDenylist: [/^\/api/, /^\/native-bridge\.html$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "images-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 day
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  build: {
    // Vendor code is split so the startup bundle stays small: previously
    // everything landed in one ~1.2MB chunk that the native WebView had to
    // parse and execute before the first screen could appear.
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          const p = id.split("\\").join("/");

          // React and the renderer must stay together — splitting them
          // apart risks a half-initialized module at startup.
          if (/node_modules\/(react|react-dom|scheduler)\//.test(p)) return "vendor-react";
          if (p.includes("framer-motion")) return "vendor-motion";
          if (p.includes("@supabase")) return "vendor-supabase";
          if (p.includes("@radix-ui")) return "vendor-radix";
          if (p.includes("recharts") || p.includes("/d3-")) return "vendor-charts";
          if (p.includes("canvas-confetti")) return "vendor-confetti";
          if (p.includes("date-fns")) return "vendor-date";
          if (p.includes("lucide-react")) return "vendor-icons";
          // Camera/scanner stack — only pulled in when attendance is opened.
          if (p.includes("@zxing") || p.includes("barcode-scanning")) return "vendor-scanner";
          if (p.includes("react-hook-form") || p.includes("@hookform") || p.includes("/zod/"))
            return "vendor-forms";
          if (p.includes("i18next")) return "vendor-i18n";
          if (
            p.includes("embla-carousel") ||
            p.includes("cmdk") ||
            p.includes("vaul") ||
            p.includes("react-day-picker")
          )
            return "vendor-ui";
          return "vendor";
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
}));
