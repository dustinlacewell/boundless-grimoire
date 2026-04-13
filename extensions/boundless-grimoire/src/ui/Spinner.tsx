/**
 * Lightweight indeterminate spinner.
 *
 * Pure SVG with SMIL `animateTransform` so we don't have to inject a
 * global @keyframes anywhere. Renders a partial ring rotating once per
 * second. Color and size are caller-controlled.
 */
import { colors } from "./colors";

interface Props {
  size?: number;
  color?: string;
  /** Stroke width relative to box size; default 12% of size. */
  thickness?: number;
}

export function Spinner({
  size = 20,
  color = colors.accent,
  thickness,
}: Props) {
  const stroke = thickness ?? Math.max(2, size * 0.12);
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  // Show ~25% of the ring at any moment.
  const dash = circumference * 0.25;
  const gap = circumference - dash;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="status"
      aria-label="Loading"
      style={{ display: "block" }}
    >
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${gap}`}
        transform={`rotate(-90 ${c} ${c})`}
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${c} ${c}`}
          to={`360 ${c} ${c}`}
          dur="1s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}
