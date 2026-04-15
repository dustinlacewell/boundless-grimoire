import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { Pill } from "./Pill";
import { Popover } from "./Popover";
import { SearchInput } from "./SearchInput";

export interface MultiSelectOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Plain-text representation used for the search filter. */
  searchText: string;
}

interface Props<T extends string> {
  options: MultiSelectOption<T>[];
  values: T[];
  onChange: (values: T[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  width?: number | string;
}

const triggerClass = (open: boolean) =>
  [
    "min-h-8 p-1 w-full box-border flex flex-wrap items-center gap-1 cursor-pointer",
    "bg-bg-2 rounded-md ui-interactive ui-interactive-border",
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
 * Pill-bar trigger + popover with search-filtered multi-select list.
 *
 * Collapsed state: row of pills (one per selected value), each with × to
 * remove. Click anywhere on the bar to open.
 *
 * Open state: search input on top, scrollable list of options below.
 * Click an option to toggle. Click outside or press Esc to close.
 */
export function MultiSelect<T extends string>({
  options,
  values,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  width = 280,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the search input when the popover opens.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  const selectedSet = useMemo(() => new Set(values), [values]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.searchText.toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (value: T) => {
    if (selectedSet.has(value)) {
      onChange(values.filter((v) => v !== value));
    } else {
      onChange([...values, value]);
    }
  };

  const remove = (value: T) => onChange(values.filter((v) => v !== value));

  const selectedOptions = options.filter((o) => selectedSet.has(o.value));

  return (
    <div style={{ width }}>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        align="left"
        triggerFullWidth
        trigger={
          <div className={triggerClass(open)} onClick={() => setOpen(true)}>
            {selectedOptions.length === 0 && (
              <span className="text-text-muted text-xs px-1.5 font-semibold">
                {placeholder}
              </span>
            )}
            {selectedOptions.map((opt) => (
              <Pill key={opt.value} size="sm" onRemove={() => remove(opt.value)}>
                {opt.label}
              </Pill>
            ))}
          </div>
        }
      >
        <div className="p-2 border-b border-border">
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
        <div className="overflow-y-auto">
          {filtered.length === 0 && (
            <div className={`${optionClass(false)} opacity-50`}>No matches</div>
          )}
          {filtered.map((opt) => (
            <div
              key={opt.value}
              className={optionClass(selectedSet.has(opt.value))}
              onClick={() => toggle(opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      </Popover>
    </div>
  );
}
