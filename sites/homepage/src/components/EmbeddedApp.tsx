import { useEffect, useState } from "react";
import {
  App,
  ServicesProvider,
  hydrateCustomFormatStore,
  hydrateCustomQueryStore,
  hydrateDeckStore,
  hydrateFavoritesStore,
  hydrateGridSizeStore,
  hydrateDeckGridSizeStore,
  hydrateLegalityStore,
  hydrateMetaGroupsStore,
  hydratePinnedCardsStore,
  hydratePresetStore,
  hydratePrintSizeStore,
  hydrateSettingsStore,
  importDecklist,
  parseDecklist,
  provideServices,
  selectDeck,
  setDeckFormat,
  setLibraryView,
  storage,
  useDeckStore,
  type Services,
} from "@boundless-grimoire/app";
import { createBrowserServices } from "../services";
import { SEED_CUBES, SEED_DECKS } from "../seedDecks";

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

  // Seed cubes too — same import pipeline, just flagged so they land
  // in the Cubes tab and skip sideboard / format / legality chrome.
  for (const cube of SEED_CUBES) {
    try {
      await importDecklist(parseDecklist(cube.cardlist), cube.name, { isCube: true });
    } catch (err) {
      console.error(`[demo] failed to seed cube "${cube.name}"`, err);
    }
  }

  // Leave the demo on the Decks tab with the first deck selected so the
  // initial view shows the richer constructed-deck chrome (commander /
  // sideboard / format / legality). createCube would otherwise leave us
  // on the Cubes tab because it was the last seed action.
  const lib = useDeckStore.getState().library;
  const firstDeckId = lib.order.find((id) => lib.decks[id] && !lib.decks[id]!.isCube);
  setLibraryView("decks");
  if (firstDeckId) selectDeck(firstDeckId);

  await storage.set(SEED_FLAG_KEY, true);
}

const FIRST_VISIT_KEY = "boundless-grimoire:demo:visited";

export function EmbeddedApp() {
  const [b] = useState(() => bootOnce());
  const [hydrated, setHydrated] = useState(false);
  const [isFirstVisit] = useState(() => {
    try {
      const forced = new URLSearchParams(window.location.search).has("first-time");
      if (forced) return true;
      if (localStorage.getItem(FIRST_VISIT_KEY)) return false;
      localStorage.setItem(FIRST_VISIT_KEY, "1");
      return true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let cancelled = false;
    void b.ready.then(() => {
      if (!cancelled) setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [b]);

  // The app starts with the overlay open and, on first visit, the Help
  // modal's About tab visible so the user sees the hero content with
  // download/GitHub links. On subsequent visits the overlay opens
  // directly to the deck-builder.
  return (
    <div id="boundless-grimoire-root" className="ui-scrollbars">
      {hydrated && (
        <ServicesProvider services={b.services}>
          <App initialOpen initialHelpOpen={isFirstVisit} />
        </ServicesProvider>
      )}
    </div>
  );
}
