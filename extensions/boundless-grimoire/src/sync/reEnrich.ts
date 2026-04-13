/**
 * Detect decks with thin (un-enriched) card snapshots and re-enrich them.
 *
 * A card is "thin" if it has no image_uris — that field is always present
 * on a Scryfall-enriched snapshot. Run this once at boot after the deck
 * store is hydrated so any cards that failed enrichment on a prior session
 * get another chance automatically.
 */
import { useDeckStore } from "../storage/deckStore";
import type { DeckCard } from "../storage/types";
import { enrichDeckCards } from "./enrichDeck";
import { suppressFromNextPush } from "./pushSchedule";

function hasThinCards(cards: Record<string, DeckCard>): boolean {
  return Object.values(cards).some(
    (c) => !c.snapshot.image_uris && !c.snapshot.card_faces,
  );
}

/** Re-enrich a single deck's thin cards and commit the result to the store. */
export async function enrichDeckInPlace(localDeckId: string): Promise<void> {
  const deck = useDeckStore.getState().library.decks[localDeckId];
  if (!deck) return;

  const [enrichedCards, enrichedSideboard] = await Promise.all([
    enrichDeckCards(deck.cards),
    enrichDeckCards(deck.sideboard),
  ]);

  suppressFromNextPush(localDeckId);

  useDeckStore.setState((s) => {
    const current = s.library.decks[localDeckId];
    if (!current) return s;
    return {
      library: {
        ...s.library,
        decks: {
          ...s.library.decks,
          [localDeckId]: {
            ...current,
            cards: enrichedCards,
            sideboard: enrichedSideboard,
            enriching: false,
          },
        },
      },
    };
  });
}

/** Scan all decks and re-enrich any that contain thin snapshots. */
export function reEnrichThinDecks(): void {
  const { decks } = useDeckStore.getState().library;
  for (const deck of Object.values(decks)) {
    if (hasThinCards(deck.cards) || hasThinCards(deck.sideboard)) {
      console.log(`[re-enrich] deck "${deck.name}" has thin cards, re-enriching`);
      void enrichDeckInPlace(deck.id);
    }
  }
}
