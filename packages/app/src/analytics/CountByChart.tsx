import { type CSSProperties, useMemo, useState } from "react";
import type { Deck, DeckCard } from "../storage/types";
import { colors } from "@boundless-grimoire/ui";
import { Dropdown, type DropdownOption } from "@boundless-grimoire/ui";
import { ChartCard } from "./ChartCard";
import { type CountByMode, computeCountBy } from "./stats";

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

function allModeEntries(cards: Record<string, DeckCard>) {
  return Object.fromEntries(
    MODE_OPTIONS.map(({ value }) => [value, computeCountBy(cards, value)]),
  ) as Record<CountByMode, ReturnType<typeof computeCountBy>>;
}

export function CountByChart({ deck, style }: Props) {
  const [mode, setMode] = useState<CountByMode>("type");
  const allEntries = useMemo(() => allModeEntries(deck.cards), [deck.cards]);
  const availableModes = MODE_OPTIONS.filter(({ value }) => allEntries[value] !== null);

  if (availableModes.length === 0) return null;

  const activeMode = availableModes.some((o) => o.value === mode) ? mode : availableModes[0].value;
  const entries = allEntries[activeMode] ?? [];
  const maxCount = entries.length > 0 ? entries[0].count : 1;

  const title = (
    <div style={titleRowStyle}>
      <div style={titleStyle}>Count by</div>
      <Dropdown options={availableModes} value={activeMode} onChange={(v) => setMode(v)} compact />
    </div>
  );

  return (
    <ChartCard title={title} style={style}>
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
    </ChartCard>
  );
}
