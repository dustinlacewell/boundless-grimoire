/**
 * Load the vendored Keyrune stylesheet via a `<link>` whose href is a
 * `chrome-extension://` URL.
 *
 * We can't put `keyrune/keyrune.min.css` in the manifest's
 * `content_scripts[].css` because Chrome resolves relative `url()` refs
 * inside that CSS against the host page's origin (untap.in) — the
 * stylesheet's `@font-face` blocks reference `../fonts/keyrune.woff`,
 * which would 404. Loading via `<link>` with an absolute extension URL
 * gives the stylesheet a chrome-extension:// base, so its url() refs
 * resolve to the bundled fonts.
 */
const STYLE_LINK_ID = "boundless-grimoire-keyrune";

export function injectKeyrune(): void {
  if (document.getElementById(STYLE_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = STYLE_LINK_ID;
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = chrome.runtime.getURL("keyrune/keyrune.min.css");
  document.head.appendChild(link);
}
