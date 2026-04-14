import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages project site: served at https://<user>.github.io/boundless-grimoire/
// Override `BASE` env var when deploying elsewhere.
const base = process.env.BASE ?? "/boundless-grimoire/";

export default defineConfig({
  site: "https://dustinlacewell.github.io",
  base,
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
