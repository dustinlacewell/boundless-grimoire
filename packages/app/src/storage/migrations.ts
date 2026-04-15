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

  // v3 → v4: Commander field added on Deck. Optional, no backfill needed —
  // existing decks have no commander; the migration only bumps the version.
  3: (lib) => ({ ...lib, version: 4 }),

  // v9 → v10: backfill negative custom-query list.
  9: (lib) => {
    const decks: Record<string, Deck> = {};
    for (const [id, deck] of Object.entries(lib.decks)) {
      const f = deck.filters ?? DEFAULT_FILTER_STATE;
      const raw = f as unknown as Record<string, unknown>;
      decks[id] = {
        ...deck,
        filters: {
          ...f,
          excludedOracleTags: (raw.excludedOracleTags as string[]) ?? [],
        },
      };
    }
    return { ...lib, version: 10, decks };
  },

  // v8 → v9: backfill per-filter type AND/OR mode + negative type list.
  8: (lib) => {
    const decks: Record<string, Deck> = {};
    for (const [id, deck] of Object.entries(lib.decks)) {
      const f = deck.filters ?? DEFAULT_FILTER_STATE;
      const raw = f as unknown as Record<string, unknown>;
      decks[id] = {
        ...deck,
        filters: {
          ...f,
          typeMode: (raw.typeMode as "or" | "and") ?? "or",
          excludedTypes: (raw.excludedTypes as string[]) ?? [],
        },
      };
    }
    return { ...lib, version: 9, decks };
  },

  // v7 → v8: per-deck `columnSort`. "cmc" preserves the previous
  // hardcoded within-column ordering (cmc asc then name).
  7: (lib) => {
    const decks: Record<string, Deck> = {};
    for (const [id, deck] of Object.entries(lib.decks)) {
      const raw = deck as unknown as Record<string, unknown>;
      decks[id] = {
        ...deck,
        columnSort: (raw.columnSort as Deck["columnSort"] | undefined) ?? "cmc",
      };
    }
    return { ...lib, version: 8, decks };
  },

  // v6 → v7: `layout` (scroll/wrap) migrated from a global setting to
  // a per-deck field, alongside `groupBy`. Everyone starts on "scroll"
  // since that was the product default.
  6: (lib) => {
    const decks: Record<string, Deck> = {};
    for (const [id, deck] of Object.entries(lib.decks)) {
      const raw = deck as unknown as Record<string, unknown>;
      decks[id] = {
        ...deck,
        layout: (raw.layout as Deck["layout"] | undefined) ?? "scroll",
      };
    }
    return { ...lib, version: 7, decks };
  },

  // v5 → v6: `groupBy` migrated from a global setting to a per-deck
  // field. Decks default to "category"; cubes default to "zone" (the
  // convention their zone tags exist to express).
  5: (lib) => {
    const decks: Record<string, Deck> = {};
    for (const [id, deck] of Object.entries(lib.decks)) {
      const raw = deck as unknown as Record<string, unknown>;
      decks[id] = {
        ...deck,
        groupBy: (raw.groupBy as Deck["groupBy"] | undefined) ?? (deck.isCube ? "zone" : "category"),
      };
    }
    return { ...lib, version: 6, decks };
  },

  // v4 → v5: cube support. Each DeckCard gets a `zone` tag, each Deck
  // gets an `isCube` flag, and the library gets a `libraryView` /
  // `selectedCubeId` pair so the ribbon can host Decks vs Cubes tabs.
  4: (lib) => {
    const decks: Record<string, Deck> = {};
    for (const [id, deck] of Object.entries(lib.decks)) {
      const cards = tagZone(deck.cards, "deck-1");
      const sideboard = tagZone(deck.sideboard, "sideboard-1");
      decks[id] = { ...deck, cards, sideboard, isCube: false };
    }
    const raw = lib as unknown as Record<string, unknown>;
    return {
      ...lib,
      version: 5,
      decks,
      selectedCubeId: (raw.selectedCubeId as string | null | undefined) ?? null,
      libraryView: (raw.libraryView as "decks" | "cubes" | undefined) ?? "decks",
    };
  },
};

function tagZone(
  map: Record<string, Deck["cards"][string]>,
  zone: string,
): Record<string, Deck["cards"][string]> {
  const out: Record<string, Deck["cards"][string]> = {};
  for (const [k, c] of Object.entries(map)) {
    out[k] = { ...c, zone: c.zone ?? zone };
  }
  return out;
}

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
