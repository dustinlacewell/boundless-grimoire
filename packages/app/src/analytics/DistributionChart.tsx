import { colors } from "@boundless-grimoire/ui";
import { AnalyticsCard } from "./AnalyticsCard";
import { Bar, BAR_WIDTH, BAR_GAP, CHART_HEIGHT } from "@boundless-grimoire/ui";
import type { Distribution } from "./stats";

interface Props {
  title: string;
  distribution: Distribution;
  /** Hide the average line. */
  hideAverage?: boolean;
  /** Additional style merged into the card (e.g. width: "100%" for wrap layout). */
  style?: React.CSSProperties;
}

const MAX_BAR_HEIGHT = CHART_HEIGHT - 16;

const chartAreaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: BAR_GAP,
  height: CHART_HEIGHT,
};

const labelRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: BAR_GAP,
  marginTop: 4,
};

const labelStyle: React.CSSProperties = {
  width: BAR_WIDTH,
  fontSize: 10,
  color: colors.textMuted,
  textAlign: "center",
};

const averageStyle: React.CSSProperties = {
  fontSize: 12,
  color: colors.accent,
  fontWeight: 600,
  marginTop: 8,
  textAlign: "center",
};

export function DistributionChart({ title, distribution, hideAverage, style }: Props) {
  const { buckets, labels, average, total } = distribution;
  const maxCount = Math.max(...buckets, 1);

  return (
    <AnalyticsCard title={title} style={{ minWidth: 240, ...style }}>
      <div style={chartAreaStyle}>
        {buckets.map((count, i) => (
          <Bar
            key={labels[i]}
            count={count}
            height={(count / maxCount) * MAX_BAR_HEIGHT}
            color={colors.accent}
          />
        ))}
      </div>
      <div style={labelRowStyle}>
        {labels.map((label) => (
          <div key={label} style={labelStyle}>{label}</div>
        ))}
      </div>
      {!hideAverage && total > 0 && (
        <div style={averageStyle}>Avg: {average.toFixed(2)}</div>
      )}
    </AnalyticsCard>
  );
}
