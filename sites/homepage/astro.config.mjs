import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages project site: served at https://<user>.github.io/boundless-grimoire/
// Override `BASE` env var when deploying elsewhere.
const base = process.env.BASE ?? "/boundless-grimoire/";

export default defineConfig({
  site: "https://dustinlacewell.github.io",
  base,
  integrations: [react()],
  vite: {
    plugins: [
      // MDX must run before the React JSX transform — same ordering as
      // the extension. The /demo route imports the app, which imports
      // .mdx files for the help modal content.
      { enforce: "pre", ...mdx({ providerImportSource: "@mdx-js/react", jsxRuntime: "automatic" }) },
      tailwindcss(),
    ],
  },
});
