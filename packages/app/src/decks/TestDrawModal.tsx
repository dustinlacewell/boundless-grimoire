import { useEffect } from "react";
import { createPortal } from "react-dom";
import { CardImage } from "../cards/CardImage";
import { colors } from "@boundless-grimoire/ui";
import { closeTestDraw, redraw, useTestDrawStore } from "./testDrawStore";

const CARD_WIDTH = 180;

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 2147483647,
  background: "rgba(0,0,0,0.7)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "system-ui, sans-serif",
};

const dialogStyle: React.CSSProperties = {
  width: "min(1100px, 92vw)",
  maxHeight: "88vh",
  background: colors.bg1,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 12,
  boxShadow: "0 12px 36px rgba(0,0,0,0.7)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  color: colors.text,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  borderBottom: `1px solid ${colors.border}`,
};

const titleStyle: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 15,
  flex: 1,
};

const btnStyle: React.CSSProperties = {
  background: colors.bg2,
  color: colors.text,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 6,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const bodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 16,
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  justifyContent: "center",
  alignItems: "start",
};

const emptyStyle: React.CSSProperties = {
  padding: "32px 4px",
  fontSize: 13,
  color: colors.textMuted,
  textAlign: "center",
  width: "100%",
};

export function TestDrawModal() {
  const deck = useTestDrawStore((s) => s.deck);
  const hand = useTestDrawStore((s) => s.hand);

  useEffect(() => {
    if (!deck) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeTestDraw();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [deck]);

  if (!deck) return null;

  return createPortal(
    <div style={overlayStyle} onClick={closeTestDraw}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={titleStyle}>Test Draw · {deck.name}</div>
          <button type="button" style={btnStyle} onClick={redraw}>
            Draw Again
          </button>
          <button type="button" style={btnStyle} onClick={closeTestDraw}>
            Close (Esc)
          </button>
        </div>
        <div style={bodyStyle}>
          {hand.length === 0 ? (
            <div style={emptyStyle}>Deck is empty — add cards first.</div>
          ) : (
            hand.map((snapshot, i) => (
              <CardImage key={`${snapshot.id}-${i}`} snapshot={snapshot} width={CARD_WIDTH} />
            ))
          )}
        </div>
      </div>
    </div>,
    document.getElementById("boundless-grimoire-root") ?? document.body,
  );
}
