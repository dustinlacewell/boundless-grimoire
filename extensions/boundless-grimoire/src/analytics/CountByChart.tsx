import { useMemo, useState, type CSSProperties } from "react";
import type { Deck } from "../storage/types";
import { colors } from "../ui/colors";
import { Dropdown, type DropdownOption } from "../ui/Dropdown";
import { Surface } from "../ui/Surface";
import { computeCountBy, type CountByMode } from "./stats";

interface Props {
  deck: Deck;
  style?: CSSProperties;
}

const MODE_OPTIONS: DropdownOption<CountByMode>[] = [
  { value: "type", label: "Type" },
  { value: "subtype", label: "Subtype" },
];

const CHART_HEIGHT = 100;
const BAR_WIDTH = 24;
const GAP = 4;
const LABEL_HEIGHT = 50;

const titleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 16,
};

const titleStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  color: colors.textMuted,
  whiteSpace: "nowrap",
};

const chartAreaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: GAP,
  height: CHART_HEIGHT,
};

const barWrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  width: BAR_WIDTH,
};

const countStyle: React.CSSProperties = {
  fontSize: 9,
  color: colors.textFaint,
  minHeight: 12,
};

const labelAreaStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  justifyContent: "center",
  gap: GAP,
  height: LABEL_HEIGHT,
  marginTop: 4,
};

const labelSlotStyle: React.CSSProperties = {
  position: "relative",
  width: BAR_WIDTH,
  height: 0,
};

const angledLabelStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  left: BAR_WIDTH / 2,
  fontSize: 10,
  color: colors.textMuted,
  whiteSpace: "nowrap",
  transformOrigin: "top left",
  transform: "rotate(45deg)",
};

export function CountByChart({ deck, style }: Props) {
  const [mode, setMode] = useState<CountByMode>("type");
  const entries = useMemo(() => computeCountBy(deck.cards, mode), [deck.cards, mode]);
  const maxCount = entries.length > 0 ? entries[0].count : 1;

  return (
    <Surface elevation={2} padding={12} style={{ flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", ...style }}>
      <div style={titleRowStyle}>
        <div style={titleStyle}>Count by</div>
        <Dropdown options={MODE_OPTIONS} value={mode} onChange={(v) => setMode(v ?? "type")} width={110} />
      </div>
      <div style={chartAreaStyle}>
        {entries.map(({ label, count }) => {
          const height = (count / maxCount) * (CHART_HEIGHT - 20);
          return (
            <div key={label} style={barWrapperStyle}>
              <div style={countStyle}>{count > 0 ? count : ""}</div>
              <div
                style={{
                  width: BAR_WIDTH,
                  height: Math.max(height, count > 0 ? 2 : 0),
                  background: colors.accent,
                  borderRadius: 3,
                  opacity: count > 0 ? 1 : 0.15,
                  transition: "height 0.2s ease",
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={labelAreaStyle}>
        {entries.map(({ label }) => (
          <div key={label} style={labelSlotStyle}>
            <div style={angledLabelStyle} title={label}>
              {label}
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}
