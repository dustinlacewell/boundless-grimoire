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
 * Mounts the full deck-builder app inside the marketing site's /demo
 * route. Bound to localStorage + direct Scryfall fetch via
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

export function DemoApp() {
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

  if (!hydrated) {
    return (
      <div
        id="boundless-grimoire-root"
        className="fixed inset-0 grid place-items-center bg-bg-0 text-text-muted"
      >
        Loading demo…
      </div>
    );
  }

  return (
    // The host element id matches the extension's host so any CSS or
    // portal-target lookups that key off `#boundless-grimoire-root`
    // resolve the same way.
    <div
      id="boundless-grimoire-root"
      className="fixed inset-0 isolate"
      style={{ zIndex: 1 }}
    >
      <ServicesProvider services={b.services}>
        <App />
      </ServicesProvider>
    </div>
  );
}
