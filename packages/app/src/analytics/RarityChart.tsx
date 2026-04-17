import { useMemo, type CSSProperties } from "react";
import type { Deck } from "../storage/types";
import { colors } from "@boundless-grimoire/ui";
import { AnalyticsCard } from "./AnalyticsCard";
import { Bar, BAR_GAP, CHART_HEIGHT } from "@boundless-grimoire/ui";
import { computeRarityBreakdown } from "./stats";

interface Props {
  deck: Deck;
  style?: CSSProperties;
}

const MAX_BAR_HEIGHT = CHART_HEIGHT - 20;

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
  gap: BAR_GAP,
  height: CHART_HEIGHT,
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
    <AnalyticsCard title="Rarity" style={style}>
      <div style={chartAreaStyle}>
        {entries.map(({ rarity, count }) => (
          <div key={rarity} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Bar
              count={count}
              height={(count / maxCount) * MAX_BAR_HEIGHT}
              color={RARITY_COLORS[rarity]}
            />
            <div style={labelStyle}>{RARITY_LABELS[rarity]}</div>
          </div>
        ))}
      </div>
    </AnalyticsCard>
  );
}
