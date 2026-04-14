import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "default" | "primary" | "ghost";
type Size = "sm" | "md";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
}

const variantClass: Record<Variant, string> = {
  default: "bg-bg-2 text-text border-border-strong",
  primary: "bg-accent text-[#0a0a0c] border-accent",
  ghost: "bg-transparent text-text-muted border-border",
};

const sizeClass: Record<Size, string> = {
  sm: "h-[26px] px-[10px] text-[12px]",
  md: "h-[32px] px-[14px] text-[13px]",
};

const baseClass =
  "inline-flex items-center justify-center box-border border font-sans font-semibold rounded-[6px] cursor-pointer";

/** Plain button primitive — no behavior, just styling. */
export function Button({ children, variant = "default", size = "md", className = "", ...rest }: Props) {
  return (
    <button
      type="button"
      className={`${baseClass} ${variantClass[variant]} ${sizeClass[size]} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
