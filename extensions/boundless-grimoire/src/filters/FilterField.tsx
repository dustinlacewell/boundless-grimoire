import type { ReactNode } from "react";
import { colors } from "../ui/colors";

interface Props {
  label: string;
  children: ReactNode;
  style?: React.CSSProperties;
  /** Optional right-aligned element next to the label (e.g. mode toggle). */
  action?: ReactNode;
}

/** Vertical label + control wrapper used by every filter row entry. */
export function FilterField({ label, children, style, action }: Props) {
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
        <span>{label}</span>
        {action && <span style={{ marginLeft: "auto" }}>{action}</span>}
      </div>
      {children}
    </div>
  );
}
