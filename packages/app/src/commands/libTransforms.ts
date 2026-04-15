/**
 * Pure library transforms.
 *
 * Every card-level mutation boils down to one of these functions:
 * `addCards`, `removeCards`, `moveCards`. They are plain `(library) =>
 * library` — no store access, no side effects. Both the direct deckStore
 * actions and the undo-history commands apply these to compute the next
 * library state.
 *
 * Keeping them pure is what makes the command layer trivial: a command's
 * `apply` and `invert` just choose which transform to call and with what
 * arguments.
 */
import type { CardSnapshot, Deck, DeckCard, DeckLibrary } from "../storage/types";

export type DeckZone = "main" | "sideboard";

/** One card-level change. `count` is always a positive integer. */
export interface CardDelta {
  snapshot: CardSnapshot;
  count: number;
  zone: DeckZone;
}

function zoneField(zone: DeckZone): "cards" | "sideboard" {
  return zone === "sideboard" ? "sideboard" : "cards";
}

function touch(deck: Deck): Deck {
  return { ...deck, updatedAt: Date.now() };
}

function sanitizeCount(n: number | undefined): number {
  if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

function withDeck(lib: DeckLibrary, deckId: string, next: Deck): DeckLibrary {
  return { ...lib, decks: { ...lib.decks, [deckId]: next } };
}

function addToZone(
  map: Record<string, DeckCard>,
  snapshot: CardSnapshot,
  count: number,
  zoneTag: string,
): Record<string, DeckCard> {
  const existing = map[snapshot.id];
  const baseline = sanitizeCount(existing?.count);
  return {
    ...map,
    [snapshot.id]: existing
      ? { ...existing, count: baseline + count }
      : { snapshot, count, addedAt: Date.now(), zone: zoneTag },
  };
}

/**
 * Resolve the untap zone tag for a newly-added card. Decks use the
 * fixed "deck-1" / "sideboard-1" tags. Cubes have no sideboard and drop
 * new cards into "group-1" — the user can reorganize into other groups
 * later via cube-specific actions.
 */
function zoneTagFor(deck: Deck, semanticZone: DeckZone): string {
  if (deck.isCube) return "group-1";
  return semanticZone === "sideboard" ? "sideboard-1" : "deck-1";
}

function removeFromZone(
  map: Record<string, DeckCard>,
  cardId: string,
  count: number,
): Record<string, DeckCard> {
  const existing = map[cardId];
  if (!existing) return map;
  const baseline = sanitizeCount(existing.count);
  const next = { ...map };
  if (baseline - count <= 0) delete next[cardId];
  else next[cardId] = { ...existing, count: baseline - count };
  return next;
}

/** Add each delta to the deck. Creates missing entries, bumps existing counts. */
export function addCards(
  lib: DeckLibrary,
  deckId: string,
  deltas: readonly CardDelta[],
): DeckLibrary {
  const deck = lib.decks[deckId];
  if (!deck) return lib;
  let cards = deck.cards;
  let sideboard = deck.sideboard;
  for (const d of deltas) {
    const tag = zoneTagFor(deck, d.zone);
    if (d.zone === "sideboard") sideboard = addToZone(sideboard, d.snapshot, d.count, tag);
    else cards = addToZone(cards, d.snapshot, d.count, tag);
  }
  return withDeck(lib, deckId, touch({ ...deck, cards, sideboard }));
}

/** Remove each delta from the deck. Counts clamp to zero (entry removed). */
export function removeCards(
  lib: DeckLibrary,
  deckId: string,
  deltas: readonly CardDelta[],
): DeckLibrary {
  const deck = lib.decks[deckId];
  if (!deck) return lib;
  let cards = deck.cards;
  let sideboard = deck.sideboard;
  for (const d of deltas) {
    if (d.zone === "sideboard") sideboard = removeFromZone(sideboard, d.snapshot.id, d.count);
    else cards = removeFromZone(cards, d.snapshot.id, d.count);
  }
  return withDeck(lib, deckId, touch({ ...deck, cards, sideboard }));
}

/**
 * Move deltas from `from` zone to the opposite zone. The counts shift
 * between zones — total deck size is unchanged.
 */
export function moveCards(
  lib: DeckLibrary,
  deckId: string,
  deltas: readonly CardDelta[],
  from: DeckZone,
): DeckLibrary {
  const deck = lib.decks[deckId];
  if (!deck) return lib;
  const to: DeckZone = from === "main" ? "sideboard" : "main";
  const srcKey = zoneField(from);
  const dstKey = zoneField(to);
  let src = deck[srcKey];
  let dst = deck[dstKey];
  for (const d of deltas) {
    src = removeFromZone(src, d.snapshot.id, d.count);
    dst = addToZone(dst, d.snapshot, d.count, zoneTagFor(deck, to));
  }
  return withDeck(lib, deckId, touch({ ...deck, [srcKey]: src, [dstKey]: dst }));
}
