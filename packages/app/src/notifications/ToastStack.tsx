/**
 * Renders the live toast queue as a vertical stack pinned to the bottom-
 * right of the viewport. Newest toast appears at the bottom; older
 * toasts stack upward.
 *
 * Mount once at the root of the React tree (Overlay does this). The
 * stack reads from `toastStore` and re-renders when toasts are pushed,
 * dismissed, or replaced.
 */
import { createPortal } from "react-dom";
import { dismissToast, useToastStore } from "./toastStore";

const containerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 24,
  right: 24,
  zIndex: 2147483647,
  display: "flex",
  flexDirection: "column",
  gap: 10,
  alignItems: "flex-end",
  pointerEvents: "none",
};

export function ToastStack() {
  const toasts = useToastStore((s) => s.toasts);
  const host = document.getElementById("boundless-grimoire-root");
  if (!host) return null;
  if (toasts.length === 0) return null;

  return createPortal(
    <div style={containerStyle}>
      {toasts.map((t) => (
        <div key={t.id}>{t.render({ dismiss: () => dismissToast(t.id) })}</div>
      ))}
    </div>,
    host,
  );
}
