import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLegalityStore } from "./legalityStore";
import { colors } from "@boundless-grimoire/ui";
import { Spinner } from "@boundless-grimoire/ui";

const DONE_LINGER_MS = 5000;

const toastStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 24,
  right: 24,
  zIndex: 2147483647,
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "16px 24px",
  background: colors.bg2,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 10,
  boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
  fontSize: 16,
  color: colors.text,
  fontFamily: "system-ui, sans-serif",
  pointerEvents: "none",
};

type Phase = "idle" | "checking" | "legal" | "illegal";

export function LegalityToast() {
  const isChecking = useLegalityStore((s) => Object.values(s.checking).some(Boolean));
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (isChecking) {
      setPhase("checking");
    } else {
      setPhase((prev) => {
        if (prev !== "checking") return prev;
        const { illegalByDeck } = useLegalityStore.getState();
        const hasIllegal = Object.values(illegalByDeck).some((s) => s.size > 0);
        return hasIllegal ? "illegal" : "legal";
      });
    }
  }, [isChecking]);

  useEffect(() => {
    if (phase !== "legal" && phase !== "illegal") return;
    const timer = setTimeout(() => setPhase("idle"), DONE_LINGER_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "idle") return null;

  const host = document.getElementById("boundless-grimoire-root");
  if (!host) return null;

  const icon = phase === "checking"
    ? <Spinner size={22} />
    : <span style={{ fontSize: 18, lineHeight: 1, color: phase === "legal" ? colors.success : colors.danger }}>
        {phase === "legal" ? "✓" : "✗"}
      </span>;

  const message = phase === "checking"
    ? "Checking deck legality…"
    : phase === "legal"
      ? "Deck is legal."
      : "Deck contains illegal cards.";

  return createPortal(
    <div style={toastStyle}>
      <span style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </span>
      {message}
    </div>,
    host,
  );
}
