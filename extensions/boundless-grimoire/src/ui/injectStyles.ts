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
const TRIGGER_ICON_STYLE_ID = "boundless-grimoire-trigger-icon";

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

// Trigger-button icon effect:
//   - Outer layer: animated multicolor gradient, clipped to the icon's
//     alpha silhouette via mask-image. Two layered gradients rotate at
//     different speeds so the color field swirls.
//   - Inner layer: the greyscale icon drawn with `mix-blend-mode:
//     luminosity`. Luminosity takes hue+saturation from the layer below
//     (gradient) and brightness from this one (greyscale). Net effect:
//     the icon's internal shading is preserved AND colorized by the
//     swirling gradient.
const TRIGGER_ICON_CSS = (iconUrl: string) => `
@keyframes bg-trigger-swirl-a {
  0%   { background-position:   0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position:   0% 50%; }
}
@keyframes bg-trigger-swirl-b {
  0%   { background-position: 100% 50%; }
  50%  { background-position:   0% 50%; }
  100% { background-position: 100% 50%; }
}
.bg-trigger-icon {
  /* Single source of truth — tweak these to reposition/zoom the icon.
     Both the gradient mask and the luminosity overlay read them.
       --icon-size   : mask-size / background-size value (e.g. "auto 260%")
       --icon-shift-x: pixels from horizontal center (negative = left)
       --icon-shift-y: pixels from vertical center (negative = up)
  */
  --icon-size: auto 220%;
  --icon-shift-x: -5px;
  --icon-shift-y: 20px;
  --icon-pos-x: calc(50% + var(--icon-shift-x));
  --icon-pos-y: calc(50% + var(--icon-shift-y));

  position: relative;
  width: 100%;
  height: 100%;
  isolation: isolate;
  background:
    linear-gradient(100deg,
      #ff7e3a 0%, #ffd24c 20%, #4bc0ff 45%, #9b4bff 70%, #ff5a8a 90%, #ff7e3a 100%
    ),
    linear-gradient(260deg,
      #4caf50 0%, #4bc0ff 30%, #9b4bff 60%, #ff5a5a 100%
    );
  background-blend-mode: screen;
  background-size: 300% 100%, 300% 100%;
  animation:
    bg-trigger-swirl-a 7s ease-in-out infinite,
    bg-trigger-swirl-b 11s ease-in-out infinite;
  mask-image: url(${iconUrl});
  -webkit-mask-image: url(${iconUrl});
  mask-repeat: no-repeat;
  -webkit-mask-repeat: no-repeat;
  mask-size: var(--icon-size);
  -webkit-mask-size: var(--icon-size);
  mask-position: var(--icon-pos-x) var(--icon-pos-y);
  -webkit-mask-position: var(--icon-pos-x) var(--icon-pos-y);
}
.bg-trigger-icon::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: url(${iconUrl});
  background-size: var(--icon-size);
  background-position: var(--icon-pos-x) var(--icon-pos-y);
  background-repeat: no-repeat;
  mix-blend-mode: luminosity;
  pointer-events: none;
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
  if (!document.getElementById(TRIGGER_ICON_STYLE_ID)) {
    const style = document.createElement("style");
    style.id = TRIGGER_ICON_STYLE_ID;
    style.textContent = TRIGGER_ICON_CSS(chrome.runtime.getURL("icon.png"));
    document.head.appendChild(style);
  }
}
