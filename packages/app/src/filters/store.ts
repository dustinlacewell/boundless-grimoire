/**
 * Filter store facade.
 *
 * Source of truth is the active deck — every deck owns its own
 * persisted FilterState. This module exposes a `useFilterStore` hook
 * with the same selector API as before so the per-filter components
 * (TextFilter, ColorFilter, etc.) need no changes.
 *
 * Behavior:
 *   - Read: returns the active deck's filters, falling back to
 *     INITIAL_FILTER_STATE when no deck is selected. The fallback is
 *     a stable reference so components don't re-render needlessly.
 *   - Write: `patch()` and `reset()` call ensureActiveDeck() — the
 *     first toggle from a clean library auto-creates an "Untitled" deck
 *     to receive the change, matching the click-to-add behavior.
 */
import { useDeckStore, ensureActiveDeck, selectedDeck } from "../storage/deckStore";
import { resetDeckFilters, setDeckFilters } from "../storage/deckStore";
import { INITIAL_FILTER_STATE, type FilterState } from "./types";

interface FilterStoreFacade {
  state: FilterState;
  patch: (p: Partial<FilterState>) => void;
  reset: () => void;
}

const STABLE_FALLBACK: FilterState = INITIAL_FILTER_STATE;

function patch(p: Partial<FilterState>): void {
  const id = ensureActiveDeck();
  setDeckFilters(id, p);
}

function reset(): void {
  const id = ensureActiveDeck();
  resetDeckFilters(id);
}

/**
 * Custom hook with the same selector API as a zustand store.
 * Components call e.g. `useFilterStore((s) => s.state.text)`.
 */
export function useFilterStore<T>(selector: (s: FilterStoreFacade) => T): T {
  const deck = useDeckStore(selectedDeck);
  const state = deck?.filters ?? STABLE_FALLBACK;
  return selector({ state, patch, reset });
}

/** Toggle a value in an array — utility used by every multi-toggle filter. */
export function toggleIn<T>(arr: readonly T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}
