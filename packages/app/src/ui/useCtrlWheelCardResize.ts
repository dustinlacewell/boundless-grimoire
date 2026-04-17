import { useEffect, type RefObject } from "react";
import { setCardWidth, useGridSizeStore } from "../search/gridSizeStore";
import { setDeckCardWidth, useDeckGridSizeStore, MIN_DECK_CARD_WIDTH, MAX_DECK_CARD_WIDTH } from "../decks/deckGridSizeStore";
import { useSettingsStore } from "../settings/settingsStore";

const SCROLL_STEP_PX = 12;

/**
 * Module-level zoom capture. When a Ctrl+wheel gesture begins over a
 * zoom-aware element, we install a document-level capturing wheel listener
 * that both suppresses the browser page zoom AND drives the card resize.
 * This keeps zoom working even when the cursor drifts off the grid (which
 * happens because the layout shifts as cards resize). The capture is torn
 * down when Ctrl is released.
 *
 * `activeHandler` is set on gesture start and not replaced mid-gesture, so
 * the originating context (search or deck) owns the resize for the full hold.
 */
let activeHandler: ((deltaY: number) => void) | null = null;
let zoomCaptureCleanup: (() => void) | null = null;

function startZoomCapture(handler: (deltaY: number) => void): void {
  if (zoomCaptureCleanup) return; // already capturing — preserve original context
  activeHandler = handler;

  const onCaptureWheel = (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    activeHandler?.(e.deltaY);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === "Control") stopZoomCapture();
  };

  document.addEventListener("wheel", onCaptureWheel, { passive: false, capture: true });
  document.addEventListener("keyup", onKeyUp);
  zoomCaptureCleanup = () => {
    document.removeEventListener("wheel", onCaptureWheel, { capture: true });
    document.removeEventListener("keyup", onKeyUp);
    activeHandler = null;
    zoomCaptureCleanup = null;
  };
}

function stopZoomCapture(): void {
  zoomCaptureCleanup?.();
}

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
    const accumulate = (deltaY: number) => {
      pendingDelta += -Math.sign(deltaY) * SCROLL_STEP_PX;
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };

    // The grid listener only initiates capture. Once capture is running, the
    // document-level listener drives all accumulation (including when the
    // cursor has drifted off this element), so we don't accumulate here too.
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      startZoomCapture(accumulate);
    };
    node.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      node.removeEventListener("wheel", onWheel);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [ref, context]);
}
