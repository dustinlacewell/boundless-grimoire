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
  importDecklist,
  parseDecklist,
  provideServices,
  setDeckFormat,
  storage,
  useDeckStore,
  type Services,
} from "@boundless-grimoire/app";
import { createBrowserServices } from "../services";
import { SEED_DECKS } from "../seedDecks";

const SEED_FLAG_KEY = "boundless-grimoire:demo:seeded:v1";

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
    // Fire-and-forget — seeding triggers Scryfall fetches and shouldn't
    // block the deck-builder from rendering. The decks pop in as their
    // imports finish; the empty-deck-library state is brief.
    void maybeSeedExampleDecks();
  });
  booted = { services, ready };
  return booted;
}

/**
 * On the very first demo visit, populate the deck library with a few
 * recognizable archetypes so the user has something to look at. Gated
 * by a localStorage flag so a user who deletes the examples doesn't
 * see them come back.
 *
 * Each `importDecklist` call resolves card names through Scryfall's
 * /cards/collection endpoint, so the seed lists become real deck
 * snapshots with full card data.
 */
async function maybeSeedExampleDecks(): Promise<void> {
  const alreadySeeded = await storage.get<boolean>(SEED_FLAG_KEY);
  if (alreadySeeded) return;
  if (Object.keys(useDeckStore.getState().library.decks).length > 0) {
    // Defensive: user somehow has decks but no seed flag (e.g. they
    // imported their own before we could seed). Don't clobber.
    await storage.set(SEED_FLAG_KEY, true);
    return;
  }

  for (const seed of SEED_DECKS) {
    try {
      const deckId = await importDecklist(parseDecklist(seed.decklist), seed.name);
      setDeckFormat(deckId, seed.formatIndex);
    } catch (err) {
      console.error(`[demo] failed to seed "${seed.name}"`, err);
    }
  }

  await storage.set(SEED_FLAG_KEY, true);
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
  //
  // Deliberately NO `isolate`: it would trap the overlay's max-int
  // z-index inside this container, which from outside has default
  // stacking. Page-level fixed elements (the Try-It callout) would
  // then render ON TOP of the overlay. Without isolate, the overlay's
  // z-index propagates to the document and covers everything.
  return (
    <div id="boundless-grimoire-root">
      {hydrated && (
        <ServicesProvider services={b.services}>
          <App />
        </ServicesProvider>
      )}
    </div>
  );
}
