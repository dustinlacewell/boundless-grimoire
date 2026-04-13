import { memo, useCallback, useMemo } from "react";
import { CardWithCount } from "../cards/CardWithCount";
import { toSnapshot } from "../scryfall/snapshot";
import type { ScryfallCard } from "../scryfall/types";
import {
  decrementCard,
  ensureActiveDeck,
  incrementCard,
  useDeckStore,
} from "../storage/deckStore";
import { toggleFavorite, useFavoritesStore } from "./favoritesStore";
import { togglePinned, usePinnedCardsStore } from "./pinnedCardsStore";

interface Props {
  card: ScryfallCard;
  width: number;
}

/**
 * One card in the search grid.
 *
 * Reuses CardWithCount from the deck view (DogEar count badge + click
 * handlers). Click handlers route through ensureActiveDeck() so the user
 * never needs to manually create / select a deck before adding.
 *
 * The displayed count reflects the *active deck only* — when no deck is
 * active, the badge stays at 0.
 *
 * Performance notes:
 *   - Wrapped in React.memo so a re-render of the parent grid (e.g. when
 *     a sibling tile updates) doesn't re-render every tile.
 *   - Subscribes to a *primitive* count for this specific card, not the
 *     whole active deck object. This is critical: any unrelated mutation
 *     in the active deck would otherwise reallocate the deck reference
 *     and re-render every tile.
 *   - Snapshot is memoized so the prop is referentially stable across
 *     re-renders, letting CardWithCount's reconciliation skip work.
 */
function CardGridItemImpl({ card, width }: Props) {
  // Subscribe to JUST this card's count in the active deck. Returns a
  // primitive, so the snapshot is reference-stable across unrelated
  // deck-store updates.
  const count = useDeckStore((s) => {
    const id = s.library.selectedId;
    if (!id) return 0;
    const deck = s.library.decks[id];
    if (!deck) return 0;
    return (deck.cards[card.id]?.count ?? 0) + (deck.sideboard[card.id]?.count ?? 0);
  });

  const pinned = usePinnedCardsStore((s) => card.id in s.byId);
  const favorited = useFavoritesStore((s) => card.id in s.byId);

  const snapshot = useMemo(() => toSnapshot(card), [card]);

  const handleIncrement = useCallback(() => {
    const deckId = ensureActiveDeck();
    incrementCard(deckId, snapshot);
  }, [snapshot]);

  const handleDecrement = useCallback((cardId: string) => {
    const deckId = ensureActiveDeck();
    decrementCard(deckId, cardId);
  }, []);

  const handleShiftClick = useCallback(() => togglePinned(card), [card]);
  const handleShiftContextMenu = useCallback(() => toggleFavorite(card.id), [card.id]);
  const handleAltClick = useCallback(() => {
    const deckId = ensureActiveDeck();
    incrementCard(deckId, snapshot, "sideboard");
  }, [snapshot]);

  return (
    <CardWithCount
      snapshot={snapshot}
      count={count}
      width={width}
      pinned={pinned}
      favorited={favorited}
      onIncrement={handleIncrement}
      onDecrement={handleDecrement}
      onShiftClick={handleShiftClick}
      onShiftContextMenu={handleShiftContextMenu}
      onAltClick={handleAltClick}
    />
  );
}

export const CardGridItem = memo(CardGridItemImpl);
