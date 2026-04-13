import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./manifest.json" with { type: "json" };

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Disable Vite's <link rel="modulepreload"> helper. Content scripts run
    // in untap.in's document context — `document.head` belongs to the page,
    // not the extension. The preload helper appends links with relative
    // `assets/foo.js` URLs which the browser then resolves against
    // https://untap.in/ instead of chrome-extension://, fetches the SPA
    // HTML fallback, and logs a noisy "MIME type text/html" error. The
    // actual dynamic import via chrome-extension:// still works — these
    // errors are pure cosmetic noise. Local extension chunks have no
    // network cost so preloading saves nothing.
    modulePreload: false,
  },
  server: {
    port: 5173,
    strictPort: true,
    // Vite 5.4 tightened CORS — by default it returns
    // Access-Control-Allow-Origin: * which Chrome rejects for
    // chrome-extension:// requests with credentials. We need an explicit
    // allow-list. Regex matches any chrome-extension origin so we don't
    // have to bake a (changing) extension id into the config.
    cors: {
      origin: [/^chrome-extension:\/\/.+$/],
      credentials: true,
    },
    hmr: {
      port: 5173,
      protocol: "ws",
      host: "localhost",
    },
  },
});
