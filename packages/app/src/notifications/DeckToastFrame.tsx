/**
 * Deck-themed toast — single-line message with the deck's hero art as
 * the background so the user can tell which deck a toast refers to
 * without a title row. Callers include the deck name in the message
 * when useful; for quick status updates on a single deck, multiple
 * toasts can stack without ballooning vertically.
 *
 * Hero selection mirrors the deck-ribbon tile: explicit `coverCardId`
 * if set, falling back to the first card by add time.
 */
import type { ReactNode } from "react";
import { imageUrl } from "../cards/imageUrl";
import { coverSnapshotOf, useDeckStore } from "../storage/deckStore";
import { colors } from "@boundless-grimoire/ui";

interface Props {
  deckId: string;
  children: ReactNode;
  /** Optional leading icon (Spinner, ✓, ✗, etc.). */
  icon?: ReactNode;
  onDismiss?: () => void;
}

const baseStyle: React.CSSProperties = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  minWidth: 260,
  maxWidth: 420,
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.55)",
  fontSize: 14,
  color: colors.text,
  fontFamily: "system-ui, sans-serif",
  pointerEvents: "auto",
  isolation: "isolate",
  overflow: "hidden",
  boxSizing: "border-box",
};

const iconCellStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const dismissBtnStyle: React.CSSProperties = {
  marginLeft: "auto",
  background: "transparent",
  border: "none",
  color: colors.textMuted,
  cursor: "pointer",
  padding: 0,
  fontSize: 18,
  lineHeight: 1,
};

export function DeckToastFrame({ deckId, children, icon, onDismiss }: Props) {
  const deck = useDeckStore((s) => s.library.decks[deckId]);
  const hero = deck ? coverSnapshotOf(deck) : null;
  const bg = hero ? imageUrl(hero, "art_crop") ?? imageUrl(hero, "normal") : null;

  return (
    <div style={{ ...baseStyle, background: colors.bg2 }}>
      {bg && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: -1,
            backgroundImage: `url(${bg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.55,
          }}
        />
      )}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: -1,
          background:
            "linear-gradient(90deg, rgba(21,21,26,0.92) 0%, rgba(21,21,26,0.55) 100%)",
        }}
      />
      {icon && <span style={iconCellStyle}>{icon}</span>}
      <span style={{ flex: 1, minWidth: 0, fontWeight: 600, textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>
        {children}
      </span>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          title="Dismiss"
          style={dismissBtnStyle}
          onClick={onDismiss}
        >
          ×
        </button>
      )}
    </div>
  );
}
