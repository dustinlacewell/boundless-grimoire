import type { ReactNode } from "react";
import { colors } from "@boundless-grimoire/ui";

interface Props {
  label: string;
  children: ReactNode;
  style?: React.CSSProperties;
  /** Optional right-aligned element next to the label (e.g. mode toggle). */
  action?: ReactNode;
  /** Label alignment. "start" (default) hugs left; "center" centers the label. */
  align?: "start" | "center";
}

/** Vertical label + control wrapper used by every filter row entry. */
export function FilterField({ label, children, style, action, align = "start" }: Props) {
  // Action is always pinned to the right. For centered alignment, a
  // matching left spacer keeps the label visually centered within the
  // row (three-column flex: spacer | label | action).
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: colors.textMuted,
          fontWeight: 700,
        }}
      >
        {align === "center" && <span style={{ flex: 1 }} />}
        <span>{label}</span>
        <span style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          {action}
        </span>
      </div>
      {children}
    </div>
  );
}
