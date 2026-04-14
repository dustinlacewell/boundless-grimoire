import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  gap?: number;
  padding?: number | string;
  style?: CSSProperties;
  /**
   * When true, vertical mouse-wheel input is redirected to horizontal
   * scrolling. Useful for strips (analytics, ribbon) where the user
   * naturally wants to scroll sideways but their wheel/trackpad emits
   * vertical deltas.
   */
  wheelToHorizontal?: boolean;
}

/**
 * Horizontally-scrolling row. Children flow left-to-right, no wrapping.
 * Used by the deck ribbon, and reusable for other horizontal lists later.
 */
export function HScroll({ children, gap = 12, padding = 0, style, wheelToHorizontal = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!wheelToHorizontal) return;
    const node = ref.current;
    if (!node) return;
    // Non-passive so we can preventDefault on the vertical-to-horizontal
    // redirect. Guard against hijacking when the user is clearly scrolling
    // horizontally (trackpads) or holding a modifier (ctrl-scroll to zoom).
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.deltaY === 0) return;
      e.preventDefault();
      node.scrollLeft += e.deltaY;
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [wheelToHorizontal]);

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        gap,
        padding,
        overflowX: "auto",
        overflowY: "hidden",
        scrollbarWidth: "thin",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
