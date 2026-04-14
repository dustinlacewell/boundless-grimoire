import { useEffect, useState } from "react";
import {
  App,
  ServicesProvider,
  hydrateCustomFormatStore,
  hydrateCustomQueryStore,
  hydrateDeckStore,
  hydrateFavoritesStore,
  hydrateGridSizeStore,
  hydrateMetaGroupsStore,
  hydratePinnedCardsStore,
  hydratePresetStore,
  hydratePrintSizeStore,
  hydrateSettingsStore,
  provideServices,
  type Services,
} from "@boundless-grimoire/app";
import { createBrowserServices } from "../services";

/**
 * Mounts the deck-builder app onto the marketing homepage. Same
 * floating trigger + toggleable overlay UX as the extension uses on
 * untap.in — clicking the corner trigger covers the marketing content
 * with the deck-builder; clicking again hides it.
 *
 * Bound to localStorage + direct Scryfall fetch via
 * `createBrowserServices()`. No untap integration.
 *
 * `provideServices` is a process singleton, so we guard against double-
 * provide (StrictMode double-effect or HMR) before calling it.
 */
let booted: { services: Services; ready: Promise<void> } | null = null;

function bootOnce(): { services: Services; ready: Promise<void> } {
  if (booted) return booted;
  const services = createBrowserServices();
  provideServices(services);
  const ready = Promise.allSettled([
    hydrateDeckStore(),
    hydrateGridSizeStore(),
    hydratePinnedCardsStore(),
    hydrateFavoritesStore(),
    hydratePrintSizeStore(),
    hydratePresetStore(),
    hydrateCustomQueryStore(),
    hydrateCustomFormatStore(),
    hydrateSettingsStore(),
    hydrateMetaGroupsStore(),
  ]).then((results) => {
    for (const r of results) {
      if (r.status === "rejected") console.error("[demo] hydrate failed", r.reason);
    }
  });
  booted = { services, ready };
  return booted;
}

export function EmbeddedApp() {
  const [b] = useState(() => bootOnce());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void b.ready.then(() => {
      if (!cancelled) setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [b]);

  // The host id is the portal target the global modals (HelpModal,
  // PrintPickerModal, etc.) look up when mounting. It must exist before
  // they render; nothing else about it matters. App's TriggerButton is
  // fixed-positioned (top-left) and the Overlay is fixed-inset-0 when
  // toggled open — both float over the marketing content beneath.
  return (
    <div id="boundless-grimoire-root" className="isolate">
      {hydrated && (
        <ServicesProvider services={b.services}>
          <App />
        </ServicesProvider>
      )}
    </div>
  );
}
