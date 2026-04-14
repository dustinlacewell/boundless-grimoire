import { useMemo } from "react";
import type { Deck } from "../storage/types";
import { colors } from "../ui/colors";
import { Surface } from "../ui/Surface";
import { computeColorDemandSupply, MANA_COLORS, type ManaColor } from "./stats";

interface Props {
  deck: Deck;
}

const CHART_HEIGHT = 100;
const BAR_WIDTH = 12;
const BAR_GAP = 2;
const GROUP_GAP = 10;

const DEMAND_COLOR = colors.accent;
const SUPPLY_COLOR = "#5b8dd9";

const titleStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  color: colors.textMuted,
  marginBottom: 16,
};

const chartAreaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: GROUP_GAP,
  height: CHART_HEIGHT,
};

const groupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
};

const GROUP_WIDTH = BAR_WIDTH * 2 + BAR_GAP;

const pairStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: BAR_GAP,
  height: CHART_HEIGHT - 24,
  width: GROUP_WIDTH,
};

const labelWrapperStyle: React.CSSProperties = {
  width: GROUP_WIDTH,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
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

export function ColorManaChart({ deck }: Props) {
  const { demand, supply } = useMemo(() => computeColorDemandSupply(deck.cards), [deck.cards]);
  const maxValue = Math.max(
    ...MANA_COLORS.map((c) => Math.max(demand[c], supply[c])),
    1,
  );
  const total = MANA_COLORS.reduce((sum, c) => sum + demand[c] + supply[c], 0);
  if (total === 0) return null;

  const maxBarHeight = CHART_HEIGHT - 24;

  return (
    <Surface elevation={2} padding={12} style={{ flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={titleStyle}>Cost vs Production</div>
      <div style={chartAreaStyle}>
        {MANA_COLORS.map((color) => {
          const d = demand[color];
          const s = supply[color];
          const dHeight = (d / maxValue) * maxBarHeight;
          const sHeight = (s / maxValue) * maxBarHeight;
          return (
            <div key={color} style={groupStyle}>
              <div style={pairStyle}>
                <div
                  title={`${color} demand: ${d.toFixed(1)}`}
                  style={{
                    width: BAR_WIDTH,
                    height: Math.max(dHeight, 2),
                    background: DEMAND_COLOR,
                    borderRadius: 2,
                    opacity: d > 0 ? 1 : 0.15,
                    transition: "height 0.2s ease",
                  }}
                />
                <div
                  title={`${color} supply: ${s}`}
                  style={{
                    width: BAR_WIDTH,
                    height: Math.max(sHeight, 2),
                    background: SUPPLY_COLOR,
                    borderRadius: 2,
                    opacity: s > 0 ? 1 : 0.15,
                    transition: "height 0.2s ease",
                  }}
                />
              </div>
              <div style={labelWrapperStyle}>
                <img
                  src={symbolUrl(color)}
                  alt={color}
                  draggable={false}
                  style={{ width: 16, height: 16 }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div style={legendStyle}>
        <span><span style={legendDotStyle(DEMAND_COLOR)} />Cost</span>
        <span><span style={legendDotStyle(SUPPLY_COLOR)} />Production</span>
      </div>
    </Surface>
  );
}
