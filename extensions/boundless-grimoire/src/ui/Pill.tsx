import type { ReactNode, MouseEvent } from "react";
import { colors } from "./colors";

interface Props {
  children: ReactNode;
  onRemove?: (e: MouseEvent) => void;
  size?: "sm" | "md";
}

const sizes = {
  sm: { height: 22, padding: "0 8px", fontSize: 11, gap: 4 },
  md: { height: 26, padding: "0 10px", fontSize: 12, gap: 6 },
} as const;

/** Compact rounded label, optionally with an × remove button. */
export function Pill({ children, onRemove, size = "md" }: Props) {
  const s = sizes[size];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        background: colors.bg3,
        color: colors.text,
        border: `1px solid ${colors.borderStrong}`,
        borderRadius: 999,
        boxSizing: "border-box",
        userSelect: "none",
      }}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
          aria-label="remove"
          style={{
            background: "transparent",
            border: "none",
            color: colors.textMuted,
            cursor: "pointer",
            fontSize: s.fontSize + 2,
            lineHeight: 1,
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
