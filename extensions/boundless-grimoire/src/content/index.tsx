import { createRoot, type Root } from "react-dom/client";
import "../ui/tailwind.css";
import { injectKeyrune } from "../ui/injectKeyrune";
import { provideServices, ServicesProvider } from "@boundless-grimoire/app";
import { createExtensionServices } from "../services/extension";
import { hydrateMetaGroupsStore } from "@boundless-grimoire/app";
import { hydrateFavoritesStore } from "@boundless-grimoire/app";
import { hydrateGridSizeStore } from "@boundless-grimoire/app";
import { hydrateDeckGridSizeStore } from "@boundless-grimoire/app";
import { hydratePinnedCardsStore } from "@boundless-grimoire/app";
import { hydrateDeckStore } from "@boundless-grimoire/app";
import { hydrateCustomFormatStore } from "@boundless-grimoire/app";
import { hydrateCustomQueryStore } from "@boundless-grimoire/app";
import { hydratePresetStore } from "@boundless-grimoire/app";
import { hydratePrintSizeStore } from "@boundless-grimoire/app";
import { hydrateSettingsStore } from "@boundless-grimoire/app";
import { hydrateLegalityStore } from "@boundless-grimoire/app";
import { App } from "@boundless-grimoire/app";

const HOST_ID = "boundless-grimoire-root";

// Wire services BEFORE any store hydration — stores read from the
// services seam during their own hydration.
const services = createExtensionServices();
provideServices(services);

injectKeyrune();

// Hydrate every persisted store at boot, in parallel. Each `hydrate*` call
// is fired exactly once and its promise is reused below — calling them
// twice would race two reads against the same chrome.storage key.
//
// Components handle the unhydrated state by rendering with sensible
// defaults, but the persisted-stores-aware chrome of the app shouldn't
// thrash on first paint, so we wait for all of them before mounting React.
const deckHydrated = hydrateDeckStore();
const allHydrated = Promise.allSettled([
  deckHydrated,
  hydrateGridSizeStore(),
  hydrateDeckGridSizeStore(),
  hydratePinnedCardsStore(),
  hydrateFavoritesStore(),
  hydratePrintSizeStore(),
  hydratePresetStore(),
  hydrateCustomQueryStore(),
  hydrateCustomFormatStore(),
  hydrateSettingsStore(),
  hydrateMetaGroupsStore(),
  hydrateLegalityStore(),
]).then((results) => {
  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[boundless-grimoire] hydrate failed", r.reason);
    }
  }
});

// Boot sync once the deck store is hydrated. The sync runner itself
// is stateless — it reads live state from useDeckStore when it runs.
void deckHydrated.then(() => {
  void services.untap?.boot();
});

let root: Root | null = null;

function isHomepage(): boolean {
  return location.pathname === "/" || location.pathname === "";
}

function ensureMounted() {
  if (document.getElementById(HOST_ID)) return;
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.className = "ui-scrollbars";
  // Establish a stacking context so all child portals (modals, previews)
  // share the same z-index space and render above the host page.
  host.style.cssText = "position:relative;z-index:2147483640;isolation:isolate;";
  document.body.appendChild(host);
  root = createRoot(host);
  root.render(
    <ServicesProvider services={services}>
      <App />
    </ServicesProvider>,
  );
}

function unmount() {
  const host = document.getElementById(HOST_ID);
  if (!host) return;
  root?.unmount();
  root = null;
  host.remove();
}

// First reconcile waits on hydration so the very first paint reflects
// persisted state instead of defaults. Subsequent reconciles (from SPA
// navigation) run synchronously — by then the stores are already hydrated.
let firstReconcile = true;
function reconcile() {
  if (firstReconcile) {
    firstReconcile = false;
    void allHydrated.then(() => {
      if (isHomepage()) ensureMounted();
      else unmount();
    });
    return;
  }
  if (isHomepage()) ensureMounted();
  else unmount();
}

// --- SPA navigation detection ---------------------------------------
// Untap.in is an SPA. We need to react to client-side route changes,
// not just initial document load. Patch history methods + listen for
// popstate, then dispatch a synthetic "uh:locationchange" event.
function installLocationListener() {
  const fire = () => window.dispatchEvent(new Event("uh:locationchange"));
  const wrap = <K extends "pushState" | "replaceState">(key: K) => {
    const orig = history[key];
    history[key] = function (this: History, ...args: Parameters<History[K]>) {
      const result = orig.apply(this, args as never);
      fire();
      return result;
    } as History[K];
  };
  wrap("pushState");
  wrap("replaceState");
  window.addEventListener("popstate", fire);
  window.addEventListener("uh:locationchange", reconcile);
}

installLocationListener();
reconcile();
