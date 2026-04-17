/**
 * Persisted card width for the search grid. Adjusted by ctrl-scroll
 * over the grid; survives reloads via chrome.storage.local.
 */
import { create } from "zustand";
import { attachPersistence } from "../storage/persistedSlice";

const STORAGE_KEY = "boundless-grimoire:grid-card-width";

export const MIN_CARD_WIDTH = 100;
export const MAX_CARD_WIDTH = 320;
export const DEFAULT_CARD_WIDTH = 160;

interface GridSizeState {
  cardWidth: number;
  hydrated: boolean;
}

export const useGridSizeStore = create<GridSizeState>(() => ({
  cardWidth: DEFAULT_CARD_WIDTH,
  hydrated: false,
}));

const { hydrate } = attachPersistence<GridSizeState, number>(useGridSizeStore, {
  label: STORAGE_KEY,
  storageKey: STORAGE_KEY,
  select: (s) => s.cardWidth,
  isHydrated: (s) => s.hydrated,
  setHydrated: (loaded) => ({
    cardWidth:
      typeof loaded === "number" && loaded >= MIN_CARD_WIDTH && loaded <= MAX_CARD_WIDTH
        ? loaded
        : DEFAULT_CARD_WIDTH,
    hydrated: true,
  }),
});

export const hydrateGridSizeStore = hydrate;

export function setCardWidth(width: number): void {
  const clamped = Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, Math.round(width)));
  useGridSizeStore.setState((s) =>
    s.cardWidth === clamped ? s : { ...s, cardWidth: clamped },
  );
}

