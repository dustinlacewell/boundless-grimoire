import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> {
  children: ReactNode;
  selected: boolean;
  size?: "sm" | "md";
}

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-[26px] px-2.5 text-[12px]",
  md: "h-[32px] px-3 text-[13px]",
};

const baseClass =
  "inline-flex items-center justify-center box-border border rounded-[6px] font-sans font-semibold cursor-pointer transition-[background-color,color,border-color] duration-100";

const stateClass = (selected: boolean) =>
  selected
    ? "bg-accent text-[#0a0a0c] border-accent hover:opacity-90"
    : "bg-bg-2 text-text border-border-strong hover:bg-bg-3 hover:border-border";

/** Single toggleable button. Used inside ButtonGroup. */
export function ToggleButton({ children, selected, size = "md", className = "", ...rest }: Props) {
  return (
    <button
      type="button"
      className={`${baseClass} ${sizeClass[size]} ${stateClass(selected)} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
}
