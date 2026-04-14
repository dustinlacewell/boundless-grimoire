import { colors } from "@boundless-grimoire/ui";
import { ChartCard } from "./ChartCard";
import type { Distribution } from "./stats";

interface Props {
  title: string;
  distribution: Distribution;
  /** Hide the average line. */
  hideAverage?: boolean;
  /** Additional style merged into the card (e.g. width: "100%" for wrap layout). */
  style?: React.CSSProperties;
}

const CHART_HEIGHT = 100;
const BAR_WIDTH = 24;
const GAP = 4;

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

const labelRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: GAP,
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
    <ChartCard title={title} style={{ minWidth: 240, ...style }}>
      <div style={chartAreaStyle}>
        {buckets.map((count, i) => {
          const height = (count / maxCount) * (CHART_HEIGHT - 16);
          return (
            <div key={labels[i]} style={barWrapperStyle}>
              <div style={countStyle}>{count > 0 ? count : ""}</div>
              <div
                style={{
                  width: BAR_WIDTH,
                  height: Math.max(height, count > 0 ? 2 : 0),
                  background: colors.accent,
                  borderRadius: 3,
                  opacity: count > 0 ? 1 : 0.15,
                  transition: "height 0.2s ease",
                }}
              />
            </div>
          );
        })}
      </div>
      <div style={labelRowStyle}>
        {labels.map((label) => (
          <div key={label} style={labelStyle}>{label}</div>
        ))}
      </div>
      {!hideAverage && total > 0 && (
        <div style={averageStyle}>Avg: {average.toFixed(2)}</div>
      )}
    </ChartCard>
  );
}
