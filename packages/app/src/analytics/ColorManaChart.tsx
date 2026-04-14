import { type CSSProperties, useMemo } from "react";
import type { Deck } from "../storage/types";
import { colors } from "@boundless-grimoire/ui";
import { AnalyticsCard } from "./AnalyticsCard";
import { TwinBar, BAR_GAP, CHART_HEIGHT } from "@boundless-grimoire/ui";
import { computeColorDemandSupply, MANA_COLORS, type ManaColor } from "./stats";

interface Props {
  deck: Deck;
  style?: CSSProperties;
}

const MAX_BAR_HEIGHT = CHART_HEIGHT - 36;

const DEMAND_COLOR = colors.accent;
const SUPPLY_COLOR = "#5b8dd9";

const chartAreaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: 10,
  height: CHART_HEIGHT,
};

const groupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  flex: 1,
  maxWidth: 50,
};

const valueLabelStyle: React.CSSProperties = {
  display: "flex",
  gap: BAR_GAP,
  width: "100%",
  fontSize: 9,
  minHeight: 12,
};

const valueSlotStyle: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
};

const legendStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 12,
  marginTop: 8,
  fontSize: 10,
  color: colors.textMuted,
};

const legendDotStyle = (color: string): React.CSSProperties => ({
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: 2,
  background: color,
  marginRight: 4,
  verticalAlign: "middle",
});

function symbolUrl(color: ManaColor): string {
  return `https://svgs.scryfall.io/card-symbols/${color}.svg`;
}

export function ColorManaChart({ deck, style }: Props) {
  const { demand, supply } = useMemo(() => computeColorDemandSupply(deck.cards), [deck.cards]);
  const activeColors = MANA_COLORS.filter((c) => demand[c] > 0);
  if (activeColors.length === 0) return null;
  const maxValue = Math.max(...activeColors.map((c) => Math.max(demand[c], supply[c])), 1);

  return (
    <AnalyticsCard title="Cost vs Production" style={{ minWidth: 240, ...style }}>
      <div style={chartAreaStyle}>
        {activeColors.map((color) => {
          const d = demand[color];
          const s = supply[color];
          return (
            <div key={color} style={groupStyle}>
              <div style={valueLabelStyle}>
                <span style={{ ...valueSlotStyle, color: DEMAND_COLOR }}>{d > 0 ? Math.round(d) : ""}</span>
                <span style={{ ...valueSlotStyle, color: SUPPLY_COLOR }}>{s > 0 ? s : ""}</span>
              </div>
              <TwinBar
                countA={d}
                heightA={(d / maxValue) * MAX_BAR_HEIGHT}
                colorA={DEMAND_COLOR}
                countB={s}
                heightB={(s / maxValue) * MAX_BAR_HEIGHT}
                colorB={SUPPLY_COLOR}
              />
              <img
                src={symbolUrl(color)}
                alt={color}
                draggable={false}
                style={{ width: 16, height: 16 }}
              />
            </div>
          );
        })}
      </div>
      <div style={legendStyle}>
        <span><span style={legendDotStyle(DEMAND_COLOR)} />Cost</span>
        <span><span style={legendDotStyle(SUPPLY_COLOR)} />Production</span>
      </div>
    </AnalyticsCard>
  );
}
