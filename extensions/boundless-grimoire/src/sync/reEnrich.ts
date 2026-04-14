/**
 * Detect decks with thin (un-enriched) card snapshots and re-enrich them.
 *
 * A card is "thin" if:
 *   - it has no image_uris AND no card_faces (never successfully enriched), OR
 *   - it's a land that's missing `produced_mana` (snapshot predates that field
 *     being captured — needed by analytics for mana production).
 *
 * Run this once at boot after the deck store is hydrated so any cards that
 * failed enrichment on a prior session, or predate newer fields, get another
 * chance automatically.
 */
import { useDeckStore } from "@boundless-grimoire/app";
import type { CardSnapshot, DeckCard } from "@boundless-grimoire/app";
import { enrichDeckCards } from "./enrichDeck";
import { suppressFromNextPush } from "./pushSchedule";

function isLand(snapshot: CardSnapshot): boolean {
  return (snapshot.type_line ?? "").toLowerCase().includes("land");
}

function isThin(snapshot: CardSnapshot): boolean {
  if (!snapshot.image_uris && !snapshot.card_faces) return true;
  if (isLand(snapshot) && !snapshot.produced_mana) return true;
  return false;
}

function hasThinCards(cards: Record<string, DeckCard>): boolean {
  return Object.values(cards).some((c) => isThin(c.snapshot));
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
