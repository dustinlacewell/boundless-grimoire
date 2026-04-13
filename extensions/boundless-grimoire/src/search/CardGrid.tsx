import { useEffect, useRef } from "react";
import type { ScryfallCard } from "../scryfall/types";
import { CardGridItem } from "./CardGridItem";
import {
  MAX_CARD_WIDTH,
  MIN_CARD_WIDTH,
  setCardWidth,
  useGridSizeStore,
} from "./gridSizeStore";

interface Props {
  cards: ScryfallCard[];
}

const SCROLL_STEP_PX = 12;

/**
 * Responsive auto-fill grid of CardGridItem tiles.
 *
 * Card width is global state (persisted via chrome.storage.local) so it
 * survives reloads. Holding Ctrl while scrolling over the grid adjusts
 * the card width and prevents the page from scrolling. Without Ctrl
 * the wheel falls through to the normal overlay scroll.
 */
export function CardGrid({ cards }: Props) {
  const cardWidth = useGridSizeStore((s) => s.cardWidth);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    // Wheel events fire much faster than render frames. Coalesce all the
    // ticks that arrive between paints into a single setState by holding
    // a pending delta and flushing it on the next animation frame. This
    // turns a 100-tile resize from "100 setState × 100 tiles re-render"
    // into ~60/sec setStates and lets the CSS grid actually keep up.
    let pendingDelta = 0;
    let rafId: number | null = null;
    const flush = () => {
      rafId = null;
      if (pendingDelta === 0) return;
      const current = useGridSizeStore.getState().cardWidth;
      setCardWidth(current + pendingDelta);
      pendingDelta = 0;
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      // Prevent both page scroll and pinch-zoom semantics.
      e.preventDefault();
      pendingDelta += -Math.sign(e.deltaY) * SCROLL_STEP_PX;
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };
    // passive:false is required so preventDefault() works.
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

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
