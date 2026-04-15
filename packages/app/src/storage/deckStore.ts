/**
 * Deck library state.
 *
 * Single zustand store, hydrated once from chrome.storage.local at content
 * script startup, and persisted on every change. The store is intentionally
 * the only place that mutates the library — components dispatch via the
 * exported action functions, never by editing the snapshot directly.
 */
import { create } from "zustand";
import type { FilterState, SortDir, SortField } from "../filters/types";
import { storage } from "../services/storage";
import { getServices } from "../services";
import { migrateLibrary } from "./migrations";
import { preserveOnHmr } from "./preserveOnHmr";
import {
  DEFAULT_FILTER_STATE,
  DEFAULT_SORT_DIR,
  DEFAULT_SORT_FIELD,
  EMPTY_LIBRARY,
  LIBRARY_VERSION,
  type CardSnapshot,
  type Deck,
  type DeckCard,
  type DeckLibrary,
} from "./types";

const STORAGE_KEY = "boundless-grimoire:library";

interface DeckStoreState {
  hydrated: boolean;
  library: DeckLibrary;
}

export const useDeckStore = create<DeckStoreState>(() => ({
  hydrated: false,
  library: EMPTY_LIBRARY,
}));

// ---------- Persistence ----------

export async function hydrateDeckStore(): Promise<void> {
  const stored = await storage.get<DeckLibrary>(STORAGE_KEY);
  useDeckStore.setState({
    hydrated: true,
    library: stored ? migrateLibrary(stored) : EMPTY_LIBRARY,
  });
}

let writeChain: Promise<void> = Promise.resolve();

function persist(library: DeckLibrary): void {
  // Serialize writes so concurrent updates can't interleave-clobber.
  // Tag the write with the current schema version so older clients can
  // detect a forward migration is needed.
  const tagged: DeckLibrary = library.version === LIBRARY_VERSION
    ? library
    : { ...library, version: LIBRARY_VERSION };
  writeChain = writeChain
    .catch(() => {
      /* prior failure already logged below — don't poison the chain */
    })
    .then(() => storage.set(STORAGE_KEY, tagged))
    .catch((e) => {
      // chrome.storage.local is bounded (~10 MB). Quota errors and
      // permission errors will surface here. Surfacing them as console
      // errors at minimum gives the user a chance to notice; a richer
      // future fix would push this into a UI banner.
      console.error("[deckStore] persist failed", e);
    });
}

useDeckStore.subscribe((state, prev) => {
  if (!state.hydrated) return;
  if (state.library === prev.library) return;
  persist(state.library);
  // Schedule untap sync for any deck whose cards/name changed
  scheduleSyncChanged(prev.library, state.library);
});

function scheduleSyncChanged(prev: DeckLibrary, next: DeckLibrary): void {
  const untap = getServices().untap;
  if (!untap) return;

  // Defer until the impl says it's ready (extension waits on the
  // untap.in MAIN-world bridge). Without this, early edits made before
  // the bridge handshake completes would be silently dropped.
  void untap.whenReady().then((ready) => {
    if (!ready) return;

    // Pushes for added or modified decks.
    for (const [id, deck] of Object.entries(next.decks)) {
      const prevDeck = prev.decks[id];
      if (!prevDeck || prevDeck.cards !== deck.cards || prevDeck.sideboard !== deck.sideboard || prevDeck.name !== deck.name) {
        untap.schedulePush(deck);
      }
    }

    // Deletions for any deck that disappeared from the library.
    for (const [id, prevDeck] of Object.entries(prev.decks)) {
      if (id in next.decks) continue;
      untap.cancelPush(id);
      if (prevDeck.untapDeckUid) {
        void untap.deleteRemote(prevDeck.untapDeckUid);
      }
    }
  });
}

// ---------- Internal helpers ----------

function mutate(fn: (lib: DeckLibrary) => DeckLibrary): void {
  useDeckStore.setState((s) => ({ library: fn(s.library) }));
}

function touch(deck: Deck): Deck {
  return { ...deck, updatedAt: Date.now() };
}

// ---------- Actions ----------

export type DeckZone = "main" | "sideboard";

function makeEntity(name: string, isCube: boolean): Deck {
  const id = crypto.randomUUID();
  const now = Date.now();
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    cards: {},
    sideboard: {},
    formatIndex: null,
    sortField: DEFAULT_SORT_FIELD,
    sortDir: DEFAULT_SORT_DIR,
    filters: DEFAULT_FILTER_STATE,
    isCube,
    // Cubes sensibly default to zone grouping — their zone tags
    // (basics, group-1…group-10) are the main axis. Decks default
    // to type-line category columns.
    groupBy: isCube ? "zone" : "category",
    layout: "scroll",
    columnSort: "cmc",
  };
}

export function createDeck(name = "Untitled"): string {
  const deck = makeEntity(name, false);
  mutate((lib) => ({
    ...lib,
    decks: { ...lib.decks, [deck.id]: deck },
    order: [...lib.order, deck.id],
    selectedId: deck.id,
    libraryView: "decks",
  }));
  return deck.id;
}

export function createCube(name = "Untitled Cube"): string {
  const cube = makeEntity(name, true);
  mutate((lib) => ({
    ...lib,
    decks: { ...lib.decks, [cube.id]: cube },
    order: [...lib.order, cube.id],
    selectedCubeId: cube.id,
    libraryView: "cubes",
  }));
  return cube.id;
}

export function setLibraryView(view: "decks" | "cubes"): void {
  mutate((lib) => (lib.libraryView === view ? lib : { ...lib, libraryView: view }));
}

/**
 * Clone an existing deck (cards + sort settings preserved). The clone
 * is inserted immediately after the source in the display order, given
 * a new id, and selected. Returns the new deck id.
 */
export function duplicateDeck(deckId: string): string | null {
  const lib = useDeckStore.getState().library;
  const src = lib.decks[deckId];
  if (!src) return null;
  const newId = crypto.randomUUID();
  const now = Date.now();
  const copy: Deck = {
    ...src,
    id: newId,
    name: `${src.name} (Copy)`,
    createdAt: now,
    updatedAt: now,
    // Deep-clone both card maps so future mutations don't bleed across.
    cards: Object.fromEntries(
      Object.entries(src.cards).map(([id, c]) => [id, { ...c }]),
    ),
    sideboard: Object.fromEntries(
      Object.entries(src.sideboard).map(([id, c]) => [id, { ...c }]),
    ),
  };
  mutate((library) => {
    const idx = library.order.indexOf(deckId);
    const order =
      idx >= 0
        ? [...library.order.slice(0, idx + 1), newId, ...library.order.slice(idx + 1)]
        : [...library.order, newId];
    return {
      ...library,
      decks: { ...library.decks, [newId]: copy },
      order,
      selectedId: newId,
    };
  });
  return newId;
}

/** Persist sort field/direction onto a specific deck. */
export function setDeckSort(
  deckId: string,
  sortField: SortField,
  sortDir: SortDir,
): void {
  mutate((lib) => {
    const deck = lib.decks[deckId];
    if (!deck) return lib;
    if (deck.sortField === sortField && deck.sortDir === sortDir) return lib;
    return {
      ...lib,
      decks: { ...lib.decks, [deckId]: touch({ ...deck, sortField, sortDir }) },
    };
  });
}

/**
 * Patch the persisted filter state on a specific deck. Mutating from a
 * partial keeps the call sites simple — every filter component just
 * sends the field(s) it owns.
 */
export function setDeckFilters(
  deckId: string,
  patch: Partial<FilterState>,
): void {
  mutate((lib) => {
    const deck = lib.decks[deckId];
    if (!deck) return lib;
    const nextFilters = { ...deck.filters, ...patch };
    return {
      ...lib,
      decks: {
        ...lib.decks,
        [deckId]: touch({ ...deck, filters: nextFilters }),
      },
    };
  });
}

/** Reset a deck's filters back to the global default. */
export function resetDeckFilters(deckId: string): void {
  mutate((lib) => {
    const deck = lib.decks[deckId];
    if (!deck) return lib;
    return {
      ...lib,
      decks: {
        ...lib.decks,
        [deckId]: touch({ ...deck, filters: DEFAULT_FILTER_STATE }),
      },
    };
  });
}

export function deleteDeck(deckId: string): void {
  mutate((lib) => {
    if (!(deckId in lib.decks)) return lib;
    const { [deckId]: _removed, ...rest } = lib.decks;
    return {
      ...lib,
      decks: rest,
      order: lib.order.filter((id) => id !== deckId),
      selectedId: lib.selectedId === deckId ? null : lib.selectedId,
      selectedCubeId: lib.selectedCubeId === deckId ? null : lib.selectedCubeId,
    };
  });
}

export function renameDeck(deckId: string, name: string): void {
  mutate((lib) => {
    const deck = lib.decks[deckId];
    if (!deck) return lib;
    return {
      ...lib,
      decks: { ...lib.decks, [deckId]: touch({ ...deck, name }) },
    };
  });
}

/**
 * Set (or clear) a deck's commander.
 *
 * - Passing a snapshot promotes that card: the snapshot is stored as the
 *   deck's commander and a copy of it is removed from `cards` /
 *   `sideboard` (one count). Any previous commander is returned to the
 *   mainboard at count 1.
 * - Passing `null` clears the commander and returns the previous one
 *   (if any) to the mainboard.
 *
 * The commander is rendered as a fixed first column in the deck view.
 * It's a singleton — count is implicitly 1 — so we don't store a count
 * with it.
 */
export function setDeckCommander(deckId: string, snapshot: CardSnapshot | null): void {
  mutate((lib) => {
    const deck = lib.decks[deckId];
    if (!deck) return lib;
    if (snapshot && deck.commander?.id === snapshot.id) return lib;

    let cards = deck.cards;
    let sideboard = deck.sideboard;

    // Return the previous commander (if any) to the mainboard.
    if (deck.commander) {
      const prev = deck.commander;
      const existing = cards[prev.id];
      cards = {
        ...cards,
        [prev.id]: existing
          ? { ...existing, count: existing.count + 1 }
          : { snapshot: prev, count: 1, addedAt: Date.now(), zone: "deck-1" },
      };
    }

    // Promote the new commander out of mainboard / sideboard.
    if (snapshot) {
      const fromMain = cards[snapshot.id];
      if (fromMain) {
        if (fromMain.count <= 1) {
          const { [snapshot.id]: _gone, ...rest } = cards;
          cards = rest;
        } else {
          cards = { ...cards, [snapshot.id]: { ...fromMain, count: fromMain.count - 1 } };
        }
      } else {
        const fromSide = sideboard[snapshot.id];
        if (fromSide) {
          if (fromSide.count <= 1) {
            const { [snapshot.id]: _gone, ...rest } = sideboard;
            sideboard = rest;
          } else {
            sideboard = { ...sideboard, [snapshot.id]: { ...fromSide, count: fromSide.count - 1 } };
          }
        }
      }
    }

    // Promoting a card to commander also sets it as the deck's hero
    // (cover art) — the visual identity follows the gameplay role.
    // Clearing the commander leaves the existing cover alone so the
    // user doesn't lose their selection if they swap commanders.
    const coverCardId = snapshot ? snapshot.id : deck.coverCardId;

    const next: Deck = {
      ...deck,
      commander: snapshot ?? undefined,
      coverCardId,
      cards,
      sideboard,
    };
    return { ...lib, decks: { ...lib.decks, [deckId]: touch(next) } };
  });
}

export function setDeckFormat(deckId: string, formatIndex: number | null): void {
  mutate((lib) => {
    const deck = lib.decks[deckId];
    if (!deck) return lib;
    if (deck.formatIndex === formatIndex) return lib;
    return {
      ...lib,
      decks: { ...lib.decks, [deckId]: touch({ ...deck, formatIndex }) },
    };
  });
}

export function setDeckGroupBy(
  deckId: string,
  groupBy: import("../cards/categorize").DeckGroupBy,
): void {
  mutate((lib) => {
    const deck = lib.decks[deckId];
    if (!deck) return lib;
    if (deck.groupBy === groupBy) return lib;
    return {
      ...lib,
      decks: { ...lib.decks, [deckId]: touch({ ...deck, groupBy }) },
    };
  });
}

export function setDeckLayout(deckId: string, layout: "scroll" | "wrap"): void {
  mutate((lib) => {
    const deck = lib.decks[deckId];
    if (!deck) return lib;
    if (deck.layout === layout) return lib;
    return {
      ...lib,
      decks: { ...lib.decks, [deckId]: touch({ ...deck, layout }) },
    };
  });
}

export function setDeckColumnSort(
  deckId: string,
  columnSort: import("../cards/categorize").ColumnSort,
): void {
  mutate((lib) => {
    const deck = lib.decks[deckId];
    if (!deck) return lib;
    if (deck.columnSort === columnSort) return lib;
    return {
      ...lib,
      decks: { ...lib.decks, [deckId]: touch({ ...deck, columnSort }) },
    };
  });
}

export function setDeckCover(deckId: string, cardId: string): void {
  mutate((lib) => {
    const deck = lib.decks[deckId];
    if (!deck) return lib;
    return {
      ...lib,
      decks: { ...lib.decks, [deckId]: touch({ ...deck, coverCardId: cardId }) },
    };
  });
}

/**
 * Select an entity. Routes to `selectedId` or `selectedCubeId` based on
 * the entity's `isCube` flag, so switching tabs preserves each side's
 * selection. Passing null clears the selection for the active tab.
 */
export function selectDeck(id: string | null): void {
  mutate((lib) => {
    if (id === null) {
      return lib.libraryView === "cubes"
        ? { ...lib, selectedCubeId: null }
        : { ...lib, selectedId: null };
    }
    const entity = lib.decks[id];
    if (!entity) return lib;
    return entity.isCube
      ? { ...lib, selectedCubeId: id, libraryView: "cubes" }
      : { ...lib, selectedId: id, libraryView: "decks" };
  });
}

/**
 * Return the active deck id, creating or auto-selecting one if needed.
 *
 * - If a valid deck is selected, return its id.
 * - Otherwise, if any decks exist, select the first in display order.
 * - Otherwise, create an "Untitled" deck and select it.
 *
 * Used by click-to-add flows so the user never has to select a deck
 * before adding cards.
 */
export function ensureActiveDeck(): string {
  const lib = useDeckStore.getState().library;
  if (lib.selectedId && lib.decks[lib.selectedId]) return lib.selectedId;
  const firstId = lib.order.find((id) => id in lib.decks);
  if (firstId) {
    selectDeck(firstId);
    return firstId;
  }
  return createDeck("Untitled");
}

export function reorderDecks(order: string[]): void {
  mutate((lib) => ({ ...lib, order }));
}

/** Resolve the card map field name for a zone. */
function zoneField(zone: DeckZone): "cards" | "sideboard" {
  return zone === "sideboard" ? "sideboard" : "cards";
}

function sanitizeCount(n: number | undefined): number {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * Replace a card entry with a different printing of the same card.
 *
 * The old entry is removed and a new entry is created keyed by the new
 * snapshot's id. Count and addedAt are preserved so the deck's
 * categorization, totals, and "first card art" thumbnail are stable.
 *
 * If the new id already exists in the deck (rare race / user error),
 * counts are merged into the existing entry instead.
 */
export function swapCardPrint(
  deckId: string,
  oldCardId: string,
  newSnapshot: CardSnapshot,
  zone: DeckZone = "main",
): void {
  if (oldCardId === newSnapshot.id) return;
  const field = zoneField(zone);
  mutate((lib) => {
    const deck = lib.decks[deckId];
    if (!deck) return lib;
    const old = deck[field][oldCardId];
    if (!old) return lib;
    const map = { ...deck[field] };
    delete map[oldCardId];
    const existing = map[newSnapshot.id];
    map[newSnapshot.id] = existing
      ? { ...existing, count: existing.count + old.count }
      : { snapshot: newSnapshot, count: old.count, addedAt: old.addedAt, zone: old.zone };
    return { ...lib, decks: { ...lib.decks, [deckId]: touch({ ...deck, [field]: map }) } };
  });
}


/**
 * Import a parsed decklist: create a new deck, resolve card names via
 * Scryfall's /cards/collection, and populate it. Returns the new deck id.
 */
/**
 * Two-phase import of a decklist into a newly-created deck or cube.
 *
 * Phase 1 — INSTANT:
 *   Create the entity with `enriching: true` and an empty card map.
 *   The ribbon tile appears immediately (with a spinner overlay via
 *   DeckRibbonItem's `enriching` handling), so the user gets visual
 *   feedback that something is loading rather than a blank UI.
 *
 * Phase 2 — BACKGROUND (fire-and-forget):
 *   Resolve card names via Scryfall `/cards/collection`, populate the
 *   card map, clear the `enriching` flag. The promise is NOT awaited
 *   by the return value — callers get the deck id right away so they
 *   can seed multiple decks in parallel and watch them fill in.
 *
 * This mirrors the extension's `pullDecks.ts` pattern (thin commit now,
 * rich data later) so the demo seed path and the untap pull path feel
 * the same.
 */
export function importDecklist(
  entries: import("../decks/parseDecklist").DecklistEntry[],
  name = "Imported Deck",
  options: { isCube?: boolean } = {},
): Promise<string> {
  const { isCube = false } = options;
  const deckId = isCube ? createCube(name) : createDeck(name);
  // Flag as enriching so the ribbon tile spins.
  mutate((lib) => {
    const deck = lib.decks[deckId];
    if (!deck) return lib;
    return { ...lib, decks: { ...lib.decks, [deckId]: { ...deck, enriching: true } } };
  });
  // Phase 2 runs in the background. Errors don't propagate to the
  // caller — we log and clear `enriching` so the spinner stops.
  void resolveAndPopulate(deckId, entries, isCube).catch((err) => {
    console.error(`[importDecklist] "${name}" failed`, err);
    mutate((lib) => {
      const deck = lib.decks[deckId];
      if (!deck) return lib;
      return { ...lib, decks: { ...lib.decks, [deckId]: { ...deck, enriching: false } } };
    });
  });
  return Promise.resolve(deckId);
}

async function resolveAndPopulate(
  deckId: string,
  entries: import("../decks/parseDecklist").DecklistEntry[],
  isCube: boolean,
): Promise<void> {
  const { getCardsByIds } = await import("../services/scryfall");
  const { toSnapshot } = await import("../scryfall/snapshot");

  const uniqueNames = [...new Set(entries.map((e) => e.name))];
  const identifiers = uniqueNames.map((n) => ({ name: n }));
  const resolved = await getCardsByIds(identifiers);

  const byName = new Map<string, CardSnapshot>();
  for (const card of resolved) {
    byName.set(card.name.toLowerCase(), toSnapshot(card));
  }

  mutate((lib) => {
    const deck = lib.decks[deckId];
    if (!deck) return lib;
    const cards: Record<string, DeckCard> = {};
    const sideboard: Record<string, DeckCard> = {};
    const now = Date.now();
    for (const entry of entries) {
      const snap = byName.get(entry.name.toLowerCase());
      if (!snap) continue;
      // Cubes: all cards go in the mainboard under "group-1" (no
      // sideboard concept). Decks: standard main / sideboard split.
      const isSide = !isCube && entry.zone === "sideboard";
      const target = isSide ? sideboard : cards;
      const zoneTag = isCube ? "group-1" : isSide ? "sideboard-1" : "deck-1";
      const existing = target[snap.id];
      if (existing) {
        target[snap.id] = { ...existing, count: existing.count + entry.count };
      } else {
        target[snap.id] = { snapshot: snap, count: entry.count, addedAt: now, zone: zoneTag };
      }
    }
    return {
      ...lib,
      decks: {
        ...lib.decks,
        [deckId]: touch({ ...deck, cards, sideboard, enriching: false }),
      },
    };
  });
}

// ---------- Selectors ----------

/**
 * The entity shown in the detail view — the selected deck OR cube,
 * depending on the active library tab. Named `selectedDeck` for
 * historical reasons (and because the type is `Deck` either way — cubes
 * are just decks with `isCube: true`).
 */
export function selectedDeck(state: DeckStoreState): Deck | null {
  const { libraryView, selectedId, selectedCubeId, decks } = state.library;
  const id = libraryView === "cubes" ? selectedCubeId : selectedId;
  return id ? decks[id] ?? null : null;
}

export function deckCardCount(deck: Deck): number {
  let total = 0;
  for (const c of Object.values(deck.cards)) total += sanitizeCount(c.count);
  for (const c of Object.values(deck.sideboard)) total += sanitizeCount(c.count);
  return total;
}

export function firstCardSnapshot(deck: Deck): CardSnapshot | null {
  let earliest: DeckCardEntry | null = null;
  for (const c of Object.values(deck.cards)) {
    if (!earliest || c.addedAt < earliest.addedAt) earliest = c;
  }
  return earliest?.snapshot ?? null;
}

/**
 * Resolve the deck's cover-art snapshot. Looks up `coverCardId` across
 * mainboard, sideboard, AND the commander slot — promoting a card to
 * commander moves its snapshot into `deck.commander`, so a cover that
 * points at the commander must check there too. Falls back to the
 * commander itself, then the first card by add time.
 */
export function coverSnapshotOf(deck: Deck): CardSnapshot | null {
  if (deck.coverCardId) {
    const explicit =
      deck.cards[deck.coverCardId]?.snapshot ??
      deck.sideboard[deck.coverCardId]?.snapshot ??
      (deck.commander?.id === deck.coverCardId ? deck.commander : undefined);
    if (explicit) return explicit;
  }
  return deck.commander ?? firstCardSnapshot(deck);
}

type DeckCardEntry = Deck["cards"][string];

preserveOnHmr(useDeckStore, import.meta.hot);
