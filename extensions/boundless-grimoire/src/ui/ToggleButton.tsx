import type { ButtonHTMLAttributes, ReactNode } from "react";
import { colors } from "./colors";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  children: ReactNode;
  selected: boolean;
  size?: "sm" | "md";
}

const sizes = {
  sm: { height: 26, padding: "0 10px", fontSize: 12 },
  md: { height: 32, padding: "0 12px", fontSize: 13 },
} as const;

/** Single toggleable button. Used inside ButtonGroup. */
export function ToggleButton({
  children,
  selected,
  size = "md",
  style,
  ...rest
}: Props) {
  const s = sizes[size];
  return (
    <button
      {...rest}
      type="button"
      style={{
        height: s.height,
        padding: s.padding,
        fontSize: s.fontSize,
        background: selected ? colors.accent : colors.bg2,
        color: selected ? "#0a0a0c" : colors.text,
        border: `1px solid ${selected ? colors.accent : colors.borderStrong}`,
        borderRadius: 6,
        fontFamily: "system-ui, sans-serif",
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        transition: "background 0.1s, color 0.1s, border-color 0.1s",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
