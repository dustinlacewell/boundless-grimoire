import { useState } from "react";
import type { CardSnapshot, DeckCard } from "../storage/types";
import { CardWithCount } from "./CardWithCount";
import { cardHeightFor } from "./CardImage";

interface Props {
  cards: DeckCard[];
  cardWidth: number;
  /** Pixels of vertical reveal between successive cards in the stack. */
  offset?: number;
  onIncrement: (snapshot: CardSnapshot) => void;
  onDecrement: (cardId: string) => void;
  onPickPrint?: (snapshot: CardSnapshot) => void;
  onAltClick?: (snapshot: CardSnapshot) => void;
  illegalCards?: Set<string>;
}

const TRANSITION = "transform 200ms ease-out";

/**
 * Vertically fanned stack of cards (Archidekt-style). Each card is
 * absolutely positioned, offset down from the previous, so the top of
 * every card peeks out and the bottom card shows in full.
 *
 * On hover, every card *below* the hovered one slides down by exactly
 * `cardHeight - offset` so the hovered card is fully revealed while the
 * cards below it keep their relative stack formation. On unhover the
 * cards smoothly return to their resting positions.
 */
export function CategoryStack({
  cards,
  cardWidth,
  offset = 36,
  onIncrement,
  onDecrement,
  onPickPrint,
  onAltClick,
  illegalCards,
}: Props) {
  const cardH = cardHeightFor(cardWidth);
  const stackH = cardH + Math.max(0, cards.length - 1) * offset;
  const reveal = cardH - offset;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <div
      style={{ position: "relative", width: cardWidth, height: stackH }}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {cards.map((entry, i) => {
        // Cards strictly below the hovered card slide down to expose it.
        const slid = hoverIdx !== null && i > hoverIdx;
        return (
          <div
            key={entry.snapshot.id}
            onMouseEnter={() => setHoverIdx(i)}
            style={{
              position: "absolute",
              top: i * offset,
              left: 0,
              transform: slid ? `translateY(${reveal}px)` : "translateY(0)",
              transition: TRANSITION,
              willChange: "transform",
              // Higher z-index for cards lower in the stack so the
              // visual layering matches DOM order even with transforms.
              zIndex: i,
            }}
          >
            <CardWithCount
              snapshot={entry.snapshot}
              count={entry.count}
              width={cardWidth}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onPickPrint={onPickPrint}
              onAltClick={onAltClick}
              illegal={illegalCards?.has(entry.snapshot.id)}
            />
          </div>
        );
      })}
    </div>
  );
}
