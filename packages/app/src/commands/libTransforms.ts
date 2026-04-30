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
import type { CardSnapshot, Deck, DeckCard, DeckLibrary, ZoneName } from "../storage/types";

export type { ZoneName as DeckZone };

/** One card-level change. `count` is always a positive integer. */
export interface CardDelta {
  snapshot: CardSnapshot;
  count: number;
  zone: ZoneName;
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
 * Resolve the untap zone tag for a card in a given zone.
 * Cubes place all cards in "group-1"; non-cube zones map to their
 * canonical untap zone strings.
 */
function zoneTagFor(deck: Deck, zoneName: ZoneName): string {
  if (deck.isCube) return "group-1";
  switch (zoneName) {
    case "sideboard": return "sideboard-1";
    case "commander":
    case "startsInPlay": return "play-1";
    default: return "deck-1";
  }
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
  let zones = deck.zones;
  for (const d of deltas) {
    const tag = zoneTagFor(deck, d.zone);
    const zone = zones[d.zone];
    zones = { ...zones, [d.zone]: { ...zone, cards: addToZone(zone.cards, d.snapshot, d.count, tag) } };
  }
  return withDeck(lib, deckId, touch({ ...deck, zones }));
}

/** Remove each delta from the deck. Counts clamp to zero (entry removed). */
export function removeCards(
  lib: DeckLibrary,
  deckId: string,
  deltas: readonly CardDelta[],
): DeckLibrary {
  const deck = lib.decks[deckId];
  if (!deck) return lib;
  let zones = deck.zones;
  for (const d of deltas) {
    const zone = zones[d.zone];
    zones = { ...zones, [d.zone]: { ...zone, cards: removeFromZone(zone.cards, d.snapshot.id, d.count) } };
  }
  return withDeck(lib, deckId, touch({ ...deck, zones }));
}

/**
 * Move deltas from one zone to another. Total deck size is unchanged.
 */
export function moveCards(
  lib: DeckLibrary,
  deckId: string,
  deltas: readonly CardDelta[],
  from: ZoneName,
  to: ZoneName,
): DeckLibrary {
  const deck = lib.decks[deckId];
  if (!deck) return lib;
  let zones = deck.zones;
  for (const d of deltas) {
    const srcZone = zones[from];
    const dstZone = zones[to];
    const srcCards = removeFromZone(srcZone.cards, d.snapshot.id, d.count);
    const dstCards = addToZone(dstZone.cards, d.snapshot, d.count, zoneTagFor(deck, to));
    zones = { ...zones, [from]: { ...srcZone, cards: srcCards }, [to]: { ...dstZone, cards: dstCards } };
  }
  return withDeck(lib, deckId, touch({ ...deck, zones }));
}
