/**
 * Favorited cards — a sticky set of Scryfall card ids that get hoisted
 * to the top of the search results *when they would have appeared
 * anyway*. Unlike pinned cards, favorites do NOT inject themselves
 * into result sets where they don't match the current filters.
 *
 * Because we never need to render a favorite that isn't already in the
 * current results, the store only holds ids — there's no need to keep
 * a full ScryfallCard around. The card data always comes from
 * `state.cards` in useCardSearch.
 *
 * UI affordance: shift-right-click on a search-grid card toggles its
 * favorite state. (Plain right-click is -1 copy from the active deck.)
 */
import { create } from "zustand";
import { attachPersistence } from "../storage/persistedSlice";
import { preserveOnHmr } from "../storage/preserveOnHmr";

const STORAGE_KEY = "boundless-grimoire:favorited-cards";

interface FavoritesState {
  /** Insertion-order map of card id → true. Object iteration is insertion-order. */
  byId: Record<string, true>;
  hydrated: boolean;
}

export const useFavoritesStore = create<FavoritesState>(() => ({
  byId: {},
  hydrated: false,
}));

const { hydrate } = attachPersistence<FavoritesState, Record<string, true>>(
  useFavoritesStore,
  {
    label: STORAGE_KEY,
    storageKey: STORAGE_KEY,
    select: (s) => s.byId,
    isHydrated: (s) => s.hydrated,
    setHydrated: (loaded) => ({
      byId: loaded && typeof loaded === "object" ? loaded : {},
      hydrated: true,
    }),
  },
);

export const hydrateFavoritesStore = hydrate;

// ── Selectors ─────────────────────────────────────────────────────────────────
// Same rule as pinnedCardsStore: return the stable `byId` reference (or a
// primitive at the use site) so React's useSyncExternalStore snapshot stays
// referentially stable across no-op renders.

/** The full favorites map. Stable reference; iterate / memoize at the use site. */
export const selectFavoritesById = (s: FavoritesState): Record<string, true> => s.byId;

// ── Actions ───────────────────────────────────────────────────────────────────

export function toggleFavorite(cardId: string): void {
  useFavoritesStore.setState((s) => {
    const next = { ...s.byId };
    if (cardId in next) delete next[cardId];
    else next[cardId] = true;
    return { ...s, byId: next };
  });
}

preserveOnHmr(useFavoritesStore, import.meta.hot);
