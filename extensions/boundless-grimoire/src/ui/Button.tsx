import type { ButtonHTMLAttributes, ReactNode } from "react";
import { colors } from "./colors";

type Variant = "default" | "primary" | "ghost";
type Size = "sm" | "md";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
}

const sizeStyles: Record<Size, { padding: string; fontSize: number; height: number }> = {
  sm: { padding: "0 10px", fontSize: 12, height: 26 },
  md: { padding: "0 14px", fontSize: 13, height: 32 },
};

const variantStyles: Record<Variant, { bg: string; border: string; color: string }> = {
  default: { bg: colors.bg2, border: colors.borderStrong, color: colors.text },
  primary: { bg: colors.accent, border: colors.accent, color: "#0a0a0c" },
  ghost: { bg: "transparent", border: colors.border, color: colors.textMuted },
};

/** Plain button primitive — no behavior, just styling. */
export function Button({
  children,
  variant = "default",
  size = "md",
  style,
  ...rest
}: Props) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  return (
    <button
      type="button"
      {...rest}
      style={{
        background: v.bg,
        color: v.color,
        border: `1px solid ${v.border}`,
        borderRadius: 6,
        padding: s.padding,
        height: s.height,
        fontSize: s.fontSize,
        fontFamily: "system-ui, sans-serif",
        fontWeight: 600,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {children}
    </button>
  );
}
