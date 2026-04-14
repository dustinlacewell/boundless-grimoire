/**
 * Default toast container — the box, border, padding, optional icon
 * gutter, and an unobtrusive dismiss affordance. Most callers wrap
 * their content in this; the deck-themed frame is a sibling that
 * extends the same base shape with a hero-card background.
 */
import type { ReactNode } from "react";
import { colors } from "@boundless-grimoire/ui";

export type ToastVariant = "info" | "success" | "warn" | "error";

interface Props {
  children: ReactNode;
  variant?: ToastVariant;
  /** Optional leading icon (Spinner, ✓, ✗, etc.). */
  icon?: ReactNode;
  /** When provided, a small × button appears for manual dismissal. */
  onDismiss?: () => void;
}

const accentByVariant: Record<ToastVariant, string> = {
  info: colors.borderStrong,
  success: colors.success,
  warn: colors.accent,
  error: colors.danger,
};

const baseStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "12px 16px",
  minWidth: 260,
  maxWidth: 420,
  background: colors.bg2,
  border: `1px solid ${colors.borderStrong}`,
  borderLeftWidth: 3,
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.55)",
  fontSize: 14,
  color: colors.text,
  fontFamily: "system-ui, sans-serif",
  pointerEvents: "auto",
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

export function ToastFrame({ children, variant = "info", icon, onDismiss }: Props) {
  return (
    <div style={{ ...baseStyle, borderLeftColor: accentByVariant[variant] }}>
      {icon && <span style={iconCellStyle}>{icon}</span>}
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
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
