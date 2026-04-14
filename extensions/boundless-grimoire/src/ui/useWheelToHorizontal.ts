import { useEffect, type RefObject } from "react";

/**
 * Redirect vertical mouse-wheel input to horizontal scrolling on the
 * element referenced by `ref`. Guards against hijacking when the user is
 * already scrolling horizontally (trackpads) or holding a modifier
 * (ctrl-scroll = zoom).
 *
 * Attach a `ref` to the scroll container, pass it here, and the element's
 * `scrollLeft` will advance by wheel `deltaY` when appropriate.
 */
export function useWheelToHorizontal(
  ref: RefObject<HTMLElement | null>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.deltaY === 0) return;
      e.preventDefault();
      node.scrollLeft += e.deltaY;
    };
    // Non-passive so preventDefault works.
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [ref, enabled]);
}
