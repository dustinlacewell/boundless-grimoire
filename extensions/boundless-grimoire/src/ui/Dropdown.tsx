import { useState, type ReactNode } from "react";
import { colors } from "./colors";
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
}

const triggerStyle = (open: boolean): React.CSSProperties => ({
  height: 32,
  padding: "0 12px",
  background: colors.bg2,
  color: colors.text,
  border: `1px solid ${open ? colors.accent : colors.borderStrong}`,
  borderRadius: 6,
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  width: "100%",
  boxSizing: "border-box",
});

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
 * Single-select dropdown. Uses Popover for the open/close mechanics.
 * For multi-select with search, use MultiSelect.
 */
export function Dropdown<T extends string>({
  options,
  value,
  onChange,
  placeholder = "Select…",
  clearable = false,
  width = 180,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? null;

  return (
    <div style={{ width }}>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        align="left"
        trigger={
          <button
            type="button"
            style={triggerStyle(open)}
            onClick={() => setOpen((o) => !o)}
          >
            <span
              style={{
                opacity: current ? 1 : 0.5,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {current ? current.label : placeholder}
            </span>
            <span style={{ opacity: 0.6, fontSize: 11 }}>▾</span>
          </button>
        }
      >
        <div style={{ overflowY: "auto", padding: 4 }}>
          {clearable && (
            <div
              style={optionStyle(value === null)}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <em style={{ opacity: 0.6 }}>{placeholder}</em>
            </div>
          )}
          {options.map((opt) => (
            <div
              key={opt.value}
              style={optionStyle(opt.value === value)}
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
