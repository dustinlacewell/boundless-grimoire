import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@mdx-js/rollup";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Production site lives at the custom domain. Override `BASE` env var
// when deploying elsewhere (e.g. to a project-page preview).
const base = process.env.BASE ?? "/";

export default defineConfig({
  site: "https://grimoire.ldlework.com",
  base,
  integrations: [react()],
  vite: {
    plugins: [
      // MDX must run before the React JSX transform — same ordering as
      // the extension. The /demo route imports the app, which imports
      // .mdx files for the help modal content.
      { enforce: "pre", ...mdx({ providerImportSource: "@mdx-js/react", jsxRuntime: "automatic" }) },
      // Astro's @astrojs/react integration handles .tsx/.jsx already.
      // MDX-emitted JSX (from @boundless-grimoire/app's help-modal
      // content) is the only thing Astro doesn't cover, so this plugin
      // is scoped to .mdx only — overlapping it with .tsx/.jsx would
      // double-apply React Fast Refresh and break dev builds.
      viteReact({ include: /\.mdx$/ }),
      tailwindcss(),
    ],
  },
});
