import { colors } from "../ui/colors";
import { Surface } from "../ui/Surface";
import type { Distribution } from "./stats";

interface Props {
  title: string;
  distribution: Distribution;
  /** Hide the average line. */
  hideAverage?: boolean;
}

const CHART_HEIGHT = 100;
const BAR_WIDTH = 24;
const GAP = 4;

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

const averageStyle: React.CSSProperties = {
  fontSize: 12,
  color: colors.accent,
  fontWeight: 600,
  marginTop: 8,
  textAlign: "center",
};

export function DistributionChart({ title, distribution, hideAverage }: Props) {
  const { buckets, labels, average, total } = distribution;
  const maxCount = Math.max(...buckets, 1);

  return (
    <Surface elevation={2} padding={12} style={{ minWidth: 240, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={titleStyle}>{title}</div>
      <div style={chartAreaStyle}>
        {buckets.map((count, i) => {
          const height = (count / maxCount) * (CHART_HEIGHT - 20);
          return (
            <div key={i} style={barWrapperStyle}>
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
              <div style={labelStyle}>{labels[i]}</div>
            </div>
          );
        })}
      </div>
      {!hideAverage && total > 0 && (
        <div style={averageStyle}>Avg: {average.toFixed(2)}</div>
      )}
    </Surface>
  );
}
