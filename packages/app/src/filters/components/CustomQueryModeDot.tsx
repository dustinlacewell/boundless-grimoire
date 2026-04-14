import { useState } from "react";
import { colors } from "@boundless-grimoire/ui";
import { GearIcon } from "@boundless-grimoire/ui";
import { Popover } from "@boundless-grimoire/ui";
import { useFilterStore } from "../store";

type CustomQueryMode = "or" | "and";

const MODES: { value: CustomQueryMode; label: string; description: string }[] = [
  { value: "or", label: "OR", description: "Any selected custom filter can match" },
  { value: "and", label: "AND", description: "All selected custom filters must match" },
];

const DOT_SIZE = 18;

const dotStyle = (active: boolean): React.CSSProperties => ({
  width: DOT_SIZE,
  height: DOT_SIZE,
  borderRadius: "50%",
  background: active ? colors.accent : colors.bg3,
  border: `1px solid ${active ? colors.accent : colors.borderStrong}`,
  padding: 0,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: active ? "#0a0a0c" : colors.textMuted,
  transition: "background 0.15s, border-color 0.15s, color 0.15s",
});

const menuItemStyle = (selected: boolean): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "8px 12px",
  fontSize: 12,
  cursor: "pointer",
  background: selected ? colors.bg3 : "transparent",
  color: selected ? colors.accent : colors.text,
  fontWeight: selected ? 700 : 500,
});

const menuLabelStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 0.5,
};

const menuDescStyle: React.CSSProperties = {
  fontSize: 10,
  color: colors.textMuted,
  textTransform: "none",
  letterSpacing: 0,
  fontWeight: 400,
};

/**
 * Gear dot for the custom-query combine mode (OR / AND). Mirrors
 * ColorModeDot: sits in the action slot of the Custom Filters FilterField.
 */
export function CustomQueryModeDot() {
  const mode = (useFilterStore((s) => s.state.customQueryMode) ?? "or") as CustomQueryMode;
  const patch = useFilterStore((s) => s.patch);
  const [open, setOpen] = useState(false);

  const current = MODES.find((m) => m.value === mode);

  return (
    <Popover
      open={open}
      onClose={() => setOpen(false)}
      align="right"
      trigger={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {current && (
            <span style={{ fontSize: 9, color: colors.accent, fontWeight: 700, letterSpacing: 0.3 }}>
              {current.label}
            </span>
          )}
          <button
            type="button"
            title={current ? `${current.label} — ${current.description}` : "Combine mode"}
            onClick={() => setOpen((o) => !o)}
            style={dotStyle(open)}
          >
            <GearIcon size={10} />
          </button>
        </span>
      }
    >
      <div style={{ padding: 4, minWidth: 220 }}>
        {MODES.map((m) => (
          <div
            key={m.value}
            style={menuItemStyle(m.value === mode)}
            onClick={() => {
              patch({ customQueryMode: m.value });
              setOpen(false);
            }}
          >
            <span style={menuLabelStyle}>{m.label}</span>
            <span style={menuDescStyle}>{m.description}</span>
          </div>
        ))}
      </div>
    </Popover>
  );
}
