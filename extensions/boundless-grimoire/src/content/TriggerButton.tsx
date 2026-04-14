import { useState } from "react";
import { GrimoireLogo } from "../ui/GrimoireLogo";

interface Props {
  open: boolean;
  onToggle: () => void;
}

export const TRIGGER_W = 98;
export const TRIGGER_H = 52;

const baseStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  zIndex: 2147483647, // above overlay so it stays clickable as a toggle
  width: TRIGGER_W,
  height: TRIGGER_H,
  padding: 0,
  margin: 0,
  borderTop: "none",
  borderLeft: "none",
  borderRight: "1px solid #2a2a30",
  borderBottom: "1px solid #2a2a30",
  borderRadius: "0 0 8px 0",
  background: "#15151a",
  color: "#fff",
  fontFamily: "system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.2,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  overflow: "hidden",
};

export function TriggerButton({ open, onToggle }: Props) {
  const [hover, setHover] = useState(false);
  const whiteEdges = open || hover;
  return (
    <button
      type="button"
      style={{
        ...baseStyle,
        background: open ? "#15151a" : "#1f1f23",
        // semi-transparent white edges when open OR hovered — subtle
        // "active" signal that doesn't overpower the icon.
        borderRightColor: whiteEdges ? "rgba(255,255,255,0.45)" : "#2a2a30",
        borderBottomColor: whiteEdges ? "rgba(255,255,255,0.45)" : "#2a2a30",
        // when closed, soft drop shadow so it sits on the page;
        // when open, no shadow because it merges with the header
        boxShadow: open ? "none" : "0 2px 8px rgba(0,0,0,0.4)",
      }}
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={open ? "Close Boundless Grimoire" : "Open Boundless Grimoire"}
    >
      <GrimoireLogo open={open} hoverSwap fast={hover} framed />
    </button>
  );
}
