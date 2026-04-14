/**
 * Pinned cards — a sticky set of ScryfallCards that always render at the
 * top of the search results, regardless of the current filter / query.
 *
 * The full ScryfallCard is kept in the store (not just the id) so a pin
 * survives even when the card is no longer in any active search result —
 * we have everything we need to render it on its own.
 *
 * UI affordance: shift-left-click on a search-grid card toggles its pin
 * state. See `CardGridItem.tsx` for the wiring.
 */
import { create } from "zustand";
import type { ScryfallCard } from "../scryfall/types";
import { attachPersistence } from "../storage/persistedSlice";

const STORAGE_KEY = "boundless-grimoire:pinned-cards";

interface PinnedCardsState {
  /** Insertion-order map (object iteration is insertion-order in modern JS). */
  byId: Record<string, ScryfallCard>;
  hydrated: boolean;
}

export const usePinnedCardsStore = create<PinnedCardsState>(() => ({
  byId: {},
  hydrated: false,
}));

const { hydrate } = attachPersistence<PinnedCardsState, Record<string, ScryfallCard>>(
  usePinnedCardsStore,
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

export const hydratePinnedCardsStore = hydrate;

// ── Selectors ─────────────────────────────────────────────────────────────────
//
// Selectors must return stable references — zustand uses useSyncExternalStore
// under the hood, and React throws #185 ("getSnapshot should be cached") if
// the same store state yields a new snapshot reference each call. So we
// return `byId` itself (referentially stable across no-op renders) and let
// callers derive arrays inside useMemo.

/** The full pinned-cards map. Stable reference; iterate / memoize at the use site. */
export const selectPinnedById = (s: PinnedCardsState): Record<string, ScryfallCard> =>
  s.byId;

// ── Actions ───────────────────────────────────────────────────────────────────

export function togglePinned(card: ScryfallCard): void {
  usePinnedCardsStore.setState((s) => {
    const next = { ...s.byId };
    if (card.id in next) delete next[card.id];
    else next[card.id] = card;
    return { ...s, byId: next };
  });
}
