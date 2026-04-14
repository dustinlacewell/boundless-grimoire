import { useMemo, useRef, useState, useEffect, type ReactNode } from "react";
import { colors } from "./colors";
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

const triggerWrapper = (open: boolean): React.CSSProperties => ({
  minHeight: 32,
  padding: 4,
  background: colors.bg2,
  border: `1px solid ${open ? colors.accent : colors.borderStrong}`,
  borderRadius: 6,
  cursor: "pointer",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 4,
  width: "100%",
  boxSizing: "border-box",
});

const placeholderStyle: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: 12,
  padding: "0 6px",
  fontWeight: 600,
};

const optionStyle = (selected: boolean): React.CSSProperties => ({
  padding: "8px 12px",
  fontSize: 13,
  cursor: "pointer",
  background: selected ? colors.accent : "transparent",
  color: selected ? "#0a0a0c" : colors.text,
  fontWeight: selected ? 700 : 400,
  whiteSpace: "nowrap",
});

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
          <div style={triggerWrapper(open)} onClick={() => setOpen(true)}>
            {selectedOptions.length === 0 && (
              <span style={placeholderStyle}>{placeholder}</span>
            )}
            {selectedOptions.map((opt) => (
              <Pill key={opt.value} size="sm" onRemove={() => remove(opt.value)}>
                {opt.label}
              </Pill>
            ))}
          </div>
        }
      >
        <div style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
        <div style={{ overflowY: "auto", padding: 4 }}>
          {filtered.length === 0 && (
            <div style={{ ...optionStyle(false), opacity: 0.5 }}>No matches</div>
          )}
          {filtered.map((opt) => (
            <div
              key={opt.value}
              style={optionStyle(selectedSet.has(opt.value))}
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
