/**
 * Versioned schema migrations for the persisted deck library.
 *
 * Bump LIBRARY_VERSION (in `types.ts`) whenever the on-disk shape changes
 * in a way that needs a runtime fixup, and add a step here. Steps run in
 * order from the stored version up to the current version.
 *
 * Each step is idempotent and pure: input → output, no setState, no
 * side effects. The store calls `migrateLibrary(stored)` exactly once
 * during hydration.
 *
 * v0 → v1: backfill the per-deck UI fields (sortField, sortDir, filters)
 *   that were added after the initial release. Pre-versioning records
 *   have no `version` field at all and are treated as v0.
 */
import { ALL_SET_TYPES } from "../filters/types";
import {
  DEFAULT_FILTER_STATE,
  DEFAULT_SORT_DIR,
  DEFAULT_SORT_FIELD,
  LIBRARY_VERSION,
  type Deck,
  type DeckLibrary,
} from "./types";

type Migration = (lib: DeckLibrary) => DeckLibrary;

const migrations: Record<number, Migration> = {
  // v0 → v1: backfill per-deck UI fields, mark version.
  0: (lib) => {
    const decks: Record<string, Deck> = {};
    for (const [id, deck] of Object.entries(lib.decks)) {
      decks[id] = {
        ...deck,
        sortField: deck.sortField ?? DEFAULT_SORT_FIELD,
        sortDir: deck.sortDir ?? DEFAULT_SORT_DIR,
        filters: deck.filters ?? DEFAULT_FILTER_STATE,
      };
    }
    return { ...lib, version: 1, decks };
  },

  // v1 → v2: backfill cardName / cardText filter fields on existing decks.
  1: (lib) => {
    const decks: Record<string, Deck> = {};
    for (const [id, deck] of Object.entries(lib.decks)) {
      const f = deck.filters ?? DEFAULT_FILTER_STATE;
      const raw = f as unknown as Record<string, unknown>;
      decks[id] = {
        ...deck,
        filters: {
          ...f,
          cardName: (raw.cardName as string) ?? "",
          cardText: (raw.cardText as string) ?? "",
        },
      };
    }
    return { ...lib, version: 2, decks };
  },

  // v2 → v3: add sideboard field to every deck + oracleTags filter field.
  2: (lib) => {
    const decks: Record<string, Deck> = {};
    for (const [id, deck] of Object.entries(lib.decks)) {
      const raw = deck as unknown as Record<string, unknown>;
      const f = deck.filters ?? DEFAULT_FILTER_STATE;
      decks[id] = {
        ...deck,
        sideboard: raw.sideboard as Record<string, never> ?? {},
        formatIndex: (raw.formatIndex as number) ?? null,
        filters: {
          ...f,
          oracleTags: (f as unknown as Record<string, unknown>).oracleTags as string[] ?? [],
          customQueryMode: ((f as unknown as Record<string, unknown>).customQueryMode as "or" | "and") ?? "or",
          enabledSetTypes: (f as unknown as Record<string, unknown>).enabledSetTypes as string[] ?? [...ALL_SET_TYPES],
        },
      };
    }
    return { ...lib, version: 3, decks };
  },
};

export function migrateLibrary(lib: DeckLibrary): DeckLibrary {
  let current = lib;
  let from = current.version ?? 0;
  while (from < LIBRARY_VERSION) {
    const step = migrations[from];
    if (!step) {
      console.warn(
        `[deckStore] no migration from v${from} to v${from + 1}; leaving as-is`,
      );
      break;
    }
    current = step(current);
    from = current.version ?? from + 1;
  }
  return current;
}
