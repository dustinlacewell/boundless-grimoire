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
import { getItem, setItem } from "./chromeStorage";
import { getServices } from "../services";
import { migrateLibrary } from "./migrations";
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
  const stored = await getItem<DeckLibrary>(STORAGE_KEY);
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
    .then(() => setItem(STORAGE_KEY, tagged))
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

  // Lazy import to avoid pulling extension-specific bridge code into envs
  // (the demo) that don't have it. Await the bridge so early edits/deletes
  // aren't silently dropped.
  void import("../sync/untapApi").then(async ({ waitForBridge }) => {
    const bridgeUp = await waitForBridge();
    if (!bridgeUp) return;

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

export function createDeck(name = "Untitled"): string {
  const id = crypto.randomUUID();
  const now = Date.now();
  const deck: Deck = {
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
  };
  mutate((lib) => ({
    ...lib,
    decks: { ...lib.decks, [id]: deck },
    order: [...lib.order, id],
    selectedId: id,
  }));
  return id;
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

export function selectDeck(deckId: string | null): void {
  mutate((lib) => ({ ...lib, selectedId: deckId }));
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
      : { snapshot: newSnapshot, count: old.count, addedAt: old.addedAt };
    return { ...lib, decks: { ...lib.decks, [deckId]: touch({ ...deck, [field]: map }) } };
  });
}


/**
 * Import a parsed decklist: create a new deck, resolve card names via
 * Scryfall's /cards/collection, and populate it. Returns the new deck id.
 */
export async function importDecklist(
  entries: import("../decks/parseDecklist").DecklistEntry[],
  name = "Imported Deck",
): Promise<string> {
  const { getCardsByIds } = await import("../scryfall/client");
  const { toSnapshot } = await import("../scryfall/snapshot");

  // Dedupe names for the batch lookup
  const uniqueNames = [...new Set(entries.map((e) => e.name))];
  const identifiers = uniqueNames.map((n) => ({ name: n }));
  const resolved = await getCardsByIds(identifiers);

  // Build name → snapshot lookup (case-insensitive)
  const byName = new Map<string, CardSnapshot>();
  for (const card of resolved) {
    byName.set(card.name.toLowerCase(), toSnapshot(card));
  }

  const deckId = createDeck(name);
  mutate((lib) => {
    const deck = lib.decks[deckId];
    if (!deck) return lib;
    const cards: Record<string, DeckCard> = {};
    const sideboard: Record<string, DeckCard> = {};
    const now = Date.now();
    for (const entry of entries) {
      const snap = byName.get(entry.name.toLowerCase());
      if (!snap) continue;
      const target = entry.zone === "sideboard" ? sideboard : cards;
      const existing = target[snap.id];
      if (existing) {
        target[snap.id] = { ...existing, count: existing.count + entry.count };
      } else {
        target[snap.id] = { snapshot: snap, count: entry.count, addedAt: now };
      }
    }
    return {
      ...lib,
      decks: { ...lib.decks, [deckId]: touch({ ...deck, cards, sideboard }) },
    };
  });

  return deckId;
}

// ---------- Selectors ----------

export function selectedDeck(state: DeckStoreState): Deck | null {
  const id = state.library.selectedId;
  return id ? state.library.decks[id] ?? null : null;
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

type DeckCardEntry = Deck["cards"][string];
