import type { CSSProperties, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  /** Visual elevation tier. 1 = chrome, 2 = panel, 3 = raised. */
  elevation?: 1 | 2 | 3;
  /** Inline padding. Use a number for px or a string for full CSS values. */
  padding?: number | string;
  /** Inline corner radius in px. */
  radius?: number;
  border?: boolean;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
}

const elevationClass: Record<NonNullable<Props["elevation"]>, string> = {
  1: "bg-bg-1",
  2: "bg-bg-2",
  3: "bg-bg-3",
};

/**
 * Generic dark panel surface. The basis for nearly every other component.
 * Compose, don't fork — if you need a one-off variant, pass `style` or
 * extra Tailwind classes via `className`.
 */
export function Surface({
  children,
  elevation = 2,
  padding = 0,
  radius = 8,
  border = true,
  style,
  className = "",
  onClick,
}: Props) {
  const borderClass = border ? "border border-border" : "border-0";
  return (
    <div
      onClick={onClick}
      className={`box-border text-text ${elevationClass[elevation]} ${borderClass} ${className}`.trim()}
      style={{ borderRadius: radius, padding, ...style }}
    >
      {children}
    </div>
  );
}
