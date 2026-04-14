import { colors } from "./colors";

const DEFAULT_BAR_WIDTH = 24;
const DEFAULT_BAR_GAP = 4;
const DEFAULT_CHART_HEIGHT = 100;

const countStyle: React.CSSProperties = {
  fontSize: 9,
  color: colors.textFaint,
  minHeight: 12,
};

const wrapperStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
};

interface BarProps {
  count: number;
  height: number;
  color: string;
  width?: number;
}

interface TwinBarProps {
  countA: number;
  heightA: number;
  colorA: string;
  countB: number;
  heightB: number;
  colorB: string;
  total?: number;
  gap?: number;
  width?: number;
}

function barRectStyle(count: number, height: number, color: string, width = DEFAULT_BAR_WIDTH): React.CSSProperties {
  return {
    width,
    height: Math.max(height, count > 0 ? 2 : 0),
    background: color,
    borderRadius: 3,
    opacity: count > 0 ? 1 : 0.15,
    transition: "height 0.2s ease",
  };
}

/** A single bar column: count label above, colored rectangle below. No label slot — callers render that. */
export function Bar({ count, height, color, width }: BarProps) {
  return (
    <div style={wrapperStyle}>
      <div style={countStyle}>{count > 0 ? count : ""}</div>
      <div style={barRectStyle(count, height, color, width)} />
    </div>
  );
}

/** Two side-by-side bars sharing a column: optional combined count label above, two rectangles below. */
export function TwinBar({ countA, heightA, colorA, countB, heightB, colorB, total, gap = DEFAULT_BAR_GAP, width }: TwinBarProps) {
  const displayed = total ?? countA + countB;
  return (
    <div style={wrapperStyle}>
      <div style={countStyle}>{displayed > 0 ? displayed : ""}</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap }}>
        <div style={barRectStyle(countA, heightA, colorA, width)} />
        <div style={barRectStyle(countB, heightB, colorB, width)} />
      </div>
    </div>
  );
}

/** A stacked bar column: two segments stacked vertically, optional combined count label above. */
export function StackedBar({ countA, heightA, colorA, countB, heightB, colorB, total, width }: TwinBarProps) {
  const displayed = total ?? countA + countB;
  return (
    <div style={wrapperStyle}>
      <div style={countStyle}>{displayed > 0 ? displayed : ""}</div>
      <div style={{ display: "flex", flexDirection: "column", borderRadius: 3, overflow: "hidden", transition: "height 0.2s ease" }}>
        <div style={{ width: width ?? DEFAULT_BAR_WIDTH, height: Math.max(heightA, countA > 0 ? 2 : 0), background: colorA }} />
        <div style={{ width: width ?? DEFAULT_BAR_WIDTH, height: Math.max(heightB, countB > 0 ? 2 : 0), background: colorB }} />
      </div>
    </div>
  );
}

export { DEFAULT_BAR_WIDTH as BAR_WIDTH, DEFAULT_BAR_GAP as BAR_GAP, DEFAULT_CHART_HEIGHT as CHART_HEIGHT };
