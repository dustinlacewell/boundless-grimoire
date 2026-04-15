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
  "inline-flex items-center justify-center box-border rounded-[6px] font-sans font-semibold cursor-pointer ui-interactive ui-interactive-border";

const stateClass = (selected: boolean) =>
  selected ? "ui-interactive-selected" : "bg-bg-2 text-text";

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
