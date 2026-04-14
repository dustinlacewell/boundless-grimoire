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

// Grimoire logo effect (used by TriggerButton and the About tab):
//   - Two stacked layers — one with the closed-book icon, one with the
//     open-book icon. Each layer clips the swirling gradient via its own
//     mask-image and paints a luminosity overlay through the greyscale
//     art so internal shading survives the colorization.
//   - Cross-fade between layers on hover (hover-swap) or when forced via
//     data-open="true". Because mask-image itself can't transition, we
//     animate opacity on the whole layers instead.
const TRIGGER_ICON_CSS = (iconUrl: string, iconOpenUrl: string) => `
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
.bg-grimoire-logo {
  position: relative;
  width: 100%;
  height: 100%;
  isolation: isolate;
}
.bg-grimoire-logo__layer {
  position: absolute;
  inset: 0;
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
  mask-repeat: no-repeat;
  -webkit-mask-repeat: no-repeat;
  mask-size: var(--icon-size);
  -webkit-mask-size: var(--icon-size);
  mask-position: var(--icon-pos-x) var(--icon-pos-y);
  -webkit-mask-position: var(--icon-pos-x) var(--icon-pos-y);
  transition: opacity 350ms ease;
}
.bg-grimoire-logo__layer::after {
  content: "";
  position: absolute;
  inset: 0;
  background-size: var(--icon-size);
  background-position: var(--icon-pos-x) var(--icon-pos-y);
  background-repeat: no-repeat;
  mix-blend-mode: luminosity;
  pointer-events: none;
}
.bg-grimoire-logo__layer {
  /* Defaults: show the whole icon, no zoom, no shift. The trigger button
     overrides these via [data-framed="true"] to get its tight crop. */
  --icon-size: contain;
  --icon-pos-x: center;
  --icon-pos-y: center;
}
.bg-grimoire-logo__layer--closed {
  mask-image: url(${iconUrl});
  -webkit-mask-image: url(${iconUrl});
}
.bg-grimoire-logo__layer--closed::after {
  background-image: url(${iconUrl});
}
.bg-grimoire-logo__layer--open {
  mask-image: url(${iconOpenUrl});
  -webkit-mask-image: url(${iconOpenUrl});
  opacity: 0;
}
.bg-grimoire-logo__layer--open::after {
  background-image: url(${iconOpenUrl});
}
/* Framed mode: zoom/shift per layer to fill a small button nicely. */
.bg-grimoire-logo[data-framed="true"] .bg-grimoire-logo__layer--closed {
  --icon-size: auto 220%;
  --icon-pos-x: calc(50% - 5px);
  --icon-pos-y: calc(50% + 20px);
}
.bg-grimoire-logo[data-framed="true"] .bg-grimoire-logo__layer--open {
  --icon-size: auto 290%;
  --icon-pos-x: calc(50% - 5px);
  --icon-pos-y: calc(50% + 25px);
}
/* Forced open (parent toggles data-open) or hover-swap. Cross-fade layers. */
.bg-grimoire-logo[data-open="true"] .bg-grimoire-logo__layer--closed,
.bg-grimoire-logo[data-hover-swap="true"]:hover .bg-grimoire-logo__layer--closed {
  opacity: 0;
}
.bg-grimoire-logo[data-open="true"] .bg-grimoire-logo__layer--open,
.bg-grimoire-logo[data-hover-swap="true"]:hover .bg-grimoire-logo__layer--open {
  opacity: 1;
}
/* Fast mode — the idle swirl churns quickly. Applied to both layers. */
.bg-grimoire-logo[data-fast="true"] .bg-grimoire-logo__layer {
  animation-duration: 0.8s, 1.2s;
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
    style.textContent = TRIGGER_ICON_CSS(
      chrome.runtime.getURL("icon.png"),
      chrome.runtime.getURL("icon-open.png"),
    );
    document.head.appendChild(style);
  }
}
