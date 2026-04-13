import type { CSSProperties, ReactNode } from "react";

interface Props {
  children: ReactNode;
  gap?: number;
  padding?: number | string;
  style?: CSSProperties;
}

/**
 * Horizontally-scrolling row. Children flow left-to-right, no wrapping.
 * Used by the deck ribbon, and reusable for other horizontal lists later.
 */
export function HScroll({ children, gap = 12, padding = 0, style }: Props) {
  return (
    <div
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
