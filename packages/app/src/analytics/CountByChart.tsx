import { type CSSProperties, useMemo, useState } from "react";
import type { Deck, DeckCard } from "../storage/types";
import { colors } from "@boundless-grimoire/ui";
import { Dropdown, type DropdownOption } from "@boundless-grimoire/ui";
import { AnalyticsCard } from "./AnalyticsCard";
import { Bar, BAR_WIDTH, BAR_GAP, CHART_HEIGHT } from "@boundless-grimoire/ui";
import { type CountByMode, computeCountBy } from "./stats";

interface Props {
  deck: Deck;
  style?: CSSProperties;
}

const MODE_OPTIONS: DropdownOption<CountByMode>[] = [
  { value: "type", label: "Type" },
  { value: "subtype", label: "Subtype" },
];

const MAX_BAR_HEIGHT = CHART_HEIGHT - 20;
// Space below bars for the 45° labels. Must fit within AnalyticsCard's fixed height.
const LABEL_AREA_HEIGHT = 60;

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

const columnsStyle: React.CSSProperties = {
  display: "flex",
  gap: BAR_GAP,
  alignSelf: "center",
  paddingInline: BAR_WIDTH,
};

const columnStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: BAR_WIDTH,
};

const barAreaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  height: CHART_HEIGHT,
};

const labelSlotStyle: React.CSSProperties = {
  position: "relative",
  width: BAR_WIDTH,
  height: LABEL_AREA_HEIGHT,
};

const angledLabelStyle: React.CSSProperties = {
  position: "absolute",
  top: 4,
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
    <AnalyticsCard title={title} style={style}>
      <div style={columnsStyle}>
        {entries.map(({ label, count }) => (
          <div key={label} style={columnStyle}>
            <div style={barAreaStyle}>
              <Bar count={count} height={(count / maxCount) * MAX_BAR_HEIGHT} color={colors.accent} />
            </div>
            <div style={labelSlotStyle}>
              <div style={angledLabelStyle} title={label}>{label}</div>
            </div>
          </div>
        ))}
      </div>
    </AnalyticsCard>
  );
}
