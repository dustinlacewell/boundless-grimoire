import { useState, type ReactNode } from "react";
import { Popover } from "./Popover";

export interface DropdownOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface Props<T extends string> {
  options: DropdownOption<T>[];
  value: T | null;
  onChange: (value: T | null) => void;
  placeholder?: string;
  /** Allow clearing back to null. */
  clearable?: boolean;
  width?: number | string;
  /**
   * When true, the trigger sizes to content and keeps the caret right
   * next to the label (no justify-between whitespace). Use this for
   * compact header controls where the dropdown sits in a row of other
   * controls — fixed-width form dropdowns should leave this off.
   */
  compact?: boolean;
}

const triggerClass = (open: boolean, compact: boolean) =>
  [
    "h-8 px-3 box-border inline-flex items-center gap-2",
    compact ? "justify-start" : "w-full justify-between",
    "rounded-md font-sans text-[13px] font-semibold cursor-pointer",
    "bg-bg-2 text-text ui-interactive ui-interactive-border",
    open && "ui-interactive-active",
  ]
    .filter(Boolean)
    .join(" ");

const optionClass = (selected: boolean) =>
  [
    "px-3 py-2 text-[13px] cursor-pointer whitespace-nowrap",
    selected ? "ui-interactive-selected font-bold" : "text-text font-normal ui-interactive",
  ].join(" ");

/**
 * Single-select dropdown. Uses Popover for the open/close mechanics.
 * For multi-select with search, use MultiSelect.
 */
export function Dropdown<T extends string>({
  options,
  value,
  onChange,
  placeholder = "Select…",
  clearable = false,
  width,
  compact = false,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? null;
  // Compact trigger is content-sized; fixed-width form dropdowns default
  // to 180 to match common short-field sizing.
  const effectiveWidth = width ?? (compact ? "auto" : 180);

  return (
    <div style={{ width: effectiveWidth, display: compact ? "inline-block" : undefined }}>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        align="left"
        trigger={
          <button
            type="button"
            className={triggerClass(open, compact)}
            onClick={() => setOpen((o) => !o)}
          >
            <span
              className="overflow-hidden text-ellipsis whitespace-nowrap"
              style={{ opacity: current ? 1 : 0.5 }}
            >
              {current ? current.label : placeholder}
            </span>
            <span className="opacity-60 text-[11px]">▾</span>
          </button>
        }
      >
        <div className="overflow-y-auto">
          {clearable && (
            <div
              className={optionClass(value === null)}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <em className="opacity-60">{placeholder}</em>
            </div>
          )}
          {options.map((opt) => (
            <div
              key={opt.value}
              className={optionClass(opt.value === value)}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      </Popover>
    </div>
  );
}
