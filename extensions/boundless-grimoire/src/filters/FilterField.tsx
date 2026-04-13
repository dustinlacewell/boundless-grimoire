import type { ReactNode } from "react";
import { colors } from "../ui/colors";

interface Props {
  label: string;
  children: ReactNode;
  style?: React.CSSProperties;
}

/** Vertical label + control wrapper used by every filter row entry. */
export function FilterField({ label, children, style }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: colors.textMuted,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}
