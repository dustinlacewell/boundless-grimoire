/**
 * Thin card-action wrappers used by the UI.
 *
 * Each function resolves the current deck state (to capture snapshots
 * needed for inverse commands), builds the appropriate command, and
 * dispatches it through the undo-history store. The deckStore itself
 * doesn't know about commands — this file is the only bridge.
 */
import type { CardSnapshot } from "../storage/types";
import { useDeckStore } from "../storage/deckStore";
import {
  addCardsCommand,
  moveCardsFromSideboardCommand,
  moveCardsToSideboardCommand,
  removeCardsCommand,
} from "./cardCommands";
import { dispatch } from "./historyStore";
import type { DeckZone } from "./libTransforms";

/** Add 1 copy of a card to a deck zone (defaults to mainboard). */
export function incrementCard(
  deckId: string,
  snapshot: CardSnapshot,
  zone: DeckZone = "mainboard",
): void {
  if (!useDeckStore.getState().library.decks[deckId]) return;
  dispatch(addCardsCommand(deckId, [{ snapshot, count: 1, zone }]));
}

/** Remove 1 copy of a card. No-op if the card isn't in the zone. */
export function decrementCard(
  deckId: string,
  cardId: string,
  zone: DeckZone = "mainboard",
): void {
  const deck = useDeckStore.getState().library.decks[deckId];
  if (!deck) return;
  const entry = deck.zones[zone].cards[cardId];
  if (!entry) return;
  dispatch(removeCardsCommand(deckId, [{ snapshot: entry.snapshot, count: 1, zone }]));
}

/** Move a card's entire stack between mainboard and sideboard. */
export function moveCardToZone(deckId: string, cardId: string, from: DeckZone): void {
  const deck = useDeckStore.getState().library.decks[deckId];
  if (!deck) return;
  const entry = deck.zones[from].cards[cardId];
  if (!entry) return;
  const delta = { snapshot: entry.snapshot, count: entry.count, zone: from };
  const cmd =
    from === "mainboard"
      ? moveCardsToSideboardCommand(deckId, [delta])
      : moveCardsFromSideboardCommand(deckId, [delta]);
  dispatch(cmd);
}
