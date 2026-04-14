import { useRef } from "react";
import type { ScryfallCard } from "../scryfall/types";
import { useCtrlWheelCardResize } from "../ui/useCtrlWheelCardResize";
import { CardGridItem } from "./CardGridItem";
import {
  MAX_CARD_WIDTH,
  MIN_CARD_WIDTH,
  useGridSizeStore,
} from "./gridSizeStore";

interface Props {
  cards: ScryfallCard[];
}

/**
 * Responsive auto-fill grid of CardGridItem tiles.
 *
 * Card width is global state (persisted via chrome.storage.local) so it
 * survives reloads — and shared with the deck view. Holding Ctrl while
 * scrolling over the grid adjusts the card width and prevents the page
 * from scrolling. Without Ctrl the wheel falls through to the normal
 * overlay scroll.
 */
export function CardGrid({ cards }: Props) {
  const cardWidth = useGridSizeStore((s) => s.cardWidth);
  const ref = useRef<HTMLDivElement>(null);
  useCtrlWheelCardResize(ref);

  return (
    <div
      ref={ref}
      title={`Card width: ${cardWidth}px (Ctrl+scroll to resize, ${MIN_CARD_WIDTH}–${MAX_CARD_WIDTH})`}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`,
        gap: 12,
        alignItems: "start",
        justifyItems: "center",
        transition: "grid-template-columns 80ms linear",
        // Opt out of CSS scroll anchoring for the search grid. When the
        // user pins/favorites a card, composeGrid moves that card to the
        // top of the list. The browser's default `overflow-anchor: auto`
        // can pick the moved tile as the scroll anchor and then "follow"
        // it to position 0, dragging the viewport to the top of the
        // results — exactly the opposite of what the user wants. Card
        // tiles have fixed dimensions (CardImage sets explicit width +
        // cardHeightFor height), so image loads don't shift layout, so
        // disabling anchoring here doesn't regress any other behavior.
        overflowAnchor: "none",
      }}
    >
      {cards.map((card) => (
        <CardGridItem key={card.id} card={card} width={cardWidth} />
      ))}
    </div>
  );
}
