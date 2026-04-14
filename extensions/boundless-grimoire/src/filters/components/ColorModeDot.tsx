import { useState } from "react";
import { colors } from "../../ui/colors";
import { GearIcon } from "../../ui/icons/Icons";
import { Popover } from "../../ui/Popover";
import { COLOR_MODES } from "../constants";
import { useFilterStore } from "../store";
import type { ColorMode } from "../types";

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
 * Dot indicator for the color-match mode. Click opens a popover menu
 * listing the three modes with descriptions; current mode is highlighted.
 * Fills in the "action" slot of the Color FilterField.
 */
export function ColorModeDot() {
  const colorMode = useFilterStore((s) => s.state.colorMode);
  const patch = useFilterStore((s) => s.patch);
  const [open, setOpen] = useState(false);

  const current = COLOR_MODES.find((m) => m.value === colorMode);

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
            title={current ? `${current.label} — ${current.title}` : "Color mode"}
            onClick={() => setOpen((o) => !o)}
            style={dotStyle(open)}
          >
            <GearIcon size={10} />
          </button>
        </span>
      }
    >
      <div style={{ padding: 4, minWidth: 220 }}>
        {COLOR_MODES.map((m) => (
          <div
            key={m.value}
            style={menuItemStyle(m.value === colorMode)}
            onClick={() => {
              patch({ colorMode: m.value as ColorMode });
              setOpen(false);
            }}
          >
            <span style={menuLabelStyle}>{m.label}</span>
            <span style={menuDescStyle}>{m.title}</span>
          </div>
        ))}
      </div>
    </Popover>
  );
}
