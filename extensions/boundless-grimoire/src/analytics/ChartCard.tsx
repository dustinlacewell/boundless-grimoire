import type { CSSProperties, ReactNode } from "react";
import { colors } from "../ui/colors";
import { Surface } from "../ui/Surface";

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

export function ChartCard({ title, children, style }: Props) {
  return (
    <Surface elevation={2} padding={12} style={{ flexShrink: 0, display: "flex", flexDirection: "column", ...style }}>
      <div style={titleStyle}>{title}</div>
      <div style={bodyStyle}>{children}</div>
    </Surface>
  );
}
