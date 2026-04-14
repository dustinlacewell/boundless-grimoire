import type { ReactNode, MouseEvent } from "react";

interface Props {
  children: ReactNode;
  onRemove?: (e: MouseEvent) => void;
  size?: "sm" | "md";
}

const sizeClass: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-[22px] px-2 text-[11px] gap-1",
  md: "h-[26px] px-2.5 text-[12px] gap-1.5",
};

const removeBtnSize: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-[13px]",
  md: "text-[14px]",
};

/** Compact rounded label, optionally with an × remove button. */
export function Pill({ children, onRemove, size = "md" }: Props) {
  return (
    <span
      className={`inline-flex items-center box-border select-none rounded-full font-semibold bg-bg-3 text-text border border-border-strong ${sizeClass[size]}`}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          aria-label="remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(e);
          }}
          className={`inline-flex items-center bg-transparent border-0 p-0 leading-none text-text-muted cursor-pointer ${removeBtnSize[size]}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
