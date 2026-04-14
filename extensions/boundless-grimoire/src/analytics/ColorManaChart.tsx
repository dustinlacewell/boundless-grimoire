import { type CSSProperties, useMemo } from "react";
import type { Deck } from "../storage/types";
import { colors } from "../ui/colors";
import { Surface } from "../ui/Surface";
import { computeColorDemandSupply, MANA_COLORS, type ManaColor } from "./stats";

interface Props {
  deck: Deck;
  style?: CSSProperties;
}

const CHART_HEIGHT = 100;
const BAR_GAP = 2;
const GROUP_GAP = 10;
const MAX_BAR_WIDTH = 24;

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
  justifyContent: "center",
  gap: GROUP_GAP,
  height: CHART_HEIGHT,
};

const groupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  flex: 1,
  maxWidth: MAX_BAR_WIDTH,
};

const pairStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  gap: BAR_GAP,
  height: CHART_HEIGHT - 36,
  width: "100%",
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

const labelWrapperStyle: React.CSSProperties = {
  width: "100%",
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

export function ColorManaChart({ deck, style }: Props) {
  const { demand, supply } = useMemo(() => computeColorDemandSupply(deck.cards), [deck.cards]);
  const activeColors = MANA_COLORS.filter((c) => demand[c] > 0 || supply[c] > 0);
  if (activeColors.length === 0) return null;
  const maxValue = Math.max(
    ...activeColors.map((c) => Math.max(demand[c], supply[c])),
    1,
  );

  const maxBarHeight = CHART_HEIGHT - 36;

  return (
    <Surface elevation={2} padding={12} style={{ minWidth: 200, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", ...style }}>
      <div style={titleStyle}>Cost vs Production</div>
      <div style={chartAreaStyle}>
        {activeColors.map((color) => {
          const d = demand[color];
          const s = supply[color];
          const dHeight = (d / maxValue) * maxBarHeight;
          const sHeight = (s / maxValue) * maxBarHeight;
          return (
            <div key={color} style={groupStyle}>
              <div style={valueLabelStyle}>
                <span style={{ ...valueSlotStyle, color: DEMAND_COLOR }}>{d > 0 ? Math.round(d) : ""}</span>
                <span style={{ ...valueSlotStyle, color: SUPPLY_COLOR }}>{s > 0 ? s : ""}</span>
              </div>
              <div style={pairStyle}>
                <div
                  title={`${color} demand: ${d.toFixed(1)}`}
                  style={{
                    flex: 1,
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
                    flex: 1,
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
