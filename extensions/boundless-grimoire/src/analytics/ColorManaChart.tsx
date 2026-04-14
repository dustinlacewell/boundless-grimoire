import { useMemo, type CSSProperties } from "react";
import type { Deck } from "../storage/types";
import { colors } from "../ui/colors";
import { Surface } from "../ui/Surface";
import { computeColorDemandSupply, MANA_COLORS, type ManaColor } from "./stats";

interface Props {
  deck: Deck;
  style?: CSSProperties;
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
  justifyContent: "center",
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
  height: CHART_HEIGHT - 36,
  width: GROUP_WIDTH,
};

const valueLabelStyle: React.CSSProperties = {
  width: GROUP_WIDTH,
  textAlign: "center",
  fontSize: 9,
  minHeight: 12,
  whiteSpace: "nowrap",
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
    <Surface elevation={2} padding={12} style={{ flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", ...style }}>
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
                {d > 0 && <span style={{ color: DEMAND_COLOR }}>{Math.round(d)}</span>}
                {d > 0 && s > 0 && " "}
                {s > 0 && <span style={{ color: SUPPLY_COLOR }}>{s}</span>}
              </div>
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
