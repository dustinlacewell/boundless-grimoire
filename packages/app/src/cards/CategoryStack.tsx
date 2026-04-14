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
  onSetCover?: (snapshot: CardSnapshot) => void;
  onSetCommander?: (snapshot: CardSnapshot) => void;
  illegalCards?: Set<string>;
}

const TRANSITION = "transform 200ms ease-out";

/**
 * Fraction of card height used for each card's peek-out in the fan.
 * Keeping the offset proportional to card size makes the stack look the
 * same density whether the user has zoomed way in or way out.
 * 14% puts the offset at 36px for the old default ~260px card height.
 */
export const STACK_OFFSET_RATIO = 0.14;

/** Offset (each card's peek-out) for a given card width. */
export function stackOffsetFor(cardWidth: number): number {
  return Math.round(cardHeightFor(cardWidth) * STACK_OFFSET_RATIO);
}

/**
 * Worst-case vertical shift when any card in a stack is hovered. The
 * deck/sideboard wrapper should reserve this much extra space at its
 * bottom so slid cards don't overflow into adjacent sections.
 */
export function stackReveal(cardWidth: number, offset?: number): number {
  return cardHeightFor(cardWidth) - (offset ?? stackOffsetFor(cardWidth));
}

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
  offset,
  onIncrement,
  onDecrement,
  onPickPrint,
  onAltClick,
  onSetCover,
  onSetCommander,
  illegalCards,
}: Props) {
  // Default offset scales with card size so the fan looks the same at
  // any zoom level. Callers can still pass an explicit offset to override.
  const effectiveOffset = offset ?? stackOffsetFor(cardWidth);
  const cardH = cardHeightFor(cardWidth);
  const stackH = cardH + Math.max(0, cards.length - 1) * effectiveOffset;
  const reveal = cardH - effectiveOffset;

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
              top: i * effectiveOffset,
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
              onSetCover={onSetCover}
              onSetCommander={onSetCommander}
              illegal={illegalCards?.has(entry.snapshot.id)}
            />
          </div>
        );
      })}
    </div>
  );
}
