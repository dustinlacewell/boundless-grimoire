import type { CSSProperties, ReactNode } from "react";
import { colors } from "./colors";

interface Props {
  children?: ReactNode;
  /** Visual elevation tier. 1 = chrome, 2 = panel, 3 = raised. */
  elevation?: 1 | 2 | 3;
  padding?: number | string;
  radius?: number;
  border?: boolean;
  style?: CSSProperties;
  className?: string;
  onClick?: () => void;
}

const elevationBg: Record<NonNullable<Props["elevation"]>, string> = {
  1: colors.bg1,
  2: colors.bg2,
  3: colors.bg3,
};

/**
 * Generic dark panel surface. The basis for nearly every other component.
 * Compose, don't fork — if you need a one-off variant, pass `style`.
 */
export function Surface({
  children,
  elevation = 2,
  padding = 0,
  radius = 8,
  border = true,
  style,
  className,
  onClick,
}: Props) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: elevationBg[elevation],
        border: border ? `1px solid ${colors.border}` : "none",
        borderRadius: radius,
        padding,
        color: colors.text,
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
