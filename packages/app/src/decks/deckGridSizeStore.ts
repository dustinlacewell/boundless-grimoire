/**
 * Persisted card width for the deck view. Adjusted by ctrl-scroll over
 * the deck grid; survives reloads via chrome.storage.local.
 *
 * The minimum is higher than the search grid's because deck columns must
 * be wide enough for category labels ("Planeswalkers · NN") to fit on
 * one line.
 */
import { create } from "zustand";
import { attachPersistence } from "../storage/persistedSlice";

const STORAGE_KEY = "boundless-grimoire:deck-card-width";

export const MIN_DECK_CARD_WIDTH = 150;
export const MAX_DECK_CARD_WIDTH = 320;
export const DEFAULT_DECK_CARD_WIDTH = 160;

interface DeckGridSizeState {
  cardWidth: number;
  hydrated: boolean;
}

export const useDeckGridSizeStore = create<DeckGridSizeState>(() => ({
  cardWidth: DEFAULT_DECK_CARD_WIDTH,
  hydrated: false,
}));

const { hydrate } = attachPersistence<DeckGridSizeState, number>(useDeckGridSizeStore, {
  label: STORAGE_KEY,
  storageKey: STORAGE_KEY,
  select: (s) => s.cardWidth,
  isHydrated: (s) => s.hydrated,
  setHydrated: (loaded) => ({
    cardWidth:
      typeof loaded === "number" &&
      loaded >= MIN_DECK_CARD_WIDTH &&
      loaded <= MAX_DECK_CARD_WIDTH
        ? loaded
        : DEFAULT_DECK_CARD_WIDTH,
    hydrated: true,
  }),
});

export const hydrateDeckGridSizeStore = hydrate;

export function setDeckCardWidth(width: number): void {
  const clamped = Math.max(
    MIN_DECK_CARD_WIDTH,
    Math.min(MAX_DECK_CARD_WIDTH, Math.round(width)),
  );
  useDeckGridSizeStore.setState((s) =>
    s.cardWidth === clamped ? s : { ...s, cardWidth: clamped },
  );
}

