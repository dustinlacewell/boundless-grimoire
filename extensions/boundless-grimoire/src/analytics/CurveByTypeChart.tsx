import { useMemo } from "react";
import type { Deck } from "../storage/types";
import { colors } from "../ui/colors";
import { Surface } from "../ui/Surface";
import { computeCurveByType } from "./stats";

interface Props {
  deck: Deck;
}

const CHART_HEIGHT = 100;
const BAR_WIDTH = 24;
const GAP = 4;

const CREATURE_COLOR = colors.accent;
const NON_CREATURE_COLOR = "#5b8dd9";

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
  gap: GAP,
  height: CHART_HEIGHT,
};

const barWrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
};

const countStyle: React.CSSProperties = {
  fontSize: 9,
  color: colors.textFaint,
  minHeight: 12,
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: colors.textMuted,
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

export function CurveByTypeChart({ deck }: Props) {
  const curve = useMemo(() => computeCurveByType(deck.cards), [deck.cards]);
  const maxStack = Math.max(
    ...curve.creatures.map((c, i) => c + curve.nonCreatures[i]),
    1,
  );

  return (
    <Surface elevation={2} padding={12} style={{ minWidth: 240, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={titleStyle}>Curve by Type</div>
      <div style={chartAreaStyle}>
        {curve.labels.map((label, i) => {
          const cCount = curve.creatures[i];
          const ncCount = curve.nonCreatures[i];
          const total = cCount + ncCount;
          const maxBarHeight = CHART_HEIGHT - 20;
          const cHeight = (cCount / maxStack) * maxBarHeight;
          const ncHeight = (ncCount / maxStack) * maxBarHeight;
          return (
            <div key={i} style={barWrapperStyle}>
              <div style={countStyle}>{total > 0 ? total : ""}</div>
              <div style={{ display: "flex", flexDirection: "column", borderRadius: 3, overflow: "hidden", transition: "height 0.2s ease" }}>
                <div
                  style={{
                    width: BAR_WIDTH,
                    height: Math.max(ncHeight, ncCount > 0 ? 2 : 0),
                    background: NON_CREATURE_COLOR,
                  }}
                />
                <div
                  style={{
                    width: BAR_WIDTH,
                    height: Math.max(cHeight, cCount > 0 ? 2 : 0),
                    background: CREATURE_COLOR,
                  }}
                />
              </div>
              <div style={labelStyle}>{label}</div>
            </div>
          );
        })}
      </div>
      <div style={legendStyle}>
        <span><span style={legendDotStyle(CREATURE_COLOR)} />Creatures</span>
        <span><span style={legendDotStyle(NON_CREATURE_COLOR)} />Spells</span>
      </div>
    </Surface>
  );
}
