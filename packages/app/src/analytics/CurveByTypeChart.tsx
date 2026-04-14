import { type CSSProperties, useMemo } from "react";
import type { Deck } from "../storage/types";
import { colors } from "@boundless-grimoire/ui";
import { AnalyticsCard } from "./AnalyticsCard";
import { StackedBar, BAR_GAP, CHART_HEIGHT } from "@boundless-grimoire/ui";
import { computeCurveByType } from "./stats";

interface Props {
  deck: Deck;
  style?: CSSProperties;
}

const MAX_BAR_HEIGHT = CHART_HEIGHT - 20;

const CREATURE_COLOR = colors.accent;
const NON_CREATURE_COLOR = "#5b8dd9";

const chartAreaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: BAR_GAP,
  height: CHART_HEIGHT,
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

export function CurveByTypeChart({ deck, style }: Props) {
  const curve = useMemo(() => computeCurveByType(deck.cards), [deck.cards]);
  const total = curve.creatures.reduce((a, b) => a + b, 0) + curve.nonCreatures.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const maxStack = Math.max(...curve.creatures.map((c, i) => c + curve.nonCreatures[i]), 1);

  return (
    <AnalyticsCard title="Curve by Type" style={{ minWidth: 240, ...style }}>
      <div style={chartAreaStyle}>
        {curve.labels.map((label, i) => {
          const cCount = curve.creatures[i];
          const ncCount = curve.nonCreatures[i];
          return (
            <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <StackedBar
                countA={ncCount}
                heightA={(ncCount / maxStack) * MAX_BAR_HEIGHT}
                colorA={NON_CREATURE_COLOR}
                countB={cCount}
                heightB={(cCount / maxStack) * MAX_BAR_HEIGHT}
                colorB={CREATURE_COLOR}
                total={cCount + ncCount}
              />
              <div style={labelStyle}>{label}</div>
            </div>
          );
        })}
      </div>
      <div style={legendStyle}>
        <span><span style={legendDotStyle(CREATURE_COLOR)} />Creatures</span>
        <span><span style={legendDotStyle(NON_CREATURE_COLOR)} />Spells</span>
      </div>
    </AnalyticsCard>
  );
}
