import { useRef, type CSSProperties, type ReactNode } from "react";
import { useWheelToHorizontal } from "./useWheelToHorizontal";

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
  useWheelToHorizontal(ref, wheelToHorizontal);

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
