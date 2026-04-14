import { useMemo, type CSSProperties } from "react";
import type { Deck } from "../storage/types";
import { colors } from "../ui/colors";
import { ChartCard } from "./ChartCard";
import { computeRarityBreakdown } from "./stats";

interface Props {
  deck: Deck;
  style?: CSSProperties;
}

const CHART_HEIGHT = 100;
const BAR_WIDTH = 24;
const GAP = 4;

const RARITY_COLORS: Record<string, string> = {
  common: "#9e9e9e",
  uncommon: "#aab4c0",
  rare: "#e6c44d",
  mythic: "#e8642c",
};

const RARITY_LABELS: Record<string, string> = {
  common: "C",
  uncommon: "U",
  rare: "R",
  mythic: "M",
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

export function RarityChart({ deck, style }: Props) {
  const entries = useMemo(
    () => computeRarityBreakdown(deck.cards).filter((e) => e.count > 0),
    [deck.cards],
  );
  if (entries.length === 0) return null;
  const maxCount = Math.max(...entries.map((e) => e.count), 1);

  return (
    <ChartCard title="Rarity" style={style}>
      <div style={chartAreaStyle}>
        {entries.map(({ rarity, count }) => {
          const height = (count / maxCount) * (CHART_HEIGHT - 20);
          return (
            <div key={rarity} style={barWrapperStyle}>
              <div style={countStyle}>{count > 0 ? count : ""}</div>
              <div
                style={{
                  width: BAR_WIDTH,
                  height: Math.max(height, count > 0 ? 2 : 0),
                  background: RARITY_COLORS[rarity],
                  borderRadius: 3,
                  opacity: count > 0 ? 1 : 0.15,
                  transition: "height 0.2s ease",
                }}
              />
              <div style={labelStyle}>{RARITY_LABELS[rarity]}</div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}
