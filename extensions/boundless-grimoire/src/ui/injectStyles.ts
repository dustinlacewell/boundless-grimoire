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
 *
 * Also injects a small scoped stylesheet that styles scrollbars inside
 * the extension's root host. Scoping to `#boundless-grimoire-root` keeps
 * us from changing untap.in's own UI.
 */
const STYLE_LINK_ID = "boundless-grimoire-keyrune";
const SCROLLBAR_STYLE_ID = "boundless-grimoire-scrollbars";

// Matches HOST_ID in content/index.tsx and the portal host id used by
// modals (PrintPickerModal, SettingsModal). Both render inside this host.
const ROOT_SELECTOR = "#boundless-grimoire-root";

// Dark, thin scrollbars styled to match the rest of the UI. 10px wide is
// thin but still comfortable to grab with a mouse. Colors pulled from the
// `colors` palette by literal value so this stays a plain CSS string
// (can't import TS tokens into injected CSS).
const SCROLLBAR_CSS = `
${ROOT_SELECTOR} *::-webkit-scrollbar,
${ROOT_SELECTOR}::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
${ROOT_SELECTOR} *::-webkit-scrollbar-track,
${ROOT_SELECTOR}::-webkit-scrollbar-track {
  background: transparent;
}
${ROOT_SELECTOR} *::-webkit-scrollbar-thumb,
${ROOT_SELECTOR}::-webkit-scrollbar-thumb {
  background: #2a2a30;
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
${ROOT_SELECTOR} *::-webkit-scrollbar-thumb:hover,
${ROOT_SELECTOR}::-webkit-scrollbar-thumb:hover {
  background: #3a3a44;
  background-clip: padding-box;
}
${ROOT_SELECTOR} *::-webkit-scrollbar-corner,
${ROOT_SELECTOR}::-webkit-scrollbar-corner {
  background: transparent;
}
${ROOT_SELECTOR},
${ROOT_SELECTOR} * {
  scrollbar-width: thin;
  scrollbar-color: #2a2a30 transparent;
}
`;

export function injectStyles(): void {
  if (!document.getElementById(STYLE_LINK_ID)) {
    const link = document.createElement("link");
    link.id = STYLE_LINK_ID;
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = chrome.runtime.getURL("keyrune/keyrune.min.css");
    document.head.appendChild(link);
  }
  if (!document.getElementById(SCROLLBAR_STYLE_ID)) {
    const style = document.createElement("style");
    style.id = SCROLLBAR_STYLE_ID;
    style.textContent = SCROLLBAR_CSS;
    document.head.appendChild(style);
  }
}
