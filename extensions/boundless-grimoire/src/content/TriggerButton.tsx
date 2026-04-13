interface Props {
  open: boolean;
  onToggle: () => void;
}

export const TRIGGER_W = 110;
export const TRIGGER_H = 44;

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
};

export function TriggerButton({ open, onToggle }: Props) {
  return (
    <button
      type="button"
      style={{
        ...baseStyle,
        background: open ? "#15151a" : "#1f1f23",
        // when closed, soft drop shadow so it sits on the page;
        // when open, no shadow because it merges with the header
        boxShadow: open ? "none" : "0 2px 8px rgba(0,0,0,0.4)",
      }}
      onClick={onToggle}
      title="Boundless Grimoire"
    >
      {open ? "Close" : "Decks"}
    </button>
  );
}
