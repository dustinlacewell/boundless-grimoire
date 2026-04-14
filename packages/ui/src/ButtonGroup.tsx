import type { ReactNode } from "react";
import { ToggleButton } from "./ToggleButton";

export interface ButtonGroupOption<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
}

interface Props<T extends string> {
  options: ButtonGroupOption<T>[];
  isSelected: (value: T) => boolean;
  onToggle: (value: T) => void;
  size?: "sm" | "md";
  /** Gap between buttons in px. Defaults to 4. */
  gap?: number;
}

/**
 * Horizontal cluster of toggle buttons. Selection state and toggle
 * semantics are owned by the parent — pass `isSelected` and `onToggle`.
 * The same component handles single-select (parent treats it as a radio
 * group) and multi-select.
 */
export function ButtonGroup<T extends string>({
  options,
  isSelected,
  onToggle,
  size = "md",
  gap = 4,
}: Props<T>) {
  return (
    <div className="inline-flex flex-wrap" style={{ gap }}>
      {options.map((opt) => (
        <ToggleButton
          key={opt.value}
          selected={isSelected(opt.value)}
          onClick={() => onToggle(opt.value)}
          title={opt.title}
          size={size}
        >
          {opt.label}
        </ToggleButton>
      ))}
    </div>
  );
}
