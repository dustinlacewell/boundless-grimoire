import { useEffect, type RefObject } from "react";
import { setCardWidth, useGridSizeStore } from "../search/gridSizeStore";
import { setDeckCardWidth, useDeckGridSizeStore, MIN_DECK_CARD_WIDTH, MAX_DECK_CARD_WIDTH } from "../decks/deckGridSizeStore";
import { useSettingsStore } from "../settings/settingsStore";

const SCROLL_STEP_PX = 12;

/**
 * Attach a Ctrl+wheel handler to `ref` that adjusts card width for the
 * given `context` ("search" or "deck"). When zoom is linked (the default),
 * scrolling in either context updates both stores. When unlinked, only the
 * context's own store is updated.
 *
 * Wheel events fire much faster than render frames; we coalesce pending
 * deltas into one setState per animation frame so rapid scrolls don't
 * flood the store with intermediate values.
 */
export function useCtrlWheelCardResize(
  ref: RefObject<HTMLElement | null>,
  context: "search" | "deck",
): void {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let pendingDelta = 0;
    let rafId: number | null = null;
    const flush = () => {
      rafId = null;
      if (pendingDelta === 0) return;
      const linked = useSettingsStore.getState().settings.zoomLinked;
      if (linked) {
        // Search is the leader: apply the delta to it, then derive deck from
        // the same new value. Deck "waits" at its minimum until search catches
        // up, so they always re-align rather than drifting apart.
        const newSearchWidth = useGridSizeStore.getState().cardWidth + pendingDelta;
        setCardWidth(newSearchWidth);
        setDeckCardWidth(Math.min(Math.max(newSearchWidth, MIN_DECK_CARD_WIDTH), MAX_DECK_CARD_WIDTH));
      } else if (context === "search") {
        setCardWidth(useGridSizeStore.getState().cardWidth + pendingDelta);
      } else {
        setDeckCardWidth(useDeckGridSizeStore.getState().cardWidth + pendingDelta);
      }
      pendingDelta = 0;
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      pendingDelta += -Math.sign(e.deltaY) * SCROLL_STEP_PX;
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [ref, context]);
}
