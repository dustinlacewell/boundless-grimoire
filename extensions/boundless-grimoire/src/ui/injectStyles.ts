/**
 * One-time global style injection. Called from the content script entry.
 *
 * Loads the vendored Keyrune stylesheet from the extension's bundled
 * `public/keyrune/` assets via `chrome.runtime.getURL`. Vendoring keeps
 * us out of CSP trouble — the extension origin is always allowed by the
 * page's font-src/style-src.
 *
 * The font URLs inside keyrune.min.css are relative (`../fonts/...`),
 * so the path layout `keyrune/keyrune.min.css` + `keyrune/fonts/*` keeps
 * the relative resolution working.
 */
const STYLE_LINK_ID = "boundless-grimoire-keyrune";

export function injectStyles(): void {
  if (document.getElementById(STYLE_LINK_ID)) return;
  const link = document.createElement("link");
  link.id = STYLE_LINK_ID;
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = chrome.runtime.getURL("keyrune/keyrune.min.css");
  document.head.appendChild(link);
}
