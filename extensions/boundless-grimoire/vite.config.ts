import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { build } from "vite";

const plugins = [
  // MDX must run before @vitejs/plugin-react so react() sees plain TSX.
  { enforce: "pre" as const, ...mdx({ providerImportSource: "@mdx-js/react", jsxRuntime: "automatic" }) },
  react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
  tailwindcss(),
];

/**
 * Chrome MV3 extension — IIFE build.
 *
 * Content scripts run as classic scripts, so ES module syntax
 * (import/export, import.meta) is illegal. We build each entry
 * point as a separate IIFE bundle.
 *
 * The first entry (content) is the main Vite build and copies
 * `public/` into `dist/`. The second (untapBridge) runs as a
 * follow-up build via a custom plugin and writes into the same
 * `dist/` without clearing it.
 */
export default defineConfig({
  // Content scripts run on the host page's origin, so relative asset
  // URLs (e.g. `/assets/icon-abc123.png`) resolve against untap.in
  // instead of the extension. We inject a tiny runtime helper that
  // calls `chrome.runtime.getURL()` to build the correct
  // `chrome-extension://<id>/…` URL for every asset reference.
  experimental: {
    renderBuiltUrl(filename) {
      return {
        runtime: `(typeof chrome!=="undefined"&&chrome.runtime&&chrome.runtime.getURL?chrome.runtime.getURL(${JSON.stringify(filename)}):${JSON.stringify("/" + filename)})`,
      };
    },
  },
  plugins: [
    ...plugins,
    {
      name: "build-untap-bridge",
      closeBundle: {
        sequential: true,
        async handler() {
          await build({
            configFile: false,
            plugins,
            build: {
              outDir: resolve(__dirname, "dist"),
              emptyOutDir: false,
              modulePreload: false,
              copyPublicDir: false,
              rollupOptions: {
                input: resolve(__dirname, "src/sync/untapBridge.ts"),
                output: {
                  format: "iife",
                  entryFileNames: "untapBridge.js",
                },
              },
            },
          });
        },
      },
    },
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    modulePreload: false,
    // Extract CSS to a file — the manifest references content.css.
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, "src/content/index.tsx"),
      output: {
        format: "iife",
        entryFileNames: "content.js",
        assetFileNames: (info) => {
          // The single extracted CSS bundle keeps the stable name
          // `content.css` so the manifest can reference it.
          if (info.name?.endsWith(".css")) return "content.css";
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});
