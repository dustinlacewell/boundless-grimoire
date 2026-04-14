import { useEffect, type RefObject } from "react";
import { setCardWidth, useGridSizeStore } from "../search/gridSizeStore";

const SCROLL_STEP_PX = 12;

/**
 * Attach a Ctrl+wheel handler to `ref` that adjusts the shared card
 * width used by both the search grid and the deck view. Shared state
 * means resizing in one surface updates the other.
 *
 * Wheel events fire much faster than render frames; we coalesce pending
 * deltas into one setState per animation frame so rapid scrolls don't
 * flood the store with intermediate values.
 */
export function useCtrlWheelCardResize(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

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
      e.preventDefault();
      pendingDelta += -Math.sign(e.deltaY) * SCROLL_STEP_PX;
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", onWheel);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [ref]);
}
