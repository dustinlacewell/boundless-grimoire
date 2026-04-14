import type { CSSProperties, ReactNode } from "react";
import { colors } from "@boundless-grimoire/ui";
import { Surface } from "@boundless-grimoire/ui";

interface Props {
  title: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}

const titleStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: "uppercase",
  color: colors.textMuted,
  marginBottom: 16,
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};

// overflow: hidden is intentional — it defines the content boundary for the analytics widget.
// Do not remove it. If content clips, make the card larger instead.
export function AnalyticsCard({ title, children, style }: Props) {
  return (
    <Surface elevation={2} padding={12} style={{ flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden", ...style }}>
      <div style={titleStyle}>{title}</div>
      <div style={bodyStyle}>{children}</div>
    </Surface>
  );
}
