import { create } from "zustand";
import { attachPersistence } from "../storage/persistedSlice";
import { preserveOnHmr } from "../storage/preserveOnHmr";

const STORAGE_KEY = "boundless-grimoire:print-tile-width";

export const MIN_PRINT_WIDTH = 100;
export const MAX_PRINT_WIDTH = 320;
export const DEFAULT_PRINT_WIDTH = 160;
const SCROLL_STEP_PX = 12;

interface PrintSizeState {
  tileWidth: number;
  hydrated: boolean;
}

export const usePrintSizeStore = create<PrintSizeState>(() => ({
  tileWidth: DEFAULT_PRINT_WIDTH,
  hydrated: false,
}));

const { hydrate } = attachPersistence<PrintSizeState, number>(usePrintSizeStore, {
  label: STORAGE_KEY,
  storageKey: STORAGE_KEY,
  select: (s) => s.tileWidth,
  isHydrated: (s) => s.hydrated,
  setHydrated: (loaded) => ({
    tileWidth:
      typeof loaded === "number" &&
      loaded >= MIN_PRINT_WIDTH &&
      loaded <= MAX_PRINT_WIDTH
        ? loaded
        : DEFAULT_PRINT_WIDTH,
    hydrated: true,
  }),
});

export const hydratePrintSizeStore = hydrate;

export function adjustPrintWidth(deltaY: number): void {
  const delta = -Math.sign(deltaY) * SCROLL_STEP_PX;
  const current = usePrintSizeStore.getState().tileWidth;
  const clamped = Math.max(
    MIN_PRINT_WIDTH,
    Math.min(MAX_PRINT_WIDTH, Math.round(current + delta)),
  );
  usePrintSizeStore.setState((s) =>
    s.tileWidth === clamped ? s : { ...s, tileWidth: clamped },
  );
}

preserveOnHmr(usePrintSizeStore, import.meta.hot);
