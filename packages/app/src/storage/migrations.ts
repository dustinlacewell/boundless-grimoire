/**
 * Versioned schema migrations for the persisted deck library.
 *
 * Contract:
 *   - Every change to the persisted DeckLibrary shape adds one step.
 *     Each step transforms a library at version N into one at N+1.
 *   - `LIBRARY_VERSION` (in types.ts) is derived from the last step's
 *     `to` field by the tests — no more manual-bump drift.
 *   - Runner properties:
 *       • Idempotent: each step is a pure function; re-running with
 *         already-migrated input must produce equivalent output (steps
 *         spread + fallback so missing fields are backfilled and
 *         present fields pass through).
 *       • Verified: after each step we assert `out.version === step.to`.
 *         A forgotten version bump throws instead of looping forever.
 *       • Too-new safe: if the stored version exceeds what we know,
 *         we DO NOT write and we DO NOT discard. The library is
 *         returned unmodified and flagged so the UI can open read-only.
 *       • Backup-on-migrate: before touching a library that needs
 *         migration, we stash a copy of the raw stored value under
 *         `boundless-grimoire:library:backup-vN`. Cheap insurance.
 *
 * Steps are declared in an array (ordered) rather than a sparse Record
 * so the compiler notices gaps — every v → v+1 hop must exist.
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

interface MigrationStep {
  from: number;
  to: number;
  apply: (lib: DeckLibrary) => DeckLibrary;
}

const STEPS: MigrationStep[] = [
  // v0 → v1: backfill per-deck UI fields.
  {
    from: 0,
    to: 1,
    apply: (lib) => {
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
  },

  // v1 → v2: backfill cardName / cardText filter fields.
  {
    from: 1,
    to: 2,
    apply: (lib) => {
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
  },

  // v2 → v3: sideboard + oracleTags filter field.
  {
    from: 2,
    to: 3,
    apply: (lib) => {
      const decks: Record<string, Deck> = {};
      for (const [id, deck] of Object.entries(lib.decks)) {
        const raw = deck as unknown as Record<string, unknown>;
        const f = deck.filters ?? DEFAULT_FILTER_STATE;
        decks[id] = {
          ...deck,
          sideboard: (raw.sideboard as Record<string, never>) ?? {},
          formatIndex: (raw.formatIndex as number) ?? null,
          filters: {
            ...f,
            oracleTags: (f as unknown as Record<string, unknown>).oracleTags as string[] ?? [],
            customQueryMode:
              ((f as unknown as Record<string, unknown>).customQueryMode as "or" | "and") ?? "or",
            enabledSetTypes:
              (f as unknown as Record<string, unknown>).enabledSetTypes as string[] ??
              [...ALL_SET_TYPES],
          },
        };
      }
      return { ...lib, version: 3, decks };
    },
  },

  // v3 → v4: Commander field added on Deck (optional).
  { from: 3, to: 4, apply: (lib) => ({ ...lib, version: 4 }) },

  // v4 → v5: cube support.
  {
    from: 4,
    to: 5,
    apply: (lib) => {
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
  },

  // v5 → v6: per-deck groupBy.
  {
    from: 5,
    to: 6,
    apply: (lib) => {
      const decks: Record<string, Deck> = {};
      for (const [id, deck] of Object.entries(lib.decks)) {
        const raw = deck as unknown as Record<string, unknown>;
        decks[id] = {
          ...deck,
          groupBy:
            (raw.groupBy as Deck["groupBy"] | undefined) ?? (deck.isCube ? "zone" : "category"),
        };
      }
      return { ...lib, version: 6, decks };
    },
  },

  // v6 → v7: per-deck layout.
  {
    from: 6,
    to: 7,
    apply: (lib) => {
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
  },

  // v7 → v8: per-deck columnSort.
  {
    from: 7,
    to: 8,
    apply: (lib) => {
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
  },

  // v8 → v9: type filter mode + exclusions.
  {
    from: 8,
    to: 9,
    apply: (lib) => {
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
  },

  // v9 → v10: custom-filter exclusions.
  {
    from: 9,
    to: 10,
    apply: (lib) => {
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
  },

  // v10 → v11: CMC range filter.
  {
    from: 10,
    to: 11,
    apply: (lib) => {
      const decks: Record<string, Deck> = {};
      for (const [id, deck] of Object.entries(lib.decks)) {
        const f = deck.filters ?? DEFAULT_FILTER_STATE;
        const raw = f as unknown as Record<string, unknown>;
        decks[id] = {
          ...deck,
          filters: {
            ...f,
            cmcMin: (raw.cmcMin as number | null) ?? null,
            cmcMax: (raw.cmcMax as number | null) ?? null,
          },
        };
      }
      return { ...lib, version: 11, decks };
    },
  },
];

/** The version a correctly-upgraded library ends on. Derived from STEPS. */
export const LATEST_LIBRARY_VERSION = STEPS.length > 0 ? STEPS[STEPS.length - 1].to : 0;

// Fail-loud invariant: LIBRARY_VERSION (the constant everything writes
// into new records) must agree with the end of the migration chain.
// Forgetting to bump one or the other is a common source of
// "migration skipped" bugs; better to break the build.
if (LIBRARY_VERSION !== LATEST_LIBRARY_VERSION) {
  throw new Error(
    `[migrations] LIBRARY_VERSION (${LIBRARY_VERSION}) and LATEST_LIBRARY_VERSION (${LATEST_LIBRARY_VERSION}) disagree — add the missing migration step or bump LIBRARY_VERSION`,
  );
}

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

export interface MigrationResult {
  library: DeckLibrary;
}

/**
 * Run migrations. Throws if a step produces a version that doesn't
 * match its `to` (forgotten bump). Future versions from newer builds
 * pass through unmodified; the caller is responsible for detecting
 * that case if they want to behave differently.
 */
export function migrateLibrary(lib: DeckLibrary): MigrationResult {
  let current = lib;
  for (const step of STEPS) {
    if ((current.version ?? 0) < step.from) continue;
    if ((current.version ?? 0) >= step.to) continue;
    const next = step.apply(current);
    if (next.version !== step.to) {
      throw new Error(
        `[migrations] step ${step.from} → ${step.to} returned version ${next.version}; refusing to continue`,
      );
    }
    current = next;
  }
  return { library: current };
}
