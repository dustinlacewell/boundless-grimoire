import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

/**
 * Plain multi-entry Vite build for a Chrome MV3 extension.
 *
 * Entry points are named and get stable filenames (`content.js`,
 * `background.js`, `untapBridge.js`) so `public/manifest.json` can
 * reference them directly. Shared code is split into `chunks/` with
 * hashes; assets (icons, fonts, CSS imports) go into `assets/`.
 *
 * `public/manifest.json` and `public/keyrune/` are copied verbatim into
 * `dist/`. Anything in `web_accessible_resources` must live under a path
 * the manifest calls out explicitly.
 */
export default defineConfig({
  plugins: [
    // MDX must run before @vitejs/plugin-react so react() sees plain TSX.
    { enforce: "pre", ...mdx({ providerImportSource: "@mdx-js/react", jsxRuntime: "automatic" }) },
    react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
    tailwindcss(),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/content/index.tsx"),
        untapBridge: resolve(__dirname, "src/sync/untapBridge.ts"),
      },
      output: {
        // Stable entry filenames so manifest.json can reference them.
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: (info) => {
          // CSS emitted from an entry keeps the entry's name (e.g.
          // `content.css`) so the manifest's `content_scripts[].css`
          // reference is stable. Everything else (icons, fonts) goes
          // hashed into `assets/`.
          if (info.name?.endsWith(".css")) return "[name][extname]";
          return "assets/[name]-[hash][extname]";
        },
      },
    },
  },
});
